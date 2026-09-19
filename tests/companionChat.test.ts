/**
 * CL.4 (§H.2/§H.4) — Chat integration: lore+visibility context, Save
 * insight, distill-on-idle, path narration. Source-contract tests over
 * src/ui/ChatView.tsx (same convention as companionSurfaces.test.ts — the
 * Node strip-types runner cannot load .tsx modules, so the shipped source
 * text is contracted against directly).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/ui/ChatView.tsx', import.meta.url), 'utf8');

/* ------------------------------------------------------------------ */
/* Per-turn system context: persona+guideContext + lore + top-5 recall */
/* ------------------------------------------------------------------ */

test('CL.4: the authoritative exports are imported — parseCompanionCommand, COMPANION_ACT, PathStep, CompanionMemory', () => {
  assert.match(source, /import type \{ Database \} from 'sql\.js';/, 'the raw sidecar handle type');
  assert.match(source, /\bCOMPANION_ACT,/, 'COMPANION_ACT from the CL.1 grammar module');
  assert.match(source, /\bparseCompanionCommand,/, 'parseCompanionCommand from the CL.1 grammar module');
  assert.match(source, /type PathStep,/, 'PathStep narration shape');
  assert.match(
    source,
    /import \{ CompanionMemory \} from '\.\.\/core\/companion\/memory\.ts';/,
    'CompanionMemory from the CL.3 module',
  );
});

test('CL.4: companionSystemContext = guideContext() + assemble(lore) + top-5 recall as "## Recalled memories"', () => {
  const start = source.indexOf('const companionSystemContext');
  assert.ok(start > 0, 'companionSystemContext exists');
  const body = source.slice(start, source.indexOf('};', start) + 2);
  assert.ok(body.includes('const parts = [guideContext()];'), 'persona + guideContext() lead the context');
  assert.match(body, /memory\.assemble\(\{ view: facts\.view, date: facts\.date, focus: facts\.focus \}\)/, 'the lore block is assembled with the live facts');
  assert.ok(body.includes('if (lore) parts.push(lore);'), 'the lore block is optional');
  assert.match(body, /memory\.recall\(question, 5\)/, 'top-5 recall of the sent question');
  assert.ok(body.includes('## Recalled memories\\n${'), 'recall renders under the Recalled memories heading');
  assert.ok(body.includes("parts.join('\\n\\n')"), 'sections join with blank lines');
});

test('CL.4: every sent turn generates against companionSystemContext, not bare guideContext()', () => {
  assert.match(
    source,
    /controller\.generate\(text, abort\.signal, companionSystemContext\(text\)\)/,
    'the per-turn system context is persona+guideContext+lore+recall',
  );
  assert.doesNotMatch(source, /controller\.generate\(text, abort\.signal, guideContext\(\)\)/, 'the bare call is gone');
});

test('CL.4: CompanionMemory is built over the sidecar store\'s own sql.js handle (one database, never a fork)', () => {
  const handle = source.slice(
    source.indexOf('function sidecarHandle'),
    source.indexOf('}', source.indexOf('typeof (handle as Database).prepare')) + 1,
  );
  assert.ok(handle.includes('typeof (handle as Database).prepare'), 'the handle is feature-detected, never assumed');
  const memoryStart = source.indexOf('const memory = useMemo');
  const memory = source.slice(memoryStart, source.indexOf('}, [sidecar]);', memoryStart));
  assert.ok(memory.includes('sidecarHandle(sidecar)'), 'memory uses the detected handle');
  assert.ok(memory.includes('handle ? new CompanionMemory(handle) : null'), 'absent handle → memory idle, never a crash');
});

test('CL.4: the live facts (view/date/focus) come from guideContext()\'s documented context JSON', () => {
  const start = source.indexOf('function liveFacts');
  assert.ok(start > 0, 'liveFacts exists');
  const body = source.slice(start, source.indexOf('\n}', start) + 2);
  assert.match(body, /actual visible DOM controls: \(\[\\s\\S\]\*\?\)\\\. Current orientation target/, 'reads the documented CL.2 context JSON');
  assert.match(body, /currentDate/, 'currentDate consumed');
  assert.match(body, /focusSection/, 'focusSection consumed');
  assert.match(body, /\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//, 'the date is ISO-validated before use as the day anchor');
});

/* ------------------------------------------------------------------ */
/* Command suffix: parse / execute / strip; show-path narration        */
/* ------------------------------------------------------------------ */

test('CL.4: the reply command suffix parses and executes per the grammar; show-path carries its narration steps', () => {
  const start = source.indexOf('const executeReplyCommands');
  assert.ok(start > 0, 'executeReplyCommands exists');
  const body = source.slice(start, source.indexOf('\n  };', start) + 4);
  assert.ok(body.includes('const act = parseCompanionCommand(response);'), 'the suffix parses per the grammar');
  assert.ok(body.includes("act?.kind === 'show-path'"), 'show-path is the narrated branch');
  assert.ok(
    body.includes('applyGuideCommand(withoutShowPathToken(response));'),
    'the show-path token is removed before applyGuideCommand — any [[guide:…]] half still applies, the act itself never double-dispatches',
  );
  assert.match(body, /act\.value\.split\('>'\)\.map\(\(step\) => step\.trim\(\)\)\.filter\(Boolean\)/, 'targets split per >-step');
  assert.ok(body.includes('const narrations = pathNarrations(response, targets.length);'), 'one narration per step');
  assert.match(
    body,
    /targets\.map\(\(target, index\) => \(\{ target, narration: narrations\[index\] \?\? '' \}\)\)/,
    'steps are [{ target, narration }] pairs (§H.4 detail shape)',
  );
  assert.match(
    body,
    /window\.dispatchEvent\(new CustomEvent\(COMPANION_ACT, \{ detail: \{ \.\.\.act, steps \} \}\)\);/,
    'the forwarded COMPANION_ACT carries the steps',
  );
  assert.ok(body.includes("debugEvent('companion', 'command.dispatch'"), 'the dispatch is recorded');
  assert.ok(
    body.lastIndexOf('applyGuideCommand(response);') > body.indexOf('return;'),
    'every other act executes through applyGuideCommand after the show-path branch returns',
  );
});

test('CL.4: narrations are the reply\'s trailing blank-line-separated paragraphs, one per step', () => {
  const start = source.indexOf('function pathNarrations');
  assert.ok(start > 0, 'pathNarrations exists');
  const body = source.slice(start, source.indexOf('\n}', start) + 2);
  assert.ok(body.includes('stripGuideCommands(reply)'), 'the command suffix never leaks into a narration');
  assert.match(body, /split\(\/\\n\\s\*\\n\/\)/, 'paragraphs separate on blank lines');
  assert.match(body, /\.slice\(-count\)/, 'the trailing one-per-step paragraphs are taken');
});

test('CL.4: assistant replies render with the command suffix stripped; [[open:office]] never displays', () => {
  assert.match(
    source,
    /<ChatMarkdown text=\{stripGuideCommands\(m\.text\)\} \/>/,
    'the assistant bubble renders the stripped text through ChatMarkdown',
  );
  assert.match(source, /: m\.text}/, 'user turns stay plain');
});

