import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NativeRunnerProvider } from '../reusable-chatbot/engines/native/index.ts';
import { resolveNativeEngine, resolveWebEngine, splitLocator, SELECTED_MODEL_KEY } from '../src/core/chat/resolve.ts';
import type { CapabilityReport } from '../reusable-chatbot/core/capability-broker.ts';

/* CP.7 — native runner adapter + engine resolution (§7.8.2 Phase 1). */

const nativeRust = readFileSync(new URL('../src-tauri/src/inference.rs', import.meta.url), 'utf8');

function report(): CapabilityReport {
  return {
    runtime: 'tauri',
    memoryBudgetBytes: 3 * 1024 ** 3,
    accelerations: ['cpu-avx2'],
    contextCeiling: 8192,
    weightFormats: ['Q4_K_M'],
    kvFormats: ['f16'],
    threads: 8,
    notes: [],
  };
}

test('CP.7: Rust bridge registers probe/load/generate/cancel/unload/tokenize', () => {
  for (const cmd of [
    'pub fn inference_probe',
    'pub fn inference_load',
    'pub fn inference_generate',
    'pub fn inference_cancel',
    'pub fn inference_unload',
    'pub fn inference_tokenize',
  ]) {
    assert.ok(nativeRust.includes(cmd), `${cmd} exists`);
  }
  assert.ok(nativeRust.includes('Channel<String>'), 'streams over a Tauri Channel — no per-token IPC');
  assert.ok(nativeRust.includes('unsafe impl Send for NativeSession'), 'session ownership is explicit');
});

test('CP.7: adapter refuses builtin placeholders — needs a real locator', async () => {
  const invoke = (async () => {
    throw new Error('must not be called');
  }) as never;
  const provider = new NativeRunnerProvider(invoke);
  await assert.rejects(
    () => provider.init({ modelId: 'x', artifactUrl: 'builtin:' }),
    /needs a shared-library locator/,
  );
});

test('CP.7: init invokes inference_load with the library locator and keeps the session', async () => {
  const calls: { cmd: string; args?: Record<string, unknown> }[] = [];
  const invoke = (async (cmd: string, args?: Record<string, unknown>) => {
    calls.push({ cmd, args });
    if (cmd === 'inference_load') return 'native-123';
    if (cmd === 'inference_probe') {
      return {
        runtime: 'tauri',
        accelerations: ['cpu-avx2'],
        contextCeiling: 8192,
        weightFormats: ['Q4_K_M'],
        kvFormats: ['f16'],
        threads: 8,
        notes: [],
      };
    }
    throw new Error(`unexpected ${cmd}`);
  }) as never;
  const provider = new NativeRunnerProvider(invoke);
  const caps = await provider.probe();
  assert.equal(caps.backend, 'turboquant-native');
  const session = await provider.init({ modelId: 'm', artifactUrl: '/lib/models/sha256/ab/m.gguf' });
  assert.equal(session, 'native-123');
  assert.ok(calls[0].cmd === 'inference_probe');
  assert.ok(calls[1].cmd === 'inference_load');
});

test('CP.7: resolution is needs-model until a locator exists, then ready', async () => {
  const invoke = (async () => ({})) as never;
  const candidates = [{ id: 'm1', displayName: 'Model 1' }];
  const none = await resolveNativeEngine(invoke, report(), async () => null, candidates);
  assert.equal(none.kind, 'needs-model');
  assert.ok(none.reason.includes('picker'), 'honest setup pointer');

  const located = await resolveNativeEngine(invoke, report(), async (id) => (id === 'm1' ? 'sha::/lib/m.gguf' : null), candidates);
  assert.equal(located.kind, 'ready');
  assert.ok(located.kind === 'ready' && located.config.artifactUrl === '/lib/m.gguf');
});

test('CP.7: web resolution without WebGPU is honestly unsupported', async () => {
  const result = await resolveWebEngine({ ...report(), runtime: 'web', accelerations: ['cpu-simd3'] });
  assert.equal(result.kind, 'unsupported');
  assert.ok(result.reason.includes('WebGPU'));
});

test('CP.7: locator split + selection persistence key', () => {
  assert.deepEqual(splitLocator('abc123::/lib/m.gguf'), ['abc123', '/lib/m.gguf']);
  assert.deepEqual(splitLocator('/no/digest/here'), ['/no/digest/here', '/no/digest/here']);
  assert.equal(SELECTED_MODEL_KEY, 'chat.modelId');
});
