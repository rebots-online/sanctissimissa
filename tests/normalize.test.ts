import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText } from '../src/core/text/normalize.ts';

test('lowercases uppercase text', () => {
  assert.equal(normalizeText('GLORIA PATRI'), 'gloria patri');
});

test('strips combining diacritics via NFD', () => {
  assert.equal(normalizeText('Dómine'), 'domine');
  assert.equal(normalizeText('sǽcula'), 'saecula');
  assert.equal(normalizeText('Réquiem'), 'requiem');
});

test('maps liturgical ligatures', () => {
  assert.equal(normalizeText('ǽterna'), 'aeterna');
  assert.equal(normalizeText('æternam'), 'aeternam');
  assert.equal(normalizeText('œconomia'), 'oeconomia');
});

test('collapses non-letters to spaces', () => {
  assert.equal(normalizeText('Gloria +Patri'), 'gloria patri');
  assert.equal(normalizeText('V. R. Et cum spiritu tuo'), 'v r et cum spiritu tuo');
});

test('preserves letter content through mixed input', () => {
  assert.equal(normalizeText('Gloria Patri, et Filio, et Spiritui Sancto.'), 'gloria patri et filio et spiritui sancto');
});

test('handles empty and whitespace-only input', () => {
  assert.equal(normalizeText(''), '');
  assert.equal(normalizeText('   '), '');
});

test('user input without diacritics matches corpus form', () => {
  const userInput = 'gloria patri';
  const corpusForm = normalizeText('Gloria +Patri');
  assert.equal(userInput, corpusForm);
});

test('ligature variant matches expanded form', () => {
  assert.equal(normalizeText('cǽli'), normalizeText('caeli'));
  assert.equal(normalizeText('lætitia'), normalizeText('laetitia'));
});
