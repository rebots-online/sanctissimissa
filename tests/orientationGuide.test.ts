import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/ui/OrientationGuide.tsx', import.meta.url), 'utf8');

test('OG.7: whole-card drag — pointer handlers sit on both card roots, not only on the <strong>', () => {
  const asides = source.match(/<aside[\s\S]*?>/g) ?? [];
  assert.equal(asides.length, 2, 'exactly two card asides: offer and guide');
  for (const aside of asides) {
    assert.match(aside, /onPointerDown=\{onCardPointerDown\}/, 'card root carries onPointerDown');
    assert.match(aside, /onPointerMove=\{onCardPointerMove\}/, 'card root carries onPointerMove');
    assert.match(aside, /onPointerUp=\{endCardDrag\}/, 'card root carries onPointerUp');
    assert.match(aside, /onKeyDown=\{onCardKeyDown\}/, 'card root carries the keyboard handler');
    assert.match(aside, /tabIndex=\{0\}/, 'card root is focusable');
  }
  const headings = source.match(/<strong[\s\S]*?>/g) ?? [];
  assert.ok(headings.length >= 2, 'both cards keep their headings');
  for (const heading of headings) {
    assert.doesNotMatch(heading, /onPointer/, 'the heading is no longer the drag surface');
  }
});

test('OG.7: placement validation imports resolveGuidePlacement from the OG.6 layout module and runs it in an effect', () => {
  const importMatch = /import \{([^}]+)\} from '\.\.\/core\/orientation\/layout\.ts';/.exec(source);
  assert.ok(importMatch, "imports from '../core/orientation/layout.ts'");
  assert.match(importMatch[1], /\boccupiedRects\b/, 'occupiedRects imported');
  assert.match(importMatch[1], /\bresolveGuidePlacement\b/, 'resolveGuidePlacement imported');
  const callIndex = source.indexOf('resolveGuidePlacement(');
  const effectStart = source.lastIndexOf('useEffect(', callIndex);
  assert.ok(effectStart >= 0, 'resolveGuidePlacement is referenced inside an effect');
  const effectEnd = source.indexOf(']);', effectStart) + 3;
  const effect = source.slice(effectStart, effectEnd);
  assert.ok(effect.includes('occupiedRects(document)'), 'effect measures the occupied workspace');
  assert.ok(effect.includes('readGuidePos()'), 'effect passes the saved position to the resolver');
  assert.ok(effect.includes('window.innerWidth') && effect.includes('window.innerHeight'), 'viewport from innerWidth/innerHeight');
  assert.ok(effect.includes('saveGuidePos('), 'a changed placement is persisted');
  assert.ok(effect.includes("'compact'"), 'compact result handled');
  assert.ok(effect.includes('validatePlacement();'), 'effect runs on mount');
  assert.ok(effect.includes("window.addEventListener('resize', validatePlacement)"), 'revalidates on window resize');
  assert.ok(effect.includes('START_GUIDE, validatePlacement'), 'revalidates on START_GUIDE');
  assert.ok(effect.includes('COMPANION_LAYOUT, validatePlacement'), 'revalidates on COMPANION_LAYOUT (panel layout announcement)');
  assert.ok(effect.includes('new ResizeObserver(validatePlacement)'), 'ResizeObserver attached');
  assert.ok(effect.includes('observer.observe(document.documentElement)'), 'observing document.documentElement');
  assert.ok(effect.includes('observer.disconnect()'), 'observer disconnected on unmount');
  assert.match(effect, /\}, \[step\]\);$/, 'revalidates on every step change');
});

test('OG.7: affordances — grip, drag hint, compact class, reset button, disclosures', () => {
  assert.equal((source.match(/className="orientation-grip"/g) ?? []).length, 2, 'grip rendered in both card headers');
  assert.equal((source.match(/className="orientation-drag-hint"/g) ?? []).length, 2, 'drag hint rendered in both card headers');
  assert.ok((source.match(/orientation-compact/g) ?? []).length >= 2, 'both cards take the compact class');
  assert.equal((source.match(/>Reset position</g) ?? []).length, 2, 'visible Reset position button on both action rows');
  assert.ok(source.includes('tabIndex={0}'), 'tabIndex={0} present');
  assert.ok(source.includes('aria-hidden="true"'), 'grip is aria-hidden');
  assert.equal((source.match(/<details><summary>Details<\/summary>/g) ?? []).length, 2, 'compact disclosures on both cards');
  assert.ok(source.includes('⠿'), 'grip glyph');
  assert.ok(source.includes('Drag to move'), 'hint text');
  assert.ok(source.includes('?? 340') && source.includes('?? 200'), 'card-size fallback 340x200');
});

