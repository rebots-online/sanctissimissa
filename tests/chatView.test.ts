import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GESTURE_MAX_MS,
  GESTURE_MIN_MS,
  badgeAnimationActive,
  nextGestureDelay,
  pickGesture,
} from '../src/core/chat/gestures.ts';
import { createChatSession } from '../src/core/chat/session.ts';

/* CP.5 — ChatView: intercom badge default + dockable/resizeable panel. */

const chatView = readFileSync(new URL('../src/ui/ChatView.tsx', import.meta.url), 'utf8');
const chatBadge = readFileSync(new URL('../src/ui/ChatBadge.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('CP.5: gesture cadence is jittered within [12s, 20s)', () => {
  assert.equal(nextGestureDelay(() => 0), GESTURE_MIN_MS);
  assert.ok(nextGestureDelay(() => 0.999999) < GESTURE_MAX_MS);
  const d = nextGestureDelay(() => 0.5);
  assert.ok(d >= GESTURE_MIN_MS && d < GESTURE_MAX_MS, `delay ${d} inside the band`);
});

test('CP.5: gestures alternate cross ↔ wave starting with the cross', () => {
  assert.equal(pickGesture(0), 'cross');
  assert.equal(pickGesture(1), 'wave');
  assert.equal(pickGesture(2), 'cross');
});

test('CP.5: reduced motion suppresses badge animation', () => {
  assert.equal(badgeAnimationActive(true), false);
  assert.equal(badgeAnimationActive(false), true);
});

test('CP.5: mock engine probes honest and streams deterministically', async () => {
  const session = createChatSession();
  assert.equal(session.modelId, 'mock://liturgibot-preview');
  await session.ensureEngine();
  const caps = session.controller.capabilities;
  assert.ok(caps?.notes?.join(' ').includes('mock'), 'probe is honest about the mock');
  let text = '';
  for await (const ev of session.controller.generate('the Introibo of today\'s Mass')) {
    text += ev.text;
  }
  assert.ok(text.includes('Dóminus vobíscum'), 'streams the liturgical reply');
  assert.ok(text.includes('Introibo'), 'reply reflects the user topic');
  assert.equal(session.controller.history.length, 2, 'canonical history holds user + assistant');
});

test('CP.5: abort keeps the partial assistant turn in history', async () => {
  const session = createChatSession();
  await session.ensureEngine();
  const abort = new AbortController();
  abort.abort();
  let streamed = 0;
  for await (const ev of session.controller.generate('anything', abort.signal)) {
    streamed += ev.text.length;
  }
  assert.equal(streamed, 0, 'no tokens may stream after abort');
  assert.equal(session.controller.history.length, 1, 'user turn recorded');
});

test('CP.5: ChatView implements all six placement modes with persisted geometry', () => {
  for (const mode of ['dock-left', 'dock-right', 'floating', 'inline', 'fullscreen', 'sheet']) {
    assert.ok(chatView.includes(`'${mode}'`), `mode ${mode} present`);
  }
  assert.ok(chatView.includes('chat-panel ${dock}'), 'panel class derives from the dock mode');
  assert.ok(chatView.includes(`'chat.dock'`));
  assert.ok(chatView.includes(`'chat.rect'`));
  assert.ok(chatView.includes(`'chat.dockWidth'`));
});

test('CP.5: streaming turns are cancellable through an AbortController', () => {
  assert.ok(chatView.includes('new AbortController()'));
  assert.ok(chatView.includes('abortRef.current?.abort()'));
  assert.ok(chatView.includes('Stop'));
});

test('CP.5: badge is the default surface and honors prefers-reduced-motion', () => {
  assert.ok(chatView.includes('<ChatBadge'));
  assert.ok(chatBadge.includes("matchMedia('(prefers-reduced-motion: reduce)')"));
  assert.ok(chatBadge.includes('gesture-${gesture}'), 'gesture class derives cross/wave states');
  assert.ok(chatBadge.includes("from '../core/chat/gestures.ts'"), 'gestures come from the scheduler module');
  assert.ok(chatBadge.includes('✠'), 'cross-signing glyph');
});

test('CP.5: badge mounts globally — every workspace carries the companion', () => {
  assert.ok(app.includes('<ChatView sidecar={sidecar} />'));
});

test('CP.5: badge gets out of the way — unmounts whenever the panel is open (hotfix 2026-09-17)', () => {
  assert.ok(
    chatView.includes('{!open && <ChatBadge'),
    'badge renders only while the panel is closed; the header × closes and restores it',
  );
});

test('CP.5: mock stand-in rotates deterministic formulas across turns', async () => {
  const session = createChatSession();
  await session.ensureEngine();
  const turn = async (text: string) => {
    let out = '';
    for await (const ev of session.controller.generate(text)) out += ev.text;
    return out;
  };
  const first = await turn('the Introibo');
  assert.ok(first.includes('Dóminus vobíscum'), 'first turn keeps the classic formula');
  const second = await turn('the Introibo');
  const third = await turn('the Introibo');
  assert.notEqual(second, first, 'second turn varies');
  assert.notEqual(third, second, 'third turn varies');
  assert.ok(second.includes('Introibo') && third.includes('Introibo'), 'every formula echoes the topic');
  const fourth = await turn('the Introibo');
  const fifth = await turn('the Introibo');
  assert.notEqual(fourth, first, 'mid-cycle turns differ from the first');
  assert.equal(fifth, first, 'four-formula cycle repeats deterministically');
});

test('CP.7/9: ChatView presents real engine states — no mock surface', () => {
  assert.ok(chatView.includes('EngineChip'), 'engine state chip present');
  assert.ok(chatView.includes('resolveNativeEngine') && chatView.includes('resolveWebEngine'));
  assert.ok(!/createChatSession|mock:\/\//.test(chatView), 'mock never reaches the UI');
});

test('CP.11: setup and failures use authored guidance outside assistant messages', () => {
  assert.ok(chatView.includes('companionFeedback.setup'));
  assert.ok(chatView.includes('Prepare Companion'));
  assert.ok(!chatView.includes('error.message'));
});
