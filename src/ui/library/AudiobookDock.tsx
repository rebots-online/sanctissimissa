/**
 * BA.8 — AudiobookDock (L-audiobook-20261106.md §4, E1–E18, §4.1, §4.2, W5, W6, S10).
 *
 * Frozen binding: LIBS/UI/STITCH/sanctissimissa-bookstore-20261106/original/
 * library-tts-karaoke-studio.html:895-962 (FREEZE 1, screen 36a7c3e6). DOM
 * order and classes follow the export; E6 (param tags, ⚙ Voice Mode) and E9
 * (.karaoke-latin) are not mounted (W5). The glow is line-bold + approximate
 * word glow (S10) — `.spoken-glow` is never used here.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import type { AudiobookController, AudiobookState } from '../../core/audiobook/controller.ts';
import { AUDIOBOOK_EDITIONS, RATE_OPTIONS, SKIP_SEC, type AudiobookRate } from '../../core/audiobook/constants.ts';
import type { AudioSentence } from '../../core/audiobook/text.ts';
import { approxWordTimes } from '../../core/audiobook/timing.ts';
import { debugEvent } from '../../core/diagnostics/store.ts';
import { useEntitlement, type AccessState } from '../../core/entitlements/useEntitlement.ts';
import { loadEditions } from '../../core/library/editions.ts';
import { voiceRuntime } from '../../core/voice/runtime.ts';
import { blockLocator, formatMmSs, locatorLine, playLabel, renderStatus, tickLength } from './dockText.ts';
import { useWordGlow } from './useWordGlow.ts';
import './audiobook.css';

const READABLE: ReadonlySet<string> = new Set(['free', 'owned', 'subscription']);

type RateOption = { value: string; rate: AudiobookRate; label: string };
type WordTime = { start: number; end: number; charStart: number; charEnd: number };

function clamp01(f: number): number {
  return Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : 0;
}

function wordSpans(text: string, words: readonly WordTime[], active: number): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;
  words.forEach((w: WordTime, i: number) => {
    if (w.charStart > cursor) parts.push(text.slice(cursor, w.charStart));
    parts.push(
      <span key={i} className={i === active ? 'karaoke-word-active' : undefined}>
        {text.slice(w.charStart, w.charEnd)}
      </span>,
    );
    cursor = w.charEnd;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export default function AudiobookDock({ controller }: { controller: AudiobookController }) {
  const subscribe = useCallback((l: () => void) => controller.subscribe(l), [controller]);
  const snapshot = useCallback((): AudiobookState => controller.getState(), [controller]);
  const state: AudiobookState = useSyncExternalStore(subscribe, snapshot);

  // Fixed-length loop over a module constant: the hook order never changes.
  const editionIds = AUDIOBOOK_EDITIONS as readonly string[];
  const access: AccessState[] = [];
  for (const id of editionIds) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- AUDIOBOOK_EDITIONS is constant: stable hook order (BA.8)
    access.push(useEntitlement(id));
  }
  const firstReadable: string | null = editionIds.find((_id: string, i: number) => READABLE.has(access[i].state)) ?? null;

  useEffect(() => {
    if (firstReadable === null || controller.getState().editionId !== null) return;
    // Opens the position only; the dock never starts playback (§4 Mounting).
    Promise.resolve(controller.open(firstReadable)).catch((error: unknown) =>
      debugEvent('audiobook', 'dock-open-failed', { editionId: firstReadable, error: String(error) }, 'warn'));
  }, [controller, firstReadable]);

  const catalogue = useMemo(() => loadEditions(), []);
  const editionId: string | null = state.editionId;
  const chapterKey: string | null = state.chapterKey;
  // The controller's own chapter sentences and stored durations (BA.8 fix):
  // the same array until the chapter changes, so the memos below stay stable.
  const sentences: readonly AudioSentence[] = controller.sentences();

  const sentence: AudioSentence | null = sentences[state.sentenceIndex] ?? null;
  const text: string = sentence?.text ?? '';
  const durationSec: number | null = sentence ? controller.sentenceDurationSec(state.sentenceIndex) : null;
  const words = useMemo(() => approxWordTimes(text, durationSec ?? 0) as WordTime[], [text, durationSec]);
  const wordIndex = useWordGlow(controller, text, durationSec);

  const [drag, setDrag] = useState<number | null>(null);
  if (firstReadable === null) return null;

  // E16: chapterDurationSec ?? estimate — the same end `seekFraction` scales by,
  // so the bar and the scrub target agree (measured `queue.secondsOf`).
  const total: number = state.chapterDurationSec ?? controller.chapterEndSec();
  const progress: number = drag ?? (total > 0 ? clamp01(state.positionSec / total) : 0);
  const edition: { title: string } | null = editionId ? catalogue.get(editionId) : null;
  const nowTitle: string = edition ? `${edition.title} — ${state.chapterLabel}` : state.chapterLabel;
  const ch: string = chapterKey?.split('/')[1] ?? '';

  const fractionAt = (e: PointerEvent<HTMLDivElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    return r.width > 0 ? clamp01((e.clientX - r.left) / r.width) : 0;
  };
  const onScrubDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(fractionAt(e));
  };
  const onScrubMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag !== null) setDrag(fractionAt(e));
  };
  const onScrubUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    setDrag(null);
    controller.seekFraction(fractionAt(e));
  };
  const onScrubKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') controller.skip(-SKIP_SEC);
    else if (e.key === 'ArrowRight') controller.skip(+SKIP_SEC);
    else return;
    e.preventDefault();
  };
  const onPlay = () => {
    if (state.voice === 'waiting-metered') controller.downloadVoice();
    else if (state.voice === 'error') voiceRuntime.retry();
    else controller.toggle();
  };
  const rateOptions = RATE_OPTIONS as readonly RateOption[];
  const selected: string = rateOptions.find((o: RateOption) => o.rate === state.rate)?.value ?? '1.0x';
  const onRate = (value: string) => {
    const option = rateOptions.find((o: RateOption) => o.value === value);
    if (option) controller.setRate(option.rate);
  };

  return (
    <div
      id="supertonic-tts-dock"
      className={state.playing && !state.buffering ? 'tts-dock-banner is-playing' : 'tts-dock-banner'}
      role="region"
      aria-label="Liturgical Audio Companion and Karaoke Teleprompter"
    >
      <div className="tts-header-row">
        <div className="tts-title-group">
          <div className="tts-wave-anim" aria-hidden="true">
            <span className="tts-wave-bar" />
            <span className="tts-wave-bar" />
            <span className="tts-wave-bar" />
            <span className="tts-wave-bar" />
            <span className="tts-wave-bar" />
          </div>
          <div>
            <div className="tts-label-row">
              <span>Supertonic Neural Voice Synthesis</span>
              <span className="tts-label-sep">•</span>
              <span id="tts-render-status">{renderStatus(state)}</span>
            </div>
            <div id="tts-now-title">{nowTitle}</div>
          </div>
        </div>
      </div>
      <div className="karaoke-display">
        <div className="karaoke-header">
          <span className="karaoke-label">Verse Synchronized Karaoke (Teleprompter)</span>
          <span id="tts-karaoke-locator">{locatorLine(sentence, wordIndex, words.length, state.buffering)}</span>
        </div>
        <div className="karaoke-vernacular">{wordSpans(text, words, wordIndex)}</div>
      </div>
      <div className="tts-controls-row">
        <div className="tts-btn-cluster">
          <button type="button" id="tts-rewind" className="tts-icon-btn" title="Rewind 15s" onClick={() => controller.skip(-SKIP_SEC)}>↺ 15s</button>
          <button type="button" id="tts-play-toggle" className="tts-icon-btn tts-play-main" onClick={onPlay}>{playLabel(state)}</button>
          <button type="button" id="tts-forward" className="tts-icon-btn" title="Forward 15s" onClick={() => controller.skip(+SKIP_SEC)}>↻ 15s</button>
          <button type="button" id="tts-next-block" className="tts-icon-btn" title="Next verse" onClick={() => controller.nextBlock()}>⏭ Next Verse</button>
        </div>
        <div className="tts-timeline-wrap">
          <div
            className="tts-track-scrub"
            role="slider"
            tabIndex={0}
            title="Click to scrub"
            aria-label="Chapter position"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={state.positionSec}
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            onPointerCancel={() => setDrag(null)}
            onKeyDown={onScrubKey}
          >
            <div className="tts-track-progress" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="tts-ticks">
            <span id="tts-tick-elapsed">{formatMmSs(state.positionSec)}</span>
            <span id="tts-tick-anchor">{`✦ ${blockLocator(sentence)}`}</span>
            <span id="tts-tick-length">{tickLength(state, ch)}</span>
          </div>
        </div>
        <div className="tts-speed">
          <label htmlFor="tts-speed-select">Speed:</label>
          <select id="tts-speed-select" className="tts-param-tag" value={selected} onChange={(e) => onRate(e.target.value)}>
            {rateOptions.map((o: RateOption) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
