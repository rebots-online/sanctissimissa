/**
 * pwaUpdatePlan — pure helpers for CC16 self-applying updates (AM.08).
 * Node-importable by design: no Vite virtual modules live here (the
 * registration wiring stays in pwaUpdate.ts), mirroring the
 * aboutMedia/aboutMediaPlan split.
 */

export const UPDATE_READY_EVENT = 'sam:update-ready';
export const RELOAD_ONCE_KEY = 'sam-sw-reload-once';
export const UNSAVED_WORK_SELECTOR =
  '.ck-editor, [contenteditable="true"], .about-lightbox';

export const CHUNK_FAILURE_PATTERNS = [
  'dynamically imported module', // Chrome/Edge/Safari dynamic import failures
  'Importing a module script failed', // Firefox module script failure
  'error loading dynamically imported module',
];

/** True when an error message indicates a stale shell failing to lazy-load a chunk. */
export function isChunkLoadFailure(message?: string): boolean {
  return !!message && CHUNK_FAILURE_PATTERNS.some((p) => message.includes(p));
}
