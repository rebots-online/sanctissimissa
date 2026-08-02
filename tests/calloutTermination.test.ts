/**
 * calloutTermination tests — BX.1R: terminating live callout placement.
 *
 * Three gates:
 *  (1) Behavioral idempotence of placementsEqual / reconcileCallout.
 *  (2) Source-contract loop guard over src/ui/BibleView.tsx (no browser run).
 *  (3) Termination simulation — a fixed point reached in exactly one mutation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  placementsEqual,
  reconcileCallout,
  type DOMRectLike,
  type FloatingCalloutPlacement,
} from '../src/core/ui/calloutPlacement.ts';

const bibleViewSrc = readFileSync(new URL('../src/ui/BibleView.tsx', import.meta.url), 'utf8');

const rect = (left: number, top: number, width: number, height: number): DOMRectLike => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

const place = (left: number, top: number, side: 'above' | 'below'): FloatingCalloutPlacement => ({
  left,
  top,
  side,
});

type CalloutState = { anchor: DOMRectLike; echo: unknown; placement?: FloatingCalloutPlacement };

describe('BX.1R (1) behavioral idempotence', () => {
  const rectA = rect(10, 20, 100, 30);
  const rectB = rect(11, 22, 100, 30);
  const placeA = place(10, 5, 'above');
  const placeB = place(10, 5, 'below');

  it('reconcileCallout returns the same reference when anchor and placement are unchanged', () => {
    const prev: CalloutState = { anchor: rectA, echo: {} as never, placement: placeA };
    assert.strictEqual(reconcileCallout(prev, rectA, placeA), prev);
  });

  it('reconcileCallout allocates a new reference when the anchor changes', () => {
    const prev: CalloutState = { anchor: rectA, echo: {} as never, placement: placeA };
    const next = reconcileCallout(prev, rectB, placeA);
    assert.notStrictEqual(next, prev);
    assert.strictEqual(next.anchor, rectB);
    assert.strictEqual(next.placement, placeA);
  });

  it('reconcileCallout allocates a new reference when the placement changes', () => {
    const prev: CalloutState = { anchor: rectA, echo: {} as never, placement: placeA };
    const next = reconcileCallout(prev, rectA, placeB);
    assert.notStrictEqual(next, prev);
    assert.strictEqual(next.anchor, rectA);
    assert.strictEqual(next.placement, placeB);
  });

  it('reconcileCallout allocates when placement was previously undefined', () => {
    const prev: CalloutState = { anchor: rectA, echo: {} as never };
    const next = reconcileCallout(prev, rectA, placeA);
    assert.notStrictEqual(next, prev);
    assert.strictEqual(next.placement, placeA);
  });

  it('placementsEqual is reflexive', () => {
    assert.strictEqual(placementsEqual(placeA, placeA), true);
  });

  it('placementsEqual is symmetric', () => {
    const a = place(1, 2, 'above');
    const b = place(1, 2, 'above');
    assert.strictEqual(placementsEqual(a, b), placementsEqual(b, a));
    assert.strictEqual(placementsEqual(a, b), true);
  });

  it('placementsEqual discriminates left, top and side', () => {
    const base = place(1, 2, 'above');
    assert.strictEqual(placementsEqual(base, place(2, 2, 'above')), false); // left
    assert.strictEqual(placementsEqual(base, place(1, 3, 'above')), false); // top
    assert.strictEqual(placementsEqual(base, place(1, 2, 'below')), false); // side
  });
});

describe('BX.1R (2) BibleView source-contract loop guard', () => {
  it('measurement effect is keyed on the echo identity, never on the whole callout', () => {
    // No effect may depend on the bare [callout] object.
    assert.ok(!/\[callout\]/.test(bibleViewSrc), 'no bare [callout] dependency array');
    // The measurement hook depends on callout?.echo (or callout.echo).
    assert.ok(
      /\[callout\?\.echo\]|\[callout\.echo\]/.test(bibleViewSrc),
      'measurement effect depends on callout?.echo',
    );
  });

  it('every measurement/resize setCallout updater goes through reconcileCallout', () => {
    // The pre-BX.1R unconditional spread must be gone.
    assert.ok(
      !/setCallout\(prev => prev \? \{\.\.\.prev, placement\}/.test(bibleViewSrc),
      'unconditional { ...prev, placement } spread removed',
    );
    // The updater must route through reconcileCallout.
    assert.ok(
      /setCallout\(prev => prev \? reconcileCallout\(/.test(bibleViewSrc),
      'setCallout updater uses reconcileCallout',
    );
  });

  it('resize path re-measures the live anchor element and never a stored hover-time rect', () => {
    // No placeFloatingCallout(callout.anchor, ...) — that would reuse the hover rect.
    assert.ok(
      !/placeFloatingCallout\(callout\.anchor/.test(bibleViewSrc),
      'no stored hover-time anchor fed to placeFloatingCallout',
    );
    // The live source element is captured via anchorElRef and re-measured.
    assert.ok(/anchorElRef\.current/.test(bibleViewSrc), 'anchorElRef.current is read');
    assert.ok(/getBoundingClientRect\(\)/.test(bibleViewSrc), 'live getBoundingClientRect call present');
  });

  it('a null/detached anchor element clears the callout', () => {
    // The detached-source guard exists and routes to setCallout(null).
    assert.ok(/isConnected/.test(bibleViewSrc), 'detached guard uses isConnected');
    assert.ok(
      /!\s*anchorEl\b[\s\S]{0,120}setCallout\(null\)/.test(bibleViewSrc),
      'null/detached anchorEl clears the callout',
    );
  });
});

describe('BX.1R (3) termination simulation', () => {
  it('reaches a fixed point in exactly one state mutation', () => {
    const anchor = rect(100, 200, 120, 24);
    const placement = place(100, 140, 'above');

    // Initial state mirrors showCallout: anchor + echo, NO placement yet.
    let state: CalloutState = { anchor, echo: {} as never };
    const updater = (prev: CalloutState): CalloutState =>
      reconcileCallout(prev, anchor, placement);

    let mutations = 0;

    const first = updater(state);
    assert.notStrictEqual(first, state, 'first apply mutates: placement was missing');
    state = first;
    mutations++;

    const second = updater(state);
    assert.strictEqual(second, first, 'second apply returns the same reference it received');
    // The second apply did not mutate state.

    assert.strictEqual(mutations, 1, 'fixed point reached in exactly one state mutation');
  });
});
