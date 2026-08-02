/**
 * Inspector width utilities for resizable persisted inspector panel.
 * BX.2 implementation: deterministic clamping to 280..min(720, viewportWidth * 0.6).
 */

/**
 * Inspector width value in pixels. Null means no inspector is open.
 */
export type InspectorWidth = number | null;

/**
 * Default inspector width when no preference is stored.
 */
export const DEFAULT_INSPECTOR_WIDTH = 340;

/**
 * Minimum inspector width in pixels.
 */
export const MIN_INSPECTOR_WIDTH = 280;

/**
 * Maximum inspector width in pixels (absolute cap).
 */
export const MAX_INSPECTOR_WIDTH = 720;

/**
 * Maximum inspector width as fraction of viewport width.
 */
export const MAX_VIEWPORT_FRACTION = 0.6;

/**
 * Clamp any finite preference to the valid range: 280px..min(720px, viewportWidth * 0.6).
 * Invalid/non-finite preferences use 340px before clamping.
 * The clamp is idempotent and responds deterministically to viewport changes.
 *
 * @param preference - The stored preference value (may be invalid, non-finite, or null)
 * @param viewportWidth - The current viewport width in pixels
 * @returns The clamped inspector width in pixels, or null if the inspector should be hidden
 */
export function clampInspectorWidth(
  preference: InspectorWidth,
  viewportWidth: number,
): InspectorWidth {
  // If preference is explicitly null, inspector is hidden
  if (preference === null) {
    return null;
  }

  // Use default (340) for invalid/non-finite preferences
  let input = preference;
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    input = DEFAULT_INSPECTOR_WIDTH;
  }

  // Calculate the dynamic maximum based on viewport
  const dynamicMax = Math.min(MAX_INSPECTOR_WIDTH, Math.floor(viewportWidth * MAX_VIEWPORT_FRACTION));

  // Clamp to valid range
  const clamped = Math.max(MIN_INSPECTOR_WIDTH, Math.min(dynamicMax, input));

  // Ensure result is finite and valid
  return Number.isFinite(clamped) ? clamped : DEFAULT_INSPECTOR_WIDTH;
}

/**
 * Get the current maximum inspector width for a given viewport.
 */
export function getMaxInspectorWidth(viewportWidth: number): number {
  return Math.min(MAX_INSPECTOR_WIDTH, Math.floor(viewportWidth * MAX_VIEWPORT_FRACTION));
}

/**
 * Check if a viewport width is narrow enough to show inspector as overlay instead of split.
 */
export function isNarrowViewport(viewportWidth: number): boolean {
  // At narrow widths, the inspector is shown as a closable overlay
  return viewportWidth < 860;
}