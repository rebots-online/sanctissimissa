/**
 * Catena Aurea module keys, chapterKey grammar and reader anchors (§L.5;
 * DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.7 + `moduleKeys`
 * entity row). Closed set, Phase L.
 *
 *   chapterKey := Book "/" chapterFile, Book ∈ {Matt, Marc, Luc, Joann}
 *   anchor     := book:catena-aurea-en#<Book>/<ch>/<verseStart>
 */

export type Book = 'Matt' | 'Marc' | 'Luc' | 'Joann';

/** TOC order of the four Gospels. */
export const BOOK_ORDER: readonly Book[] = ['Matt', 'Marc', 'Luc', 'Joann'];

/** Chapters per Gospel (89 in total). */
export const BOOK_CHAPTERS: Readonly<Record<Book, number>> = { Matt: 28, Marc: 16, Luc: 24, Joann: 21 };

export const EVANGELIST: Readonly<Record<Book, string>> = {
  Matt: 'Matthew',
  Marc: 'Mark',
  Luc: 'Luke',
  Joann: 'John',
};

/** The reader opens here when no progress is stored. */
export const DEFAULT_CHAPTER = 'Matt/1';

export const CATENA_EDITION_ID = 'catena-aurea-en';

export function isBook(s: string): s is Book {
  return (BOOK_ORDER as readonly string[]).includes(s);
}

/** `<Book>/<1..BOOK_CHAPTERS[book]>` only; anything else is null. */
export function parseChapterKey(s: string): { book: Book; chapter: number } | null {
  const m = /^([A-Za-z]+)\/([1-9][0-9]?)$/.exec(s);
  if (!m || !isBook(m[1])) return null;
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > BOOK_CHAPTERS[m[1]]) return null;
  return { book: m[1], chapter };
}

/** `St. <Evangelist>, Chapter <chapterFile>`; an unparseable key renders as itself. */
export function chapterLabel(key: string): string {
  const p = parseChapterKey(key);
  return p ? `St. ${EVANGELIST[p.book]}, Chapter ${p.chapter}` : key;
}

/** Pericope or quotation key → the edition and reader anchor it belongs to; `father:*` and the rest → null. */
export function moduleKeyTarget(key: string): { editionId: string; anchor: string } | null {
  const m = /^(?:commentary:catena-aurea\/|catena:)([A-Za-z]+)\/(\d+)\/(\d+)(?:\/q\d+)?$/.exec(key);
  if (!m || !isBook(m[1])) return null;
  if (key.startsWith('commentary:') && key.split('/').length !== 4) return null;
  return { editionId: CATENA_EDITION_ID, anchor: `book:${CATENA_EDITION_ID}#${m[1]}/${m[2]}/${m[3]}` };
}
