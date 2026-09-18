/**
 * CP.3 download manager (§7.8.4): resumable HTTP-Range downloads with
 * revision validation, streamed through the ModelLibrary's verified commit.
 * Resolve-existing-first lives in `acquire` — a missing grant never triggers
 * a silent second download; the caller sees the `needs-grant` state.
 *
 * Stalls resume instead of failing: WebKitGTK's fetch can pause a large CDN
 * body for minutes mid-stream (observed on the v1.57 desktop drive — the
 * 60-second abort killed a healthy 1.2 GB model transfer at 2%), while the
 * same URL streams continuously under V8. A no-progress window therefore
 * aborts only the stalled connection and reconnects with
 * `Range: bytes=<written>-` from the last durable chunk boundary. Only the
 * user's Cancel is a real abort.
 */

import { debugEvent } from '../diagnostics/store.ts';

import type { LookupResult, ModelAsset, ModelLibrary } from './types.ts';

export interface DownloadProgress {
  sha256: string;
  received: number;
  total: number;
  phase: 'looking-up' | 'downloading' | 'verifying' | 'ready' | 'needs-grant' | 'failed';
  reason?: string;
}

export interface DownloadOptions {
  /** No-progress window before a stalled connection is reconnected (ms). */
  stallMs?: number;
  /** How many stall-reconnects one acquire may burn before failing honestly. */
  maxResumes?: number;
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
  #stallMs: number;
  #maxResumes: number;

  constructor(library: ModelLibrary, alias?: (sourceUrl: string) => Promise<string | null>, options: DownloadOptions = {}) {
    this.#library = library;
    this.#alias = alias;
    this.#stallMs = options.stallMs ?? 300_000;
    this.#maxResumes = options.maxResumes ?? 8;
  }

  onProgress(cb: (p: DownloadProgress) => void): () => void {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  }

  #emit(p: DownloadProgress): void {
    debugEvent('model-download', p.phase, p, p.phase === 'failed' ? 'error' : 'info', p.sha256);
    for (const cb of this.#listeners) cb(p);
  }

