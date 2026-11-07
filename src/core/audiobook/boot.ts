/**
 * L.6 host wiring: AppShell calls `useAudiobookBoot(db, sidecar)`. After
 * first paint the voice runtime starts (F1: voice first, then models); once
 * the corpus is open the app-lifetime audiobook controller is created.
 */

import { useEffect, useRef } from 'react';
import type { SidecarDb } from '../accompaniment/store.ts';
import type { CorpusDb } from '../data/corpusDb.ts';
import { startVoiceRuntime, voiceRuntime } from '../voice/runtime.ts';
import { initAudiobook } from './index.ts';

/** requestIdleCallback, else setTimeout(0) after `load`. */
function afterFirstPaint(run: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run);
    return () => window.cancelIdleCallback(id);
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  const later = () => { timer = setTimeout(run, 0); };
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
  return () => {
    window.removeEventListener('load', later);
    if (timer) clearTimeout(timer);
  };
}

export function useAudiobookBoot(db: CorpusDb | null, sidecar: SidecarDb | null): void {
  const ref = useRef<SidecarDb | null>(sidecar);
  useEffect(() => { ref.current = sidecar; }, [sidecar]);

  useEffect(() => afterFirstPaint(() => startVoiceRuntime({ sidecar: () => ref.current })), []);

  useEffect(() => {
    if (db) initAudiobook({ corpus: db, sidecar: () => ref.current, voiceRuntime });
  }, [db]);
}
