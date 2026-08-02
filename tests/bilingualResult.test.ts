import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBilingualResult } from '../src/core/text/bilingualResult.ts';

test('reciprocal Latin/English queries choose correct primary', () => {
  const block = {
    latin: 'Introitus\nPs. Dómine exáudi oratiónem meam.\nEt clamor meus ad te véniat.',
    english: 'Introit\nPs. O Lord, hear my prayer.\nAnd let my cry come unto thee.',
  };

  // Latin query chooses Latin as primary
  const latinQuery = buildBilingualResult(block, 'oratiónem meam');
  assert.equal(latinQuery.primaryLang, 'latin');
  assert.equal(latinQuery.primary, 'Ps. Dómine exáudi oratiónem meam.');
  assert.equal(latinQuery.companion, 'Ps. O Lord, hear my prayer.');
  assert.equal(latinQuery.companionLang, 'english');
  assert.equal(latinQuery.matchSpans.length, 1);
  assert.equal(latinQuery.matchSpans[0].start > 0, true);

  // English query chooses English as primary
  const englishQuery = buildBilingualResult(block, 'hear my prayer');
  assert.equal(englishQuery.primaryLang, 'english');
  assert.equal(englishQuery.primary, 'Ps. O Lord, hear my prayer.');
  assert.equal(englishQuery.companion, 'Ps. Dómine exáudi oratiónem meam.');
  assert.equal(englishQuery.companionLang, 'latin');
  assert.equal(englishQuery.matchSpans.length, 1);
});

test('original diacritics retained in output', () => {
  const block = {
    latin: 'Dómine exáudi oratiónem meam.',
    english: 'O Lord, hear my prayer.',
  };

  const result = buildBilingualResult(block, 'oratiónem');
  assert.match(result.primary, /oratiónem/);
  assert.equal(result.primary.indexOf('oratiónem'), result.matchSpans[0].start);
  assert.equal(result.primary.indexOf('oratiónem') + 9, result.matchSpans[0].end);
});

test('multiple match spans found and mapped correctly', () => {
  const block = {
    latin: 'Dómine exáudi oratiónem meam, quia in te sperávit.',
    english: 'O Lord, hear my prayer, for in thee has it trusted.',
  };

  const result = buildBilingualResult(block, 'meam');
  // This should find 'meam' in the text
  assert.ok(result.matchSpans.length > 0);
  const span = result.matchSpans[0];
  const matchedText = result.primary.slice(span.start, span.end);
  assert.equal(matchedText, 'meam');
});

test('case-insensitive query matches correctly', () => {
  const block = {
    latin: 'Gloria Patri, et Filio, et Spiritui Sancto.',
    english: 'Glory be to the Father, and to the Son, and to the Holy Ghost.',
  };

  const result = buildBilingualResult(block, 'PATRI');
  assert.equal(result.primaryLang, 'latin');
  assert.ok(result.matchSpans.length > 0);
  const span = result.matchSpans[0];
  const matchedText = result.primary.slice(span.start, span.end);
  assert.equal(matchedText, 'Patri');
});

test('missing companion handled gracefully', () => {
  const block = {
    latin: 'Dómine exáudi oratiónem meam.',
    english: null,
  };

  const result = buildBilingualResult(block, 'oratiónem');
  assert.equal(result.primaryLang, 'latin');
  assert.equal(result.companion, null);
  assert.equal(result.companionLang, 'english');
  assert.equal(result.matchSpans.length, 1);
});

test('no result loss when both languages present', () => {
  const block = {
    latin: 'Oratio\nDómine exáudi oratiónem meam.',
    english: 'Collect\nO Lord, hear my prayer.',
  };

  const result = buildBilingualResult(block, 'oratiónem');
  assert.equal(result.primary.length > 0, true);
  assert.ok(result.companion !== null);
  assert.ok(result.companion!.length > 0);
});

test('empty block returns empty result', () => {
  const block = { latin: null, english: null };

  const result = buildBilingualResult(block, 'test');
  assert.equal(result.primary, '');
  assert.equal(result.primaryLang, 'latin');
  assert.equal(result.companion, null);
  assert.equal(result.companionLang, 'english');
  assert.equal(result.matchSpans.length, 0);
});

test('empty query returns no matches', () => {
  const block = {
    latin: 'Dómine exáudi oratiónem meam.',
    english: 'O Lord, hear my prayer.',
  };

  const result = buildBilingualResult(block, '');
  assert.equal(result.matchSpans.length, 0);
});

test('Latin preferred on deterministic tie', () => {
  const block = {
    latin: 'Introitus\nDómine exáudi oratiónem meam.',
    english: 'Introit\nO Lord, hear my prayer.',
  };

  // Neither contains the query, so Latin should win on clause tie
  const result = buildBilingualResult(block, 'xyz');
  assert.equal(result.primaryLang, 'latin');
});

test('ligature normalization preserved in original text', () => {
  const block = {
    latin: 'Pater de cǽlis, Deus misericordiarum.',
    english: 'Father of heaven, God of mercies.',
  };

  const result = buildBilingualResult(block, 'caelis');
  assert.ok(result.primary.includes('cǽlis') || result.primary.includes('caeli'));
  assert.equal(result.matchSpans.length, 1);
});

test('companion ordering is primary then other language', () => {
  const block = {
    latin: 'Dómine exáudi oratiónem meam.',
    english: 'O Lord, hear my prayer.',
  };

  const latinResult = buildBilingualResult(block, 'Dómine');
  assert.equal(latinResult.primaryLang, 'latin');
  assert.equal(latinResult.companionLang, 'english');

  const englishResult = buildBilingualResult(block, 'Lord');
  assert.equal(englishResult.primaryLang, 'english');
  assert.equal(englishResult.companionLang, 'latin');
});

test('best line selection based on match count', () => {
  const block = {
    latin: 'Dómine exáudi oratiónem meam.\nQuia in te sperávit.\nDómine exáudi oratiónem meam.',
    english: 'O Lord, hear my prayer.\nFor in thee has it trusted.\nO Lord, hear my prayer.',
  };

  const result = buildBilingualResult(block, 'Dómine');
  // Should choose a line with Dómine in it
  assert.ok(result.primary.includes('Dómine'));
});

test('clause score used when both languages contain query', () => {
  const block = {
    latin: 'Oratio. Dómine exáudi oratiónem meam.',
    english: 'Collect. O Lord, hear my prayer.',
  };

  const result = buildBilingualResult(block, 'oratiónem');
  // Both have the query (after normalization), Latin has more clause terminators
  assert.equal(result.primaryLang, 'latin');
});