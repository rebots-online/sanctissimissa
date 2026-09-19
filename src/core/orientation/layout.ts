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
