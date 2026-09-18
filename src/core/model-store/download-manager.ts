/**
 * CP.3 download manager (§7.8.4): resumable HTTP-Range downloads with
 * revision validation, streamed through the ModelLibrary's verified commit.
 * Resolve-existing-first lives in `acquire` — a missing grant never triggers
 * a silent second download; the caller sees the `needs-grant` state.
 */

import { debugEvent } from '../diagnostics/store.ts';

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

  async #download(asset: ModelAsset, sourceUrl: string, controller: AbortController, progressKey: string): Promise<LookupResult> {
    // Stall deadline resets on received bytes; large, progressing downloads are not timed out.
    let deadline: ReturnType<typeof setTimeout>;
    const touch = () => { clearTimeout(deadline); deadline = setTimeout(() => controller.abort(), 60_000); };
    touch();
    let session: Awaited<ReturnType<ModelLibrary['beginWrite']>> | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const download = await fetch(sourceUrl, { signal: controller.signal, headers: { Range: 'bytes=0-' } });
      if (!download.ok) throw new Error(`Model source answered HTTP ${download.status}`);
      const range = download.headers.get('content-range');
      const match = range?.match(/^bytes 0-([0-9]+)\/([0-9]+)$/);
      if (download.status === 206 && (!match || Number(match[1]) + 1 !== Number(match[2]))) {
        await download.body?.cancel();
        return { kind: 'corrupt', reason: 'Incomplete or invalid model byte range' };
      }
      const declaredTotal = Number(match?.[2] ?? download.headers.get('content-length') ?? 0);
      if (!Number.isSafeInteger(declaredTotal) || declaredTotal < 0) throw new Error('Invalid source length');
      if (asset.estimatedBytes && !declaredTotal) throw new Error('Model source did not provide its exact size');
      if (!asset.estimatedBytes && declaredTotal && declaredTotal !== asset.bytes) {
        await download.body?.cancel();
        return { kind: 'corrupt', reason: `Source serves ${declaredTotal} bytes for an asset of ${asset.bytes}` };
      }
      const total = asset.estimatedBytes ? declaredTotal : asset.bytes;
      if (!download.body) throw new Error('Model source returned no body');
      const writeAsset: WriteAsset = {
        bytes: total, fileName: asset.fileName, sha256: asset.sha256 || undefined,
        stagingKey: asset.sha256 ? undefined : `dl-${hashKey(sourceUrl)}`,
      };
      session = await this.#library.beginWrite(writeAsset);
      reader = download.body.getReader();
      const CHUNK = 4 * 1024 * 1024;
      let buffer = new Uint8Array(0);
      let received = 0;
      let written = 0;
      this.#emit({ sha256: progressKey, received, total, phase: 'downloading' });
      for (;;) {
        controller.signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        touch();
        received += value.byteLength;
        if (received > total) throw new Error('Model source exceeded its declared size');
        const merged = concat(buffer, value);
        let consumed = 0;
        while (consumed + CHUNK <= merged.byteLength) {
          controller.signal.throwIfAborted();
          await session.write(written, merged.subarray(consumed, consumed + CHUNK));
          written += CHUNK;
          consumed += CHUNK;
        }
        buffer = merged.slice(consumed);
        this.#emit({ sha256: progressKey, received, total, phase: 'downloading' });
      }
      controller.signal.throwIfAborted();
      if (received !== total) throw new Error(`Stream ended at ${received}/${total} bytes`);
      if (buffer.byteLength) await session.write(written, buffer);
      clearTimeout(deadline!);
      this.#emit({ sha256: progressKey, received, total, phase: 'verifying' });
      const committed = await session.finish();
      const identity: ModelAsset = { sha256: committed.sha256, bytes: committed.bytes, fileName: asset.fileName };
      const ready = await this.#library.lookup(identity);
      return ready.kind === 'ready' ? { ...ready, asset: identity } : ready;
    } catch (error) {
      await session?.abort().catch(() => undefined);
      throw error;
    } finally {
      clearTimeout(deadline!);
      await reader?.cancel().catch(() => undefined);
      reader?.releaseLock();
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
