/**
 * L.6 — the audiobook's public surface. One app-lifetime controller, so
 * playback survives view changes (BA.8's dock binds to it via `onAudiobook`).
 */

import type { SidecarDb } from '../accompaniment/store.ts';
import type { CorpusDb } from '../data/corpusDb.ts';
import type { voiceRuntime as VoiceRuntimeInstance } from '../voice/runtime.ts';
import { AudiobookController } from './controller.ts';

export { AudiobookController, type AudiobookState } from './controller.ts';
export {
  AUDIOBOOK_EDITIONS, AUDIOBOOK_RATES, BOOK_ORDER, EDITION_SOURCE, EVANGELIST, RATE_OPTIONS, SKIP_SEC,
  type AudiobookRate, type SentenceStatus,
} from './constants.ts';
export { chapterKeyOf, chapterLabel, chapterSentences, chaptersOf, locator, type AudioSentence } from './text.ts';
export { approxWordTimes, type WordTime } from './timing.ts';

let instance: AudiobookController | null = null;
const waiters = new Set<(c: AudiobookController) => void>();

/** Idempotent: the first call creates the app-lifetime controller; later calls return it. */
export function initAudiobook(deps: {
  corpus: CorpusDb;
  sidecar: () => SidecarDb | null;
  voiceRuntime: typeof VoiceRuntimeInstance;
}): AudiobookController {
  if (instance) return instance;
  const created = new AudiobookController(deps);
  instance = created;
  for (const l of waiters) l(created);
  waiters.clear();
  return created;
}

export function audiobook(): AudiobookController | null {
  return instance;
}

/** Fires immediately when already initialised, else once at initialisation. */
export function onAudiobook(l: (c: AudiobookController) => void): () => void {
  if (instance) {
    l(instance);
    return () => undefined;
  }
  waiters.add(l);
  return () => { waiters.delete(l); };
}
