import { invoke } from '@tauri-apps/api/core';
import type { TauriInvoke } from '../../../reusable-chatbot/core/capability-broker.ts';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** The installed shell uses the SDK bridge; window.invoke is not a Tauri API. */
export function companionInvoke(): TauriInvoke | undefined {
  return isTauri() ? invoke : undefined;
}
