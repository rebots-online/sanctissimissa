/**
 * CP.3 shared model library — platform backends (§7.8.4).
 *
 * web    : OPFS under the per-origin scope; content is staged, digested
 *          streamingly, and published under the proven digest; persistence
 *          is requested and quota checked; Web Locks serialize same-origin
 *          writers (the only writers a browser origin has).
 * desktop: the Tauri shell owns the real filesystem under the decision-22
 *          root — commands `model_lookup/model_begin/model_chunk/model_finish/
 *          model_remove(_staging)/model_lock/model_unlock`; Rust hashes the
 *          file at commit, so a corrupted or truncated artifact can never
 *          resolve `ready`.
 */

import type { LookupResult, ModelAsset, ModelLibrary, WriteAsset, WriteSession } from './types.ts';

type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

/** Store layout under the resolved decision-22 root. */
export const STORE_LAYOUT = 'models/sha256';

export function digestDirPath(sha256: string): string {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error(`Invalid content digest: ${sha256}`);
  return `${STORE_LAYOUT}/${sha256}`;
}

export function validateAsset(asset: ModelAsset): void {
  if (!/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Invalid content digest: ${asset.sha256}`);
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 0) throw new Error('Invalid byte count');
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(asset.fileName)) throw new Error(`Invalid file name: ${asset.fileName}`);
}

function validateWrite(asset: WriteAsset): void {
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) throw new Error('Invalid byte count');
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(asset.fileName)) throw new Error(`Invalid file name: ${asset.fileName}`);
  if (asset.sha256 && !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Invalid content digest: ${asset.sha256}`);
}

function safeKey(key: string): string {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(key)) throw new Error(`Invalid staging key: ${key}`);
  return key;
}

/* ------------------------------------------------------------------ desktop */

export class DesktopModelLibrary implements ModelLibrary {
  #invoke: TauriInvoke;
  #scopeDir: string | null;
  #progressCbs = new Set<(key: string, received: number, total: number) => void>();

  constructor(invoke: TauriInvoke, scopeDir: string | null) {
    this.#invoke = invoke;
    this.#scopeDir = scopeDir;
  }

  onProgress(cb: (key: string, received: number, total: number) => void): void {
    this.#progressCbs.add(cb);
  }

  #emit(key: string, received: number, total: number): void {
    for (const cb of this.#progressCbs) cb(key, received, total);
  }

  /** Rust holds the OS lockfile for the duration of `model_lock`. */
  async lock<T>(key: string, run: () => Promise<T>): Promise<T> {
    const token = (await this.#invoke('model_lock', {
      key,
      scope_dir: this.#scopeDir,
      ttl_ms: 30 * 60_000,
    })) as string;
    try {
      return await run();
    } finally {
      await this.#invoke('model_unlock', { token }).catch(() => undefined);
    }
  }

  async lookup(asset: ModelAsset): Promise<LookupResult> {
    validateAsset(asset);
    const result = (await this.#invoke('model_lookup', {
      sha256: asset.sha256,
      bytes: asset.bytes,
      file_name: asset.fileName,
      scope_dir: this.#scopeDir,
    })) as { kind: string; reason?: string; path?: string };
    switch (result.kind) {
      case 'ready':
        return { kind: 'ready', locator: result.path ?? '' };
      case 'missing':
      case 'needs-grant':
      case 'unavailable':
      case 'corrupt':
        return { kind: result.kind, reason: result.reason ?? '' } as LookupResult;
      default:
        return { kind: 'unavailable', reason: `Unknown library answer: ${String(result.kind)}` };
    }
  }

  async beginWrite(asset: WriteAsset): Promise<WriteSession> {
    validateWrite(asset);
    const key = asset.sha256 || asset.stagingKey || fail('staging key required');
    const progressKey = key;
    await this.#invoke('model_begin', {
      key: safeKey(key),
      file_name: asset.fileName,
      scope_dir: this.#scopeDir,
    });
    let offset = 0;
    return {
      write: async (_offset, chunk) => {
        await this.#invoke('model_chunk', { key: safeKey(key), offset, bytes: Array.from(chunk) });
        offset += chunk.byteLength;
        this.#emit(progressKey, offset, asset.bytes);
      },
      finish: async () => {
        const ok = (await this.#invoke('model_finish', {
          key: safeKey(key),
          expected_bytes: asset.bytes,
          expected_sha256: asset.sha256 || null,
        })) as { verified: boolean; reason?: string; sha256?: string; bytes?: number };
        if (!ok.verified) throw new Error(ok.reason ?? 'Commit verification failed');
        return { sha256: ok.sha256 ?? asset.sha256 ?? '', bytes: ok.bytes ?? asset.bytes };
      },
      abort: async () => {
        await this.#invoke('model_remove_staging', { key: safeKey(key), scope_dir: this.#scopeDir }).catch(
          () => undefined,
        );
      },
    };
  }

  async remove(sha256: string): Promise<void> {
    await this.#invoke('model_remove', { sha256, scope_dir: this.#scopeDir });
  }
}

