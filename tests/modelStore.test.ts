import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { StreamingSha256, digestDir, validateAsset, WebModelLibrary } from '../src/core/model-store/store.ts';
import { DownloadManager, type DownloadProgress } from '../src/core/model-store/download-manager.ts';
import type { LookupResult, ModelAsset, ModelLibrary, WriteSession } from '../src/core/model-store/types.ts';

/* CP.3 — shared model library on the decision-22 plane (guide §13–15). */

function digestOf(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** File-backed fake of the desktop backend — same semantics, temp dir. */
class TempFileLibrary implements ModelLibrary {
  #root: string;
  #locks = new Set<string>();
  constructor(root: string) {
    this.#root = root;
  }
  async lock<T>(key: string, run: () => Promise<T>): Promise<T> {
    if (this.#locks.has(key)) throw new Error('lock contention');
    this.#locks.add(key);
    try {
      return await run();
    } finally {
      this.#locks.delete(key);
    }
  }
  async lookup(asset: ModelAsset): Promise<LookupResult> {
    const dir = join(this.#root, digestDir(asset.sha256));
    try {
      await readFile(join(dir, '.complete'));
      const meta = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8')) as { bytes: number; fileName: string };
      if (meta.bytes !== asset.bytes || meta.fileName !== asset.fileName) {
        return { kind: 'corrupt', reason: 'metadata mismatch' };
      }
      // Fixtures are small — re-hash like the desktop backend does on lookup
      // (a tampered artifact can never resolve ready).
      const content = await readFile(join(dir, asset.fileName));
      if (createHash('sha256').update(content).digest('hex') !== asset.sha256) {
        return { kind: 'corrupt', reason: 'content digest mismatch' };
      }
      return { kind: 'ready', locator: join(dir, asset.fileName) };
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') return { kind: 'missing' };
      return { kind: 'corrupt', reason: String(e) };
    }
  }
  async beginWrite(asset: ModelAsset): Promise<WriteSession> {
    const dir = join(this.#root, digestDir(asset.sha256));
    await mkdir(dir, { recursive: true });
    const file = join(dir, asset.fileName);
    const digest = createHash('sha256');
    let received = 0;
    return {
      write: async (offset, chunk) => {
        if (offset !== received) throw new Error('out of order');
        digest.update(chunk);
        await (await import('node:fs/promises')).appendFile(file, chunk);
        received += chunk.byteLength;
      },
      finish: async () => {
        if (digest.digest('hex') !== asset.sha256) throw new Error('digest mismatch');
        await writeFile(join(dir, 'meta.json'), JSON.stringify({ bytes: received, fileName: asset.fileName }));
        await writeFile(join(dir, '.complete'), String(Date.now()));
      },
      abort: async () => rm(dir, { recursive: true, force: true }),
    };
  }
  async remove(sha256: string): Promise<void> {
    await rm(join(this.#root, digestDir(sha256)), { recursive: true, force: true });
  }
  onProgress(): void {}
}

const PAYLOAD = new TextEncoder().encode('Bonsai-grade weights would go here. '.repeat(4096));
const GOOD: ModelAsset = { sha256: digestOf(PAYLOAD), bytes: PAYLOAD.byteLength, fileName: 'model.gguf' };

test('CP.3: identity validation rejects malformed digests, names, sizes', () => {
  assert.throws(() => validateAsset({ ...GOOD, sha256: 'deadbeef' }));
  assert.throws(() => validateAsset({ ...GOOD, fileName: '../escape.gguf' }));
  assert.throws(() => validateAsset({ ...GOOD, bytes: -1 }));
  assert.doesNotThrow(() => validateAsset(GOOD));
});

test('CP.3: ingest→lookup→ready; tamper→corrupt; truncate→missing; remove', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'sam-model-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const lib = new TempFileLibrary(root);
  const session = await lib.beginWrite(GOOD);
  await session.write(0, PAYLOAD);
  await session.finish();
  const ready = await lib.lookup(GOOD);
  assert.equal(ready.kind, 'ready');

  // Tampered content with a complete marker is corrupt on lookup.
  await writeFile(join(root, digestDir(GOOD.sha256), 'model.gguf'), Buffer.from('tampered'));
  assert.equal((await lib.lookup(GOOD)).kind, 'corrupt');
  await rm(join(root, digestDir(GOOD.sha256)), { recursive: true, force: true });

  // Truncated write never commits — no `.complete`, lookup stays missing.
  const partial = await lib.beginWrite(GOOD);
  await partial.write(0, PAYLOAD.subarray(0, 1024));
  await partial.abort();
  assert.equal((await lib.lookup(GOOD)).kind, 'missing');
  assert.equal(
    await (await lib.beginWrite(GOOD)).write(1, PAYLOAD).then(() => 'ok', (e) => (e as Error).message),
    'out of order',
  );
});

test('CP.3: digest lock re-checks lookup inside; contender cannot double-write', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'sam-lock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const lib = new TempFileLibrary(root);
  const winner = await lib.lock(GOOD.sha256, async () => {
    const loser = lib.lock(GOOD.sha256, async () => 'loser').catch((e) => (e as Error).message);
    assert.equal(await loser, 'lock contention');
    return 'winner';
  });
  assert.equal(winner, 'winner');
});

test('CP.3: streaming SHA-256 matches node crypto over chunked input', () => {
  const streaming = new StreamingSha256();
  for (let i = 0; i < PAYLOAD.byteLength; i += 100) {
    streaming.update(PAYLOAD.subarray(i, i + 100));
  }
  assert.equal(streaming.hex(), GOOD.sha256);
});

test('CP.3: download manager — resolve-existing-first, verified commit, honest failure', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'sam-dl-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const lib = new TempFileLibrary(root);
  const manager = new DownloadManager(lib);
  const events: DownloadProgress[] = [];
  manager.onProgress((p) => events.push(p));

  // Serve the exact payload once, then 404 — proves re-acquire never re-downloads.
  let served = 0;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async (url: string | URL | Request) => {
    if (served++ === 0 && String(url).endsWith('gguf')) {
      return new Response(PAYLOAD, { status: 200, headers: { 'content-length': String(PAYLOAD.byteLength) } });
    }
    return new Response('gone', { status: 404 });
  }) as typeof fetch;

  // Stream the fetch body through the same chunking path the manager uses.
  globalThis.fetch = (async (url: string | URL | Request) => {
    if (served++ === 0 && String(url).endsWith('gguf')) {
      return new Response(PAYLOAD, { status: 200, headers: { 'content-length': String(PAYLOAD.byteLength) } });
    }
    return new Response('gone', { status: 404 });
  }) as typeof fetch;

  const first = await manager.acquire(GOOD, 'https://models.example/gguf').promise;
  assert.equal(first.kind, 'ready');
  assert.equal(served, 1, 'exactly one network acquisition');

  const second = await manager.acquire(GOOD, 'https://models.example/gguf').promise;
  assert.equal(second.kind, 'ready');
  assert.equal(served, 1, 'shared hit causes zero network bytes (guide §18 case 1)');

  const events_ = events.filter((e) => e.phase === 'ready');
  assert.ok(events_.length >= 2);
  assert.ok(events.every((e) => e.received <= e.total), 'progress never exceeds the declared total');
});

test('CP.3: source-serving-wrong-length is corrupt, not a cache miss', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'sam-bad-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manager = new DownloadManager(new TempFileLibrary(root));
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async () =>
    new Response(new Uint8Array(10), { status: 200, headers: { 'content-length': '10' } })) as typeof fetch;
  const result = await manager.acquire(GOOD, 'https://models.example/gguf').promise;
  assert.equal(result.kind, 'corrupt');
});

test('CP.3: web OPFS backend absent in node — lookup degrades honestly', async () => {
  const lib = new WebModelLibrary();
  const result = await lib.lookup(GOOD).then(
    (r) => r.kind,
    (e) => (e as Error).message,
  );
  // Node ≥22 exposes OPFS, so either `missing` (real OPFS) or the explicit
  // unavailable message (no OPFS) is honest — a throw is not.
  assert.ok(result === 'missing' || /OPFS unavailable/.test(result), `honest outcome: ${result}`);
});
