/**
 * HD.2 (§K.8) — the didactic overlay: pure geometry (ellipse/arrow math) plus
 * the source contract for the React/browser component (the repo's established
 * discipline for DOM components under the Node test runner).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ellipseGeometry, arrowGeometry, DIDACTIC_GROW, DIDACTIC_FADE_MS } from '../src/ui/reader/didacticGeometry.ts';
import { readVisibleContext } from '../src/core/chat/visibleContext.ts';

/* ───────────────────────── pure geometry ──────────────────────────────── */

test('HD.2: an ellipse hugs the target rect grown by 8 px (OG.9 geometry)', () => {
  assert.equal(DIDACTIC_GROW, 8);
  const g = ellipseGeometry({ left: 100, top: 200, width: 60, height: 40 });
  assert.deepEqual(g, { cx: 130, cy: 220, rx: 38, ry: 28 });
  // A zero-size anchor still draws a minimum visible ring (8 px radius).
  assert.deepEqual(ellipseGeometry({ left: 0, top: 0, width: 0, height: 0 }), { cx: 0, cy: 0, rx: 8, ry: 8 });
});

test('HD.2: an arrow curves from A to B and lands an arrowhead at B', () => {
  const { path, head } = arrowGeometry({ left: 0, top: 0, width: 10, height: 10 }, { left: 100, top: 0, width: 10, height: 10 });
  assert.match(path, /^M 5 5 Q /, 'starts at A\'s center under quadratic control');
  assert.match(path, / 105 5$/, 'ends at B\'s center');
  // The bow is perpendicular: with a horizontal chord the control point lifts
  // off the chord line (y ≠ 5).
  const control = /Q (\d+) (\d+) /.exec(path);
  assert.ok(control, 'control point present');
  assert.notEqual(Number(control![2]), 5, 'the path curves — never a straight line');
  assert.match(head, /^M [\d-]+ [\d-]+ L [\d-]+ [\d-]+ L [\d-]+ [\d-]+ Z$/, 'arrowhead is a closed triangle at B');
});

test('HD.2: the arrowhead points along the approach tangent, into B', () => {
  const { head } = arrowGeometry({ left: 0, top: 0, width: 10, height: 10 }, { left: 0, top: 100, width: 10, height: 10 });
  const nums = head.match(/-?\d+/g)!.map(Number);
  // Tip (first pair) must sit below the base (second/third pairs): the head
  // points downward along a downward chord.
  const [tipX, tipY, baseX] = nums;
  assert.ok(tipY > baseX || tipY > nums[3], 'tip leads toward B');
  assert.equal(tipX > 0, true);
});

test('HD.2: non-annotated marks fade at 6 s (the contract constant)', () => {
  assert.equal(DIDACTIC_FADE_MS, 6000);
});

/* ───────────────────── HD.1 visible context (fake DOM) ────────────────── */

test('HD.1: readVisibleContext reads anchors, headings, visibility and depth from injected deps', () => {
  const el = (attrs: Record<string, string>, heading: string | null, rect: { top: number; bottom: number; width: number }) => ({
    getAttribute: (name: string) => attrs[name] ?? null,
    querySelector: () => (heading === null ? null : { textContent: heading }),
    getBoundingClientRect: () => ({ top: rect.top, bottom: rect.bottom, width: rect.width }),
  });
  const sections = [
    el({ 'data-section': 'Ordo/Missae/Canon' }, 'Canon Missae', { top: -50, bottom: 100, width: 300 }),
    el({ 'data-section': 'Offertorium' }, null, { top: 900, bottom: 1000, width: 300 }),
  ];
  const doc = {
    querySelectorAll: () => sections,
    querySelector: () => ({ getAttribute: () => 'icons' }),
  } as unknown as Document;
  const ctx = readVisibleContext(
    { currentView: 'reader', focusSection: 'Ordo/Missae/Canon' },
    { doc, viewportHeight: 800, scrollY: 100, scrollHeight: 2000 },
  );
  assert.equal(ctx.view, 'reader');
  assert.equal(ctx.rail, 'collapsed');
  assert.equal(ctx.focusSection, 'Ordo/Missae/Canon');
  assert.deepEqual(ctx.sections, [
    { anchor: 'Ordo/Missae/Canon', heading: 'Canon Missae', visible: true },
    { anchor: 'Offertorium', heading: '', visible: false },
  ]);
  assert.equal(ctx.scrollDepth, Math.round((100 / 1200) * 100));
});

test('HD.1: with no document (Node), the context degrades honestly — empty sections, no crash', () => {
  const ctx = readVisibleContext({ currentView: 'map' }, {});
  assert.deepEqual(ctx, { view: 'map', rail: 'full', focusSection: null, sections: [], scrollDepth: 0 });
});

/* ─────────────────────── overlay source contract ──────────────────────── */

const src = readFileSync(new URL('../src/ui/reader/DidacticOverlay.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('HD.2: the overlay is a pointer-events-none SVG layer below the Sacristan panel', () => {
  assert.match(src, /className="didactic-overlay"/);
  assert.match(src, /aria-hidden="true"/);
  assert.match(css, /\.didactic-overlay \{[^}]*pointer-events: none/);
  assert.match(css, /\.didactic-overlay \{[^}]*z-index: 54/, 'below .chat-panel (z-55) per the HD.2 contract');
});

test('HD.2: the overlay listens on the didactic channel and the show-path channel', () => {
  assert.match(src, /window\.addEventListener\(DIDACTIC_ACT, onDidactic\)/);
  assert.match(src, /window\.addEventListener\(COMPANION_SHOWPATH_EVENT, onShowPath\)/);
});

test('HD.2: marks clear on view change; nothing lingers across navigation', () => {
  assert.match(src, /useEffect\(\(\) => \{[\s\S]*?setMarks\(\[\]\);[\s\S]*?\}, \[view\]\)/);
});

test('HD.2: an anchor with no live element skips with a diagnostics record — never a faked mark', () => {
  assert.match(src, /'anchor-not-live'/);
  assert.match(src, /debugEvent\('didactic', 'mark\.skip'/);
});

test('HD.2: focus-swap recedes the panel by class and announces the layout change', () => {
  assert.match(src, /querySelector<HTMLElement>\('\.chat-panel'\)/);
  assert.match(src, /classList\.toggle\('receded', next\)/);
  assert.match(src, /new CustomEvent\(SACRISTAN_LAYOUT\)/);
  assert.match(css, /\.chat-panel\.receded \{[^}]*opacity: 0\.25/, 'the recede is visual, never an unmount');
});

test('HD.2: the draw is 600 ms with a reduced-motion static fallback; annotated circles persist', () => {
  assert.match(css, /didactic-draw 600ms/);
  assert.match(css, /prefers-reduced-motion[^]*didactic-circle[^]*stroke-dashoffset: 0/);
  assert.match(css, /\.didactic-circle\.annotated \{ animation: didactic-draw 600ms ease-out forwards; \}/);
});
