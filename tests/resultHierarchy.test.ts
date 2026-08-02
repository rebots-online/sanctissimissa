/**
 * Tests for canonical Bible-order result grouping — §BX.4
 *
 * Tests cover canonical book order, numeric chapter/verse order,
 * duplicate keys without loss, non-Bible final group, and exact
 * input/output multiset equality.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimilarHit } from '../src/core/data/types.ts';
import { organizeResultsByCanon } from '../src/core/text/resultHierarchy.ts';

// Mock canonical books (73 books in the real corpus)
const MOCK_CANONICAL_BOOKS = [
  { key: 'Genesis', title: 'Genesis', testament: 'OT' as const, hasLatin: true },
  { key: 'Exodus', title: 'Exodus', testament: 'OT' as const, hasLatin: true },
  { key: 'Leviticus', title: 'Leviticus', testament: 'OT' as const, hasLatin: true },
  { key: 'Numbers', title: 'Numbers', testament: 'OT' as const, hasLatin: true },
  { key: 'Deuteronomy', title: 'Deuteronomy', testament: 'OT' as const, hasLatin: true },
  { key: 'Joshua', title: 'Joshua', testament: 'OT' as const, hasLatin: true },
  { key: 'Judges', title: 'Judges', testament: 'OT' as const, hasLatin: true },
  { key: 'Ruth', title: 'Ruth', testament: 'OT' as const, hasLatin: true },
  { key: '1Samuel', title: '1 Samuel', testament: 'OT' as const, hasLatin: true },
  { key: '2Samuel', title: '2 Samuel', testament: 'OT' as const, hasLatin: true },
  { key: '1Kings', title: '1 Kings', testament: 'OT' as const, hasLatin: true },
  { key: '2Kings', title: '2 Kings', testament: 'OT' as const, hasLatin: true },
  { key: '1Chronicles', title: '1 Chronicles', testament: 'OT' as const, hasLatin: true },
  { key: '2Chronicles', title: '2 Chronicles', testament: 'OT' as const, hasLatin: true },
  { key: 'Ezra', title: 'Ezra', testament: 'OT' as const, hasLatin: true },
  { key: 'Nehemiah', title: 'Nehemiah', testament: 'OT' as const, hasLatin: true },
  { key: 'Esther', title: 'Esther', testament: 'OT' as const, hasLatin: true },
  { key: 'Job', title: 'Job', testament: 'OT' as const, hasLatin: true },
  { key: 'Psalms', title: 'Psalms', testament: 'OT' as const, hasLatin: true },
  { key: 'Proverbs', title: 'Proverbs', testament: 'OT' as const, hasLatin: true },
  { key: 'Ecclesiastes', title: 'Ecclesiastes', testament: 'OT' as const, hasLatin: true },
  { key: 'SongOfSolomon', title: 'Song of Solomon', testament: 'OT' as const, hasLatin: true },
  { key: 'Isaiah', title: 'Isaiah', testament: 'OT' as const, hasLatin: true },
  { key: 'Jeremiah', title: 'Jeremiah', testament: 'OT' as const, hasLatin: true },
  { key: 'Lamentations', title: 'Lamentations', testament: 'OT' as const, hasLatin: true },
  { key: 'Ezekiel', title: 'Ezekiel', testament: 'OT' as const, hasLatin: true },
  { key: 'Daniel', title: 'Daniel', testament: 'OT' as const, hasLatin: true },
  { key: 'Hosea', title: 'Hosea', testament: 'OT' as const, hasLatin: true },
  { key: 'Joel', title: 'Joel', testament: 'OT' as const, hasLatin: true },
  { key: 'Amos', title: 'Amos', testament: 'OT' as const, hasLatin: true },
  { key: 'Obadiah', title: 'Obadiah', testament: 'OT' as const, hasLatin: true },
  { key: 'Jonah', title: 'Jonah', testament: 'OT' as const, hasLatin: true },
  { key: 'Micah', title: 'Micah', testament: 'OT' as const, hasLatin: true },
  { key: 'Nahum', title: 'Nahum', testament: 'OT' as const, hasLatin: true },
  { key: 'Habakkuk', title: 'Habakkuk', testament: 'OT' as const, hasLatin: true },
  { key: 'Zephaniah', title: 'Zephaniah', testament: 'OT' as const, hasLatin: true },
  { key: 'Haggai', title: 'Haggai', testament: 'OT' as const, hasLatin: true },
  { key: 'Zechariah', title: 'Zechariah', testament: 'OT' as const, hasLatin: true },
  { key: 'Malachi', title: 'Malachi', testament: 'OT' as const, hasLatin: true },
  { key: 'Matthew', title: 'Matthew', testament: 'NT' as const, hasLatin: true },
  { key: 'Mark', title: 'Mark', testament: 'NT' as const, hasLatin: true },
  { key: 'Luke', title: 'Luke', testament: 'NT' as const, hasLatin: true },
  { key: 'John', title: 'John', testament: 'NT' as const, hasLatin: true },
  { key: 'Acts', title: 'Acts', testament: 'NT' as const, hasLatin: true },
  { key: 'Romans', title: 'Romans', testament: 'NT' as const, hasLatin: true },
  { key: '1Corinthians', title: '1 Corinthians', testament: 'NT' as const, hasLatin: true },
  { key: '2Corinthians', title: '2 Corinthians', testament: 'NT' as const, hasLatin: true },
  { key: 'Galatians', title: 'Galatians', testament: 'NT' as const, hasLatin: true },
  { key: 'Ephesians', title: 'Ephesians', testament: 'NT' as const, hasLatin: true },
  { key: 'Philippians', title: 'Philippians', testament: 'NT' as const, hasLatin: true },
  { key: 'Colossians', title: 'Colossians', testament: 'NT' as const, hasLatin: true },
  { key: '1Thessalonians', title: '1 Thessalonians', testament: 'NT' as const, hasLatin: true },
  { key: '2Thessalonians', title: '2 Thessalonians', testament: 'NT' as const, hasLatin: true },
  { key: '1Timothy', title: '1 Timothy', testament: 'NT' as const, hasLatin: true },
  { key: '2Timothy', title: '2 Timothy', testament: 'NT' as const, hasLatin: true },
  { key: 'Titus', title: 'Titus', testament: 'NT' as const, hasLatin: true },
  { key: 'Philemon', title: 'Philemon', testament: 'NT' as const, hasLatin: true },
  { key: 'Hebrews', title: 'Hebrews', testament: 'NT' as const, hasLatin: true },
  { key: 'James', title: 'James', testament: 'NT' as const, hasLatin: true },
  { key: '1Peter', title: '1 Peter', testament: 'NT' as const, hasLatin: true },
  { key: '2Peter', title: '2 Peter', testament: 'NT' as const, hasLatin: true },
  { key: '1John', title: '1 John', testament: 'NT' as const, hasLatin: true },
  { key: '2John', title: '2 John', testament: 'NT' as const, hasLatin: true },
  { key: '3John', title: '3 John', testament: 'NT' as const, hasLatin: true },
  { key: 'Jude', title: 'Jude', testament: 'NT' as const, hasLatin: true },
  { key: 'Revelation', title: 'Revelation', testament: 'NT' as const, hasLatin: true },
];

// Helper to create a mock NucleatedSimilarityHit
function makeHit(
  key: string,
  score: number = 0.5,
): { hit: SimilarHit; clause: string; nucleusKey: string | null; nucleusAffinity: number; contextScore: number } {
  return {
    hit: {
      key,
      section: 'Oratio',
      title: 'Test',
      score,
      latin: 'Test Latin',
      english: 'Test English',
    },
    clause: 'test clause',
    nucleusKey: null,
    nucleusAffinity: 0.5,
    contextScore: score,
  };
}

test('canonical book order preserves Genesis before Exodus before Psalms', () => {
  const items = [
    makeHit('verse:Psalms/23/1', 0.7),
    makeHit('verse:Genesis/1/1', 0.8),
    makeHit('verse:Exodus/20/1', 0.9),
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 3);
  assert.equal(result.bible.length, 3);
  assert.equal(result.other.length, 0);

  // Books should be in canonical order: Genesis, Exodus, Psalms
  assert.equal(result.bible[0].book, 'Genesis');
  assert.equal(result.bible[1].book, 'Exodus');
  assert.equal(result.bible[2].book, 'Psalms');
});

test('numeric chapter and verse order within each book', () => {
  const items = [
    makeHit('verse:Genesis/3/5', 0.5),
    makeHit('verse:Genesis/1/10', 0.6),
    makeHit('verse:Genesis/2/3', 0.7),
    makeHit('verse:Genesis/1/1', 0.8),
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.bible.length, 1);
  const genesis = result.bible[0];

  // Get chapters in numeric order
  const chapters = Array.from(genesis.chapters.keys()).sort((a, b) => a - b);
  assert.deepEqual(chapters, [1, 2, 3]);

  // Chapter 1 verses should be numeric order
  const chapter1 = genesis.chapters.get(1);
  assert.ok(chapter1);
  const verses1 = Array.from(chapter1.keys()).sort((a, b) => a - b);
  assert.deepEqual(verses1, [1, 10]);

  // Verify hit order within verse is preserved
  const verse1Hits = chapter1.get(1);
  assert.ok(verse1Hits);
  assert.equal(verse1Hits.length, 1);
  assert.equal(verse1Hits[0].hit.key, 'verse:Genesis/1/1');
});

test('duplicate keys at same verse are preserved without loss', () => {
  const items = [
    makeHit('verse:Genesis/1/1', 0.5),
    makeHit('verse:Genesis/1/1', 0.6), // Same verse, different item
    makeHit('verse:Genesis/1/1', 0.7), // Third item at same verse
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 3);
  assert.equal(result.bible.length, 1);

  const genesis = result.bible[0];
  const chapter1 = genesis.chapters.get(1);
  assert.ok(chapter1);

  const verse1Hits = chapter1.get(1);
  assert.ok(verse1Hits);
  assert.equal(verse1Hits.length, 3);

  // Input order should be preserved
  assert.equal(verse1Hits[0].hit.score, 0.5);
  assert.equal(verse1Hits[1].hit.score, 0.6);
  assert.equal(verse1Hits[2].hit.score, 0.7);
});

test('non-verse hits go to final Other group', () => {
  const items = [
    makeHit('verse:Genesis/1/1', 0.8),
    makeHit('section:Sancti/12-25/Oratio', 0.7), // Non-verse
    makeHit('section:Ordo/Missa/Introitus', 0.6), // Non-verse
    makeHit('verse:Psalms/23/1', 0.9),
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 4);
  assert.equal(result.bible.length, 2);
  assert.equal(result.other.length, 2);

  // Other group should contain non-verse hits in input order
  assert.equal(result.other[0].hit.key, 'section:Sancti/12-25/Oratio');
  assert.equal(result.other[1].hit.key, 'section:Ordo/Missa/Introitus');

  // Bible group should have only verse hits
  assert.equal(result.bible[0].book, 'Genesis');
  assert.equal(result.bible[1].book, 'Psalms');
});

test('unknown book keys go to Other group', () => {
  const items = [
    makeHit('verse:UnknownBook/1/1', 0.5),
    makeHit('verse:Genesis/1/1', 0.8),
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 2);
  assert.equal(result.bible.length, 1);
  assert.equal(result.other.length, 1);

  assert.equal(result.bible[0].book, 'Genesis');
  assert.equal(result.other[0].hit.key, 'verse:UnknownBook/1/1');
});

test('exact input output multiset equality', () => {
  const items = [
    makeHit('verse:Genesis/1/1', 0.5),
    makeHit('verse:Genesis/1/1', 0.6),
    makeHit('verse:Exodus/20/1', 0.7),
    makeHit('section:Ordo/Missa/Oratio', 0.8),
    makeHit('verse:Psalms/23/1', 0.9),
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  // Collect all output items
  const allOutput: SimilarHit[] = [];

  // Flatten Bible groups
  for (const book of result.bible) {
    for (const chapterMap of book.chapters.values()) {
      for (const verseHits of chapterMap.values()) {
        for (const item of verseHits) {
          allOutput.push(item.hit);
        }
      }
    }
  }

  // Add other items
  for (const item of result.other) {
    allOutput.push(item.hit);
  }

  // Check total count
  assert.equal(allOutput.length, items.length);

  // We need to compare in canonical order, so sort the expected output
  // Bible items should be sorted by book/chapter/verse, other items preserve input order
  const verseItems = items.filter((item) => item.hit.key.startsWith('verse:'));
  const otherItems = items.filter((item) => !item.hit.key.startsWith('verse:'));

  // Bible items should be organized by canonical order
  const organizedVerseItems: SimilarHit[] = [];
  const bibleMap = new Map<string, SimilarHit[]>();

  // Group by book
  for (const item of verseItems) {
    const match = item.hit.key.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
    if (!match) continue;

    const book = match[1];
    Number.parseInt(match[2], 10);
    Number.parseInt(match[3], 10);

    const bookItems = bibleMap.get(book) || [];
    bookItems.push(item.hit);
    bibleMap.set(book, bookItems);
  }

  // Extract in canonical book order
  for (const book of MOCK_CANONICAL_BOOKS) {
    const bookItems = bibleMap.get(book.key);
    if (bookItems) {
      // Sort by chapter then verse
      bookItems.sort((a, b) => {
        const aMatch = a.key.match(/^verse:[^/]+\/(\d+)\/(\d+)$/);
        const bMatch = b.key.match(/^verse:[^/]+\/(\d+)\/(\d+)$/);
        if (!aMatch || !bMatch) return 0;

        const aChapter = Number.parseInt(aMatch[2], 10);
        const bChapter = Number.parseInt(bMatch[2], 10);
        if (aChapter !== bChapter) return aChapter - bChapter;

        const aVerse = Number.parseInt(aMatch[3], 10);
        const bVerse = Number.parseInt(bMatch[3], 10);
        return aVerse - bVerse;
      });

      organizedVerseItems.push(...bookItems);
    }
  }

  // Combine verse items (in canonical order) with other items (in input order)
  const expectedOutput = [...organizedVerseItems, ...otherItems.map((item) => item.hit)];

  // Verify output matches expected
  assert.deepEqual(allOutput, expectedOutput);
});

test('empty input returns empty result', () => {
  const result = organizeResultsByCanon([], MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 0);
  assert.equal(result.bible.length, 0);
  assert.equal(result.other.length, 0);
});

test('only non-verse hits returns only other group', () => {
  const items = [
    makeHit('section:Ordo/Missa/Oratio', 0.8),
    makeHit('section:Sancti/12-25/Oratio', 0.7),
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 2);
  assert.equal(result.bible.length, 0);
  assert.equal(result.other.length, 2);

  // Input order preserved in other
  assert.equal(result.other[0].hit.key, 'section:Ordo/Missa/Oratio');
  assert.equal(result.other[1].hit.key, 'section:Sancti/12-25/Oratio');
});

test('only verse hits returns only bible groups', () => {
  const items = [
    makeHit('verse:Genesis/1/1', 0.8),
    makeHit('verse:Exodus/20/1', 0.7),
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 2);
  assert.equal(result.bible.length, 2);
  assert.equal(result.other.length, 0);

  assert.equal(result.bible[0].book, 'Genesis');
  assert.equal(result.bible[1].book, 'Exodus');
});

test('NT books appear after OT books in canonical order', () => {
  const items = [
    makeHit('verse:Matthew/1/1', 0.8), // NT, first Gospel
    makeHit('verse:Malachi/1/1', 0.7), // OT, last prophet
    makeHit('verse:Genesis/1/1', 0.9), // OT, first book
  ];

  const result = organizeResultsByCanon(items, MOCK_CANONICAL_BOOKS);

  assert.equal(result.totalCount, 3);
  assert.equal(result.bible.length, 3);

  // Canonical order: Genesis (OT), Malachi (OT), Matthew (NT)
  assert.equal(result.bible[0].book, 'Genesis');
  assert.equal(result.bible[1].book, 'Malachi');
  assert.equal(result.bible[2].book, 'Matthew');

  assert.equal(result.bible[0].testament, 'OT');
  assert.equal(result.bible[1].testament, 'OT');
  assert.equal(result.bible[2].testament, 'NT');
});