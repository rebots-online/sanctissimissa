/**
 * CL.3 focused tests — CompanionMemory: assemble / recall / distill (§H.2).
 * Plain Node, no network, no DOM: the sidecar handle is a fresh in-memory
 * sql.js database created from the verbatim sidecar schema.
 *
 * Run: node --experimental-strip-types --test tests/companionMemory.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Database } from 'sql.js';
import { SIDECAR_SCHEMA_SQL_V2 } from '../src/core/accompaniment/store.ts';
import { CompanionMemory } from '../src/core/companion/memory.ts';
import { embedText, EMBED_DIM } from '../src/core/vector/embed.ts';

async function openSidecar(): Promise<Database> {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(SIDECAR_SCHEMA_SQL_V2);
  return db;
}

function selectAll(db: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as never);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
    return rows;
  } finally {
    stmt.free();
  }
}

function plantLore(
  db: Database,
  rows: { id: string; kind: string; body: string; at: string }[],
): void {
  for (const r of rows) {
    db.run('INSERT INTO lore (id, device_id, updated_at, kind, body_md) VALUES (?, ?, ?, ?, ?)', [
      r.id,
      'test-device',
      r.at,
      r.kind,
      r.body,
    ] as never);
  }
}

function plantEmbedding(db: Database, refId: string, text: string): void {
  const vec = embedText(text);
  db.run('INSERT OR REPLACE INTO sidecar_embeddings (ref_id, dim, vec) VALUES (?, ?, ?)', [
    refId,
    EMBED_DIM,
    new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength),
  ] as never);
}

function journeyRows(db: Database): { id: string; body: string }[] {
  return selectAll(db, "SELECT id, body_md FROM lore WHERE kind = 'journey' ORDER BY rowid").map(
    (r) => ({ id: String(r.id), body: String(r.body_md) }),
  );
}

function embeddingOf(db: Database, refId: string): Int8Array | null {
  const rows = selectAll(db, 'SELECT vec FROM sidecar_embeddings WHERE ref_id = ?', [refId]);
  if (!rows.length) return null;
  const v = rows[0].vec as Uint8Array;
  return new Int8Array(v.buffer, v.byteOffset, v.byteLength);
}

function countEmbeddings(db: Database): number {
  return Number(selectAll(db, 'SELECT COUNT(*) AS n FROM sidecar_embeddings')[0].n);
}

/* --------------------------------- assemble --------------------------------- */

test('assemble: no lore renders an empty string (no block)', async () => {
  const db = await openSidecar();
  const cm = new CompanionMemory(db);
  assert.equal(cm.assemble({ view: 'office', date: '2026-09-19', focus: null }), '');
});

test('assemble: planted lore surfaces under the heading, newest-last, kind-marked', async () => {
  const db = await openSidecar();
  plantLore(db, [
    { id: 'l1', kind: 'journey', body: 'First lore', at: '2026-09-01T00:00:00.000Z' },
    { id: 'l2', kind: 'parish', body: 'Second lore', at: '2026-09-02T00:00:00.000Z' },
    { id: 'l3', kind: 'persona', body: 'Third lore', at: '2026-09-03T00:00:00.000Z' },
  ]);
  const cm = new CompanionMemory(db);
  const block = cm.assemble({ view: 'map', date: '2026-09-19', focus: 'canon' });
  assert.ok(block.startsWith('## Companion lore\n'));
  assert.ok(block.includes('- [journey] First lore'));
  assert.ok(block.includes('- [parish] Second lore'));
  assert.ok(block.includes('- [persona] Third lore'));
  const i1 = block.indexOf('First lore');
  const i2 = block.indexOf('Second lore');
  const i3 = block.indexOf('Third lore');
  assert.ok(i1 !== -1 && i2 !== -1 && i3 !== -1);
  assert.ok(i1 < i2 && i2 < i3, 'rows render oldest-first so the newest reads last');
});