test('OG.7: drag engages only after more than 4 px of travel; a sub-threshold release stays an ordinary click', () => {
  assert.match(source, /const DRAG_THRESHOLD = 4;/, 'threshold constant is 4 px');
  const downStart = source.indexOf('const onCardPointerDown');
  const moveStart = source.indexOf('const onCardPointerMove');
  const upStart = source.indexOf('const endCardDrag');
  const resetStart = source.indexOf('const resetPlacement');
  const keyStart = source.indexOf('const onCardKeyDown');
  assert.ok(downStart >= 0 && moveStart > downStart && upStart > moveStart && resetStart > upStart && keyStart > resetStart,
    'expected handlers exist');
  const downBody = source.slice(downStart, moveStart);
  const moveBody = source.slice(moveStart, upStart);
  const upBody = source.slice(upStart, resetStart);
  assert.ok(!downBody.includes('preventDefault'), 'pointer-down never preventDefaults, so buttons/links keep working');
  const gate = moveBody.indexOf('DRAG_THRESHOLD');
  assert.ok(gate >= 0, 'move handler decides engagement against the threshold');
  assert.ok(/<= DRAG_THRESHOLD|> DRAG_THRESHOLD/.test(moveBody), 'engagement compares travel to the 4 px threshold');
  assert.ok(gate < moveBody.indexOf("classList.add('dragging')"), 'dragging class only after engagement');
  assert.ok(gate < moveBody.indexOf('setPointerCapture'), 'pointer capture only after engagement');
  assert.ok(moveBody.includes('clampGuidePos('), 'drag moves run through clampGuidePos');
  assert.ok(moveBody.includes('card.offsetWidth') && moveBody.includes('card.offsetHeight'), 'clamped with the live card size');
  assert.ok(upBody.includes('saveGuidePos('), 'pointer-up persists the dragged position');
});

test('OG.7: keyboard placement — arrows nudge 16 px, Shift+arrows 96 px, Home and Reset position resolve the default', () => {
  const resetStart = source.indexOf('const resetPlacement');
  const keyStart = source.indexOf('const onCardKeyDown');
  const keyEnd = source.indexOf('const leave');
  const resetBody = source.slice(resetStart, keyStart);
  const keyBody = source.slice(keyStart, keyEnd);
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    assert.ok(keyBody.includes(key), `${key} handled`);
  }
  assert.match(keyBody, /event\.shiftKey \? 96 : 16/, '16 px nudge, 96 px with Shift');
  assert.ok(keyBody.includes('clampGuidePos('), 'nudges are clamped');
  assert.ok(keyBody.includes('saveGuidePos('), 'nudges persist');
  assert.ok(keyBody.includes("'Home'"), 'Home key handled');
  assert.ok(keyBody.includes('resetPlacement()'), 'Home performs the shared reset');
  assert.ok(resetBody.includes('resolveGuidePlacement('), 'reset resolves placement');
  assert.ok(/,\s*null,?\s*\)/.test(resetBody), 'reset asks for the default placement (saved = null)');
  assert.ok(resetBody.includes('saveGuidePos('), 'reset persists');
  assert.ok(resetBody.includes("'compact'"), 'reset honors the compact fallback');
});

test('OG.7: existing orientation semantics are preserved', () => {
  for (const needle of ['Start orientation', 'Later', 'Show me', 'Ask Companion to explain', 'Back', 'Next', 'Finish orientation',
    'Continue later', 'Close guide', 'GUIDE_STEPS', 'START_GUIDE', 'GUIDE_CHANGED', 'OPEN_COMPANION', 'activateGuide',
    'highlightGuide', 'clearGuide', 'saveGuideState', 'readGuideState', 'Would you like a short tour?',
    'This control is not visible just now.']) {
    assert.ok(source.includes(needle), `preserved: ${needle}`);
  }
});
