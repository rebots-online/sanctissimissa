/**
 * pwaUpdate — CC16 self-applying updates (Admin-Manual
 * DOCS/CICD_CONVENTIONS.md CC16, adopted 2026-09-16 after the v1.42.25336
 * cutover left SW-carrying visitors on a broken v1.39 shell).
 *
 * Users never force-reload. The app: (1) registers the service worker with
 * autoUpdate plus hourly update checks; (2) reloads itself exactly once when
 * a new worker takes `controllerchange` — deferred, via UPDATE_READY_EVENT,
 * only while unsaved editor work is on screen (the App renders an
 * "update ready" chip then); (3) self-heals if a stale shell fails to load a
 * lazily-imported chunk after the precache swap. A sessionStorage flag makes
 * every reload one-shot (no loops) and re-arms 15s after a healthy boot.
 *
 * Vite-only (imports virtual:pwa-register); pure helpers live in
 * pwaUpdatePlan.ts so Node tests never load this file.
 */

/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';
import {
  UPDATE_READY_EVENT,
  RELOAD_ONCE_KEY,
  UNSAVED_WORK_SELECTOR,
  isChunkLoadFailure,
} from './pwaUpdatePlan.ts';

export { UPDATE_READY_EVENT } from './pwaUpdatePlan.ts';

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

/** Unsaved-work heuristic: live CKEditor, any contenteditable, or an open dialog. */
export function busyWithUnsavedWork(): boolean {
  return !!document.querySelector(UNSAVED_WORK_SELECTOR);
}

/** One-shot reload per session-guard; the guard re-arms 15s after healthy load. */
export function reloadOnce(reason: string): void {
  if (sessionStorage.getItem(RELOAD_ONCE_KEY)) return;
  try {
    sessionStorage.setItem(RELOAD_ONCE_KEY, reason);
  } catch {
    /* private mode: proceed without the guard */
  }
  window.location.reload();
}

/** Chip action: hand control to the registered worker, else plain reload. */
export function applyPendingUpdate(): void {
  if (applyUpdate) void applyUpdate(true).catch(() => window.location.reload());
  else window.location.reload();
}

export function initSelfApplyingUpdates(): void {
  if (!('serviceWorker' in navigator)) return;

  applyUpdate = registerSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Hourly checks keep long-lived tabs current without a navigation.
      window.setInterval(() => void registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem(RELOAD_ONCE_KEY)) return;
    if (busyWithUnsavedWork()) {
      window.dispatchEvent(new CustomEvent(UPDATE_READY_EVENT));
      return;
    }
    reloadOnce('controllerchange');
  });

  window.addEventListener('error', (e) => {
    if (isChunkLoadFailure(e.message)) reloadOnce('chunk-load-failure');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const message = (e.reason as { message?: string } | undefined)?.message;
    if (isChunkLoadFailure(message)) reloadOnce('chunk-load-failure');
  });

  window.addEventListener('load', () => {
    // Healthy boot of the (new) shell re-arms auto-reload for a later update.
    window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_ONCE_KEY);
      } catch {
        /* ignore */
      }
    }, 15000);
  });
}
