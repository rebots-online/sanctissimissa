/**
 * L.6 §2.2 / §2.4 — chapter keys, chapter lists and sentence units of an
 * audiobook edition. Only `kind='commentary'` pericope nodes are read
 * (`commentaryFor` never returns quotation nodes), filtered by the edition's
 * source; every sentence comes from TT.1 `segmentSentences`.
 */

import type { CorpusDb } from '../data/corpusDb.ts';
import type { SectionText } from '../data/types.ts';
import { debugEvent } from '../diagnostics/store.ts';
import { normalizeWs, segmentSentences } from '../voice/sentences.ts';
import { BOOK_ORDER, EDITION_SOURCE, EVANGELIST, LONG_SENTENCE_CHARS, type AudiobookBook } from './constants.ts';

export interface AudioSentence {
  /** 0.. across the chapter. */
  index: number;
  blockIndex: number;
  blockKey: string;
  verseStart: number;
  text: string;
}

const CHAPTER_KEY = /^(Matt|Marc|Luc|Joann)\/([1-9][0-9]?)$/;

export function parseChapterKey(chapterKey: string): { book: AudiobookBook; chapter: number } | null {
  const m = CHAPTER_KEY.exec(chapterKey);
  return m ? { book: m[1] as AudiobookBook, chapter: Number(m[2]) } : null;
}

export function sourceOf(s: SectionText): string | undefined {
  return /^commentary:([^/]+)\//.exec(s.nodeKey)?.[1];
}

/** `…(Matt|Marc|Luc|Joann)/<ch>/<vs>[/q<n>]` → `Book/ch`, else null. */
export function chapterKeyOf(nodeKey: string): string | null {
  const m = /(Matt|Marc|Luc|Joann)\/(\d+)\/(\d+)(?:\/q\d+)?$/.exec(nodeKey);
  return m ? `${m[1]}/${m[2]}` : null;
}

export function chapterLabel(chapterKey: string): string {
  const p = parseChapterKey(chapterKey);
  return p ? `St. ${EVANGELIST[p.book]}, Chapter ${p.chapter}` : chapterKey;
}

export function locator(book: string, ch: number, vs: number): string {
  return `${EVANGELIST[book as AudiobookBook] ?? book} ${ch}:${vs}`;
}

function editionBlocks(corpus: CorpusDb, editionId: string, book: string, ch: number): SectionText[] {
  const source = EDITION_SOURCE[editionId];
  if (!source) return [];
  return corpus.commentaryFor(book, ch).filter((s) => sourceOf(s) === source);
}

const chapterMemo = new WeakMap<CorpusDb, Map<string, string[]>>();

/** Ordered chapter keys carrying the edition's commentary; memoized per (corpus instance, revision). */
export function chaptersOf(corpus: CorpusDb, editionId: string, revision = 0): string[] {
  let perCorpus = chapterMemo.get(corpus);
  if (!perCorpus) chapterMemo.set(corpus, (perCorpus = new Map()));
  const memoKey = `${editionId}#${revision}`;
  const hit = perCorpus.get(memoKey);
  if (hit) return hit;
  const books = corpus.getBooks();
  const out: string[] = [];
  for (const b of BOOK_ORDER) {
    const chapters = books.find((k) => k.key === b)?.chapters ?? 0;
    for (let ch = 1; ch <= chapters; ch++) {
      if (editionBlocks(corpus, editionId, b, ch).length > 0) out.push(`${b}/${ch}`);
    }
  }
  perCorpus.set(memoKey, out);
  return out;
}

/**
 * Sub-split a sentence longer than LONG_SENTENCE_CHARS, repeatedly: at the
 * last `;`/`:` at or before char 300, else the last `,`, else the last
 * whitespace. A cut is taken only at a word boundary (the mark followed by
 * whitespace), so that re-joining the pieces with ' ' preserves the text
 * (the §2.4 anti-drop invariant; e.g. "5:3" is never cut).
 */
function subSplit(sentence: string): string[] {
  const out: string[] = [];
  let rest = sentence.trim();
  while (rest.length > LONG_SENTENCE_CHARS) {
    const head = rest.slice(0, LONG_SENTENCE_CHARS + 1);
    const lastMark = (marks: RegExp): number => {
      let at = -1;
      for (const m of head.matchAll(marks)) if ((m.index ?? 0) < LONG_SENTENCE_CHARS) at = m.index ?? -1;
      return at;
    };
    let cut = lastMark(/[;:](?=\s)/g);
    if (cut <= 0) cut = lastMark(/,(?=\s)/g);
    let piece: string;
    let next: string;
    if (cut > 0) {
      piece = rest.slice(0, cut + 1);
      next = rest.slice(cut + 1);
    } else {
      const ws = head.search(/\s\S*$/);
      if (ws <= 0) break; // one unbroken token: kept whole rather than cut mid-word
      piece = rest.slice(0, ws);
      next = rest.slice(ws);
    }
    out.push(piece.trim());
    rest = next.trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function chapterSentences(corpus: CorpusDb, editionId: string, chapterKey: string): AudioSentence[] {
  const p = parseChapterKey(chapterKey);
  if (!p) return [];
  const blocks = editionBlocks(corpus, editionId, p.book, p.chapter);
  const units: AudioSentence[] = [];
  blocks.forEach((block, blockIndex) => {
    const verseStart = Number(block.nodeKey.split('/').pop() ?? 0) || 0;
    const english = block.english ?? '';
    for (const s of segmentSentences(english)) {
      for (const text of s.length > LONG_SENTENCE_CHARS ? subSplit(s) : [s]) {
        units.push({ index: units.length, blockIndex, blockKey: block.nodeKey, verseStart, text });
      }
    }
  });
  const spoken = normalizeWs(units.map((u) => u.text).join(' '));
  const shown = normalizeWs(blocks.map((b) => b.english ?? '').join(' '));
  if (spoken !== shown) debugEvent('audiobook', 'anti-drop-violation', { chapterKey }, 'error');
  return units;
}
