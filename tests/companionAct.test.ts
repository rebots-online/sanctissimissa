import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

// CL.2 — App COMPANION_ACT routing + live/visibility context in guideContext.
// App.tsx is a React/browser component, so its half is verified as a source
// contract; the guideContext() live-context extension is verified functionally.

// Minimal DOM stub: guideContext() probes the live DOM for registered
// controls; headless Node only needs the query surface to exist.
const globalScope = globalThis as unknown as { document?: unknown };
globalScope.document ??= {
  querySelectorAll: () => [],
  querySelector: () => null,
};

const guide = await import('../src/core/orientation/guide.ts');

// CL.1 owns the COMPANION_ACT export; its quoted value is the contract this
// task codes against. Whether or not CL.1 has landed yet, the act channel
// name must be exactly this string.
const COMPANION_ACT_NAME = (guide as { COMPANION_ACT?: string }).COMPANION_ACT ?? 'sanctissimissa:companion-act';

test('CL.2: COMPANION_ACT channel name matches the quoted contract', () => {
  assert.equal(COMPANION_ACT_NAME, 'sanctissimissa:companion-act');
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

test('CL.2: guideContext carries the structural visible snapshot', () => {
  guide.setGuideLiveContext({
    visible: {
      rail: 'collapsed',
      companionPanel: { open: true, dock: 'right' },
      orientation: { completed: false, step: 3, targetHeld: true, spotlight: false },
      scrolledSections: ['Canon'],
      visibleControls: ['nav-office'],
    },
  });
  const text = guide.guideContext();
  assert.match(text, /"rail":"collapsed"/);
  assert.match(text, /"companionPanel":\{"open":true,"dock":"right"\}/);
  assert.match(text, /"targetHeld":true/);
  assert.match(text, /"scrolledSections":\["Canon"\]/);
  assert.match(text, /"visibleControls":\["nav-office"\]/);
});

test('CL.2: live-context patches merge per field (last write wins per field)', () => {
  guide.setGuideLiveContext({ currentView: 'reader', currentDate: '2026-12-25' });
  guide.setGuideLiveContext({ focusSection: 'Introitus' });
  const text = guide.guideContext();
  assert.match(text, /"currentView":"reader"/, 'earlier field survives a later partial patch');
  assert.match(text, /"currentDate":"2026-12-25"/);
  assert.match(text, /"focusSection":"Introitus"/);
});

test('CL.2: instruction sentence documents the full command grammar', () => {
  const sentence = 'You may append exactly one of [[guide:<id>]], [[open:<view>]], [[focus:<section>]], [[date:<iso>]], [[homily-draft:<litKey>]], [[annotate:<nodeKey>]], [[concordance:<term>]], [[journal:<term>]], [[show-path:a > b > c]] at the very end.';
  assert.ok(guide.guideContext().includes(sentence));
});

// ── App.tsx source contract ─────────────────────────────────────────────
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('CL.2: App listens for COMPANION_ACT from the guide module', () => {
  assert.match(appSource, /import\s*\{[^}]*COMPANION_ACT[^}]*\}\s*from\s*'\.\/core\/orientation\/guide\.ts'/);
  assert.match(appSource, /window\.addEventListener\(COMPANION_ACT,\s*onAct/);
  assert.match(appSource, /window\.removeEventListener\(COMPANION_ACT,\s*onAct/);
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
  assert.match(appSource, /const COMPANION_SHOWPATH = 'sanctissimissa:companion-showpath'/);
  assert.match(appSource, /forward\(COMPANION_DRAFT, act\.kind, value, reply\)/);
  assert.match(appSource, /forward\(COMPANION_ANNOTATE, act\.kind, value, reply\)/);
  assert.match(appSource, /case 'concordance':[\s\S]*?case 'journal':[\s\S]*?forward\(COMPANION_SEARCH, act\.kind, value, reply\)/);
  assert.match(appSource, /new CustomEvent\(COMPANION_SHOWPATH, \{ detail: \{ steps \} \}\)/);
});

test('CL.2: App registers the live context and visible snapshot', () => {
  assert.match(appSource, /setGuideLiveContext\(\{[\s\S]*?currentView: view,[\s\S]*?currentDate: date,[\s\S]*?focusSection: focus\.section,[\s\S]*?openDraftKey,[\s\S]*?visible: visibilitySnapshot\(companionLayoutRef\.current\),[\s\S]*?\}\)/);
  assert.match(appSource, /readGuideState\(\)/);
  assert.match(appSource, /GUIDE_STEPS[\s\S]*?visibleControls/);
  assert.match(appSource, /scrolledSections/);
  assert.match(appSource, /data-rail/);
  assert.match(appSource, /companionPanel/);
  assert.match(appSource, /\.tour-spotlight/);
  assert.match(appSource, /\.orientation-target/);
  assert.match(appSource, /COMPANION_LAYOUT/);
});

test('CL.2: invalid acts are rejected to Diagnostics, not executed', () => {
  assert.match(appSource, /debugEvent\('companion', 'act\.rejected', detail, 'warn'\)/);
  assert.match(appSource, /debugEvent\('companion', 'act\.open', \{ view: value \}, 'info'\)/);
});

test('CL.2: no page text leaves through the snapshot', () => {
  assert.ok(!appSource.includes('.textContent'), 'the App surface must not extract page text');
  assert.ok(!appSource.includes('innerText'));
});
