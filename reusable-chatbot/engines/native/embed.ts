// NativeEmbedEngine — L-native-embed-engine F5 (contract owned by BA.12; created by
// BA.13 to the exact BA.12 spec because BA.12 had not landed at code time).
// Linux/Windows/Android-64 embedding runtime: the Tauri shell's `embedding.rs`
// commands over the pinned Atomic llama.cpp fork. No `src/` imports: pins and the
// diagnostics callback are injected by the caller.
// see DOCS/sdk/tauri-plugins-ipc/calling-rust.md (invoke argument camelCasing: sessionId, expectedBytes, expectedSha256)

import type {
  BatchScoreRequest,
  EngineCapabilities,
  EngineConfig,
  IInferenceEngine,
  KvCacheStats,
  SessionId,
  TokenEvent,
} from '../../core/engine-types.ts';
import type { TauriInvoke } from '../../core/capability-broker.ts';

export type NativeEmbedPins = Record<string, { role: 'embed' | 'rerank'; bytes: number; sha256: string }>;

const EMBED_CHUNK = 32;

export class NativeEmbedEngine implements IInferenceEngine {
  #invoke: TauriInvoke;
  #pins: NativeEmbedPins;
  #onEvent?: (op: 'texts' | 'rerank', detail: { n: number; ms: number; runtime: 'native' }) => void;
  #chain: Promise<unknown> = Promise.resolve();

  constructor(
    invoke: TauriInvoke,
    pins: NativeEmbedPins,
    onEvent?: (op: 'texts' | 'rerank', detail: { n: number; ms: number; runtime: 'native' }) => void,
  ) {
    this.#invoke = invoke;
    this.#pins = pins;
    this.#onEvent = onEvent;
  }

  #serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.#chain.then(run, run);
    this.#chain = next.catch(() => undefined);
    return next;
  }

  async probe(): Promise<EngineCapabilities> {
    await this.#invoke('embed_probe');
    const android = typeof navigator !== 'undefined' && navigator.userAgent.includes('Android');
    return { runtime: android ? 'android' : 'tauri', backend: 'turboquant-native', kvFormats: ['f16'], weightFormats: ['Q8_0'], maxContextTokens: 2048 };
  }

  init(config: EngineConfig): Promise<SessionId> {
    return this.#serial(async () => {
      const pin = this.#pins[config.modelId];
      if (!pin) throw new Error(`embed: no pin for ${config.modelId}`);
      // A Play-pack path carries its sha (verified natively); a DownloadManager
      // path passes '' → null because model_finish already proved the digest.
      return (await this.#invoke('embed_load', {
        path: config.artifactUrl,
        role: pin.role,
        expectedBytes: pin.bytes,
        expectedSha256: pin.sha256 || null,
      })) as SessionId;
    });
  }

  generate(): AsyncIterable<TokenEvent> {
    throw new Error('embedding engine: generate unsupported');
  }

  embed(session: SessionId, texts: string[]): Promise<Float32Array[]> {
    return this.#serial(async () => {
      const started = performance.now();
      const out: Float32Array[] = [];
      for (let i = 0; i < texts.length; i += EMBED_CHUNK) {
        const rows = (await this.#invoke('embed_texts', { sessionId: session, texts: texts.slice(i, i + EMBED_CHUNK) })) as number[][];
        for (const row of rows) out.push(Float32Array.from(row));
      }
      this.#onEvent?.('texts', { n: texts.length, ms: Math.round(performance.now() - started), runtime: 'native' });
      return out;
    });
  }

  batchScore(session: SessionId, request: BatchScoreRequest): Promise<Float32Array> {
    return this.#serial(async () => {
      const query = request.items[0]?.context[0]?.content ?? '';
      for (const item of request.items) {
        const ctx = item.context;
        if (ctx.length !== 1 || ctx[0].role !== 'user' || ctx[0].content !== query) {
          throw new Error('embed: batchScore requires one shared query');
        }
      }
      const documents = request.items.map((item) => item.continuation);
      if (documents.length === 0) return new Float32Array(0);
      const started = performance.now();
      const scores = (await this.#invoke('rerank_scores', { sessionId: session, query, documents })) as number[];
      this.#onEvent?.('rerank', { n: documents.length, ms: Math.round(performance.now() - started), runtime: 'native' });
      return Float32Array.from(scores);
    });
  }

  async kvStats(): Promise<KvCacheStats> {
    return { tokens: 0, bytes: 0, bytesPerToken: 0, compressed: false };
  }

  async reset(): Promise<void> {}

  close(session: SessionId): Promise<void> {
    return this.#serial(async () => {
      await this.#invoke('embed_unload', { sessionId: session });
    });
  }
}
