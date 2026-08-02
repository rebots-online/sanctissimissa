/**
 * Bible plane (ingest Pass 4) — CHECKLIST BA.4.
 * Asserts against the committed assets/missal.db: canon shape, exact verse
 * text both languages, LXX psalm numbering, deuterocanonical honesty
 * (English-only where vul.tsv lacks the book), CITES edges.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const DB = 'assets/missal.db';
const present = existsSync(DB);
const db = present ? new DatabaseSync(DB, { readOnly: true }) : null;

function one(sql: string, ...params: unknown[]): Record<string, unknown> {
  return db!.prepare(sql).get(...(params as never[])) as Record<string, unknown>;
}

test('canon shape: 73 books, full chapter/verse graph', { skip: !present }, () => {
  assert.equal(Number(one("SELECT COUNT(*) c FROM nodes WHERE kind='book'").c), 73);
  const chapters = Number(one("SELECT COUNT(*) c FROM nodes WHERE kind='chapter'").c);
  const verses = Number(one("SELECT COUNT(*) c FROM nodes WHERE kind='verse'").c);
  assert.ok(chapters >= 1289 && chapters <= 1350, `chapters ${chapters}`);
  assert.ok(verses >= 35000 && verses <= 36500, `verses ${verses}`);
  // every chapter reachable from its book, every verse from its chapter
  assert.equal(Number(one("SELECT COUNT(*) c FROM edges WHERE rel='HAS_CHAPTER'").c), chapters);
  assert.equal(Number(one("SELECT COUNT(*) c FROM edges WHERE rel='HAS_VERSE'").c), verses);
});

test('known chapter counts', { skip: !present }, () => {
  for (const [book, n] of [['Gen', 50], ['Ps', 150], ['Matt', 28], ['Apoc', 22]] as const) {
    const c = Number(
      one(
        `SELECT COUNT(*) c FROM edges e JOIN nodes b ON b.id = e.src WHERE e.rel='HAS_CHAPTER' AND b.key = ?`,
        `book:${book}`,
      ).c,
    );
    assert.equal(c, n, `${book} chapters`);
  }
});

test('Gen 1:1 exact text, both languages', { skip: !present }, () => {
  const r = one(
    `SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = 'verse:Gen/1/1'`,
  );
  assert.equal(r.latin, 'In principio creavit Deus caelum et terram.');
  assert.equal(r.english, 'In the beginning God created heaven and earth.');
});

test('psalms use Vulgate/LXX numbering in both languages', { skip: !present }, () => {
  const r = one(
    `SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = 'verse:Ps/22/1'`,
  );
  assert.match(String(r.latin), /Dominus regit me/);
  assert.match(String(r.english), /Lord ruleth me/);
});

test('deuterocanonicals absent from vul.tsv are honestly English-only', { skip: !present }, () => {
  for (const book of ['Tob', 'Judith', 'Sap', 'Eccli', 'Bar']) {
    const r = one(
      `SELECT COUNT(*) c, COUNT(tb.latin) lat FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
       WHERE n.key LIKE ?`,
      `verse:${book}/%`,
    );
    assert.ok(Number(r.c) > 0, `${book} has verses`);
    assert.equal(Number(r.lat), 0, `${book} latin must be NULL (missing upstream)`);
  }
  // and a control: a vul-backed book has Latin throughout
  const gen = one(
    `SELECT COUNT(*) c, COUNT(tb.latin) lat FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key LIKE 'verse:Gen/%'`,
  );
  assert.equal(Number(gen.c), Number(gen.lat));
});

test('CITES edges link liturgy to scripture with quality meta', { skip: !present }, () => {
  const total = Number(one("SELECT COUNT(*) c FROM edges WHERE rel='CITES'").c);
  assert.ok(total > 10000, `CITES ${total}`);
  // a psalm-citing section resolves to psalm verses
  const r = one(
    `SELECT COUNT(*) c FROM edges e JOIN nodes s ON s.id = e.src JOIN nodes v ON v.id = e.dst
     WHERE e.rel='CITES' AND s.kind='section' AND v.key LIKE 'verse:Ps/%'`,
  );
  assert.ok(Number(r.c) > 1000, `psalm cites ${r.c}`);
  const meta = one(`SELECT meta FROM edges WHERE rel='CITES' LIMIT 1`);
  const parsed = JSON.parse(String(meta.meta));
  assert.ok(parsed.citation);
  assert.ok(parsed.quality === 'exact' || parsed.quality === 'adapted');
});

test('verses are searchable via FTS and carry embeddings', { skip: !present }, () => {
  const fts = one(
    `SELECT COUNT(*) c FROM search WHERE key LIKE 'verse:%' AND search MATCH '"in principio creavit"'`,
  );
  assert.ok(Number(fts.c) >= 1);
  const emb = Number(
    one(
      `SELECT COUNT(*) c FROM embeddings e JOIN nodes n ON n.id = e.node_id WHERE n.kind='verse'`,
    ).c,
  );
  assert.ok(emb >= 35000, `verse embeddings ${emb}`);
});

// ── BB.1 — CorpusDb Bible query surface (via the node adapter) ──────
import { openAdapter } from '../scripts/db-adapter.mjs';
import type { CorpusDb } from '../src/core/data/corpusDb.ts';

const adapter = () => openAdapter(DB) as unknown as CorpusDb;

test('getBooks: 73 books in canon order, deutero flagged Latin-less', { skip: !present }, () => {
  const a = adapter();
  const books = a.getBooks();
  assert.equal(books.length, 73);
  assert.equal(books[0].key, 'Gen');
  assert.equal(books[72].key, 'Apoc');
  assert.equal(books.find((b) => b.key === 'Sap')?.hasLatin, false);
  assert.equal(books.find((b) => b.key === 'Ps')?.chapters, 150);
});

test('getChapter: Gen 1 has 31 ordered bilingual verses', { skip: !present }, () => {
  const a = adapter();
  const ch = a.getChapter('Gen', 1);
  assert.equal(ch.length, 31);
  assert.equal(ch[0].nodeKey, 'verse:Gen/1/1');
  assert.match(String(ch[30].latin), /Viditque Deus cuncta quae fecerat/);
});

test('getVerseRange: Ps/22/1-3 returns three verses', { skip: !present }, () => {
  const a = adapter();
  const vs = a.getVerseRange('Ps/22/1-3');
  assert.equal(vs.length, 3);
  assert.match(String(vs[0].latin), /Dominus regit me/);
});

test('citationsOf + liturgyCitingChapter: liturgy↔scripture is bidirectional', { skip: !present }, () => {
  const a = adapter();
  const citing = a.liturgyCitingChapter('Ps', 22);
  assert.ok(citing.length > 0, 'Ps 22 is cited by the liturgy');
  const back = a.citationsOf(citing[0].sectionKey);
  assert.ok(back.some((c) => c.toKey.startsWith('verse:Ps/22/')));
});
