import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// OG.9 — Tour spotlight: dim veil + halo cutout (§H.3), including the
// target-side attention amendment. OrientationGuide is a React/browser
// component, so the contract is verified against source + the appended CSS.

const source = readFileSync(new URL('../src/ui/OrientationGuide.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('OG.9: the spotlight overlay renders the three contract classes under an aria-hidden veil', () => {
  assert.match(source, /\{spotRect && <div className="tour-spotlight" aria-hidden="true">/,
    'the overlay renders only while a cutout rect is held, and the veil carries aria-hidden');
  assert.match(source, /className="tour-spotlight-cutout"/, 'the transparent cutout element');
  assert.match(source, /className="tour-spotlight-halo"/, 'the gold halo ring element');
});

test('OG.9: the cutout hugs the live .orientation-target rect grown 8 px', () => {
  assert.match(source, /const SPOTLIGHT_GROW = 8;/, 'grow constant is 8 px');
  assert.match(source, /document\.querySelector<HTMLElement>\('\.orientation-target'\)/,
    'the live highlighted target is queried directly');
  assert.match(source, /left: Math\.round\(rect\.left - SPOTLIGHT_GROW\)/);
  assert.match(source, /top: Math\.round\(rect\.top - SPOTLIGHT_GROW\)/);
  assert.match(source, /width: Math\.round\(rect\.width \+ SPOTLIGHT_GROW \* 2\)/);
  assert.match(source, /height: Math\.round\(rect\.height \+ SPOTLIGHT_GROW \* 2\)/);
});

test('OG.9: the cutout recomputes on resize, scroll, and the §D validation triggers', () => {
  const start = source.indexOf('const held = active || path !== null;');
  const end = source.indexOf('}, [active, path, step, pointed]);', start);
  assert.ok(start >= 0 && end > start, 'the spotlight tracking effect exists');
  const effect = source.slice(start, end);
  for (const trigger of [
    "window.addEventListener('resize', recompute)",
    "window.addEventListener('scroll', recompute, { capture: true, passive: true })",
    'window.addEventListener(COMPANION_LAYOUT, recompute)', // a §D validation trigger
    'window.addEventListener(GUIDE_CHANGED, recompute)', // the held target changed
    'new ResizeObserver(recompute)',
    'observer.observe(document.documentElement)',
  ]) {
    assert.ok(effect.includes(trigger), `recompute trigger present: ${trigger}`);
  }
  for (const removal of [
    "window.removeEventListener('resize', recompute)",
    "window.removeEventListener('scroll', recompute, true)",
    'window.removeEventListener(COMPANION_LAYOUT, recompute)',
    'window.removeEventListener(GUIDE_CHANGED, recompute)',
    'observer.disconnect()',
  ]) {
    assert.ok(effect.includes(removal), `cleanup present: ${removal}`);
  }
});

test('OG.9: no spotlight renders when no target is highlighted', () => {
  assert.match(source, /const held = active \|\| path !== null;/,
    'the veil belongs to the card-held grammar (tour step or show-path step), not a bare companion pointer');
  assert.match(source, /if \(!held\) \{ setSpotRect\(null\); return; \}/,
    'card not holding a target — overlay cleared');
  assert.match(source, /if \(!target \|\| !rect \|\| rect\.width <= 0\) \{ setSpotRect\(null\); return; \}/,
    'no live .orientation-target element — overlay cleared');
  assert.match(source, /\{spotRect && /, 'the overlay mounts only from a held rect');
});

test('OG.9: styles.css — whole overlay is pointer-events: none and z-orders under the card', () => {
  for (const rule of ['.tour-spotlight {', '.tour-spotlight-cutout {', '.tour-spotlight-halo {']) {
    const at = css.indexOf(rule);
    assert.ok(at >= 0, `rule exists: ${rule}`);
    const body = css.slice(at, css.indexOf('}', at));
    assert.match(body, /pointer-events: none/, `${rule} carries pointer-events: none — the target stays directly clickable`);
  }
  assert.match(css, /\.tour-spotlight \{ position: fixed; inset: 0; z-index: 84; pointer-events: none; \}/,
    'fixed full-viewport overlay below the card');
  assert.match(css, /\.orientation-offer, \.orientation-guide \{[^\n]*z-index: 85;/,
    'the orientation card stays above the veil');
});

test('OG.9: styles.css — the veil dims at most 50% and the cutout itself stays transparent', () => {
  const at = css.indexOf('.tour-spotlight-cutout {');
  assert.ok(at >= 0, '.tour-spotlight-cutout rule exists');
  const rule = css.slice(at, css.indexOf('}', at));
  const veil = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/.exec(rule);
  assert.ok(veil, 'the veil is painted by a translucent rgba spread');
  assert.ok(Number(veil[1]) <= 0.5, `veil alpha ${veil[1]} dims at most 50% — the Mass stays visible through it`);
  assert.ok(!/background/.test(rule), 'the cutout paints no background of its own');
});

test('OG.9: styles.css — gold halo ring with a soft pulse; reduced-motion keeps it a static ring', () => {
  const at = css.indexOf('.tour-spotlight-halo {');
  assert.ok(at >= 0, '.tour-spotlight-halo rule exists');
  const rule = css.slice(at, css.indexOf('}', at));
  assert.match(rule, /border: 2px solid var\(--gold/, 'the ring is gold');
  assert.match(rule, /animation: tour-halo-pulse/, 'the ring pulses softly');
  assert.match(css, /@keyframes tour-halo-pulse/, 'pulse keyframes exist');
  assert.match(css, /\.tour-spotlight-halo \{ animation: none; \}/,
    'prefers-reduced-motion: reduce — static ring, no pulse');
});

test('OG.9 (§H.3 amendment): a held target waves/tilts — rotate ±2.5°, 1 px bob, 0.9 s, 2 iterations', () => {
  assert.match(css, /\.orientation-target:not\(\.orientation-showing\) \{ animation: orientation-attention 0\.9s ease-in-out 2; \}/,
    '0.9 s, exactly 2 iterations; :not(.orientation-showing) leaves the §D Show-me pulse its own animation — one shared grammar, no clobbering');
  const keyframes = css.slice(css.indexOf('@keyframes orientation-attention'), css.indexOf('/* reduced-motion: no wave'));
  assert.match(keyframes, /rotate\(2\.5deg\)/, 'tilt +2.5°');
  assert.match(keyframes, /rotate\(-2\.5deg\)/, 'tilt −2.5°');
  assert.match(keyframes, /translateY\(-1px\)/, '1 px bob up');
  assert.match(keyframes, /translateY\(1px\)/, '1 px bob down');
  assert.match(css, /\.orientation-target:not\(\.orientation-showing\) \{ animation: none; transform: none; \}/,
    'reduced-motion: no wave — transform none (same specificity as the wave rule, so it wins)');
});

test('OG.9 (§H.3 amendment): a held target flips to high contrast', () => {
  const at = css.indexOf('.orientation-target {', css.indexOf('§H.3 amendment'));
  assert.ok(at >= 0, 'the appended attention flip rule exists');
  const rule = css.slice(at, css.indexOf('}', at));
  assert.match(rule, /background: var\(--card/, 'surface --card');
  assert.match(rule, /border: 2px solid var\(--gold/, '2 px --gold border');
  assert.match(rule, /color: var\(--ink/, 'darkened ink');
});

test('OG.9: the overlay class is the one App\'s visibility snapshot probes (CL.2 channel)', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(appSource, /document\.querySelector\('\.tour-spotlight'\)/,
    'CL.2\'s visible snapshot reads exactly this overlay');
});
