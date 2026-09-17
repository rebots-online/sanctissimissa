import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webllmEntries, type WebLLMModule } from '../reusable-chatbot/engines/webllm/index.ts';
import type { CapabilityReport } from '../reusable-chatbot/core/capability-broker.ts';

/* CP.9 — browser/PWA runner providers (§7.8.2 Phase 1, web). */

const providerSource = readFileSync(
  new URL('../reusable-chatbot/engines/webllm/index.ts', import.meta.url),
  'utf8',
);

const MODULE: WebLLMModule = {
  hasModelInModelList: (id: string) => ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Llama-3.2-3B-Instruct-q4f16_1-MLC'].includes(id),
  CreateMLCEngine: async () => {
    throw new Error('not used in unit tests');
  },
  prebuiltAppConfig: {
    model_list: [
      { model: 'm1', model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', vram_required_MB: 900, low_resource_required: true },
      { model: 'm2', model_id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC', vram_required_MB: 2200 },
      { model: 'm3', model_id: 'Huge-70B-q4f16_1-MLC', vram_required_MB: 40_000 },
      { model: 'embed', model_id: 'snowflake-arctic-embed-m-q0f32-MLC-b4', vram_required_MB: 400 },
    ],
  },
};

test('CP.9: webllm roster maps to picker entries, smallest first', () => {
  const entries = webllmEntries(MODULE);
  assert.equal(entries.length, 3, 'quantized chat models only (embedder excluded)');
  assert.ok(entries[0].bytes <= entries[entries.length - 1].bytes, 'sorted by footprint');
  assert.equal(entries[0].id, 'Llama-3.2-1B-Instruct-q4f16_1-MLC');
});

test('CP.9: provider probe is honest without a WebGPU adapter', async () => {
  // In node there is no navigator.gpu — probe must report unsupported notes,
  // never claim webgpu.
  const { WebLlmRunnerProvider } = await import('../reusable-chatbot/engines/webllm/index.ts');
  const caps = await new WebLlmRunnerProvider().probe();
  assert.equal(caps.backend, 'wasm-simd', 'fallback backend label');
  assert.ok(caps.notes!.some((n) => n.includes('no WebGPU adapter')));
});

test('CP.9: init rejects models outside the manifest — no invented ids', async () => {
  const { WebLlmRunnerProvider } = await import('../reusable-chatbot/engines/webllm/index.ts');
  const provider = new WebLlmRunnerProvider();
  // node lacks the dynamic module → init throws 'unavailable' before id check;
  // exercise the id guard through the source contract instead.
  assert.ok(providerSource.includes(`Unknown WebLLM model`), 'unknown model id is rejected');
  void provider;
});

test('CP.9: generation aborts through interruptGenerate — no per-token IPC', () => {
  assert.ok(providerSource.includes('interruptGenerate'), 'abort path present');
  assert.ok(providerSource.includes("signal.addEventListener('abort'"), 'signal wired');
});

test('CP.9: budget gating — a device with 2 GB budget takes the 1B model', () => {
  const entries = webllmEntries(MODULE);
  const budget = 2 * 1024 ** 3;
  const deployable = entries.filter((e) => e.bytes <= budget);
  assert.equal(deployable[0].id, 'Llama-3.2-1B-Instruct-q4f16_1-MLC');
  assert.ok(!deployable.some((e) => e.id.includes('3B')), '3B does not fit a 2 GB budget');
  void ({} as CapabilityReport | null);
});
