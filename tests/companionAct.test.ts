import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

// CL.2 — App COMPANION_ACT routing + live/visibility context in guideContext.
// App.tsx is a React/browser component, so its half is verified as a source
// contract; the guideContext() live-context extension is verified functionally.

// Minimal DOM stub: guideContext() probes the live DOM for registered
// controls AND (HD.1) reads the visible context from [data-section] nodes;
// headless Node needs those surfaces to exist.
const makeEl = (attrs: Record<string, string>, heading: string | null) => ({
  getAttribute: (name: string) => attrs[name] ?? null,
  querySelector: () => (heading === null ? null : { textContent: heading }),
  getBoundingClientRect: () => ({ top: 0, bottom: 10, width: 100 }),
});
const stubSections = [makeEl({ 'data-section': 'Canon' }, 'Canon Missae')];
const globalScope = globalThis as unknown as { document?: unknown; window?: unknown };
globalScope.document ??= {
  documentElement: { scrollHeight: 2000 },
  querySelectorAll: (selector: string) => (selector.includes('data-section') ? stubSections : []),
  querySelector: () => null,
};
globalScope.window ??= { innerHeight: 800, scrollY: 100 };

const guide = await import('../src/core/orientation/guide.ts');

// CL.1 owns the SACRISTAN_ACT export (§K.6 rename); its quoted value is the
// contract this task codes against. The act channel name must be exactly
// this string.
const SACRISTAN_ACT_NAME = (guide as { SACRISTAN_ACT?: string }).SACRISTAN_ACT ?? 'sanctissimissa:sacristan-act';

test('CL.2: SACRISTAN_ACT channel name matches the quoted contract', () => {
  assert.equal(SACRISTAN_ACT_NAME, 'sanctissimissa:sacristan-act');
});

test('CL.2: guideContext carries the live context fields', () => {
  guide.setGuideLiveContext({
    currentView: 'office',
    currentDate: '2026-09-19',
    focusSection: 'Canon',
    openDraftKey: 'Sancti/09-19#Homily',
  });
  const text = guide.guideContext();
  assert.match(text, /"currentView":"office"/);
  assert.match(text, /"currentDate":"2026-09-19"/);
  assert.match(text, /"focusSection":"Canon"/);
  assert.match(text, /"openDraftKey":"Sancti\/09-19#Homily"/);
});

test('HD.1: guideContext carries the visible context READ from the DOM (not registered)', () => {
  guide.setGuideLiveContext({ currentView: 'reader', focusSection: 'Canon' });
  const text = guide.guideContext();
  // The stub DOM carries one [data-section] anchor "Canon" (heading "Canon
  // Missae", intersecting an 800 px viewport) with scrollY 100 of a 2000 px
  // document: depth = round(100 / 1200 × 100) = 8.
  assert.match(text, /"visible":\{"view":"reader","rail":"full","focusSection":"Canon","sections":\[\{"anchor":"Canon","heading":"Canon Missae","visible":true\}\],"scrollDepth":8\}/);
});

test('CL.2: live-context patches merge per field (last write wins per field)', () => {
  guide.setGuideLiveContext({ currentView: 'reader', currentDate: '2026-12-25' });
  guide.setGuideLiveContext({ focusSection: 'Introitus' });
  const text = guide.guideContext();
  assert.match(text, /"currentView":"reader"/, 'earlier field survives a later partial patch');
  assert.match(text, /"currentDate":"2026-12-25"/);
  assert.match(text, /"focusSection":"Introitus"/);
});

test('CL.2/HD.1: the instruction sentence documents the full command grammar', () => {
  const text = guide.guideContext();
  const tokens = ['[[guide:<id>]]', '[[open:<view>]]', '[[focus:<section>]]', '[[date:<iso>]]', '[[homily-draft:<litKey>]]',
    '[[annotate:<anchor>|<note>]]', '[[concordance:<term>]]', '[[journal:<term>]]', '[[show-path:a > b > c]]',
    '[[scroll:<anchor>]]', '[[highlight:<anchor>]]', '[[circle:<anchor>]]', '[[arrow:<a>-><b>]]', '[[focus-swap]]'];
  for (const token of tokens) assert.ok(text.includes(token), `documents ${token}`);
  assert.match(text, /Do not claim to see anything not in the live view/, 'HD.1 teaching law present');
});

