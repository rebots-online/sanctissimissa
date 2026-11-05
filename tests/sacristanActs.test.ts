/**
 * HD.1 (§K.8) — the didactic action grammar: parse/validate/reject for the
 * new trailing tokens ([[scroll:]], [[highlight:]], [[circle:]],
 * [[arrow:a->b]], [[annotate:anchor|note]], [[focus-swap]]), plus the App
 * source contract for apply-time live-anchor validation and forwarding.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCompanionCommand, stripGuideCommands } from '../src/core/orientation/guide.ts';

/* ───────────────────────── pure parse/validate ────────────────────────── */

test('HD.1: scroll/highlight/circle parse a 1–80 char anchor', () => {
  assert.deepEqual(parseCompanionCommand('Here. [[scroll:Ordo/Missae/Canon]]'), { kind: 'scroll', value: 'Ordo/Missae/Canon' });
  assert.deepEqual(parseCompanionCommand('See this. [[highlight:Offertorium]]'), { kind: 'highlight', value: 'Offertorium' });
  assert.deepEqual(parseCompanionCommand('Both prayers. [[circle:Sanctus]]'), { kind: 'circle', value: 'Sanctus' });
});

test('HD.1: anchor metacharacters are rejected (never a faked target)', () => {
  assert.equal(parseCompanionCommand('[[scroll:]]'), null, 'empty anchor');
  assert.equal(parseCompanionCommand(`[[circle:${'a'.repeat(81)}]]`), null, 'anchor over 80 chars');
  assert.equal(parseCompanionCommand('[[scroll:a|b]]'), null, 'pipe is annotate grammar, not an anchor char');
  assert.equal(parseCompanionCommand('[[circle:a->b]]'), null, 'arrow is arrow grammar');
});

test('HD.1: arrow requires exactly two anchors joined by ->', () => {
  assert.deepEqual(parseCompanionCommand('Connected. [[arrow:Ordo/Missae/Canon->Ordo/Missae/Secreta]]'),
    { kind: 'arrow', value: 'Ordo/Missae/Canon->Ordo/Missae/Secreta' });
  assert.equal(parseCompanionCommand('[[arrow:only-one]]'), null, 'missing ->');
  assert.equal(parseCompanionCommand('[[arrow:a->b->c]]'), null, 'three endpoints are not an arrow');
  assert.equal(parseCompanionCommand('[[arrow:a->]]'), null, 'empty second anchor');
});

test('HD.1: annotate carries an optional 1–300 char note after the first pipe', () => {
  assert.deepEqual(parseCompanionCommand('Marked. [[annotate:Ordo/Missae/Canon|The Roman Canon is the still center]]'),
    { kind: 'annotate', value: 'Ordo/Missae/Canon', note: 'The Roman Canon is the still center' });
  // The §H nodeKey form (no pipe) keeps its old meaning.
  assert.deepEqual(parseCompanionCommand('[[annotate:Ordo/Missae/Canon]]'), { kind: 'annotate', value: 'Ordo/Missae/Canon' });
  assert.equal(parseCompanionCommand('[[annotate:Ordo/Missae/Canon|]]'), null, 'empty note');
  assert.equal(parseCompanionCommand(`[[annotate:x|${'n'.repeat(301)}]]`), null, 'note over 300 chars');
});

test('HD.1: focus-swap is the one valueless token', () => {
  assert.deepEqual(parseCompanionCommand('Step back. [[focus-swap]]'), { kind: 'focus-swap', value: '' });
  assert.equal(parseCompanionCommand('[[focus-swap:now]]'), null, 'focus-swap takes no value');
});

test('HD.1: a guide pointer plus a didactic act still yields the act (two-token law)', () => {
  assert.deepEqual(parseCompanionCommand('[[guide:nav-map]] [[circle:Sanctus]]'), { kind: 'circle', value: 'Sanctus' });
  assert.deepEqual(parseCompanionCommand('[[circle:Sanctus]] [[guide:nav-map]]'), { kind: 'circle', value: 'Sanctus' });
});

test('HD.1: display strips every didactic token form', () => {
  assert.equal(stripGuideCommands('Prose stays. [[circle:Sanctus]]'), 'Prose stays.');
  assert.equal(stripGuideCommands('Prose stays. [[arrow:a->b]]'), 'Prose stays.');
  assert.equal(stripGuideCommands('Prose stays. [[focus-swap]]'), 'Prose stays.');
  assert.equal(stripGuideCommands('Prose stays. [[annotate:x|a note]]'), 'Prose stays.');
});

/* ─────────────────────── App source contract (apply time) ─────────────── */

const appSrc = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const guideSrc = readFileSync(new URL('../src/core/orientation/guide.ts', import.meta.url), 'utf8');

test('HD.1: App validates didactic anchors against the live document before applying', () => {
  assert.match(appSrc, /liveSectionAnchor/, 'the attribute-compare live lookup exists');
  for (const kind of ['scroll', 'highlight', 'circle']) {
    assert.match(appSrc, new RegExp(`case '${kind}':[\\s\\S]*?liveSectionAnchor\\(value\\)`), `${kind} validates its anchor`);
  }
  assert.match(appSrc, /case 'arrow':[\s\S]*?liveSectionAnchor\(a\)[\s\S]*?liveSectionAnchor\(b\)/, 'arrow validates BOTH anchors');
  assert.match(appSrc, /debugEvent\('sacristan', 'act\.rejected'/, 'rejections are recorded, never faked');
});

test('HD.1: App forwards didactic acts on the overlay channel after validation', () => {
  assert.match(appSrc, /new CustomEvent\(DIDACTIC_ACT, \{ detail: \{ kind: 'circle'/);
  assert.match(appSrc, /new CustomEvent\(DIDACTIC_ACT, \{ detail: \{ kind: 'arrow', anchor: a, anchorB: b/);
  assert.match(appSrc, /new CustomEvent\(DIDACTIC_ACT, \{ detail: \{ kind: 'highlight'/);
  assert.match(appSrc, /new CustomEvent\(DIDACTIC_ACT, \{ detail: \{ kind: 'focus-swap'/);
  assert.match(guideSrc, /export const DIDACTIC_ACT = 'sanctissimissa:didactic-act'/);
});

test('HD.1: annotate maps a live section anchor to its nodeKey for the §H surface', () => {
  assert.match(appSrc, /case 'annotate':[\s\S]*?getAttribute\('data-nodekey'\)/, 'anchor→nodeKey mapping at the live element');
  assert.match(appSrc, /detail: \{ kind: act\.kind, value: nodeKey, note, reply \}/, 'the note rides along');
});

test('HD.1: focus-swap is the one act allowed an empty value', () => {
  assert.match(appSrc, /act\.kind !== 'focus-swap' && !act\.value\.trim\(\)/);
});

test('HD.1: the visible context is a real DOM read in guideContext, not a registered snapshot', () => {
  assert.match(guideSrc, /visible: readVisibleContext\(guideLiveContext\)/);
  assert.ok(!appSrc.includes('visibilitySnapshot'), 'App no longer curates a visible snapshot');
  assert.match(guideSrc, /Do not claim to see anything not in the live view/, 'the teaching law is in the prompt');
  assert.match(guideSrc, /\[\[scroll:<anchor>\]\]/, 'the didactic vocabulary is enumerated');
});