test('assemble: each row body is capped at 400 chars', async () => {
  const db = await openSidecar();
  plantLore(db, [
    { id: 'long', kind: 'persona', body: 'y'.repeat(1000), at: '2026-09-01T00:00:00.000Z' },
  ]);
  const cm = new CompanionMemory(db);
  const block = cm.assemble({ view: 'settings', date: '2026-09-19', focus: null });
  const lines = block.split('\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[1], `- [persona] ${'y'.repeat(400)}`);
});

test('assemble: block stays at most 4000 chars, dropping the oldest rows first', async () => {
  const db = await openSidecar();
  plantLore(
    db,
    Array.from({ length: 30 }, (_, i) => ({
      id: `l${String(i).padStart(2, '0')}`,
      kind: 'journey',
      body: `row ${String(i).padStart(2, '0')} ${'z'.repeat(350)}`,
      at: `2026-09-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    })),
  );
  const cm = new CompanionMemory(db);
  const block = cm.assemble({ view: 'reader', date: '2026-09-19', focus: null });
  assert.ok(block.length <= 4000, `block length was ${block.length}`);
  assert.ok(block.includes('row 29'), 'newest row is kept');
  assert.ok(!block.includes('row 00'), 'oldest row is dropped for budget');
});

/* ---------------------------------- recall ---------------------------------- */

test('recall: the planted match ranks first with cosine scores', async () => {
  const db = await openSidecar();
  plantEmbedding(db, 'alpha', 'How do I pray the Breviary each day?');
  plantEmbedding(db, 'beta', 'parish picnic planning checklist');
  const cm = new CompanionMemory(db);
  const hits = cm.recall('How do I pray the Breviary each day?');
  assert.equal(hits.length, 2);
  assert.deepEqual(Object.keys(hits[0]).sort(), ['refId', 'score']);
  assert.equal(hits[0].refId, 'alpha');
  assert.ok(hits[0].score > 0.99, 'deterministic self-match is near 1');
  assert.equal(hits[1].refId, 'beta');
  assert.ok(hits[1].score < hits[0].score);
});

test('recall: k defaults to 5 and is honored', async () => {
  const db = await openSidecar();
  for (let i = 0; i < 7; i++) plantEmbedding(db, `ref-${i}`, `seed text number ${i}`);
  const cm = new CompanionMemory(db);
  assert.equal(cm.recall('seed text').length, 5);
  assert.equal(cm.recall('seed text', 3).length, 3);
  assert.deepEqual(cm.recall('seed text', 0), []);
});

/* ---------------------------------- distill --------------------------------- */

test('distill: writes one journey lore row with the answer capped at 600 chars plus its embedding', async () => {
  const db = await openSidecar();
  const cm = new CompanionMemory(db);
  await cm.distill({ question: 'How do I find the Canon during Mass?', answer: 'a'.repeat(700) });
  const rows = journeyRows(db);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].body, `Q: How do I find the Canon during Mass?\nA: ${'a'.repeat(600)}`);
  const vec = embeddingOf(db, rows[0].id);
  assert.ok(vec, 'embedding row written under the lore row id');
  assert.equal(vec.length, EMBED_DIM);
  assert.deepEqual(Array.from(vec), Array.from(embedText(rows[0].body)));
});

test('distill: the distilled turn surfaces in assemble and its match ranks first in recall', async () => {
  const db = await openSidecar();
  plantEmbedding(db, 'distractor', 'parish picnic planning checklist');
  const cm = new CompanionMemory(db);
  await cm.distill({
    question: 'How do I find the Canon during Mass?',
    answer: 'Follow along after the Sanctus.',
  });
  const rows = journeyRows(db);
  assert.equal(rows.length, 1);
  const block = cm.assemble({ view: 'reader', date: '2026-09-19', focus: 'canon' });
  assert.ok(block.includes('Q: How do I find the Canon during Mass?'));
  const hits = cm.recall('How do I find the Canon during Mass?');
  assert.equal(hits[0].refId, rows[0].id, 'the distilled row is the planted match that ranks first');
  assert.equal(hits[1].refId, 'distractor');
});

test('distill: keeps at most 64 rows, pruning the oldest and their embeddings', async () => {
  const db = await openSidecar();
  const cm = new CompanionMemory(db);
  for (let i = 0; i < 66; i++) {
    await cm.distill({ question: `question ${i}`, answer: `answer ${i}` });
  }
  const rows = journeyRows(db);
  assert.equal(rows.length, 64);
  const bodies = new Set(rows.map((r) => r.body));
  assert.ok(!bodies.has('Q: question 0\nA: answer 0'), 'oldest row pruned');
  assert.ok(!bodies.has('Q: question 1\nA: answer 1'), 'second-oldest row pruned');
  assert.ok(bodies.has('Q: question 2\nA: answer 2'), 'oldest surviving row kept');
  assert.ok(bodies.has('Q: question 65\nA: answer 65'), 'newest row kept');
  assert.equal(countEmbeddings(db), 64, 'pruned rows leave no orphan embeddings');
});
