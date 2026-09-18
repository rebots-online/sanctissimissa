import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFileSize, resolveCatalogEntries, loadRecommendedRepos, type CatalogRow } from '../reusable-chatbot/model-registry/catalog.ts';
import { pickDefault, rankModels } from '../reusable-chatbot/model-registry/rank.ts';
import type { CapabilityReport } from '../reusable-chatbot/core/capability-broker.ts';

/* CP.4 — model registry + picker over the Atomic Chat catalogs (§7.8.5). */

const recommended = JSON.parse(
  readFileSync(new URL('../reusable-chatbot/model-registry/data/atomic-chat-recommended.json', import.meta.url), 'utf8'),
) as { recommendations: { model_name: string }[]; low_spec_recommendations?: { model_name: string }[] };

const pickerSource = readFileSync(new URL('../src/ui/ModelPicker.tsx', import.meta.url), 'utf8');
const chatViewSource = readFileSync(new URL('../src/ui/ChatView.tsx', import.meta.url), 'utf8');
const settingsSource = readFileSync(new URL('../src/ui/SettingsView.tsx', import.meta.url), 'utf8');
const provenance = readFileSync(new URL('../reusable-chatbot/model-registry/PROVENANCE.md', import.meta.url), 'utf8');

const ROWS: CatalogRow[] = [
  {
    model_name: 'AtomicChat/Qwen3.5-4B-GGUF',
    developer: 'unsloth',
    downloads: 1_146_989,
    likes: 382,
    description: '**Tags**: gguf, license:apache-2.0, conversational',
    num_quants: 2,
    quants: [
      { model_id: 'q-bf16', path: 'https://hf.example/Qwen3.5-4B-BF16.gguf', file_size: '7.8 GB' },
      { model_id: 'q-q4km', path: 'https://hf.example/Qwen3.5-4B-Q4_K_M.gguf', file_size: '2.4 GB' },
    ],
  },
  {
    model_name: 'LiquidAI/LFM2.5-2.6B-GGUF',
    developer: 'LiquidAI',
    downloads: 554_506,
    likes: 293,
    description: '**Tags**: gguf, license:other',
    num_quants: 1,
    quants: [{ model_id: 'lfm-q4', path: 'https://hf.example/LFM2.5-2.6B-Q4_K_M.gguf', file_size: '1.6 GB' }],
  },
];

function report(memoryGb: number): CapabilityReport {
  return {
    runtime: 'tauri',
    memoryBudgetBytes: memoryGb * 1024 ** 3,
    accelerations: ['cpu-simd3'],
    contextCeiling: 8192,
    weightFormats: ['Q4_K_M'],
    kvFormats: ['q8_0'],
    threads: 4,
    notes: [],
  };
}

test('CP.4: vendored recommended manifest is real and names models', () => {
  assert.ok(recommended.recommendations.length >= 2, 'recommended roster present');
  assert.ok((recommended.low_spec_recommendations ?? []).length >= 1, 'low-spec roster present');
  assert.ok(provenance.includes('6d8c3a91'), 'upstream commit locked in PROVENANCE');
});

test('CP.4: catalog resolution prefers the baseline quant and parses sizes', () => {
  assert.equal(parseFileSize('2.4 GB'), Math.round(2.4 * 1024 ** 3));
  assert.equal(parseFileSize('850.1 MB'), Math.round(850.1 * 1024 ** 2));
  const entries = resolveCatalogEntries(['AtomicChat/Qwen3.5-4B-GGUF'], ROWS);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].quant, 'Q4_K_M', 'Q4_K_M beats BF16 for the universal baseline');
  assert.equal(entries[0].license, 'apache-2.0');
  assert.ok(entries[0].bytes > 2 * 1024 ** 3);
});

test('CP.4: absent catalog rows resolve to nothing — never a stub', () => {
  assert.deepEqual(resolveCatalogEntries(['Ghost/Nope-GGUF'], ROWS), []);
  assert.deepEqual(resolveCatalogEntries(['AtomicChat/Qwen3.5-4B-GGUF'], []), []);
});

test('CP.4: ranking changes correctly when probe truth changes', () => {
  const entries = resolveCatalogEntries(
    loadRecommendedRepos().recommended.concat(loadRecommendedRepos().lowSpec),
    ROWS,
  );
  const roomy = rankModels(entries, report(8));
  const tight = rankModels(entries, report(2));
  assert.ok(!roomy[0].unsupported, 'an 8 GB device deploys the recommended tier');
  assert.equal(pickDefault(tight)?.displayName.includes('LFM2.5'), true, 'a 2 GB device defaults to the low-spec model');
  assert.ok(tight.some((m) => m.unsupported), 'the 4B model is honestly marked unsupported at 2 GB');
  assert.ok(tight.find((m) => m.unsupported)!.unsupportedReason!.includes('over this device'));
});

test('CP.4: picker states are honest — no mock/preview anywhere in the surface', () => {
  for (const state of ['downloaded', 'downloading', 'failed', 'unsupported', 'idle']) {
    assert.ok(pickerSource.includes(`'${state}'`), `state ${state} exists`);
  }
  assert.ok(!/mock:\/\//.test(pickerSource) && !/MockEngine/.test(pickerSource), 'picker never presents a mock engine');
  assert.ok(chatViewSource.includes('<ModelPicker hook={models} compact'), 'ChatView header carries the picker');
  assert.ok(settingsSource.includes('Companion models'), 'Settings carries the models surface');
});

/* OG.5 — universal default model is the preferred 2B repo only; heavier models never auto-selected (2026-09-18 amendment §C). */
test('preferredDefault resolves the preferred 2B repo or nothing — never a heavier fallback', async () => {
  const defaults = JSON.parse(readFileSync(new URL('../config/companion-defaults.json', import.meta.url), 'utf8')) as { preferredNativeRepo: string };
  assert.equal(defaults.preferredNativeRepo, 'unsloth/Qwen3.5-2B-GGUF');
  const source = readFileSync(new URL('../src/core/chat/models.ts', import.meta.url), 'utf8');
  const body = /export function preferredDefault[\s\S]*?\n}/.exec(source)?.[0] ?? '';
  assert.match(body, /entry\.repo === defaults\.preferredNativeRepo/, 'default resolves the preferred repo');
  assert.doesNotMatch(body, /manualOnlyFamilies/, 'the any-ranked-model fallback is removed');
  assert.match(body, /\?\? null/, 'absence of the preferred repo yields null (explicit choice)');
  const picker = readFileSync(new URL('../src/ui/ModelPicker.tsx', import.meta.url), 'utf8');
  assert.match(picker, /!state\.catalog\.defaultPick && /, 'picker renders an honest no-default state');
});
