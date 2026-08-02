/**
 * calloutPlacement tests — pure placement logic verification.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { placeFloatingCallout, type DOMRectLike } from '../src/core/ui/calloutPlacement.ts';

const rect = (left: number, top: number, width: number, height: number): DOMRectLike => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

const size = (width: number, height: number) => ({ width, height });

describe('placeFloatingCallout', () => {
  const viewport = rect(0, 0, 1000, 800);

  it('places above when there is room above and below prefers above', () => {
    const anchor = rect(100, 400, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.side, 'above');
    assert.strictEqual(placement.top, anchor.top - 28 - box.height);
    assert.strictEqual(placement.left, anchor.left);
  });

  it('places below when above does not fit but below does', () => {
    const anchor = rect(100, 50, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.side, 'below');
    assert.strictEqual(placement.top, anchor.bottom + 28);
    assert.strictEqual(placement.left, anchor.left);
  });

  it('chooses side with more room when neither fully fits', () => {
    const anchor = rect(100, 30, 200, 20);
    const box = size(150, 100);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    const roomAbove = anchor.top - 8;
    const roomBelow = 800 - 8 - anchor.bottom;
    const expectedSide = roomAbove >= roomBelow ? 'above' : 'below';
    assert.strictEqual(placement.side, expectedSide);
  });

  it('clamps to viewport inset horizontally', () => {
    const anchor = rect(-20, 400, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.left, 8);
  });

  it('clamps to viewport inset horizontally on right edge', () => {
    const anchor = rect(900, 400, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.left, 1000 - 8 - 150);
  });

  it('clamps to viewport inset vertically above', () => {
    const anchor = rect(100, 10, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.side, 'below');
    assert.strictEqual(placement.top, anchor.bottom + 28);
  });

  it('clamps to viewport inset vertically below', () => {
    const anchor = rect(100, 780, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.side, 'above');
    assert.strictEqual(placement.top, anchor.top - 28 - box.height);
  });

  it('avoids intersecting anchor when both sides have room', () => {
    const anchor = rect(100, 100, 200, 100);
    const box = size(150, 80);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    const calloutTop = placement.top;
    const calloutBottom = placement.top + box.height;
    
    const intersects = calloutBottom > anchor.top && calloutTop < anchor.bottom;
    assert.strictEqual(intersects, false);
  });

  it('handles two-line callout size', () => {
    const anchor = rect(100, 400, 200, 20);
    const box = size(150, 40);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.side, 'above');
    assert.strictEqual(placement.top, anchor.top - 28 - box.height);
  });

  it('handles five-line callout size', () => {
    const anchor = rect(100, 400, 200, 20);
    const box = size(150, 100);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.side, 'above');
    assert.strictEqual(placement.top, anchor.top - 28 - box.height);
  });

  it('prefers above for middle anchor with equal room', () => {
    const anchor = rect(100, 390, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    assert.strictEqual(placement.side, 'above');
  });

  it('places below for bottom anchor when above has less room', () => {
    const anchor = rect(100, 600, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport);
    
    const roomAbove = anchor.top - 8;
    const roomBelow = 800 - 8 - anchor.bottom;
    if (roomBelow > roomAbove) {
      assert.strictEqual(placement.side, 'below');
    }
  });

  it('handles custom gap parameter', () => {
    const anchor = rect(100, 400, 200, 20);
    const box = size(150, 60);
    const placement = placeFloatingCallout(anchor, box, viewport, 24);
    
    assert.strictEqual(placement.top, anchor.top - 24 - box.height);
  });
});