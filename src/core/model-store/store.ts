/**
 * CP.3 shared model library — platform backends (§7.8.4).
 *
 * web    : OPFS under the per-origin scope; writes via a streaming write
 *          handle; persistence requested, quota checked; Web Locks serialize
 *          same-origin writers (the only writers a browser origin has).
 * desktop: the Tauri shell owns the real filesystem under the decision-22
 *          root — commands `model_lookup/model_begin/model_chunk/model_finish/
 *          model_remove/model_lock`; Rust hashes the file at commit, so a
 *          corrupted or truncated artifact can never resolve `ready`.
 */

import type { LookupResult, ModelAsset, ModelLibrary, WriteSession } from './types.ts';

type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export const STORE_LAYOUT = 'models/sha256';

export function digestDir(sha256: string): string {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error(`Invalid content digest: ${sha256}`);
  return `${STORE_LAYOUT}/${sha256}`;
}

export function validateAsset(asset: ModelAsset): void {
  if (!/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Invalid content digest: ${asset.sha256}`);
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 0) throw new Error('Invalid byte count');
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(asset.fileName)) throw new Error(`Invalid file name: ${asset.fileName}`);
}

/* ------------------------------------------------------------------ desktop */

export class DesktopModelLibrary implements ModelLibrary {
  #invoke: TauriInvoke;
  #scopeDir: string | null;
  #progressCbs = new Set<(sha256: string, received: number, total: number) => void>();

  constructor(invoke: TauriInvoke, scopeDir: string | null) {
    this.#invoke = invoke;
    this.#scopeDir = scopeDir;
  }

  onProgress(cb: (sha256: string, received: number, total: number) => void): void {
    this.#progressCbs.add(cb);
  }

  #emit(sha256: string, received: number, total: number): void {
    for (const cb of this.#progressCbs) cb(sha256, received, total);
  }

  /** Rust holds the OS file lock for the duration of `model_lock`. */
  async lock<T>(key: string, run: () => Promise<T>): Promise<T> {
    const token = await this.#invoke('model_lock', { key, scope_dir: this.#scopeDir, ttl_ms: 30 * 60_000 });
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

  async beginWrite(asset: ModelAsset): Promise<WriteSession> {
    validateAsset(asset);
    await this.#invoke('model_begin', { sha256: asset.sha256, file_name: asset.fileName, scope_dir: this.#scopeDir });
    let offset = 0;
    return {
      write: async (_offset, chunk) => {
        await this.#invoke('model_chunk', {
          sha256: asset.sha256,
          offset,
          bytes: Array.from(chunk),
        });
        offset += chunk.byteLength;
        this.#emit(asset.sha256, offset, asset.bytes);
      },
      finish: async () => {
        const ok = (await this.#invoke('model_finish', { sha256: asset.sha256, expected_bytes: asset.bytes })) as {
          verified: boolean;
          reason?: string;
        };
        if (!ok.verified) throw new Error(ok.reason ?? 'Commit verification failed');
      },
      abort: async () => {
        await this.#invoke('model_remove', { sha256: asset.sha256, scope_dir: this.#scopeDir }).catch(() => undefined);
      },
    };
  }

  async remove(sha256: string): Promise<void> {
    await this.#invoke('model_remove', { sha256, scope_dir: this.#scopeDir });
  }
}

/* ---------------------------------------------------------------------- web */

/** Minimal streaming SHA-256 — incremental, so multi-GB files never buffer. */
export class StreamingSha256 {
  #h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
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
    // Padding + length, then big-endian hex of H.
    const tail = new Uint8Array(((this.#bufferLen < 56 ? 64 : 128) - this.#bufferLen));
    tail[0] = 0x80;
    const bits = this.#length * 8;
    new DataView(tail.buffer).setUint32(tail.byteLength - 4, bits >>> 0);
    new DataView(tail.buffer).setUint32(tail.byteLength - 8, Math.floor(bits / 2 ** 32));
    let last = this.#buffer.subarray(0, this.#bufferLen);
    const full = new Uint8Array(this.#bufferLen + tail.byteLength);
    full.set(last, 0);
    full.set(tail, this.#bufferLen);
    for (let i = 0; i < full.byteLength; i += 64) this.#block(full.subarray(i, i + 64));
    return [...this.#h].map((x) => x.toString(16).padStart(8, '0')).join('');
  }

  #block(block: Uint8Array): void {
    const w = this.#w;
    const dv = new DataView(block.buffer, block.byteOffset, 64);
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    const [a, b, c, d, e, f, g, h] = this.#h;
    let A = a, B = b, C = c, D = d, E = e, F = f, G = g, H = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7));
      const ch = (E & F) ^ (~E & G);
      const t1 = (H + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10));
      const mj = (A & B) ^ (A & C) ^ (B & C);
      const t2 = (S0 + mj) >>> 0;
      H = G; G = F; F = E; E = (D + t1) >>> 0; D = C; C = B; B = A; A = (t1 + t2) >>> 0;
    }
    this.#h[0] = (this.#h[0] + A) >>> 0;
    this.#h[1] = (this.#h[1] + B) >>> 0;
    this.#h[2] = (this.#h[2] + C) >>> 0;
    this.#h[3] = (this.#h[3] + D) >>> 0;
    this.#h[4] = (this.#h[4] + E) >>> 0;
    this.#h[5] = (this.#h[5] + F) >>> 0;
    this.#h[6] = (this.#h[6] + G) >>> 0;
    this.#h[7] = (this.#h[7] + H) >>> 0;
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
  #progressCbs = new Set<(sha256: string, received: number, total: number) => void>();

  onProgress(cb: (sha256: string, received: number, total: number) => void): void {
    this.#progressCbs.add(cb);
  }

  #emit(sha256: string, received: number, total: number): void {
    for (const cb of this.#progressCbs) cb(sha256, received, total);
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
      let dir = await navigator.storage.getDirectory();
      for (const part of digestDir('').split('/').filter(Boolean)) {
        dir = await dir.getDirectoryHandle(part, { create: true });
      }
      return dir;
    })();
    return this.#root;
  }

  async #digestDir(sha256: string, create = false): Promise<FileSystemDirectoryHandle> {
    const root = await this.#ensureRoot();
    return root.getDirectoryHandle(sha256, { create });
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
      const dir = await this.#digestDir(asset.sha256);
      const marker = await dir.getFileHandle('.complete');
      const meta = JSON.parse(await (await dir.getFileHandle('meta.json')).getFile().then((f) => f.text())) as {
        bytes: number;
        fileName: string;
      };
      if (meta.bytes !== asset.bytes || meta.fileName !== asset.fileName) {
        return { kind: 'corrupt', reason: 'Digest directory holds different content metadata' };
      }
      void marker;
      return { kind: 'ready', locator: `opfs://${digestDir(asset.sha256)}/${asset.fileName}` };
    } catch {
      return { kind: 'missing' };
    }
  }

  async beginWrite(asset: ModelAsset): Promise<WriteSession> {
    validateAsset(asset);
    const dir = await this.#digestDir(asset.sha256, true);
    const handle = await dir.getFileHandle(asset.fileName, { create: true });
    const writable = await handle.createWritable({ keepExistingData: true });
    const digest = new StreamingSha256();
    let received = 0;
    return {
      write: async (offset, chunk) => {
        if (offset !== received) throw new Error(`Out-of-order write at ${offset} (expected ${received})`);
        await writable.write({ type: 'write', position: offset, data: chunk as Uint8Array<ArrayBuffer> });
        digest.update(chunk);
        received += chunk.byteLength;
        this.#emit(asset.sha256, received, asset.bytes);
      },
      finish: async () => {
        await writable.close();
        const actual = digest.hex();
        if (actual !== asset.sha256 || received !== asset.bytes) {
          throw new Error(`Digest mismatch after commit: got ${actual.slice(0, 12)}… over ${received} bytes`);
        }
        const wmeta = await (await dir.getFileHandle('meta.json', { create: true })).createWritable();
        await wmeta.write(JSON.stringify({ bytes: asset.bytes, fileName: asset.fileName, completeAt: Date.now() }));
        await wmeta.close();
        const wmark = await (await dir.getFileHandle('.complete', { create: true })).createWritable();
        await wmark.write(String(Date.now()));
        await wmark.close();
      },
      abort: async () => {
        await writable.abort?.().catch(() => undefined);
        await this.remove(asset.sha256).catch(() => undefined);
      },
    };
  }

  async remove(sha256: string): Promise<void> {
    await this.#digestDir(sha256).then((dir) => dir.removeEntry(sha256, { recursive: true })).catch(() => undefined);
  }
}

export type { ModelLibrary };
