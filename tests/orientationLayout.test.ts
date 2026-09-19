import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORIENTATION_GAP,
  occupiedRects,
  resolveGuidePlacement,
} from '../src/core/orientation/layout.ts';
import type { OccupiedRect } from '../src/core/orientation/layout.ts';

const VIEWPORT = { w: 1280, h: 800 };
const CARD = { w: 340, h: 200 };
// Right-docked Companion chat panel covering the right edge of the viewport.
const RIGHT_PANEL: OccupiedRect = { left: 924, top: 0, width: 356, height: 800 };

test('ORIENTATION_GAP is 8 px', () => {
  assert.equal(ORIENTATION_GAP, 8);
});

test('valid saved position is returned unchanged', () => {
  const saved = { left: 400, top: 300 };
  assert.deepEqual(resolveGuidePlacement(VIEWPORT, [RIGHT_PANEL], CARD, saved), saved);
});

test('saved position off-screen is rejected and a valid anchor is chosen instead', () => {
  const saved = { left: 2000, top: 300 };
  const result = resolveGuidePlacement(VIEWPORT, [], CARD, saved);
  assert.notDeepEqual(result, saved);
  // Nothing occupied: the top-right anchor is the first valid candidate.
  assert.deepEqual(result, { left: 924, top: 64 });
});

test('saved position intersecting a right-docked panel is rejected; top-left wins when both right anchors are blocked', () => {
  const saved = { left: 950, top: 100 };
  const result = resolveGuidePlacement(VIEWPORT, [RIGHT_PANEL], CARD, saved);
  if (result === 'compact') throw new Error('expected a resolved placement, got compact');
  assert.notDeepEqual(result, saved);
  // Right-docked panel blocks both right anchors; top-left is the first free one.
  assert.deepEqual(result, { left: 16, top: 64 });
});

test('empty occupied list resolves to the top-right anchor', () => {
  assert.deepEqual(resolveGuidePlacement(VIEWPORT, [], CARD, null), { left: 924, top: 64 });
});

test('all four corner anchors blocked resolves to compact', () => {
  const occupied: OccupiedRect[] = [
    { left: 900, top: 0, width: 380, height: 800 }, // full-height right column
    { left: 0, top: 0, width: 400, height: 800 }, // full-height left column
  ];
  assert.equal(resolveGuidePlacement(VIEWPORT, occupied, CARD, null), 'compact');
});

test('outputs are integers for saved and anchor results', () => {
  const fromSaved = resolveGuidePlacement(VIEWPORT, [], CARD, { left: 400.6, top: 300.4 });
  if (fromSaved === 'compact') throw new Error('expected a resolved placement, got compact');
  assert.equal(Number.isInteger(fromSaved.left), true);
  assert.equal(Number.isInteger(fromSaved.top), true);
  assert.deepEqual(fromSaved, { left: 401, top: 300 });

  const fromAnchor = resolveGuidePlacement({ w: 1280.7, h: 800.3 }, [], CARD, null);
  if (fromAnchor === 'compact') throw new Error('expected a resolved placement, got compact');
  assert.equal(Number.isInteger(fromAnchor.left), true);
  assert.equal(Number.isInteger(fromAnchor.top), true);
});

test('occupiedRects keeps visible elements only, in selector order, rounded to integers', () => {
  const chatPanel = { left: 923.6, top: 0.4, width: 356.2, height: 799.5 };
  const rail = { left: 0.2, top: 0, width: 72.4, height: 800.2 };
  const zeroHeightMasthead = { left: 0, top: 0, width: 1280, height: 0 };
  const root = {
    querySelector: (selector: string): { getBoundingClientRect: () => unknown } | null => {
      switch (selector) {
        case '.chat-panel':
          return { getBoundingClientRect: () => chatPanel };
        case '.rail':
          return { getBoundingClientRect: () => rail };
        case '.masthead':
          return { getBoundingClientRect: () => zeroHeightMasthead };
        default:
          return null;
      }
    },
  } as unknown as Document;
  assert.deepEqual(occupiedRects(root), [
    { left: 924, top: 0, width: 356, height: 800 },
    { left: 0, top: 0, width: 72, height: 800 },
  ]);
});

test('occupiedRects skips absent elements entirely', () => {
  const root = {
    querySelector: (selector: string): { getBoundingClientRect: () => unknown } | null =>
      selector === '.chat-panel'
        ? { getBoundingClientRect: () => ({ left: 10, top: 20, width: 30, height: 40 }) }
        : null,
  } as unknown as Document;
  assert.deepEqual(occupiedRects(root), [{ left: 10, top: 20, width: 30, height: 40 }]);
});
