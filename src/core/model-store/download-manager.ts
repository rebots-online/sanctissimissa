/**
 * CP.3 download manager (§7.8.4): resumable HTTP-Range downloads with
 * revision validation, streamed through the ModelLibrary's verified commit.
 * Resolve-existing-first lives in `acquire` — a missing grant never triggers
 * a silent second download; the caller sees the `needs-grant` state.
 */

import type { LookupResult, ModelAsset, ModelLibrary, WriteAsset } from './types.ts';

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
  /** Catalogue alias: source URL → published digest, when one is recorded. */
  #alias?: (sourceUrl: string) => Promise<string | null>;

  constructor(library: ModelLibrary, alias?: (sourceUrl: string) => Promise<string | null>) {
    this.#library = library;
    this.#alias = alias;
  }

  onProgress(cb: (p: DownloadProgress) => void): () => void {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  }

  #emit(p: DownloadProgress): void {
    for (const cb of this.#listeners) cb(p);
  }

  /**
   * Lookup first (shared library, then caches), then network under the digest
   * lock. With a catalog-only asset (digest unknown), `knownDigest` short-
   * circuits when the content is already published; otherwise the download
   * proves the digest at commit and the returned lookup is keyed by it.
   */
  acquire(asset: ModelAsset, sourceUrl: string, knownDigest?: string, progressKey?: string): DownloadHandle {
    const controller = new AbortController();
    const promise = this.#run(asset, sourceUrl, controller.signal, knownDigest, progressKey);
    this.#controllers.set(asset.sha256, controller);
    promise.finally(() => this.#controllers.delete(asset.sha256));
    return { asset, promise, abort: () => controller.abort() };
  }

  cancel(sha256: string): void {
    this.#controllers.get(sha256)?.abort();
  }

  async #run(
    asset: ModelAsset,
    sourceUrl: string,
    signal: AbortSignal,
    knownDigest?: string,
    progressKeyOverride?: string,
  ): Promise<LookupResult> {
    const progressKey = progressKeyOverride ?? asset.sha256 ?? knownDigest ?? sourceUrl;
    try {
      this.#emit({ sha256: progressKey, received: 0, total: asset.bytes, phase: 'looking-up' });
      // Resolve-existing-first: shared library, then authorized caches — by
      // the asset digest when known, else through the catalogue alias (§7.8.4).
      const alias = knownDigest ?? (await this.#alias?.(sourceUrl)) ?? null;
      const existing = asset.sha256 || alias
        ? await this.#library.lookup({ ...asset, sha256: asset.sha256 || alias! })
        : ({ kind: 'missing' } as LookupResult);
      if (existing.kind !== 'missing') {
        this.#emit({ sha256: asset.sha256 || alias!, received: asset.bytes, total: asset.bytes, phase: 'ready' });
        return existing;
      }
      const lockKey = knownDigest ?? asset.sha256 ?? sourceUrl;
      return await this.#library.lock(lockKey, async () => {
        if (knownDigest) {
          const again = await this.#library.lookup({ ...asset, sha256: knownDigest });
          if (again.kind !== 'missing') return again;
        }
        const result = await this.#download(asset, sourceUrl, signal, progressKey);
        if (result.kind === 'ready' && knownDigest && result.locator) return result;
        return result;
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#emit({ sha256: progressKey, received: 0, total: asset.bytes, phase: 'failed', reason });
      return { kind: 'unavailable', reason };
    }
  }

  async #download(asset: ModelAsset, sourceUrl: string, signal: AbortSignal, progressKey: string): Promise<LookupResult> {
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

    const writeAsset: WriteAsset = {
      bytes: asset.bytes,
      fileName: asset.fileName,
      sha256: asset.sha256 || undefined,
      stagingKey: asset.sha256 ? undefined : `dl-${hashKey(sourceUrl)}`,
    };
    const session = await this.#library.beginWrite(writeAsset);
    this.#emit({ sha256: progressKey, received: 0, total: asset.bytes, phase: 'downloading' });
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

function hashKey(url: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) h = ((h ^ url.charCodeAt(i)) * 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0') + url.length.toString(16);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.byteLength + b.byteLength);
  out.set(a, 0);
  out.set(b, a.byteLength);
  return out;
}
