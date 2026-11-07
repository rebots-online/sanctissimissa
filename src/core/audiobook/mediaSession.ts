/**
 * BA.8 — Media Session binding for the audiobook (L-audiobook-20261106.md F7).
 *
 * System media controls (Chrome/PWA, WebView2 SMTC on Windows) drive the one
 * app-lifetime `AudiobookController`. Where the platform surfaces no system UI
 * (Android System WebView, WebKitGTK) the handlers are still registered.
 *
 * see DOCS/sdk/media-session/mdn-setactionhandler.md §Description
 * see DOCS/sdk/media-session/mdn-setpositionstate.md §Exceptions
 * see DOCS/sdk/media-session/mdn-mediametadata.md §Constructor
 * see DOCS/sdk/media-session/w3c-mediasession-spec.md §4.1. Playback State
 */
import type { AudiobookController, AudiobookState } from './controller.ts';
import type { EditionIndex } from '../library/editions.ts';

// Order independence (Stanza BA author resolution 6): App.tsx imports this
// module, so its sibling dependencies (BA.7 index/text, BA.3 editions) load
// through eager `import.meta.glob`. Until a sibling lands its entry is absent
// and the binding degrades to a no-op instead of breaking the build.
type IndexModule = typeof import('./index.ts');
type TextModule = typeof import('./text.ts');
type EditionsModule = typeof import('../library/editions.ts');
const indexModule: IndexModule | undefined = import.meta.glob<IndexModule>('./index.ts', { eager: true })['./index.ts'];
const textModule: TextModule | undefined = import.meta.glob<TextModule>('./text.ts', { eager: true })['./text.ts'];
const editionsModule: EditionsModule | undefined =
  import.meta.glob<EditionsModule>('../library/editions.ts', { eager: true })['../library/editions.ts'];

const chapterLabel = (chapterKey: string): string => textModule?.chapterLabel(chapterKey) ?? chapterKey;
const NO_EDITIONS: EditionIndex = { get: () => null } as unknown as EditionIndex;

/** F7 action map. Closed set, Phase L. */
const NULLED_ACTIONS: readonly MediaSessionAction[] = ['previoustrack', 'seekto', 'stop'];
const BOUND_ACTIONS: readonly MediaSessionAction[] = ['play', 'pause', 'seekbackward', 'seekforward', 'nexttrack'];

function setHandler(ms: MediaSession, action: MediaSessionAction, handler: MediaSessionActionHandler | null): void {
  // Some engines throw for actions they do not support
  // (see DOCS/sdk/media-session/INDEX.md §Curator notes).
  try {
    ms.setActionHandler(action, handler);
  } catch {
    /* unsupported action on this platform: nothing to register */
  }
}

export function bindMediaSession(controller: AudiobookController, catalogue: EditionIndex): () => void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return () => {};
  const ms = navigator.mediaSession;

  setHandler(ms, 'play', () => { controller.play(); });
  setHandler(ms, 'pause', () => { controller.pause(); });
  // `details.seekOffset` is ignored: the dock's skip is always ±15 s (F7).
  setHandler(ms, 'seekbackward', () => { controller.skip(-15); });
  setHandler(ms, 'seekforward', () => { controller.skip(+15); });
  setHandler(ms, 'nexttrack', () => { controller.nextBlock(); });
  for (const action of NULLED_ACTIONS) setHandler(ms, action, null);

  let lastChapter: string | null | undefined;
  const sync = () => {
    const s: AudiobookState = controller.getState();
    const chapterKey: string | null = s.chapterKey;
    if (chapterKey !== lastChapter) {
      lastChapter = chapterKey;
      const edition: { title: string; author: string } | null = s.editionId ? catalogue.get(s.editionId) : null;
      ms.metadata = chapterKey === null
        ? null
        : new MediaMetadata({
            title: chapterLabel(chapterKey),
            artist: edition?.author ?? '',
            album: edition?.title ?? '',
            artwork: [], // no cover asset exists this phase (F7)
          });
    }
    ms.playbackState = s.editionId === null || chapterKey === null ? 'none' : s.playing ? 'playing' : 'paused';
    const duration: number | null = s.chapterDurationSec;
    if (duration !== null) {
      try {
        ms.setPositionState({
          duration,
          playbackRate: s.rate,
          position: Math.max(0, Math.min(s.positionSec, duration)),
        });
      } catch {
        /* TypeError on an out-of-range state: keep the last valid one */
      }
    }
  };
  sync();
  const unsubscribe: () => void = controller.subscribe(sync);

  return () => {
    unsubscribe();
    for (const action of BOUND_ACTIONS) setHandler(ms, action, null);
    for (const action of NULLED_ACTIONS) setHandler(ms, action, null);
    ms.metadata = null;
    ms.playbackState = 'none';
  };
}

/** Binds the controller as soon as BA.7 initialises it; the cleanup also unbinds. */
export function startMediaSession(): () => void {
  if (!indexModule) return () => {};
  let unbind: (() => void) | null = null;
  const off: () => void = indexModule.onAudiobook((c: AudiobookController) => {
    unbind?.();
    unbind = bindMediaSession(c, editionsModule ? editionsModule.loadEditions() : NO_EDITIONS);
  });
  return () => {
    off();
    unbind?.();
    unbind = null;
  };
}