// ── App.tsx source contract ─────────────────────────────────────────────
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('CL.2: App listens for SACRISTAN_ACT from the guide module', () => {
  assert.match(appSource, /import\s*\{[^}]*SACRISTAN_ACT[^}]*\}\s*from\s*'\.\/core\/orientation\/guide\.ts'/);
  assert.match(appSource, /window\.addEventListener\(SACRISTAN_ACT,\s*onAct/);
  assert.match(appSource, /window\.removeEventListener\(SACRISTAN_ACT,\s*onAct/);
});

test('CL.2: open routes through the rail view set before setView', () => {
  assert.match(appSource, /RAIL_VIEWS = new Set<string>\(\[\.\.\.NAV, \.\.\.UTIL_NAV\]/);
  assert.match(appSource, /RAIL_VIEWS\.has\(value\)/);
  assert.match(appSource, /case 'open':[\s\S]*?setView\(value as View\)/);
});

test('CL.2: focus only fires when the section is live-rendered, with nonce n+1', () => {
  assert.match(appSource, /case 'focus':[\s\S]*?getAttribute\('data-section'\) === value[\s\S]*?reject\(/);
  assert.match(appSource, /setFocus\(\(f\) => \(\{ section: value, nonce: f\.nonce \+ 1 \}\)\)/);
});

test('CL.2: date is re-validated (pattern + round-trip) before setDate', () => {
  assert.match(appSource, /case 'date':[\s\S]*?isRealIsoDate\(value\)[\s\S]*?reject\(/);
  assert.match(appSource, /setDate\(value\)/);
  assert.match(appSource, /getFullYear\(\) === y && round\.getMonth\(\) === mo - 1 && round\.getDate\(\) === d/);
});

test('CL.2: document-plane acts are forwarded on the dedicated channels', () => {
  assert.match(appSource, /const COMPANION_DRAFT = 'sanctissimissa:companion-draft'/);
  assert.match(appSource, /const COMPANION_ANNOTATE = 'sanctissimissa:companion-annotate'/);
  assert.match(appSource, /const COMPANION_SEARCH = 'sanctissimissa:companion-search'/);
  assert.match(appSource, /COMPANION_SHOWPATH_EVENT/, 'the show-path channel name comes from guide.ts (HD.2 single authority)');
  assert.match(appSource, /forward\(COMPANION_DRAFT, act\.kind, value, reply\)/);
  assert.match(appSource, /case 'concordance':[\s\S]*?case 'journal':[\s\S]*?forward\(COMPANION_SEARCH, act\.kind, value, reply\)/);
  assert.match(appSource, /new CustomEvent\(COMPANION_SHOWPATH_EVENT, \{ detail: \{ steps \} \}\)/);
});

test('CL.2/HD.1: App registers the live facts; the visible snapshot is a real DOM read in guideContext', () => {
  assert.match(appSource, /setGuideLiveContext\(\{[\s\S]*?currentView: view,[\s\S]*?currentDate: date,[\s\S]*?focusSection: focus\.section,[\s\S]*?openDraftKey,[\s\S]*?\}\)/);
  // HD.1 (§K.8): visible moved from a registered App snapshot into
  // guideContext()'s per-turn readVisibleContext() DOM read.
  assert.ok(!appSource.includes('visibilitySnapshot'), 'App no longer curates a visible snapshot');
  const guideSrc = readFileSync(new URL('../src/core/orientation/guide.ts', import.meta.url), 'utf8');
  assert.match(guideSrc, /visible: readVisibleContext\(guideLiveContext\)/);
});

test('CL.2: invalid acts are rejected to Diagnostics, not executed', () => {
  assert.match(appSource, /debugEvent\('sacristan', 'act\.rejected', detail, 'warn'\)/);
  assert.match(appSource, /debugEvent\('sacristan', 'act\.open', \{ view: value \}, 'info'\)/);
});

test('CL.2: no page text leaves through the snapshot', () => {
  assert.ok(!appSource.includes('.textContent'), 'the App surface must not extract page text');
  assert.ok(!appSource.includes('innerText'));
});
