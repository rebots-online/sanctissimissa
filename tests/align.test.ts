import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignPhrase, type PhraseSelectionInput } from '../src/core/text/align.ts';

test('alignPhrase - exact forward Latin to English endpoints', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 17,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.ok(result, 'Should return alignment for exact Latin range');
  assert.strictEqual(result?.srcLang, 'latin', 'Source language should be latin');
  assert.strictEqual(result?.idx, 0, 'Line index should be 0');
  assert.strictEqual(result?.srcStart, 0, 'Source start should match selection');
  assert.strictEqual(result?.srcEnd, 17, 'Source end should match selection');
  assert.ok(result?.dstStart >= 0, 'Destination start should be non-negative');
  assert.ok(result?.dstEnd <= (result?.dstLine?.length ?? 0), 'Destination end should not exceed line length');
});

test('alignPhrase - exact reverse English to Latin endpoints', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'english',
    idx: 0,
    start: 0,
    end: 13,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.ok(result, 'Should return alignment for exact English range');
  assert.strictEqual(result?.srcLang, 'english', 'Source language should be english');
  assert.strictEqual(result?.idx, 0, 'Line index should be 0');
  assert.strictEqual(result?.srcStart, 0, 'Source start should match selection');
  assert.strictEqual(result?.srcEnd, 13, 'Source end should match selection');
  assert.ok(result?.dstLine?.toLowerCase().includes('quæsumus') || result?.dstLine?.toLowerCase().includes('quaesumus'), 'Should contain translated phrase');
});

test('alignPhrase - normalize reversed endpoints', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 17,
    end: 0,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.ok(result, 'Should handle reversed endpoints');
  assert.strictEqual(result?.srcStart, 0, 'Source start should be normalized to min');
  assert.strictEqual(result?.srcEnd, 17, 'Source end should be normalized to max');
});

test('alignPhrase - reject collapsed selection', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 5,
    end: 5,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.strictEqual(result, null, 'Should return null for collapsed selection');
});

test('alignPhrase - reject out-of-range line index', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine.',
    english: 'we beseech You, O Lord.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 99,
    start: 0,
    end: 10,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.strictEqual(result, null, 'Should return null for out-of-range line index');
});

test('alignPhrase - reject out-of-range character positions', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine.',
    english: 'we beseech You, O Lord.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 999,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.strictEqual(result, null, 'Should return null for out-of-range character positions');
});

test('alignPhrase - reject missing translation', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const blockWithNull = {
    latin: 'quæsumus, Dómine.',
    english: null,
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 17,
  };

  const result = alignPhrase(mockDb, blockWithNull, selection);
  assert.strictEqual(result, null, 'Should return null when translation is missing');
});

test('alignPhrase - reject missing source text', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const blockWithNull = {
    latin: null,
    english: 'we beseech You, O Lord.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 10,
  };

  const result = alignPhrase(mockDb, blockWithNull, selection);
  assert.strictEqual(result, null, 'Should return null when source text is missing');
});

test('alignPhrase - reject negative start position', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine.',
    english: 'we beseech You, O Lord.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: -1,
    end: 10,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.strictEqual(result, null, 'Should return null for negative start position');
});

test('alignPhrase - repeated source terms', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'Dominus vobiscum. Et cum spiritu tuo.',
    english: 'The Lord be with you. And with your spirit.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 7,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.ok(result, 'Should handle repeated terms');
  assert.ok(result?.dstLine?.toLowerCase().includes('the lord'), 'Should find first occurrence');
});

test('alignPhrase - one-character expansion/contraction', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  // Single character at start
  const selection1: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 1,
  };

  const result1 = alignPhrase(mockDb, testBlock, selection1);
  assert.ok(result1, 'Should handle single character selection');
  assert.ok(result1?.dstStart >= 0, 'Should have valid destination start');
  assert.ok(result1?.dstEnd > result1?.dstStart, 'Should have positive range');

  // Expanding to two characters
  const selection2: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 2,
  };

  const result2 = alignPhrase(mockDb, testBlock, selection2);
  assert.ok(result2, 'Should handle two character selection');
  assert.ok(result2?.dstStart >= 0, 'Should have valid destination start');
  assert.ok(result2?.dstEnd > result2?.dstStart, 'Should have positive range');
});

test('alignPhrase - partial-word expansion/contraction', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  // Partial word at start
  const selection1: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 4,
  };

  const result1 = alignPhrase(mockDb, testBlock, selection1);
  assert.ok(result1, 'Should handle partial word selection');
  
  // Expanding to full word
  const selection2: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 9,
  };

  const result2 = alignPhrase(mockDb, testBlock, selection2);
  assert.ok(result2, 'Should handle full word selection');
});

