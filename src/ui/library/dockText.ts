/**
 * BA.8 — pure formatters for the AudiobookDock (L-audiobook-20261106.md §4,
 * §4.1, §4.2). No React, no DOM, no I/O: every function maps controller state
 * (BA.7 `AudiobookState`) or one `AudioSentence` to the exact copy the frozen
 * export binding (`library-tts-karaoke-studio.html:895-962`) requires.
 */
import type { AudiobookState } from '../../core/audiobook/controller.ts';
import { chapterLabel, locator, type AudioSentence } from '../../core/audiobook/text.ts';

/** §4.1 `#tts-render-status` grammar — rows evaluated in order. Closed set, Phase L. */
export function renderStatus(state: AudiobookState): string {
  if (state.voice === 'waiting-metered') {
    return `English voice not downloaded (≈${state.voiceDownloadMB} MB)`;
  }
  if (state.voice === 'loading') {
    const p: number | null = state.voiceProgress;
    if (p === null || p < 1) return `Downloading English voice… ${Math.round((p ?? 0) * 100)}%`;
    return 'Preparing English voice…';
  }
  if (state.voice === 'error') return 'English voice could not be prepared — tap Play to retry';
  if (state.readyThrough !== null) return `Audio ready through ${chapterLabel(state.readyThrough)}`;
  return `Preparing audio… ${state.storedCount}/${state.sentenceCount}`;
}

/** §4.2 `#tts-play-toggle` labels. Closed set, Phase L. */
export function playLabel(state: AudiobookState): string {
  if (state.voice === 'waiting-metered') return '⬇ Download voice';
  if (state.voice === 'error') return '▶ Play';
  if (state.playing) return '❚❚ Pause';
  return '▶ Play';
}

/** `mm:ss` = two-digit floor minutes `:` two-digit floor seconds (E17). */
export function formatMmSs(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** E17 `#tts-tick-length`: `mm:ss (Chapter <ch> end)`, or `preparing…` until the chapter is fully stored. */
export function tickLength(state: AudiobookState, ch: string | number): string {
  if (state.chapterDurationSec === null) return 'preparing…';
  return `${formatMmSs(state.chapterDurationSec)} (Chapter ${ch} end)`;
}

const BLOCK_RE = /(Matt|Marc|Luc|Joann)\/(\d+)\/(\d+)(?:\/q\d+)?$/;

/** `locator(Book, ch, verseStart)` of the sentence's block, or '' when the key carries no chapter. */
export function blockLocator(sentence: AudioSentence | null): string {
  if (!sentence) return '';
  const m = BLOCK_RE.exec(sentence.blockKey);
  if (!m) return '';
  return locator(m[1], Number(m[2]), sentence.verseStart);
}

/** E8 `#tts-karaoke-locator`: `locator • Word <i+1> of <n>`; the locator alone while buffering. */
export function locatorLine(sentence: AudioSentence | null, wordIndex: number, n: number, buffering: boolean): string {
  const loc = blockLocator(sentence);
  if (buffering || !sentence) return loc;
  return `${loc} • Word ${wordIndex + 1} of ${n}`;
}
