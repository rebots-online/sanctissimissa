import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PERICOPES, SCENARIO_CLUSTERS } from '../src/core/ontology/parallels.ts';
// @ts-expect-error — plain .mjs module (BOOK_MAP is the Bible-plane vocabulary source)
import { BOOK_MAP } from '../scripts/ingest-bible.mjs';

type BookRow = { key: string; dr: string; vul: string | null; nt: boolean };
const books = BOOK_MAP as BookRow[];
const bookKeys = new Set(books.map((b) => b.key));
const clusterIds = new Set(SCENARIO_CLUSTERS.map((c) => c.id));

const REF_RE = /^\d+:\d+(-\d+)?$/;

test('every pericope ref parses <chapter>:<verseStart>[-<verseEnd>]', () => {
  for (const p of PERICOPES) {
    const entries = Object.entries(p.refs);
    assert.ok(entries.length > 0, `${p.id} has no refs`);
    for (const [book, ref] of entries) {
      assert.match(ref as string, REF_RE, `${p.id} ${book} ref "${ref}" malformed`);
      const m = (ref as string).match(/^(\d+):(\d+)(?:-(\d+))?$/)!;
      if (m[3]) {
        assert.ok(Number(m[3]) >= Number(m[2]), `${p.id} ${book} ref "${ref}" verseEnd < verseStart`);
      }
    }
  }
});

test('every pericope book key exists in BOOK_MAP', () => {
  for (const p of PERICOPES) {
    for (const book of Object.keys(p.refs)) {
      assert.ok(bookKeys.has(book), `${p.id}: book key "${book}" not in BOOK_MAP`);
    }
  }
});

test('every referenced cluster id exists in SCENARIO_CLUSTERS', () => {
  assert.equal(SCENARIO_CLUSTERS.length, 8);
  for (const p of PERICOPES) {
    assert.ok(clusterIds.has(p.cluster), `${p.id}: cluster "${p.cluster}" not in SCENARIO_CLUSTERS`);
  }
});

test('pericope ids are unique and the spine has ≥50 entries', () => {
  const ids = new Set(PERICOPES.map((p) => p.id));
  assert.equal(ids.size, PERICOPES.length, 'duplicate pericope id');
  assert.ok(PERICOPES.length >= 50, `only ${PERICOPES.length} pericopes`);
});

test('at least one pericope spans all four Gospels (Feeding of the 5000)', () => {
  const fourfold = PERICOPES.filter(
    (p) => p.refs.Matt && p.refs.Marc && p.refs.Luc && p.refs.Joann,
  );
  assert.ok(fourfold.length >= 1);
  assert.ok(fourfold.some((p) => p.id === 'feeding-5000'), 'feeding-5000 must be fourfold');
});

test('spot-check: pericope refs resolve to real Douay-Rheims verses', () => {
  const dr = JSON.parse(
    readFileSync(resolve('VENDORED/douay-rheims/EntireBible-DR.json'), 'utf8'),
  ) as Record<string, Record<string, Record<string, string>>>;
  const drName = new Map(books.map((b) => [b.key, b.dr]));

  const spot = ['feeding-5000', 'transfiguration', 'prodigal-son'];
  for (const id of spot) {
    const p = PERICOPES.find((x) => x.id === id);
    assert.ok(p, `${id} missing from PERICOPES`);
    for (const [book, ref] of Object.entries(p!.refs)) {
      const m = (ref as string).match(/^(\d+):(\d+)(?:-(\d+))?$/)!;
      const chapter = dr[drName.get(book)!]?.[m[1]];
      assert.ok(chapter, `${id}: ${book} ${m[1]} — chapter missing from DR`);
      const vs = Number(m[2]);
      const ve = Number(m[3] ?? m[2]);
      assert.ok(chapter[String(vs)], `${id}: ${book} ${ref} — verseStart missing`);
      assert.ok(chapter[String(ve)], `${id}: ${book} ${ref} — verseEnd missing`);
    }
  }

  // The Transfiguration follows Vulgate/DR numbering: Marc 9:1, not KJV 9:2.
  const transfig = PERICOPES.find((x) => x.id === 'transfiguration')!;
  assert.equal(transfig.refs.Marc, '9:1-9');
  assert.match(dr.Mark['9']['1'], /after six days/i);
});
