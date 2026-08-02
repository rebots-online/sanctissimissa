import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedText, cosine, EMBED_DIM, normalizeText } from '../src/core/vector/embed.ts';

test('embedding is deterministic and self-similar', () => {
  const a = embedText('Reminíscere miseratiónum tuárum, Dómine');
  const b = embedText('Reminíscere miseratiónum tuárum, Dómine');
  assert.equal(a.length, EMBED_DIM);
  assert.deepEqual(Array.from(a), Array.from(b));
  assert.ok(cosine(a, b) > 0.99);
});

test('related texts score higher than unrelated', () => {
  const collect1 = embedText('Grant, we beseech thee, almighty God, that we who are afflicted');
  const collect2 = embedText('Grant, we beseech thee, almighty God, that thy family may walk');
  const unrelated = embedText('zyx qwv 12345 mechanical differential equations');
  assert.ok(cosine(collect1, collect2) > cosine(collect1, unrelated));
  assert.ok(cosine(collect1, unrelated) < 0.5);
});

test('normalization strips liturgical diacritics', () => {
  assert.equal(normalizeText('sǽculo Dómine ǽterna'), 'saeculo domine aeterna');
});
