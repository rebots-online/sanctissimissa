/**
 * Canonical Bible-order result grouping — §BX.4
 *
 * Accepts a complete ordered nucleated item list (representatives + tail)
 * and the canonical book order from corpusDb.getBooks(). Parses
 * `verse:<book>/<chapter>/<verse>` keys into Book→numeric chapter→numeric
 * verse groups, preserving stable item identity and within-verse input order.
 * Non-verse hits are placed in a final `Other liturgical and commentary sources` group.
 *
 * This is a pure lossless projection: every input item appears exactly once
 * without rescoring or filtering.
 */

import type { NucleatedSimilarityHit } from '../data/types.ts';

export type ResultGroupingMode = 'themes' | 'biblical-order';

/**
 * One canonical book group containing chapter→verse nested hits.
 */
export interface CanonicalBookGroup {
  /** Book key (e.g., "Genesis", "Matthew") */
  book: string;
  /** Display title from corpus metadata */
  title: string;
  /** Testament: 'OT' or 'NT' */
  testament: 'OT' | 'NT';
  /** Chapter number → verse number → array of hits at that verse leaf */
  chapters: Map<number, Map<number, NucleatedSimilarityHit[]>>;
}

/**
 * Final non-Bible group label.
 */
export const OTHER_LABEL = 'Other liturgical and commentary sources';

/**
 * The result of organizing by canonical book order.
 */
export interface CanonicalResultTree {
  /** Bible groups sorted by canonical book order */
  bible: CanonicalBookGroup[];
  /** Non-verse hits (section: keys, etc.) */
  other: NucleatedSimilarityHit[];
  /** Total count of all items (bible + other) */
  totalCount: number;
}

/**
 * Parse a verse key into components, returning null if not a verse key.
 *
 * @param key - Node key to parse (e.g., "verse:Genesis/1/1")
 * @returns Object with book, chapter, verse components, or null if not a verse key
 */
function parseVerseKey(key: string): { book: string; chapter: number; verse: number } | null {
  const match = key.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
  if (!match) return null;
  return {
    book: match[1],
    chapter: Number.parseInt(match[2], 10),
    verse: Number.parseInt(match[3], 10),
  };
}

/**
 * Build a map of book → canonical order from corpusDb.getBooks() result.
 *
 * @param books - Array from corpusDb.getBooks()
 * @returns Map of book key → canonical order index
 */
function buildCanonicalOrder(
  books: { key: string; title: string; testament: 'OT' | 'NT'; hasLatin: boolean }[],
): Map<string, number> {
  const order = new Map<string, number>();
  books.forEach((book, index) => {
    order.set(book.key, index);
  });
  return order;
}

/**
 * Organize nucleated results by canonical Bible book order.
 *
 * @param items - Complete ordered list (representatives + tail)
 * @param canonicalBooks - Array from corpusDb.getBooks()
 * @returns CanonicalResultTree with Bible groups sorted by canonical order
 */
export function organizeResultsByCanon(
  items: NucleatedSimilarityHit[],
  canonicalBooks: { key: string; title: string; testament: 'OT' | 'NT'; hasLatin: boolean }[],
): CanonicalResultTree {
  const bibleMap = new Map<string, CanonicalBookGroup>();
  const other: NucleatedSimilarityHit[] = [];
  const canonicalOrder = buildCanonicalOrder(canonicalBooks);

  // Helper to get or create a book group
  const getBookGroup = (bookKey: string, bookTitle: string, testament: 'OT' | 'NT'): CanonicalBookGroup => {
    let group = bibleMap.get(bookKey);
    if (!group) {
      group = {
        book: bookKey,
        title: bookTitle,
        testament,
        chapters: new Map<number, Map<number, NucleatedSimilarityHit[]>>(),
      };
      bibleMap.set(bookKey, group);
    }
    return group;
  };

  // Distribute each item into its canonical location
  for (const item of items) {
    const parsed = parseVerseKey(item.hit.key);

    if (!parsed) {
      // Non-verse hit: add to other
      other.push(item);
      continue;
    }

    // Find book metadata from canonical order
    const bookIndex = canonicalOrder.get(parsed.book);
    if (bookIndex === undefined) {
      // Unknown book: treat as other
      other.push(item);
      continue;
    }

    const bookMeta = canonicalBooks[bookIndex];
    const group = getBookGroup(parsed.book, bookMeta.title, bookMeta.testament);

    // Get or create chapter map
    let chapterMap = group.chapters.get(parsed.chapter);
    if (!chapterMap) {
      chapterMap = new Map<number, NucleatedSimilarityHit[]>();
      group.chapters.set(parsed.chapter, chapterMap);
    }

    // Get or create verse array
    let verseHits = chapterMap.get(parsed.verse);
    if (!verseHits) {
      verseHits = [];
      chapterMap.set(parsed.verse, verseHits);
    }

    // Add hit preserving input order
    verseHits.push(item);
  }

  // Sort Bible groups by canonical order
  const bible: CanonicalBookGroup[] = Array.from(bibleMap.values()).sort((a, b) => {
    const orderA = canonicalOrder.get(a.book);
    const orderB = canonicalOrder.get(b.book);
    if (orderA === undefined || orderB === undefined) return 0;
    return orderA - orderB;
  });

  return {
    bible,
    other,
    totalCount: items.length,
  };
}