/* ------------------------------------------------------------------ */
/* Save insight                                                        */
/* ------------------------------------------------------------------ */

test('CL.4: Save insight writes a generated study accompaniment anchored to the current day + focus section', () => {
  const start = source.indexOf('const saveInsight');
  assert.ok(start > 0, 'saveInsight exists');
  const body = source.slice(start, source.indexOf('\n  };', start) + 4);
  assert.ok(body.includes("if (!sidecar?.save) return;"), 'writes through the existing store only');
  assert.ok(body.includes("exposure: 'study',"), "exposure 'study'");
  assert.ok(body.includes("provenance: 'generated',"), "provenance 'generated'");
  assert.ok(body.includes('ensureNoteHtml(body)'), 'the reply body becomes a safe HTML snapshot');
  assert.ok(body.includes('anchors: facts.focus ? [`section:${facts.focus}`] : []'), 'anchored to the focus section when one is live');
  assert.match(
    body,
    /selectors: \[\{ id: '', accompanimentId: '', kind: 'date', value: facts\.date \}\]/,
    'anchored to the current day via a date occurrence selector',
  );
  assert.ok(body.includes('void sidecar.persist();'), 'the write persists');
  assert.ok(body.includes("debugEvent('companion', 'insight.saved'"), 'the save is recorded in Diagnostics');
});

test('CL.4: each completed assistant reply offers Save insight — never on the still-streaming tail', () => {
  const rail = source.slice(source.indexOf("m.role === 'assistant' && m.text.length > 0"), source.indexOf('{savedInsights.has(i) ? \'Saved\' : \'Save insight\'}'));
  assert.ok(rail.includes("!(streaming && i === messages.length - 1)"), 'the streaming tail carries no action');
  assert.ok(source.includes("{savedInsights.has(i) ? 'Saved' : 'Save insight'}"), 'the authored action label');
  assert.match(source, /disabled=\{!saveAvailable \|\| savedInsights\.has\(i\)\}/, 'one save per reply; disabled without a store');
});

/* ------------------------------------------------------------------ */
/* Distill-on-idle                                                     */
/* ------------------------------------------------------------------ */

test('CL.4: distill-on-idle — 2-minute debounce after close, cleared on reopen, never during streaming', () => {
  assert.ok(source.includes('const DISTILL_IDLE_MS = 120_000;'), 'the two-minute idle window');
  const start = source.indexOf('const DISTILL_IDLE_MS');
  const effectEnd = source.indexOf('}, [open, streaming, memory, sidecar]);', start);
  const effect = source.slice(start, effectEnd + '}, [open, streaming, memory, sidecar]);'.length);
  assert.ok(effect.includes('if (open || streaming || !memory || !lastTurnRef.current) return;'), 'only closed + idle + a completed turn');
  assert.match(effect, /setTimeout\(\(\) => \{[\s\S]*?memory\s*\n?\s*\.distill\(turn\)/, 'the last completed turn is distilled');
  assert.ok(effect.includes('return () => clearTimeout(timer);'), 'reopening or streaming clears the pending timer');
  assert.match(effect, /\}, \[open, streaming, memory, sidecar\]\);/, 'keyed on open/streaming so both re-arm the debounce');
});

test('CL.4: only a fully completed turn becomes the distill candidate', () => {
  const completion = source.indexOf('lastTurnRef.current = { question: text, answer: stripGuideCommands(response) };');
  assert.ok(completion > 0, 'the completed turn (question + stripped answer) is recorded');
  const send = source.slice(source.indexOf('const send = async'), source.indexOf('sendRef.current = send;'));
  assert.ok(send.indexOf('lastTurnRef.current') > send.indexOf('else if (!received) throw'), 'recorded only on the success path, after the empty-reply guard');
});
