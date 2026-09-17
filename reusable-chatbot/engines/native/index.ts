/**
 * CP.7 native runner adapter (§7.8.2 Phase 1 desktop): TypeScript side of
 * the Rust llama.cpp bridge. Session state (KV cache) stays in the native
 * process; only text pieces cross the Channel. Generation is an async
 * iterator fed by a queue; `inference_cancel` handles aborts so the native
 * session stays usable afterwards.
 */

import type {
  EngineCapabilities,
  EngineConfig,
  GenerateRequest,
  IInferenceEngine,
  KvCacheStats,
  SessionId,
  TokenEvent,
} from '../../core/engine-types.ts';

export type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
interface TauriChannelLike<T> {
  on(callback: (message: T) => void): void;
}

/** Simple single-consumer queue bridging Channel callbacks to async iteration. */
class TokenQueue {
  #items: string[] = [];
  #waiters: ((done: boolean) => void)[] = [];
  #closed = false;

  push(item: string): void {
    if (this.#closed) return;
    this.#items.push(item);
    const waiter = this.#waiters.shift();
    waiter?.(false);
  }

  close(): void {
    this.#closed = true;
    for (const w of this.#waiters.splice(0)) w(true);
  }

  async next(): Promise<string | null> {
    if (this.#items.length > 0) return this.#items.shift() ?? null;
    if (this.#closed) return null;
    return new Promise<string | null>((resolve) => {
      this.#waiters.push((done) => resolve(done ? null : this.#items.shift() ?? null));
    });
  }
}

export class NativeRunnerProvider implements IInferenceEngine {
  #invoke: TauriInvoke;
  #session: SessionId | null = null;

  constructor(invoke: TauriInvoke) {
    this.#invoke = invoke;
  }

  async probe(): Promise<EngineCapabilities> {
    const report = (await this.#invoke('inference_probe')) as {
      runtime: string;
      accelerations: string[];
      contextCeiling: number;
      weightFormats: string[];
      kvFormats: string[];
      threads: number;
      notes: string[];
    };
    return {
      runtime: 'tauri',
      backend: 'turboquant-native',
      kvFormats: (report.kvFormats ?? []) as EngineCapabilities['kvFormats'],
      weightFormats: report.weightFormats ?? [],
      maxContextTokens: report.contextCeiling,
      notes: report.notes ?? [],
    };
  }

  async init(config: EngineConfig): Promise<SessionId> {
    const locator = config.artifactUrl;
    if (!locator || locator.startsWith('builtin:')) {
      throw new Error('native engine needs a shared-library locator — download a model first');
    }
    const id = (await this.#invoke('inference_load', {
      path: locator,
      contextTokens: config.contextTokens ?? 4096,
    })) as string;
    this.#session = id;
    return id;
  }

  async *generate(
    session: SessionId,
    request: GenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<TokenEvent, void, undefined> {
    if (session !== this.#session) throw new Error('native session mismatch');
    const channel = (this.#invoke as unknown as {
      Channel: new <T>() => TauriChannelLike<T>;
    }).Channel;
    if (typeof channel !== 'function') {
      throw new Error('Tauri Channel unavailable outside the desktop shell');
    }
    const chan = new (channel as new () => TauriChannelLike<string>)();
    const queue = new TokenQueue();
    chan.on((piece: string) => {
      queue.push(piece);
      if (piece === '') queue.close();
    });
    if (signal) signal.addEventListener('abort', () => void this.cancel(session), { once: true });

    const generation = this.#invoke('inference_generate', {
      sessionId: session,
      messages: request.messages.map((m) => [m.role, m.content]),
      maxTokens: request.maxTokens ?? null,
      onToken: chan,
    }) as Promise<void>;
    // The command itself streams into the channel; surface hard failures.
    generation.catch((error) => {
      queue.push(`⚠ ${error instanceof Error ? error.message : String(error)}`);
      queue.close();
    });
    void generation.finally(() => queue.close());

    for (;;) {
      const piece = await queue.next();
      if (piece === null) return;
      if (piece === '') return; // completion sentinel
      yield { text: piece };
    }
  }

  async cancel(session: SessionId): Promise<void> {
    await this.#invoke('inference_cancel', { sessionId: session }).catch(() => undefined);
  }

  async batchScore(): Promise<Float32Array> {
    return new Float32Array(0);
  }

  async kvStats(): Promise<KvCacheStats> {
    return { tokens: 0, bytes: 0, bytesPerToken: 0, compressed: false };
  }

  async reset(): Promise<void> {
    // v1: conversation resets ride a fresh prompt; the KV grows monotonically
    // within a session and context is bounded by n_ctx.
  }

  async close(): Promise<void> {
    if (this.#session !== null) {
      await this.#invoke('inference_unload', { sessionId: this.#session }).catch(() => undefined);
      this.#session = null;
    }
  }

  async tokenize(session: SessionId, text: string): Promise<number[]> {
    if (session !== this.#session) throw new Error('native session mismatch');
    return (await this.#invoke('inference_tokenize', { sessionId: session, text })) as number[];
  }
}