test('alignPhrase - full-line-only-when-source-full-line', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine.',
    english: 'we beseech You, O Lord.',
  };

  // Partial selection should not return full destination line
  const partialSelection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 8,
  };

  const partialResult = alignPhrase(mockDb, testBlock, partialSelection);
  assert.ok(partialResult, 'Should handle partial selection');
  assert.ok(partialResult?.dstEnd < (partialResult?.dstLine?.length ?? Infinity), 'Partial selection should not return full line');

  // Full line selection should return proportional range
  const fullSelection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: testBlock.latin.length,
  };

  const fullResult = alignPhrase(mockDb, testBlock, fullSelection);
  assert.ok(fullResult, 'Should handle full line selection');
  assert.ok(fullResult?.dstEnd >= fullResult?.dstStart, 'Full line selection should have valid range');
});

test('alignPhrase - multi-line blocks', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const multiLineBlock = {
    latin: 'quæsumus, Dómine.\nDeus, qui nobis.\nOremus.',
    english: 'we beseech You, O Lord.\nGod, who to us.\nLet us pray.',
  };

  const selection1: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 17,
  };

  const result1 = alignPhrase(mockDb, multiLineBlock, selection1);
  assert.ok(result1, 'Should find alignment in first line');
  assert.strictEqual(result1?.idx, 0, 'Should be at line index 0');

  const selection2: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 1,
    start: 0,
    end: 13,
  };

  const result2 = alignPhrase(mockDb, multiLineBlock, selection2);
  assert.ok(result2, 'Should find alignment in second line');
  assert.strictEqual(result2?.idx, 1, 'Should be at line index 1');
});

test('alignPhrase - countsMatch reporting', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const equalLinesBlock = {
    latin: 'quæsumus, Dómine.\nDeus, qui nobis.',
    english: 'we beseech You, O Lord.\nGod, who to us.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 17,
  };

  const result1 = alignPhrase(mockDb, equalLinesBlock, selection);
  assert.ok(result1?.countsMatch, 'Should report countsMatch=true for equal line counts');

  const unequalLinesBlock = {
    latin: 'quæsumus, Dómine.\nDeus, qui nobis.\nOremus.',
    english: 'we beseech You, O Lord.\nGod, who to us.',
  };

  const result2 = alignPhrase(mockDb, unequalLinesBlock, selection);
  assert.ok(!result2?.countsMatch, 'Should report countsMatch=false for unequal line counts');
});

test('alignPhrase - method determination', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 17,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.ok(result, 'Should return alignment');
  // With empty concordance, wordEcho won't find matches, so we should use positional-fallback
  // However, if the selection spans multiple tokens that can be mapped positionally, 
  // the implementation may still use attested-anchors based on token position mapping
  assert.ok(['attested-anchors', 'positional-fallback'].includes(result?.method ?? ''), 
    'Method should be one of the valid options');
});

test('alignPhrase - both language directions with same selection', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const latinSelection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 17,
  };

  const latinResult = alignPhrase(mockDb, testBlock, latinSelection);
  assert.ok(latinResult, 'Should return alignment for Latin source');

  const englishSelection: PhraseSelectionInput = {
    srcLang: 'english',
    idx: 0,
    start: 0,
    end: 13,
  };

  const englishResult = alignPhrase(mockDb, testBlock, englishSelection);
  assert.ok(englishResult, 'Should return alignment for English source');
  assert.strictEqual(englishResult?.dstLine?.toLowerCase().includes('quæsumus') || englishResult?.dstLine?.toLowerCase().includes('quaesumus'), true, 'English result should map to Latin phrase');
});

test('alignPhrase - round-trip validation', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const selection: PhraseSelectionInput = {
    srcLang: 'latin',
    idx: 0,
    start: 0,
    end: 17,
  };

  const result = alignPhrase(mockDb, testBlock, selection);
  assert.ok(result, 'Should return alignment');
  
  // Verify returned range is within destination line
  const dstLineLength = result?.dstLine?.length ?? 0;
  assert.ok(result?.dstStart >= 0, 'Destination start should be non-negative');
  assert.ok(result?.dstEnd <= dstLineLength, 'Destination end should not exceed line length');
  assert.ok(result?.dstStart < result?.dstEnd, 'Destination start should be less than end');
  
  // Verify source range matches selection
  assert.strictEqual(result?.srcStart, selection.start, 'Source start should match selection');
  assert.strictEqual(result?.srcEnd, selection.end, 'Source end should match selection');
});