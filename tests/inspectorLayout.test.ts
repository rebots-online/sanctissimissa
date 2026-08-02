/**
 * Tests for inspectorLayout utilities (BX.2).
 * Pure tests: no storage, no DOM, deterministic clamping.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  clampInspectorWidth,
  getMaxInspectorWidth,
  isNarrowViewport,
  DEFAULT_INSPECTOR_WIDTH,
  MIN_INSPECTOR_WIDTH,
  MAX_INSPECTOR_WIDTH,
  MAX_VIEWPORT_FRACTION,
  type InspectorWidth,
} from '../src/core/ui/inspectorLayout.ts';

describe('BX.2 inspectorLayout', () => {
  describe('clampInspectorWidth', () => {
    it('returns null for null preference (inspector hidden)', () => {
      const result = clampInspectorWidth(null, 1200);
      assert.strictEqual(result, null);
    });

    it('uses default for non-finite preferences', () => {
      assert.strictEqual(clampInspectorWidth(NaN, 1200), DEFAULT_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(Infinity, 1200), DEFAULT_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(-Infinity, 1200), DEFAULT_INSPECTOR_WIDTH);
    });

    it('uses default for invalid types', () => {
      assert.strictEqual(clampInspectorWidth(undefined as any, 1200), DEFAULT_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth('340' as any, 1200), DEFAULT_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth({} as any, 1200), DEFAULT_INSPECTOR_WIDTH);
    });

    it('enforces minimum width of 280px', () => {
      assert.strictEqual(clampInspectorWidth(100, 1200), MIN_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(200, 1200), MIN_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(279, 1200), MIN_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(280, 1200), MIN_INSPECTOR_WIDTH);
    });

    it('enforces absolute maximum of 720px', () => {
      assert.strictEqual(clampInspectorWidth(1000, 2000), MAX_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(800, 2000), MAX_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(720, 2000), MAX_INSPECTOR_WIDTH);
    });

    it('enforces viewport fraction maximum (60%)', () => {
      const viewport = 800;
      const fractionMax = Math.floor(viewport * MAX_VIEWPORT_FRACTION); // 480
      assert.strictEqual(getMaxInspectorWidth(viewport), fractionMax);
      assert.strictEqual(clampInspectorWidth(500, viewport), fractionMax);
      assert.strictEqual(clampInspectorWidth(600, viewport), fractionMax);
    });

    it('chooses smaller of absolute max and fraction max', () => {
      // At 1000px viewport: fraction max = 600, absolute max = 720
      assert.strictEqual(getMaxInspectorWidth(1000), 600);
      assert.strictEqual(clampInspectorWidth(700, 1000), 600);

      // At 1500px viewport: fraction max = 900, absolute max = 720
      assert.strictEqual(getMaxInspectorWidth(1500), MAX_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(800, 1500), MAX_INSPECTOR_WIDTH);
    });

    it('passes through valid preferences within range', () => {
      assert.strictEqual(clampInspectorWidth(340, 1200), 340);
      assert.strictEqual(clampInspectorWidth(400, 1200), 400);
      assert.strictEqual(clampInspectorWidth(500, 1200), 500);
    });

    it('is idempotent (clamping the same value twice gives same result)', () => {
      const viewport = 1200;
      const inputs = [100, 280, 340, 500, 800, NaN, null];

      for (const input of inputs) {
        const first = clampInspectorWidth(input, viewport);
        const second = clampInspectorWidth(first, viewport);
        assert.strictEqual(second, first, `Idempotency failed for input: ${input}`);
      }
    });

    it('responds deterministically to viewport changes', () => {
      const preference = 500;

      // Narrow viewport: should clamp to 60%
      assert.strictEqual(clampInspectorWidth(preference, 800), 480);

      // Wide viewport: should pass through (below absolute max)
      assert.strictEqual(clampInspectorWidth(preference, 1200), 500);

      // Very wide viewport: should clamp to viewport fraction max (60%), not absolute max
      // At 2000px viewport: 60% = 1200, but absolute max is 720
      // So the preference of 500 should pass through since it's below 720
      assert.strictEqual(clampInspectorWidth(preference, 2000), 500);
    });

    it('handles viewport changes for stored preferences', () => {
      const stored = 400; // User preference

      // User stored 400px; viewport shrinks to 700px (max = 420)
      const narrowResult = clampInspectorWidth(stored, 700);
      assert.strictEqual(narrowResult, 400); // Still valid

      // User stored 400px; viewport expands to 1000px (max = 600)
      const wideResult = clampInspectorWidth(stored, 1000);
      assert.strictEqual(wideResult, 400); // Still valid
    });

    it('clamps out-of-range preferences to valid range', () => {
      // Below minimum
      assert.strictEqual(clampInspectorWidth(200, 1000), MIN_INSPECTOR_WIDTH);

      // Above viewport fraction max
      assert.strictEqual(clampInspectorWidth(500, 700), 420);

      // Above absolute max
      assert.strictEqual(clampInspectorWidth(1000, 1500), MAX_INSPECTOR_WIDTH);
    });

    it('handles edge case preferences', () => {
      assert.strictEqual(clampInspectorWidth(0, 1000), MIN_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(-100, 1000), MIN_INSPECTOR_WIDTH);
      assert.strictEqual(clampInspectorWidth(280.5, 1000), 280.5);
      assert.strictEqual(clampInspectorWidth(719.9, 2000), 719.9);
    });
  });

  describe('getMaxInspectorWidth', () => {
    it('returns 60% of viewport for narrow viewports', () => {
      assert.strictEqual(getMaxInspectorWidth(500), 300);
      assert.strictEqual(getMaxInspectorWidth(800), 480);
      assert.strictEqual(getMaxInspectorWidth(1000), 600);
      assert.strictEqual(getMaxInspectorWidth(1200), 720);
    });

    it('caps at absolute max of 720px for wide viewports', () => {
      assert.strictEqual(getMaxInspectorWidth(1300), MAX_INSPECTOR_WIDTH);
      assert.strictEqual(getMaxInspectorWidth(1500), MAX_INSPECTOR_WIDTH);
      assert.strictEqual(getMaxInspectorWidth(2000), MAX_INSPECTOR_WIDTH);
      assert.strictEqual(getMaxInspectorWidth(4000), MAX_INSPECTOR_WIDTH);
    });

    it('returns integer values', () => {
      const result = getMaxInspectorWidth(850);
      assert.strictEqual(Number.isInteger(result), true);
    });
  });

  describe('isNarrowViewport', () => {
    it('returns true for viewports below 860px', () => {
      assert.strictEqual(isNarrowViewport(859), true);
      assert.strictEqual(isNarrowViewport(800), true);
      assert.strictEqual(isNarrowViewport(640), true);
      assert.strictEqual(isNarrowViewport(480), true);
    });

    it('returns false for viewports at or above 860px', () => {
      assert.strictEqual(isNarrowViewport(860), false);
      assert.strictEqual(isNarrowViewport(900), false);
      assert.strictEqual(isNarrowViewport(1200), false);
      assert.strictEqual(isNarrowViewport(1920), false);
    });
  });

  describe('preference bounds validation', () => {
    it('all valid preferences are within [MIN_INSPECTOR_WIDTH, MAX_INSPECTOR_WIDTH]', () => {
      const minMax = getMaxInspectorWidth(2000);
      assert.strictEqual(minMax, MAX_INSPECTOR_WIDTH);

      const testPreference = 400;
      const clamped = clampInspectorWidth(testPreference, 2000);
      assert.ok(clamped !== null && clamped >= MIN_INSPECTOR_WIDTH);
      assert.ok(clamped !== null && clamped <= MAX_INSPECTOR_WIDTH);
    });

    it('fraction maximum never exceeds absolute maximum', () => {
      const viewports = [500, 800, 1000, 1200, 1500, 2000];

      for (const viewport of viewports) {
        const max = getMaxInspectorWidth(viewport);
        assert.strictEqual(max <= MAX_INSPECTOR_WIDTH, true, `Max for ${viewport}px viewport: ${max}`);
      }
    });
  });

  describe('deterministic behavior', () => {
    it('same inputs always produce same outputs', () => {
      const inputs: [InspectorWidth, number][] = [
        [null, 1200],
        [340, 1200],
        [500, 800],
        [NaN, 1000],
        [200, 1500],
        [800, 2000],
      ];

      for (const [pref, viewport] of inputs) {
        const result1 = clampInspectorWidth(pref, viewport);
        const result2 = clampInspectorWidth(pref, viewport);
        assert.strictEqual(result2, result1);
      }
    });

    it('clamp order does not matter for idempotent values', () => {
      const viewport = 1000;
      const preference = 400;

      const direct = clampInspectorWidth(preference, viewport);
      const doubleClamp = clampInspectorWidth(clampInspectorWidth(preference, viewport), viewport);

      assert.strictEqual(doubleClamp, direct);
    });
  });
});