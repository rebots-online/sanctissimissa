/**
 * Companion badge presence scheduling (CP.5 → OG.11 / §H.5): the subtle
 * "I'm here" idle — an occasional soft presence pulse carrying the
 * alternating cross-signing/waving glyph, on a gentle 45–120 s jittered
 * band so the porthole feels present without nagging. Pure logic — the
 * badge component drives it with timers.
 */

export type BadgeGesture = 'cross' | 'wave';

export const PRESENCE_MIN_MS = 45_000;
export const PRESENCE_MAX_MS = 120_000;
export const GESTURE_DURATION_MS = 2_400;

/** Jittered idle delay before the next presence gesture (deterministic under a fixed rnd). */
export function nextGestureDelay(rnd: () => number = Math.random): number {
  return PRESENCE_MIN_MS + Math.floor(rnd() * (PRESENCE_MAX_MS - PRESENCE_MIN_MS));
}

/** Gestures alternate cross ↔ wave, starting with the cross. */
export function pickGesture(step: number): BadgeGesture {
  return step % 2 === 0 ? 'cross' : 'wave';
}

/** Reduced motion suppresses idle gestures (and the CSS breathing loop). */
export function badgeAnimationActive(reducedMotion: boolean): boolean {
  return !reducedMotion;
}
