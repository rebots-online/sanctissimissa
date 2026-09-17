import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canDeploy,
  probeWebCapabilities,
  reportFromInputs,
  type CapabilityReport,
} from '../reusable-chatbot/core/capability-broker.ts';

/* CP.2 — runner contract freeze + capability broker (§7.8.1, decision 23). */

const engineTypes = readFileSync(new URL('../reusable-chatbot/core/engine-types.ts', import.meta.url), 'utf8');
const session = readFileSync(new URL('../src/core/chat/session.ts', import.meta.url), 'utf8');

test('CP.2: runner ABI extension methods exist and stay optional', () => {
  for (const method of ['warmup?', 'cancel?', 'health?', 'estimateMemory?', 'embed?', 'tokenize?']) {
    assert.ok(engineTypes.includes(method), `ABI carries ${method}`);
  }
  // Handles opaque / KV engine-owned invariants stay stated in the contract.
  assert.ok(engineTypes.includes('KV cache'), 'KV ownership rule present');
});

test('CP.2: mock engine still conforms without implementing the extensions', async () => {
  assert.ok(session.includes('MockEngine'), 'mock is the shared test fixture');
  assert.ok(!session.includes('warmup'), 'mock does not claim extension capabilities');
});

const GPU_ADAPTER = {
  limits: { maxBufferSize: 1024 ** 3 + 1, maxStorageBufferBindingSize: 1024 ** 3 },
  features: { has: (f: string) => f === 'subgroups' },
};

test('CP.2: web probe reports webgpu + subgroups and a conservative budget', () => {
  const report = reportFromInputs({
    runtime: 'web',
    gpuAdapter: GPU_ADAPTER,
    deviceMemoryGb: 8,
    hardwareConcurrency: 12,
    nativeReport: null,
  });
  assert.equal(report.runtime, 'web');
  assert.equal(report.accelerations[0], 'webgpu');
  assert.ok(report.accelerations.includes('webgpu-subgroups'));
  assert.equal(report.memoryBudgetBytes, 4 * 1024 ** 3);
  assert.ok(report.threads <= 8);
  assert.deepEqual(report.notes, []);
});

test('CP.2: no-adapter probe is honest — unsupported, never pretend', () => {
  const report = reportFromInputs({
    runtime: 'web',
    gpuAdapter: null,
    deviceMemoryGb: null,
    hardwareConcurrency: 4,
    nativeReport: null,
  });
  assert.ok(!report.accelerations.includes('webgpu'));
  assert.ok(report.notes.some((n) => n.includes('no WebGPU adapter')));
});

test('CP.2: native (tauri) probe frames the shell answer without inventing caps', () => {
  const report = reportFromInputs({
    runtime: 'tauri',
    gpuAdapter: null,
    deviceMemoryGb: null,
    hardwareConcurrency: null,
    nativeReport: { accelerations: ['cuda', 'cpu-simd3'], threads: 16, contextCeiling: 32768 },
  });
  assert.equal(report.runtime, 'tauri');
  assert.ok(report.accelerations.includes('cuda'));
  assert.equal(report.threads, 16);
  assert.equal(report.contextCeiling, 32768);
  // Fields the shell did not report fall back to safe defaults, not guesses up.
  assert.equal(report.memoryBudgetBytes, 2 * 1024 ** 3);
});

test('CP.2: deployability check is weights + KV against the budget', () => {
  const report: CapabilityReport = { ...reportFromInputs({
    runtime: 'web', gpuAdapter: GPU_ADAPTER, deviceMemoryGb: 8,
    hardwareConcurrency: 8, nativeReport: null,
  }) };
  assert.ok(canDeploy(report, 2 * 1024 ** 3, 256 * 1024 ** 2));
  assert.ok(!canDeploy(report, 4 * 1024 ** 3, 512 * 1024 ** 2));
});

test('CP.2: live web probe never throws in headless/node', async () => {
  const report = await probeWebCapabilities(null);
  assert.equal(report.runtime, 'web');
  assert.ok(Array.isArray(report.notes));
});
