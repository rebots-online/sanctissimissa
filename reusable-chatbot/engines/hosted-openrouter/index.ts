// HostedOpenRouterProvider — debug hosted default backend (§E, amendment
// 2026-09-18). Streams OpenRouter chat completions over SSE so the Companion
// works on machines with no usable local WebGPU stack. Debug-only default:
// not a scalable path (per-operator directive, retained local engines remain
// the durable backends). The API key never crosses into log/onProgress
// payloads; it exists only in the Authorization header of the HTTPS request.
import type {
  BatchScoreRequest,
  EngineCapabilities,
  EngineConfig,
  GenerateRequest,
  IInferenceEngine,
  KvCacheStats,
  SessionId,
  TokenEvent,
} from '../../core/engine-types.ts';

const DEFAULT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** SSE event classification while scanning a chunk buffer. */
type SseEvent = { done: true } | { done: false; token: TokenEvent | null };

export class HostedOpenRouterProvider implements IInferenceEngine {
  readonly apiKey: string;
  model: string;
  readonly fallbackModel: string | null;
  /** Host app identity (build-time .env: VITE_APP_NAME / VITE_APP_URL) — the
   * provider is host-agnostic and must never bake in one app's name or domain
   * (operator directive 2026-09-18: dual-build sanctissimissa + helloword). */
  readonly appTitle: string;
  readonly appUrl: string;
  readonly onProgress?: (fraction: number, text: string) => void;
  readonly log?: (operation: string, detail: unknown) => void;
  private completionsUrl: string;

  constructor(
    apiKey: string,
    model: string,
    fallbackModel: string | null,
    appTitle: string,
    appUrl: string,
    onProgress?: (fraction: number, text: string) => void,
    log?: (operation: string, detail: unknown) => void,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.fallbackModel = fallbackModel;
    this.appTitle = appTitle;
    this.appUrl = appUrl;
    this.onProgress = onProgress;
    this.log = log;
    this.completionsUrl = DEFAULT_COMPLETIONS_URL;
  }

  async probe(): Promise<EngineCapabilities> {
    return {
      runtime: 'hosted',
      backend: 'hosted',
      kvFormats: [],
      weightFormats: [],
      maxContextTokens: 32768,
      notes: ['debug hosted default — not scalable'],
    };
  }

  async init(config: EngineConfig): Promise<SessionId> {
    if (!this.apiKey || this.apiKey.trim() === '') throw new Error('hosted key missing');
    if (!this.model || this.model.trim() === '') throw new Error('hosted model missing');
    const url = config.artifactUrl?.trim();
    if (url) this.completionsUrl = url;
    return 'hosted-openrouter';
  }

  async *generate(
    _session: SessionId,
    req: GenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<TokenEvent> {
    try {
      if (signal?.aborted) return;
      let res = await this.postCompletion(this.model, req, signal);
      // Fallback is a capability, not a default: a fallbackModel is retried
      // exactly once on HTTP 404 only when one is explicitly configured —
      // never a fallback that can fail more than the primary (operator,
      // 2026-09-18). The shipped config sets none.
      if (
        !res.ok &&
        res.status === 404 &&
        this.fallbackModel !== null &&
        this.fallbackModel !== this.model
      ) {
        await drainBody(res);
        this.log?.('fallback', { from: this.model, to: this.fallbackModel });
        res = await this.postCompletion(this.fallbackModel, req, signal);
      }
      if (!res.ok) {
        await drainBody(res);
        throw new Error(`hosted http ${res.status}`);
      }
      yield* this.consumeSse(res, signal);
    } catch (err) {
      // A caller abort stops iteration cleanly — it is not an engine error.
      if (signal?.aborted) return;
      throw err;
    }
  }

  async batchScore(_session: SessionId, _request: BatchScoreRequest): Promise<Float32Array> {
    throw new Error('hosted provider does not support batchScore');
  }

  async kvStats(_session: SessionId): Promise<KvCacheStats> {
    return { tokens: 0, bytes: 0, bytesPerToken: 0, compressed: false };
  }

  async reset(_session: SessionId): Promise<void> {
    /* no-op — hosted service holds no local state */
  }

  async close(_session: SessionId): Promise<void> {
    /* no-op — hosted service holds no local state */
  }

  private async postCompletion(
    model: string,
    req: GenerateRequest,
    signal?: AbortSignal,
  ): Promise<Response> {
    return fetch(this.completionsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.appUrl,
        'X-Title': this.appTitle,
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        stream: true,
        // Reply ceiling equals the context budget (§E, operator 2026-09-19:
        // 768 was "wholly recklessly insufficient" — replies amputated
        // mid-answer). The request may still pin a smaller budget.
        max_tokens: req.maxTokens ?? 32768,
        temperature: 0.7,
      }),
      signal,
    });
  }

  private async *consumeSse(res: Response, signal?: AbortSignal): AsyncIterable<TokenEvent> {
    const body = res.body;
    if (!body) throw new Error('hosted http empty body');
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const finish = async (): Promise<void> => {
      try {
        await reader.cancel();
      } catch {
        /* best-effort teardown */
      }
    };
    try {
      for (;;) {
        if (signal?.aborted) {
          await finish();
          return;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf('\n');
        while (nl !== -1) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          const ev = this.parseSseLine(line);
          if (ev.done) {
            await finish();
            return;
          }
          if (ev.token) yield ev.token;
          if (signal?.aborted) {
            await finish();
            return;
          }
          nl = buffer.indexOf('\n');
        }
      }
      const tail = buffer + decoder.decode();
      for (const line of tail.split('\n')) {
        const ev = this.parseSseLine(line);
        if (ev.done) return;
        if (ev.token) yield ev.token;
      }
    } catch (err) {
      if (signal?.aborted) return;
      throw err;
    }
  }

  private parseSseLine(line: string): SseEvent {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return { done: false, token: null };
    const payload = trimmed.slice('data:'.length).trim();
    if (payload === '[DONE]') return { done: true };
    try {
      const parsed = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: unknown } }>;
      };
      const piece = parsed.choices?.[0]?.delta?.content;
      if (typeof piece === 'string' && piece.length > 0) {
        // Routed free providers sometimes leak their safety-classification
        // preamble as content ("User Safety: safe / Response Safety: safe") —
        // classifier artifacts, never liturgical content; drop whole-line
        // matches (operator directive 2026-09-19: the attenuation is
        // unacceptable).
        if (/^\s*(user|response)\s+safety\s*:/.test(piece.trim())) {
          return { done: false, token: null };
        }
        return { done: false, token: { text: piece } };
      }
      return { done: false, token: null };
    } catch {
      return { done: false, token: null };
    }
  }
}

async function drainBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    /* best-effort teardown */
  }
}
