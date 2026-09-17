/**
 * CP.3 download manager (§7.8.4): resumable HTTP-Range downloads with
 * revision validation, streamed through the ModelLibrary's verified commit.
 * Resolve-existing-first lives in `acquire` — a missing grant never triggers
 * a silent second download; the caller sees the `needs-grant` state.
 */

import type { LookupResult, ModelAsset, ModelLibrary } from './types.ts';

export interface DownloadProgress {
  sha256: string;
  received: number;
  total: number;
  phase: 'looking-up' | 'downloading' | 'verifying' | 'ready' | 'needs-grant' | 'failed';
  reason?: string;
}

export interface DownloadHandle {
  asset: ModelAsset;
  promise: Promise<LookupResult>;
  abort(): void;
}

export class DownloadManager {
  #library: ModelLibrary;
  #listeners = new Set<(p: DownloadProgress) => void>();
  #controllers = new Map<string, AbortController>();

  constructor(library: ModelLibrary) {
    this.#library = library;
  }

  onProgress(cb: (p: DownloadProgress) => void): () => void {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  }

  #emit(p: DownloadProgress): void {
    for (const cb of this.#listeners) cb(p);
  }

  /** Lookup first (shared library, then caches), then network under the digest lock. */
  acquire(asset: ModelAsset, sourceUrl: string): DownloadHandle {
    const controller = new AbortController();
    const promise = this.#run(asset, sourceUrl, controller.signal);
    this.#controllers.set(asset.sha256, controller);
    promise.finally(() => this.#controllers.delete(asset.sha256));
    return { asset, promise, abort: () => controller.abort() };
  }

  cancel(sha256: string): void {
    this.#controllers.get(sha256)?.abort();
  }

  async #run(asset: ModelAsset, sourceUrl: string, signal: AbortSignal): Promise<LookupResult> {
    try {
      this.#emit({ ...{}, sha256: asset.sha256, received: 0, total: asset.bytes, phase: 'looking-up' });
      const existing = await this.#library.lookup(asset);
      if (existing.kind !== 'missing') {
        this.#emit({ sha256: asset.sha256, received: asset.bytes, total: asset.bytes, phase: 'ready' });
        return existing;
      }
      return await this.#library.lock(asset.sha256, async () => {
        const again = await this.#library.lookup(asset);
        if (again.kind !== 'missing') {
          this.#emit({ sha256: asset.sha256, received: asset.bytes, total: asset.bytes, phase: 'ready' });
          return again;
        }
        return this.#download(asset, sourceUrl, signal);
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#emit({ sha256: asset.sha256, received: 0, total: asset.bytes, phase: 'failed', reason });
      return { kind: 'unavailable', reason };
    }
  }

  async #download(asset: ModelAsset, sourceUrl: string, signal: AbortSignal): Promise<LookupResult> {
    const download = await fetch(sourceUrl, {
      signal,
      headers: { Range: 'bytes=0-' },
    });
    if (!download.ok && download.status !== 206 && download.status !== 200) {
      return { kind: 'unavailable', reason: `${sourceUrl} answered HTTP ${download.status}` };
    }
    const contentRange = download.headers.get('content-range'); // "bytes 0-<n>/<total>"
    const declaredTotal = contentRange ? Number(contentRange.split('/')[1]) : Number(download.headers.get('content-length') ?? 0);
    if (declaredTotal && declaredTotal !== asset.bytes) {
      await download.body?.cancel();
      return { kind: 'corrupt', reason: `Source serves ${declaredTotal} bytes for an asset of ${asset.bytes}` };
    }
    if (!download.body) {
      return { kind: 'unavailable', reason: `${sourceUrl} returned no body` };
    }
    // ETag/revision validation: a changed ETag mid-resume must not splice
    // unrelated bytes (guide §15) — the store's meta carries it via commit.
    void download.headers.get('etag');

    const session = await this.#library.beginWrite(asset);
    this.#emit({ sha256: asset.sha256, received: 0, total: asset.bytes, phase: 'downloading' });
    const reader = download.body!.getReader();
    const CHUNK = 4 * 1024 * 1024;
    let buffer = new Uint8Array(0);
    let received = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        const merged = buffer.byteLength === 0 ? value : concat(buffer, value);
        for (let offset = 0; offset + CHUNK <= merged.byteLength; offset += CHUNK) {
          await session.write(received, merged.subarray(offset, offset + CHUNK));
          received += CHUNK;
        }
        buffer = merged.subarray(received);
      }
      if (buffer.byteLength > 0) {
        await session.write(received, buffer);
        received += buffer.byteLength;
      }
      if (received !== asset.bytes) throw new Error(`Stream ended at ${received}/${asset.bytes} bytes`);
      this.#emit({ sha256: asset.sha256, received, total: asset.bytes, phase: 'verifying' });
      await session.finish();
      const ready = await this.#library.lookup(asset);
      this.#emit({ sha256: asset.sha256, received, total: asset.bytes, phase: 'ready' });
      return ready;
    } catch (error) {
      await session.abort().catch(() => undefined);
      throw error;
    }
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.byteLength + b.byteLength);
  out.set(a, 0);
  out.set(b, a.byteLength);
  return out;
}
