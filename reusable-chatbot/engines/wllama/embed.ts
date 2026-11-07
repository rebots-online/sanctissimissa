// WllamaEmbedEngine — L-native-embed-engine F5 (BA.13). The web/PWA and 32-bit
// Android embedding runtime: llama.cpp compiled to wasm, single-thread (D2), CPU,
// no COOP/COEP. Every asset is self-hosted: the caller hands same-origin `blob:`
// URLs (wasm) and the compat worker source as `{code}` — never jsDelivr.
// One instance per role (embed | rerank). No `src/` imports (reusable-chatbot rule).
// see DOCS/sdk/wllama-3.8.1/wllama.d.ts.md (Wllama, WllamaCompat, setCompat, loadModel,
//     createEmbedding, createRerank, exit)
// see DOCS/sdk/wllama-3.8.1/oai-compat.d.ts.md (EmbeddingCreateParams, RerankParams, RerankResponse)
// see DOCS/sdk/wllama-3.8.1/types.d.ts.md (LoadModelParams.pooling_type)

import { Wllama } from '@wllama/wllama/esm/index.js';

import type {
  BatchScoreRequest,
  EngineCapabilities,
  EngineConfig,
  IInferenceEngine,
  KvCacheStats,
  SessionId,
  TokenEvent,
} from '../../core/engine-types.ts';

export interface WllamaEmbedEngineOptions {
  role: 'embed' | 'rerank';
  wasmUrl: string;
  compat: { wasm: string; workerCode: string };
  loadBlob: (artifactUrl: string) => Promise<Blob>;
  onEvent?: (op: 'texts' | 'rerank', detail: { n: number; ms: number; runtime: 'wllama' }) => void;
}

const EMBED_CHUNK = 8;

/** Shared-query rule (identical to NativeEmbedEngine). */
export function sharedRerankQuery(request: BatchScoreRequest): { query: string; documents: string[] } {
  const first = request.items[0]?.context[0];
  const query = first?.content ?? '';
  for (const item of request.items) {
    const ctx = item.context;
    if (ctx.length !== 1 || ctx[0].role !== 'user' || ctx[0].content !== query) {
      throw new Error('embed: batchScore requires one shared query');
    }
  }
  return { query, documents: request.items.map((item) => item.continuation) };
}

export class WllamaEmbedEngine implements IInferenceEngine {
  #opts: WllamaEmbedEngineOptions;
  #wllama: Wllama;
  #session: SessionId | null = null;
  #chain: Promise<unknown> = Promise.resolve();

  constructor(opts: WllamaEmbedEngineOptions) {
    this.#opts = opts;
    // Construction path: the wasm comes from the caller's same-origin blob URL...
    this.#wllama = new Wllama({ default: opts.wasmUrl }, { suppressNativeLog: true });
    // ...and compat is overridden IMMEDIATELY — the constructor defaults it to
    // jsDelivr (wllama.ts:217, wasm-from-cdn.ts). WllamaCompat.worker accepts {code}.
    this.#wllama.setCompat({ wasm: opts.compat.wasm, worker: { code: opts.compat.workerCode } });
  }

  #serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.#chain.then(run, run);
    this.#chain = next.catch(() => undefined);
    return next;
  }

  #check(session: SessionId): void {
    if (session !== this.#session) throw new Error('wllama embed session mismatch');
  }

  async probe(): Promise<EngineCapabilities> {
    return { runtime: 'web', backend: 'wasm-simd', kvFormats: ['f16'], weightFormats: ['Q8_0'], maxContextTokens: 2048 };
  }

  init(config: EngineConfig): Promise<SessionId> {
    return this.#serial(async () => {
      const blob = await this.#opts.loadBlob(config.artifactUrl);
      // D2: single thread (pthread 0), CPU only (n_gpu_layers 0), embeddings with
      // last-token pooling (embed) or the rank head (rerank).
      await this.#wllama.loadModel([blob], {
        n_ctx: 2048,
        n_batch: 2048,
        n_ubatch: 2048,
        n_threads: 1,
        n_gpu_layers: 0,
        embeddings: true,
        pooling_type: this.#opts.role === 'embed' ? 'last' : 'rank',
      });
      this.#session = `wllama:${this.#opts.role}:${Date.now()}`;
      return this.#session;
    });
  }

  generate(): AsyncIterable<TokenEvent> {
    throw new Error('embedding engine: generate unsupported');
  }

  embed(session: SessionId, texts: string[]): Promise<Float32Array[]> {
    return this.#serial(async () => {
      this.#check(session);
      const started = performance.now();
      const out: Float32Array[] = [];
      for (let i = 0; i < texts.length; i += EMBED_CHUNK) {
        const response = await this.#wllama.createEmbedding({ input: texts.slice(i, i + EMBED_CHUNK) });
        const rows = [...response.data].sort((a, b) => a.index - b.index);
        for (const row of rows) {
          if (typeof row.embedding === 'string') throw new Error('wllama: unexpected base64 embedding');
          out.push(Float32Array.from(row.embedding));
        }
      }
      this.#opts.onEvent?.('texts', { n: texts.length, ms: Math.round(performance.now() - started), runtime: 'wllama' });
      return out;
    });
  }

  batchScore(session: SessionId, request: BatchScoreRequest): Promise<Float32Array> {
    return this.#serial(async () => {
      this.#check(session);
      const { query, documents } = sharedRerankQuery(request);
      const scores = new Float32Array(documents.length);
      if (documents.length === 0) return scores;
      const started = performance.now();
      const response = await this.#wllama.createRerank({ query, documents });
      // Results arrive sorted highest-first; scatter back into item order.
      for (const result of response.results) scores[result.index] = result.relevance_score;
      this.#opts.onEvent?.('rerank', { n: documents.length, ms: Math.round(performance.now() - started), runtime: 'wllama' });
      return scores;
    });
  }

  async kvStats(): Promise<KvCacheStats> {
    return { tokens: 0, bytes: 0, bytesPerToken: 0, compressed: false };
  }

  async reset(): Promise<void> {}

  close(session: SessionId): Promise<void> {
    return this.#serial(async () => {
      if (session !== this.#session) return;
      this.#session = null;
      await this.#wllama.exit();
    });
  }
}
