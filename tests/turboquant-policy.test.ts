import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TurboQuantKvFormat } from '../reusable-chatbot/core/engine-types.ts';
import {
  resolveEngineKvFormat,
  resolveKvFormat,
  resolveWeightFormat,
} from '../reusable-chatbot/core/turboquant-policy.ts';

test('kv policy prefers turbo3 for key and value', () => {
  assert.equal(
    resolveKvFormat(['f16', 'turbo3', 'turbo4', 'turbo2']),
    'turbo3',
    'turbo3 is the shared preferred KV format',
  );
});

test('kv policy falls back turbo3 → turbo4 → turbo2 → q8_0 → f16', () => {
  assert.equal(resolveKvFormat(['turbo4', 'q8_0', 'f16']), 'turbo4');
  assert.equal(resolveKvFormat(['turbo2', 'q8_0']), 'turbo2');
  assert.equal(resolveKvFormat(['q8_0', 'f16']), 'q8_0');
});

test('kv policy uses turbo2 first only when constrained', () => {
  const supported: TurboQuantKvFormat[] = ['turbo2', 'turbo3', 'turbo4'];
  assert.equal(resolveKvFormat(supported), 'turbo3');
  assert.equal(resolveKvFormat(supported, true), 'turbo2');
});

test('kv policy returns null when nothing is supported', () => {
  assert.equal(resolveKvFormat([]), null);
});

test('resolveEngineKvFormat reads capability truth', () => {
  assert.equal(resolveEngineKvFormat({ kvFormats: ['f16'] }), 'f16');
  assert.equal(resolveEngineKvFormat({ kvFormats: [] }), null);
});

test('weight resolution is independent of KV format', () => {
  assert.equal(resolveWeightFormat(['Q4_K_M', 'TQ3_1S']), 'Q4_K_M');
  assert.equal(resolveWeightFormat(['TQ3_1S', 'Q6_K']), 'Q6_K');
  assert.equal(resolveWeightFormat(['TQ4_1S']), 'TQ4_1S');
  assert.equal(resolveWeightFormat(['IQ4_XS']), null);
});