function fail(reason: string): never {
  throw new Error(reason);
}

/* ---------------------------------------------------------------------- web */

/** Minimal streaming SHA-256 — incremental, so multi-GB files never buffer. */
export class StreamingSha256 {
  #h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  #buffer = new Uint8Array(64);
  #bufferLen = 0;
  #length = 0;
  #w = new Uint32Array(64);

  update(data: Uint8Array): this {
    this.#length += data.byteLength;
    let offset = 0;
    if (this.#bufferLen > 0) {
      const take = Math.min(64 - this.#bufferLen, data.byteLength);
      this.#buffer.set(data.subarray(0, take), this.#bufferLen);
      this.#bufferLen += take;
      offset = take;
      if (this.#bufferLen === 64) {
        this.#block(this.#buffer);
        this.#bufferLen = 0;
      }
    }
    while (offset + 64 <= data.byteLength) {
      this.#block(data.subarray(offset, offset + 64));
      offset += 64;
    }
    if (offset < data.byteLength) {
      this.#buffer.set(data.subarray(offset), 0);
      this.#bufferLen = data.byteLength - offset;
    }
    return this;
  }

  hex(): string {
    const padLen = this.#bufferLen < 56 ? 64 : 128;
    const tail = new Uint8Array(padLen - this.#bufferLen);
    tail[0] = 0x80;
    const bits = this.#length * 8;
    new DataView(tail.buffer).setUint32(tail.byteLength - 4, bits >>> 0);
    new DataView(tail.buffer).setUint32(tail.byteLength - 8, Math.floor(bits / 2 ** 32));
    const full = new Uint8Array(this.#bufferLen + tail.byteLength);
    full.set(this.#buffer.subarray(0, this.#bufferLen), 0);
    full.set(tail, this.#bufferLen);
    for (let i = 0; i < full.byteLength; i += 64) this.#block(full.subarray(i, i + 64));
    return [...this.#h].map((x) => x.toString(16).padStart(8, '0')).join('');
  }

  #block(block: Uint8Array): void {
    const w = this.#w;
    const dv = new DataView(block.buffer, block.byteOffset, 64);
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = this.#h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    this.#h[0] = (this.#h[0] + a) >>> 0;
    this.#h[1] = (this.#h[1] + b) >>> 0;
    this.#h[2] = (this.#h[2] + c) >>> 0;
    this.#h[3] = (this.#h[3] + d) >>> 0;
    this.#h[4] = (this.#h[4] + e) >>> 0;
    this.#h[5] = (this.#h[5] + f) >>> 0;
    this.#h[6] = (this.#h[6] + g) >>> 0;
    this.#h[7] = (this.#h[7] + h) >>> 0;
  }
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export class WebModelLibrary implements ModelLibrary {
  #root: Promise<FileSystemDirectoryHandle> | null = null;
  #progressCbs = new Set<(key: string, received: number, total: number) => void>();

  onProgress(cb: (key: string, received: number, total: number) => void): void {
    this.#progressCbs.add(cb);
  }

  #emit(key: string, received: number, total: number): void {
    for (const cb of this.#progressCbs) cb(key, received, total);
  }

  async #ensureRoot(): Promise<FileSystemDirectoryHandle> {
    this.#root ??= (async () => {
      if (typeof navigator === 'undefined' || !('storage' in navigator)) {
        throw new Error('OPFS unavailable — the shared model library needs a modern browser');
      }
      await navigator.storage?.persist?.().catch(() => undefined);
      const quota = await navigator.storage?.estimate?.().catch(() => null);
      if (quota && (quota.quota ?? 0) < 1024 ** 3) {
        // Advisory only (guide §14.4) — surfaced, not fatal.
        console.warn('model-store: reported quota under 1 GiB');
      }
      return navigator.storage.getDirectory();
    })();
    return this.#root;
  }

  async lock<T>(key: string, run: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && (navigator as { locks?: unknown }).locks) {
      return (navigator as unknown as {
        locks: { request(name: string, cb: () => Promise<T>): Promise<T> };
      }).locks.request(`sam-model:${key}`, run);
    }
    return run();
  }

  async lookup(asset: ModelAsset): Promise<LookupResult> {
    validateAsset(asset);
    try {
      const root = await this.#ensureRoot();
      const dir = await mkdirChain(root, ['models', 'sha256', asset.sha256]);
      await dir.getFileHandle('.complete');
      const metaFile = await dir.getFileHandle('meta.json');
      const meta = JSON.parse(await metaFile.getFile().then((f) => f.text())) as {
        bytes: number;
        fileName: string;
      };
      if (meta.bytes !== asset.bytes || meta.fileName !== asset.fileName) {
        return { kind: 'corrupt', reason: 'Digest directory holds different content metadata' };
      }
      return { kind: 'ready', locator: `opfs://${digestDirPath(asset.sha256)}/${asset.fileName}` };
    } catch {
      return { kind: 'missing' };
    }
  }

  async beginWrite(asset: WriteAsset): Promise<WriteSession> {
    validateWrite(asset);
    const key = asset.sha256 || asset.stagingKey || fail('staging key required');
    const root = await this.#ensureRoot();
    const stagingRoot = await mkdirChain(root, ['models', 'staging']);
    const dir = await stagingRoot.getDirectoryHandle(safeKey(key), { create: true });
    const handle = await dir.getFileHandle(asset.fileName, { create: true });
    const writable = await handle.createWritable();
    const digest = new StreamingSha256();
    let received = 0;
    return {
      write: async (offset, chunk) => {
        if (offset !== received) throw new Error(`Out-of-order write at ${offset} (expected ${received})`);
        await writable.write({ type: 'write', position: offset, data: chunk as Uint8Array<ArrayBuffer> });
        digest.update(chunk);
        received += chunk.byteLength;
        this.#emit(key, received, asset.bytes);
      },
      finish: async () => {
        await writable.close();
        const actual = digest.hex();
        if (asset.sha256 && actual !== asset.sha256) {
          await stagingRoot.removeEntry(safeKey(key), { recursive: true }).catch(() => undefined);
          throw new Error(`Digest mismatch after commit: got ${actual.slice(0, 12)}…`);
        }
        if (received !== asset.bytes) {
          throw new Error(`Byte count mismatch after commit: ${received}/${asset.bytes}`);
        }
        // Publish immutably under the proven digest.
        const published = await mkdirChain(root, ['models', 'sha256', actual]);
        await moveHandle(handle, published, asset.fileName);
        const wmeta = await (await published.getFileHandle('meta.json', { create: true })).createWritable();
        await wmeta.write(JSON.stringify({ bytes: received, fileName: asset.fileName, completeAt: Date.now() }));
        await wmeta.close();
        const wmark = await (await published.getFileHandle('.complete', { create: true })).createWritable();
        await wmark.write(String(Date.now()));
        await wmark.close();
        await stagingRoot.removeEntry(safeKey(key), { recursive: true }).catch(() => undefined);
        return { sha256: actual, bytes: received };
      },
      abort: async () => {
        await stagingRoot.removeEntry(safeKey(key), { recursive: true }).catch(() => undefined);
      },
    };
  }

  async remove(sha256: string): Promise<void> {
    const root = await this.#ensureRoot();
    const parent = await mkdirChain(root, ['models', 'sha256']);
    await parent.removeEntry(sha256, { recursive: true }).catch(() => undefined);
  }
}

async function mkdirChain(
  root: FileSystemDirectoryHandle,
  parts: string[],
): Promise<FileSystemDirectoryHandle> {
  let dir = root;
  for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
  return dir;
}

/** Chromium supports FileSystemFileHandle.move; fall back to chunked copy. */
async function moveHandle(
  handle: FileSystemFileHandle,
  targetDir: FileSystemDirectoryHandle,
  fileName: string,
): Promise<void> {
  const mover = handle as FileSystemFileHandle & {
    move?: (dirOrName?: FileSystemDirectoryHandle | string, newName?: string) => Promise<void>;
  };
  if (typeof mover.move === 'function') {
    await mover.move(targetDir, fileName);
    return;
  }
  const source = await handle.getFile();
  const target = await (await targetDir.getFileHandle(fileName, { create: true })).createWritable();
  const reader = source.stream().getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    await target.write(value);
  }
  await target.close();
}

export type { ModelLibrary };
