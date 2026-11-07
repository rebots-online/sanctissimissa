/**
 * Reader sections for a purchased edition (§L.5; DOCS/ARCHITECTURE/
 * L-bookstore-ui-20261106.md §1 `#book-reader-host`, §4 `editionSections`).
 *
 * The rows are the attached Catena module's pericopes in the base corpus
 * (`commentary:catena-aurea/<Book>/<ch>/<verseStart>`, attached by BA.2), read
 * through BA.14's public `CorpusDb.sqlRows`. Each block becomes one
 * `ReaderSection` for the existing SectionReader, so highlights, margin notes
 * and the selection menu stay on the one annotation pipeline.
 *
 * A failed query (module not attached, pre-BA.14 tree) yields `[]` / `null`,
 * never a throw.
 */

import type { CorpusDb } from '../data/corpusDb.ts';
import type { ReaderSection } from '../../ui/SectionReader.tsx';
import { BOOK_ORDER, CATENA_EDITION_ID, chapterLabel, isBook, parseChapterKey, type Book } from './moduleKeys.ts';

const PERICOPE_RE = /^commentary:catena-aurea\/([A-Za-z]+)\/(\d+)\/(\d+)$/;

interface PericopeRow {
  key: string;
  title: string;
  book: Book;
  keyCh: number;
  verseStart: number;
  chapterFile: number;
  ord: number;
  english: string | null;
}

function parseMeta(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toRow(r: Record<string, unknown>): PericopeRow | null {
  const key = String(r.key ?? '');
  const m = PERICOPE_RE.exec(key);
  if (!m || !isBook(m[1])) return null;
  const meta = parseMeta(r.meta);
  const keyCh = Number(m[2]);
  const cf = Number(meta.chapterFile);
  const ord = Number(meta.ord);
  return {
    key,
    title: String(r.title ?? ''),
    book: m[1],
    keyCh,
    verseStart: Number(m[3]),
    chapterFile: Number.isInteger(cf) && cf > 0 ? cf : keyCh,
    ord: Number.isFinite(ord) ? ord : Number.MAX_SAFE_INTEGER,
    english: r.english == null ? null : String(r.english),
  };
}

function rows(db: CorpusDb, sql: string, params: unknown[]): Record<string, unknown>[] {
  try {
    return db.sqlRows(sql, params);
  } catch {
    return [];
  }
}

export function editionSections(db: CorpusDb, editionId: string, chapterKey: string): ReaderSection[] {
  if (editionId !== CATENA_EDITION_ID) return [];
  const parsed = parseChapterKey(chapterKey);
  if (!parsed) return [];
  const blocks = rows(
    db,
    "SELECT n.key, n.title, n.meta, tb.english FROM nodes n JOIN text_blocks tb ON tb.node_id = n.id WHERE n.kind = 'commentary' AND n.key LIKE ?",
    [`commentary:catena-aurea/${parsed.book}/%`],
  )
    .map(toRow)
    .filter((r): r is PericopeRow => r !== null && r.chapterFile === parsed.chapter)
    .sort((a, b) => a.ord - b.ord || a.verseStart - b.verseStart);
  return blocks.map((b, i) => ({
    anchor: `book:${CATENA_EDITION_ID}#${b.book}/${b.keyCh}/${b.verseStart}`,
    nodeKey: `commentary:catena-aurea/${b.book}/${b.keyCh}/${b.verseStart}`,
    title: i === 0 ? chapterLabel(chapterKey) : `${b.keyCh}:${b.verseStart}`,
    meta: 'Catena Aurea',
    latin: null,
    english: b.english,
  }));
}

/** Non-empty chapter lists per corpus instance (an attached module does not detach without a reload). */
const chapterCache = new WeakMap<CorpusDb, string[]>();

/** Distinct chapterKeys present in the attached rows: Matt, Marc, Luc, Joann, then chapter ascending. */
export function editionChapters(db: CorpusDb, editionId: string): string[] {
  if (editionId !== CATENA_EDITION_ID) return [];
  const cached = chapterCache.get(db);
  if (cached) return cached;
  const seen = new Set<string>();
  const keys: { book: Book; chapter: number }[] = [];
  for (const r of rows(
    db,
    "SELECT n.key, n.title, n.meta, NULL AS english FROM nodes n WHERE n.kind = 'commentary' AND n.key LIKE ?",
    ['commentary:catena-aurea/%'],
  )) {
    const row = toRow(r);
    if (!row) continue;
    const ck = `${row.book}/${row.chapterFile}`;
    if (seen.has(ck) || !parseChapterKey(ck)) continue;
    seen.add(ck);
    keys.push({ book: row.book, chapter: row.chapterFile });
  }
  const out = keys
    .sort((a, b) => BOOK_ORDER.indexOf(a.book) - BOOK_ORDER.indexOf(b.book) || a.chapter - b.chapter)
    .map((k) => `${k.book}/${k.chapter}`);
  if (out.length > 0) chapterCache.set(db, out);
  return out;
}

/** The lowest-id `verse:` node a pericope COMMENTS_ON, or null. */
export function blockVerse(db: CorpusDb, nodeKey: string): string | null {
  const r = rows(
    db,
    "SELECT v.key FROM edges e JOIN nodes c ON c.id = e.src JOIN nodes v ON v.id = e.dst WHERE e.rel = 'COMMENTS_ON' AND c.key = ? ORDER BY v.id LIMIT 1",
    [nodeKey],
  );
  const key = r[0]?.key;
  return typeof key === 'string' && key.startsWith('verse:') ? key : null;
}