  /**
   * Lookup first (shared library, then caches), then network under the digest
   * lock. With a catalog-only asset (digest unknown), `knownDigest` short-
   * circuits when the content is already published; otherwise the download
   * proves the digest at commit and the returned lookup is keyed by it.
   */
  acquire(asset: ModelAsset, sourceUrl: string, knownDigest?: string, progressKey?: string): DownloadHandle {
    const key = progressKey || asset.sha256 || knownDigest || sourceUrl;
    const controller = new AbortController();
    this.#controllers.set(key, controller);
    const promise = this.#run(asset, sourceUrl, controller, knownDigest, key).finally(() => {
      if (this.#controllers.get(key) === controller) this.#controllers.delete(key);
    });
    return { asset, promise, abort: () => controller.abort() };
  }

  cancel(key: string): void {
    this.#controllers.get(key)?.abort();
  }

  async #run(
    asset: ModelAsset,
    sourceUrl: string,
    controller: AbortController,
    knownDigest: string | undefined,
    progressKey: string,
  ): Promise<LookupResult> {
    const emitResult = (result: LookupResult): LookupResult => {
      const ready = result.kind === 'ready';
      const total = ready ? (result.asset?.bytes ?? asset.bytes) : asset.bytes;
      this.#emit({ sha256: progressKey, received: ready ? total : 0, total,
        phase: ready ? 'ready' : result.kind === 'needs-grant' ? 'needs-grant' : 'failed',
        reason: 'reason' in result ? result.reason : undefined });
      return result;
    };
    try {
      this.#emit({ sha256: progressKey, received: 0, total: asset.bytes, phase: 'looking-up' });
      const digest = asset.sha256 || knownDigest || (await this.#alias?.(sourceUrl)) || '';
      const identity = { ...asset, sha256: digest };
      const existing = digest ? await this.#library.lookup(identity) : { kind: 'missing' } as LookupResult;
      if (existing.kind !== 'missing') {
        return emitResult(existing.kind === 'ready' ? { ...existing, asset: identity } : existing);
      }
      const result = await this.#library.lock(digest || `dl-${hashKey(sourceUrl)}`, async () => {
        controller.signal.throwIfAborted();
        if (digest) {
          const again = await this.#library.lookup(identity);
          if (again.kind !== 'missing') return again.kind === 'ready' ? { ...again, asset: identity } : again;
        }
        return this.#download(identity, sourceUrl, controller, progressKey);
      });
      return emitResult(result);
    } catch (error) {
      return emitResult({ kind: 'unavailable', reason: error instanceof Error ? error.message : String(error) });
    }
  }

  async #download(asset: ModelAsset, sourceUrl: string, userController: AbortController, progressKey: string): Promise<LookupResult> {
    // Durable resume point: `written` counts exactly the bytes handed to the
    // write session; every (re)connect flushes the partial chunk first so a
    // stall can reconnect from a boundary the store really holds.
    const CHUNK = 4 * 1024 * 1024;
    const stagingKey = asset.sha256 ? undefined : `dl-${hashKey(sourceUrl)}`;
    let session: Awaited<ReturnType<ModelLibrary['beginWrite']>> | undefined;
    try {
      let total = 0;
      let written = 0;
      let buffer = new Uint8Array(0);
      let attempt = 0;
      for (;;) {
        if (buffer.byteLength) {
          await session!.write(written, buffer);
          written += buffer.byteLength;
          buffer = new Uint8Array(0);
        }
        const stall = new AbortController();
        const relayUserAbort = () => stall.abort();
        userController.signal.addEventListener('abort', relayUserAbort, { once: true });
        let deadline: ReturnType<typeof setTimeout> | undefined;
        const arm = () => { clearTimeout(deadline); deadline = setTimeout(() => stall.abort(), this.#stallMs); };
        arm();
        try {
          const download = await fetch(sourceUrl, { signal: stall.signal, headers: { Range: `bytes=${attempt === 0 ? 0 : written}-` } });
          if (!download.ok) throw new Error(`Model source answered HTTP ${download.status}`);
          const range = download.headers.get('content-range');
          const match = range?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
          const declaredTotal = Number(match?.[3] ?? download.headers.get('content-length') ?? 0);
          if (download.status === 206 && (!match || Number(match[2]) + 1 !== declaredTotal)) {
            await download.body?.cancel();
            return { kind: 'corrupt', reason: 'Incomplete or invalid model byte range' };
          }
          if (!Number.isSafeInteger(declaredTotal) || declaredTotal < 0) throw new Error('Invalid source length');
          if (asset.estimatedBytes && !declaredTotal) throw new Error('Model source did not provide its exact size');
          if (!asset.estimatedBytes && declaredTotal && declaredTotal !== asset.bytes) {
            await download.body?.cancel();
            return { kind: 'corrupt', reason: `Source serves ${declaredTotal} bytes for an asset of ${asset.bytes}` };
          }
          if (total === 0) {
            total = asset.estimatedBytes ? declaredTotal : asset.bytes;
            session ??= await this.#library.beginWrite({ bytes: total, fileName: asset.fileName, sha256: asset.sha256 || undefined, stagingKey });
            this.#emit({ sha256: progressKey, received: 0, total, phase: 'downloading' });
          }
          // A server that ignores the resume range restarts from zero: the
          // already-written prefix is void, so begin a fresh object and
          // re-stream the whole body through the same staging key.
          if (attempt > 0 && (download.status === 200 || (match && Number(match[1]) !== written))) {
            await session!.abort();
            session = await this.#library.beginWrite({ bytes: total, fileName: asset.fileName, sha256: asset.sha256 || undefined, stagingKey });
            written = 0;
          }
          if (!download.body) throw new Error('Model source returned no body');
          const reader = download.body.getReader();
          try {
            for (;;) {
              userController.signal.throwIfAborted();
              const { done, value } = await reader.read();
              if (done) break;
              if (!value) continue;
              arm();
              const merged = concat(buffer, value);
              let consumed = 0;
              while (consumed + CHUNK <= merged.byteLength) {
                userController.signal.throwIfAborted();
                await session!.write(written, merged.subarray(consumed, consumed + CHUNK));
                written += CHUNK;
                consumed += CHUNK;
              }
              buffer = merged.slice(consumed);
              if (written + buffer.byteLength > total) throw new Error('Model source exceeded its declared size');
              this.#emit({ sha256: progressKey, received: written + buffer.byteLength, total, phase: 'downloading' });
            }
          } finally {
            await reader.cancel().catch(() => undefined);
            reader.releaseLock();
          }
          if (buffer.byteLength) {
            await session!.write(written, buffer);
            written += buffer.byteLength;
            buffer = new Uint8Array(0);
          }
          if (written === total) break;
          // The segment ended early without an error — treat it as a stall.
          attempt++;
          if (attempt > this.#maxResumes) throw new Error(`Stream ended at ${written}/${total} bytes after ${this.#maxResumes} resumes`);
          debugEvent('model-download', 'segment.resume', { at: written, total, attempt }, 'warn', progressKey);
        } catch (error) {
          if (userController.signal.aborted || !(error instanceof Error) || error.name !== 'AbortError') throw error;
          attempt++;
          if (attempt > this.#maxResumes) throw new Error(`Download stalled at ${written}/${total} bytes after ${this.#maxResumes} resumes`);
          debugEvent('model-download', 'stall.resume', { at: written, total, attempt }, 'warn', progressKey);
        } finally {
          clearTimeout(deadline);
          userController.signal.removeEventListener('abort', relayUserAbort);
        }
      }
      userController.signal.throwIfAborted();
      this.#emit({ sha256: progressKey, received: written, total, phase: 'verifying' });
      const committed = await session!.finish();
      const identity: ModelAsset = { sha256: committed.sha256, bytes: committed.bytes, fileName: asset.fileName };
      const ready = await this.#library.lookup(identity);
      return ready.kind === 'ready' ? { ...ready, asset: identity } : ready;
    } catch (error) {
      await session?.abort().catch(() => undefined);
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
