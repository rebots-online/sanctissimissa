/**
 * Orientation placement module (ARCHITECTURE amendment 2026-09-18 §D).
 *
 * Pure geometry for placing the orientation cards (`.orientation-offer`,
 * `.orientation-guide`) so they never sit on top of occupied workspace
 * furniture — the right-docked Companion chat panel, the rail, the masthead.
 */

/** Gap kept between a placed card and every occupied rect (px, grown on every side). */
export const ORIENTATION_GAP = 8;

/** Viewport inset a placed card must respect on all four sides (px). */
const VIEWPORT_INSET = 8;

/** Axis-aligned rectangle in viewport CSS-pixel coordinates. */
export interface OccupiedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Selectors of workspace furniture the cards must avoid, in query order. */
const OCCUPIED_SELECTORS: readonly string[] = ['.chat-panel', '.rail', '.masthead'];

/** Live viewport rects of the first `.chat-panel`, `.rail`, and `.masthead` in `root`. */
export function occupiedRects(root: Document): OccupiedRect[] {
  const rects: OccupiedRect[] = [];
  for (const selector of OCCUPIED_SELECTORS) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const box = el.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      rects.push({
        left: Math.round(box.left),
        top: Math.round(box.top),
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }
  }
  return rects;
}

type CardSize = { w: number; h: number };
type Point = { left: number; top: number };

/** Does the card at (left, top) fit fully inside the viewport with the 8 px inset? */
function fitsViewport(left: number, top: number, card: CardSize, viewport: { w: number; h: number }): boolean {
  return (
    left >= VIEWPORT_INSET &&
    top >= VIEWPORT_INSET &&
    left + card.w <= viewport.w - VIEWPORT_INSET &&
    top + card.h <= viewport.h - VIEWPORT_INSET
  );
}

/** Does the card at (left, top) avoid every occupied rect grown by ORIENTATION_GAP on all sides? */
function avoidsOccupied(left: number, top: number, card: CardSize, occupied: OccupiedRect[]): boolean {
  const cardLeft = left;
  const cardTop = top;
  const cardRight = left + card.w;
  const cardBottom = top + card.h;
  for (const r of occupied) {
    const grownLeft = r.left - ORIENTATION_GAP;
    const grownTop = r.top - ORIENTATION_GAP;
    const grownRight = r.left + r.width + ORIENTATION_GAP;
    const grownBottom = r.top + r.height + ORIENTATION_GAP;
    const intersects =
      cardLeft < grownRight &&
      cardRight > grownLeft &&
      cardTop < grownBottom &&
      cardBottom > grownTop;
    if (intersects) return false;
  }
  return true;
}

/** Card position usable as-is: inside the inset viewport and clear of all grown occupied rects. */
function isPlacementValid(
  left: number,
  top: number,
  viewport: { w: number; h: number },
  occupied: OccupiedRect[],
  card: CardSize,
): boolean {
  return fitsViewport(left, top, card, viewport) && avoidsOccupied(left, top, card, occupied);
}

/**
 * Resolve where an orientation card should sit.
 *
 * 1. A finite `saved` position is honored when still valid — the card at `saved`
 *    fits the viewport with the 8 px inset AND clears every occupied rect grown
 *    by ORIENTATION_GAP on every side. Returned as integers.
 * 2. Otherwise the first valid anchor wins, in priority order: top-right,
 *    bottom-right, top-left, bottom-left.
 * 3. `'compact'` when nothing qualifies.
 *
 * Pure: no DOM access, integer outputs everywhere.
 */
export function resolveGuidePlacement(
  viewport: { w: number; h: number },
  occupied: OccupiedRect[],
  card: CardSize,
  saved: Point | null,
): { left: number; top: number } | 'compact' {
  if (
    saved !== null &&
    Number.isFinite(saved.left) &&
    Number.isFinite(saved.top) &&
    isPlacementValid(saved.left, saved.top, viewport, occupied, card)
  ) {
    return { left: Math.round(saved.left), top: Math.round(saved.top) };
  }
  const anchors: Point[] = [
    { left: viewport.w - 16 - card.w, top: 64 },                        // top-right
    { left: viewport.w - 16 - card.w, top: viewport.h - 16 - card.h },  // bottom-right
    { left: 16, top: 64 },                                              // top-left
    { left: 16, top: viewport.h - 16 - card.h },                        // bottom-left
  ];
  for (const anchor of anchors) {
    if (isPlacementValid(anchor.left, anchor.top, viewport, occupied, card)) {
      return { left: Math.round(anchor.left), top: Math.round(anchor.top) };
    }
  }
  return 'compact';
}

/** Compact-mode dock (§D): when no anchor fits, the card docks at the TOP of
 * the largest free horizontal band, 16 px into the band and below the 64 px
 * header zone, clamped to the viewport. Only occupied rectangles that
 * vertically overlap the dock row shape the x-bands — a full-width header
 * strip pushes the dock below itself instead of destroying every band; a
 * tall side strip (rail, docked panel) removes its own x-interval. Falls
 * back to the viewport top-left when no band fits the card. */
export function compactDock(
  viewport: { w: number; h: number },
  occupied: OccupiedRect[],
  card: { w: number; h: number },
): { left: number; top: number } {
  const clampTop = Math.max(8, viewport.h - 16 - card.h);
  if (clampTop < 64) return { left: 8, top: clampTop };
  // Wide header strips (spanning >= 60% of the width at the top of the dock
  // row) push the dock row beneath them.
  let top = 64;
  for (const r of occupied) {
    const wide = r.width >= viewport.w * 0.6;
    if (wide && r.top - ORIENTATION_GAP < top + card.h && r.top + r.height + ORIENTATION_GAP > top) {
      top = Math.max(top, Math.round(r.top + r.height + ORIENTATION_GAP));
    }
  }
  top = Math.min(top, clampTop);
  const rowTop = top, rowBottom = top + card.h;
  const bands: Array<[number, number]> = [[0, viewport.w]];
  const blocks = occupied
    .filter((r) => r.top + r.height > rowTop - ORIENTATION_GAP && r.top < rowBottom + ORIENTATION_GAP)
    .map((r) => [r.left - ORIENTATION_GAP, r.left + r.width + ORIENTATION_GAP] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  for (const [b0, b1] of blocks) {
    const next: Array<[number, number]> = [];
    for (const [s0, e0] of bands) {
      if (b1 <= s0 || b0 >= e0) { next.push([s0, e0]); continue; }
      if (s0 < b0) next.push([s0, b0]);
      if (b1 < e0) next.push([b1, e0]);
    }
    bands.length = 0;
    bands.push(...next);
  }
  let best: [number, number] | null = null;
  for (const band of bands) {
    if (band[1] - band[0] >= card.w + 16 && (!best || band[1] - band[0] > best[1] - best[0])) best = band;
  }
  if (best) return { left: Math.round(Math.max(8, best[0] + 16)), top: Math.round(top) };
  return { left: 8, top: Math.round(top) };
}
