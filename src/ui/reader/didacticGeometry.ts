/**
 * HD.2 (§K.8) — pure geometry for the didactic overlay. No DOM, no React:
 * node-testable math shared by DidacticOverlay.tsx.
 */

/** The cutout hugs the live target rect grown this much (OG.9 geometry). */
export const DIDACTIC_GROW = 8;
/** Non-annotated marks fade after this long (ms). */
export const DIDACTIC_FADE_MS = 6000;

export interface Rect { left: number; top: number; width: number; height: number }

/** Ellipse geometry hugging a rect (+grow) — pure, viewport coordinates. */
export function ellipseGeometry(rect: Rect, grow = DIDACTIC_GROW): { cx: number; cy: number; rx: number; ry: number } {
  return {
    cx: Math.round(rect.left + rect.width / 2),
    cy: Math.round(rect.top + rect.height / 2),
    rx: Math.round(rect.width / 2 + grow),
    ry: Math.round(rect.height / 2 + grow),
  };
}

/** A gentle curved path from rect A's center to rect B's center with an
 *  arrowhead triangle at B — pure geometry (quadratic bow of 15 % of the
 *  distance, perpendicular to the chord). */
export function arrowGeometry(a: Rect, b: Rect): { path: string; head: string } {
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  const bx = b.left + b.width / 2;
  const by = b.top + b.height / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.max(1, Math.hypot(dx, dy));
  // Perpendicular unit vector, bowing away from the straight chord.
  const px = -dy / dist;
  const py = dx / dist;
  const bow = dist * 0.15;
  const cxp = ax + dx / 2 + px * bow;
  const cyp = ay + dy / 2 + py * bow;
  // Arrowhead: tangent at B is control→B; a 14 px open triangle.
  const tx = bx - cxp;
  const ty = by - cyp;
  const tl = Math.max(1, Math.hypot(tx, ty));
  const ux = tx / tl;
  const uy = ty / tl;
  const h = 14;
  const w = 6;
  const tipX = bx + ux * 2;
  const tipY = by + uy * 2;
  const baseX = bx - ux * h;
  const baseY = by - uy * h;
  const leftX = baseX - uy * w;
  const leftY = baseY + ux * w;
  const rightX = baseX + uy * w;
  const rightY = baseY - ux * w;
  return {
    path: `M ${Math.round(ax)} ${Math.round(ay)} Q ${Math.round(cxp)} ${Math.round(cyp)} ${Math.round(bx)} ${Math.round(by)}`,
    head: `M ${Math.round(tipX)} ${Math.round(tipY)} L ${Math.round(leftX)} ${Math.round(leftY)} L ${Math.round(rightX)} ${Math.round(rightY)} Z`,
  };
}

/** Viewport rect of a live element — rounded, zero-safe. */
export function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
}
