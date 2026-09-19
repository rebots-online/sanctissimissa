// HC.2 — hosted-first engine resolution, ChatView adoption order, picker entry
// (§E, amendment 2026-09-18). No network: resolution constructs the provider
// but never calls out; the UI checks are source-contract assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveHostedEngine } from '../src/core/chat/resolve.ts';
import { companionFeedback } from '../src/core/chat/feedback.ts';
import { HostedOpenRouterProvider } from '../reusable-chatbot/engines/hosted-openrouter/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

test('HC.2/1 resolveHostedEngine without a key is honestly unsupported with the authored line', async () => {
  const resolution = await resolveHostedEngine(undefined);
  assert.equal(resolution.kind, 'unsupported');
  if (resolution.kind !== 'unsupported') throw new Error('unreachable');
  assert.equal(resolution.reason, companionFeedback.hostedKeyMissing);
  assert.equal(
    resolution.reason,
    'The hosted Companion is not configured on this build. On-device choices remain below; you can keep using the Missal.',
  );
});

test('HC.2/2 a configured key resolves ready to a HostedOpenRouterProvider with the hosted label', async () => {
  const resolution = await resolveHostedEngine('sk-or-test-hc2-synthetic-fixture');
  assert.equal(resolution.kind, 'ready');
  if (resolution.kind !== 'ready') throw new Error('unreachable');
  assert.ok(resolution.engine instanceof HostedOpenRouterProvider);
  assert.equal(resolution.label, 'Qwen 3.8 27B · hosted (free)');
  assert.equal(resolution.config.modelId, 'qwen/qwen3.8-27b:free');
  assert.equal(resolution.config.artifactUrl, 'https://openrouter.ai/api/v1/chat/completions');
});

test('HC.2/3 ChatView references resolveHostedEngine before the local call sites; ModelPicker carries the hosted entry', () => {
  const chatView = readFileSync(join(here, '..', 'src', 'ui', 'ChatView.tsx'), 'utf8');
  const modelPicker = readFileSync(join(here, '..', 'src', 'ui', 'ModelPicker.tsx'), 'utf8');
  const hostedRef = chatView.indexOf('resolveHostedEngine');
  const nativeCall = chatView.indexOf('resolveNativeEngine(');
  const webCall = chatView.indexOf('resolveWebEngine(');
  assert.notEqual(hostedRef, -1, 'ChatView must reference resolveHostedEngine');
  assert.notEqual(nativeCall, -1, 'ChatView must still call resolveNativeEngine');
  assert.notEqual(webCall, -1, 'ChatView must still call resolveWebEngine');
  assert.ok(hostedRef < nativeCall, 'hosted resolution must precede the resolveNativeEngine call site');
  assert.ok(hostedRef < webCall, 'hosted resolution must precede the resolveWebEngine call site');
  assert.ok(modelPicker.includes('hosted:openrouter'), 'ModelPicker must expose the hosted entry');
});
