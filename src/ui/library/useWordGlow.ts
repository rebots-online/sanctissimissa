/**
 * BA.8 — approximate word glow (L-audiobook-20261106.md F6 step 7, W6, S10).
 *
 * The active word is the last `i` with `start_i ≤ controller.currentTime()`,
 * where `start_i` comes from `approxWordTimes(sentenceText, durationSec)`.
 * It is computed in a `requestAnimationFrame` loop while playing and never
 * travels through controller state; React state changes only when the index
 * changes. With `durationSec === null` (sentence not stored) no word is active.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { AudiobookController, AudiobookState } from '../../core/audiobook/controller.ts';
import { approxWordTimes } from '../../core/audiobook/timing.ts';

type WordTime = { start: number; end: number; charStart: number; charEnd: number };

function activeIndex(times: readonly WordTime[], t: number): number {
  let i = -1;
  for (let k = 0; k < times.length; k++) {
    if (times[k].start <= t) i = k;
    else break;
  }
  return i;
}

export function useWordGlow(controller: AudiobookController, sentenceText: string, durationSec: number | null): number {
  const subscribe = useCallback((l: () => void) => controller.subscribe(l), [controller]);
  const snapshot = useCallback((): AudiobookState => controller.getState(), [controller]);
  const state: AudiobookState = useSyncExternalStore(subscribe, snapshot);
  const playing: boolean = state.playing === true;

  const times = useMemo<readonly WordTime[] | null>(
    () => (durationSec === null ? null : (approxWordTimes(sentenceText, durationSec) as WordTime[])),
    [sentenceText, durationSec],
  );
  // The index is tagged with the word-time table it belongs to, so a new
  // sentence starts with no active word without a synchronous reset.
  const [glow, setGlow] = useState<{ times: readonly WordTime[] | null; index: number }>({ times: null, index: -1 });

  useEffect(() => {
    if (!times || times.length === 0) return;
    let last = -2;
    let raf = 0;
    const tick = () => {
      const i = activeIndex(times, controller.currentTime());
      if (i !== last) {
        last = i;
        setGlow({ times, index: i });
      }
      // One frame when paused (shows the word under the playhead); continuous while playing.
      if (playing) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controller, times, playing]);

  return times !== null && glow.times === times ? glow.index : -1;
}
