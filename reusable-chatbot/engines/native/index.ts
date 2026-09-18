/**
 * CP.7 native runner adapter (§7.8.2 Phase 1 desktop): TypeScript side of
 * the Rust llama.cpp bridge. Session state (KV cache) stays in the native
 * process; only text pieces cross the Channel. Generation is an async
 * iterator fed by a queue; `inference_cancel` handles aborts so the native
 * session stays usable afterwards.
 */

import { Channel } from '@tauri-apps/api/core';

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
export interface TauriChannelLike<T> {
  onmessage: (message: T) => void;
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

  #diagnostic: (operation: string, detail: unknown) => void;
  #progress: (fraction: number, text: string) => void;
  #makeChannel: () => TauriChannelLike<string>;

  constructor(invoke: TauriInvoke, makeChannel: () => TauriChannelLike<string> = () => new Channel<string>(),
    diagnostic: (operation: string, detail: unknown) => void = () => {}, progress: (fraction: number, text: string) => void = () => {}) {
    this.#invoke = invoke;
    this.#makeChannel = makeChannel;
    this.#diagnostic = diagnostic;
    this.#progress = progress;
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
    const onProgress = this.#makeChannel();
    onProgress.onmessage = (raw) => {
      this.#diagnostic('load.event', raw);
      try {
        const event = JSON.parse(raw) as { progress?: number; stage?: string };
        if (typeof event.progress === 'number') this.#progress(event.progress, event.stage ?? '');
      } catch { /* Raw payload is already recorded. */ }
    };
    const id = (await this.#invoke('inference_load', {
      path: locator,
      onProgress,
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
    if (signal?.aborted) return;
    const chan = this.#makeChannel();
    const queue = new TokenQueue();
    let failure: unknown;
    chan.onmessage = (piece: string) => {
      if (piece) queue.push(piece);
      else queue.close();
    };
    const cancel = () => { queue.close(); void this.cancel(session); };
    signal?.addEventListener('abort', cancel, { once: true });
    const generation = this.#invoke('inference_generate', {
      sessionId: session,
      messages: request.messages.map((m) => [m.role, m.content]),
      maxTokens: request.maxTokens ?? null,
      onToken: chan,
    }).catch((error: unknown) => { failure = error; }).finally(() => queue.close());
    try {
      for (;;) {
        const piece = await queue.next();
        if (signal?.aborted) return;
        if (piece === null) break;
        yield { text: piece };
      }
      await generation;
      if (failure !== undefined) throw failure;
    } finally {
      signal?.removeEventListener('abort', cancel);
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
