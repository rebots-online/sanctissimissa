/**
 * Sidecar vector queue (L-content-modules-search-20261106.md §2.10, §3.5).
 * Saves and distills only ENQUEUE text; a single-flight drain embeds due rows
 * in batches of 16 whenever an embedder is ready, writing `dim = 256` vectors.
 * `dim = 128` legacy rows are ignored by every reader. `migrateSidecarVectors`
 * enqueues every live note and lore row once (settings `vector.migrated.q3e256`).
 */

import type { Database } from 'sql.js';
import { cosine, EMBED_DIM } from '../vector/embed.ts';
import { activeEmbedder, isEmbedNotReady, onEmbedState } from '../vector/active.ts';
import type { SidecarDb } from './store.ts';
import { accompanimentEmbedText } from './store.ts';

/** §2.10 DDL verbatim. */
const PENDING_DDL = `
CREATE TABLE IF NOT EXISTS sidecar_embeddings_pending (
  ref_id TEXT PRIMARY KEY, source TEXT NOT NULL CHECK (source IN ('accompaniment','lore')),  -- Closed set, Phase L
  text TEXT NOT NULL, enqueued_at TEXT NOT NULL, embedded_at TEXT);                         -- due when embedded_at IS NULL OR < enqueued_at
`;

const MIGRATED_KEY = 'vector.migrated.q3e256';
const BATCH = 16;

export function ensureSidecarVectorSchema(db: Database): void {
  db.exec(PENDING_DDL);
}

function rows(db: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as never);
    const out: Record<string, unknown>[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as Record<string, unknown>);
    return out;
  } finally {
    stmt.free();
  }
}

/** Drain wiring per raw handle: the persist hook of the booted SidecarDb. */
const drains = new WeakMap<Database, { persist: () => Promise<void>; running: Promise<void> | null; again: boolean }>();

function upsert(db: Database, refId: string, source: 'accompaniment' | 'lore', text: string, now: string): void {
  ensureSidecarVectorSchema(db);
  db.run(
    `INSERT INTO sidecar_embeddings_pending (ref_id, source, text, enqueued_at, embedded_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(ref_id) DO UPDATE SET text = excluded.text, source = excluded.source, enqueued_at = excluded.enqueued_at`,
    [refId, source, text, now] as never,
  );
}

/** UPSERT one pending row (text, source, enqueued_at), then kick the drain. */
export function enqueueSidecarEmbedding(db: Database, refId: string, source: 'accompaniment' | 'lore', text: string): void {
  upsert(db, refId, source, text, new Date().toISOString());
  kick(db);
}

/** One-time legacy enqueue: every live accompaniment and every lore row lacking a dim=256 vector. */
export function migrateSidecarVectors(db: Database, sidecar: SidecarDb): number {
  if (sidecar.getSetting(MIGRATED_KEY)) return 0;
  const now = new Date().toISOString();
  let n = 0;
  for (const acc of sidecar.list()) {
    upsert(db, acc.id, 'accompaniment', accompanimentEmbedText(acc), now);
    n++;
  }
  for (const r of rows(
    db,
    `SELECT id, body_md FROM lore
     WHERE id NOT IN (SELECT ref_id FROM sidecar_embeddings WHERE dim = ${EMBED_DIM})`,
  )) {
    upsert(db, String(r.id), 'lore', String(r.body_md ?? ''), now);
    n++;
  }
  sidecar.setSetting(MIGRATED_KEY, now);
  return n;
}

async function drain(db: Database, persist: () => Promise<void>): Promise<void> {
  for (;;) {
    const embedder = activeEmbedder();
    if (!embedder) return;
    const due = rows(
      db,
      `SELECT ref_id, text, enqueued_at FROM sidecar_embeddings_pending
       WHERE embedded_at IS NULL OR embedded_at < enqueued_at ORDER BY enqueued_at, ref_id LIMIT ${BATCH}`,
    );
    if (due.length === 0) return;
    let vecs: Int8Array[];
    try {
      vecs = await embedder.embedDocs(due.map((r) => String(r.text)));
    } catch (e) {
      if (isEmbedNotReady(e)) return;
      throw e;
    }
    const done = new Date().toISOString();
    let wrote = 0;
    due.forEach((r, i) => {
      const v = vecs[i];
      if (!v) return;
      wrote++;
      db.run('INSERT OR REPLACE INTO sidecar_embeddings (ref_id, dim, vec) VALUES (?, ?, ?)', [
        String(r.ref_id),
        EMBED_DIM,
        new Uint8Array(v.buffer, v.byteOffset, v.byteLength),
      ] as never);
      // Only mark when no newer enqueue arrived while embedding.
      db.run('UPDATE sidecar_embeddings_pending SET embedded_at = ? WHERE ref_id = ? AND enqueued_at = ?', [
        done,
        String(r.ref_id),
        String(r.enqueued_at),
      ] as never);
    });
    await persist();
    if (wrote === 0) return; // no progress — wait for the next kick
  }
}

/** Start the single-flight drain for a booted handle (no-op before boot). */
function kick(db: Database): void {
  const d = drains.get(db);
  if (!d) return;
  if (d.running) {
    d.again = true; // an enqueue/state change arrived mid-drain: run once more after it
    return;
  }
  d.again = false;
  d.running = drain(db, d.persist)
    .catch((e: unknown) => console.warn('[sidecar-vectors]', e))
    .finally(() => {
      d.running = null;
      if (d.again) kick(db);
    });
}

/** The raw sql.js handle SidecarDb wraps (same feature-detect as ChatView.tsx `sidecarHandle`). */
export function sidecarRawHandle(sidecar: SidecarDb): Database | null {
  const handle = (sidecar as unknown as { db?: unknown }).db;
  return handle && typeof (handle as Database).prepare === 'function' ? (handle as Database) : null;
}

/** Migrate once, drain while an embedder is ready, re-drain on embed-state changes. */
export function bootSidecarVectors(sidecar: SidecarDb): () => void {
  const db = sidecarRawHandle(sidecar);
  if (!db) return () => undefined;
  ensureSidecarVectorSchema(db);
  drains.set(db, { persist: () => sidecar.persist(), running: null, again: false });
  if (migrateSidecarVectors(db, sidecar) > 0) void sidecar.persist().catch(() => undefined);
  kick(db);
  const off = onEmbedState(() => kick(db));
  return () => {
    off();
    drains.delete(db);
  };
}

/** Top-k notes/memories by meaning: `dim = 256` rows only, ties by id asc; no embedder → `[]`. */
export async function sidecarSimilar(db: Database, query: string, k: number): Promise<{ id: string; score: number }[]> {
  const embedder = activeEmbedder();
  if (!embedder || k <= 0) return [];
  let qv: Int8Array;
  try {
    qv = await embedder.embedQuery(query);
  } catch (e) {
    if (isEmbedNotReady(e)) return [];
    throw e;
  }
  return rows(db, `SELECT ref_id, vec FROM sidecar_embeddings WHERE dim = ${EMBED_DIM}`)
    .map((r) => ({ id: String(r.ref_id), score: cosine(qv, r.vec as Uint8Array) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, k);
}
