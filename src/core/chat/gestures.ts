/**
 * Companion badge idle-gesture scheduling (CP.5): occasional cross-signing
 * and waving in the kintsugi/natally house style, on a jittered cadence.
 * Pure logic — the badge component drives it with timers.
 */

export type BadgeGesture = 'cross' | 'wave';

export const GESTURE_MIN_MS = 12_000;
export const GESTURE_MAX_MS = 20_000;
export const GESTURE_DURATION_MS = 2_400;

/** Jittered idle delay before the next gesture (deterministic under a fixed rnd). */
export function nextGestureDelay(rnd: () => number = Math.random): number {
  return GESTURE_MIN_MS + Math.floor(rnd() * (GESTURE_MAX_MS - GESTURE_MIN_MS));
}

/** Gestures alternate cross ↔ wave, starting with the cross. */
export function pickGesture(step: number): BadgeGesture {
  return step % 2 === 0 ? 'cross' : 'wave';
}

/** Reduced motion suppresses idle gestures (and the CSS breathing loop). */
export function badgeAnimationActive(reducedMotion: boolean): boolean {
  return !reducedMotion;
}
