/**
 * L.6 F2/F5 — AudiobookController: one app-lifetime audiobook session
 * (open/play/pause/seek/skip/nextBlock/rate), persisted position, audio focus,
 * and the state the dock (BA.8) renders. `open` never starts playback.
 */

import type { SidecarDb } from '../accompaniment/store.ts';
import type { CorpusDb } from '../data/corpusDb.ts';
import { debugEvent } from '../diagnostics/store.ts';
import { onNetworkCostChange } from '../net/metered.ts';
import { voiceKey } from '../voice/assets.ts';
import { calibrate } from '../voice/calibrate.ts';
import type { VoiceState, voiceRuntime as VoiceRuntimeInstance } from '../voice/runtime.ts';
import type { SynthesizedAudio } from '../voice/voice.ts';
import { AUDIOBOOK_RATES, SKIP_SEC, type AudiobookRate } from './constants.ts';
import { AudiobookPlayer } from './player.ts';
import { RenderQueue } from './queue.ts';
import { installedRevision } from './revision.ts';
import { ChunkStore, chunkKeyOf } from './store.ts';
import { chapterLabel, chapterSentences, chaptersOf, type AudioSentence } from './text.ts';

export interface AudiobookState {
  editionId: string | null;
  chapterKey: string | null;
  chapterLabel: string;
  blockIndex: number;
  sentenceIndex: number;
  sentenceCount: number;
  storedCount: number;
  positionSec: number;
  chapterDurationSec: number | null;
  playing: boolean;
  buffering: boolean;
  rate: AudiobookRate;
  readyThrough: string | null;
  voice: VoiceState;
  voiceProgress: number | null;
  voiceDownloadMB: number;
}

export interface AudiobookDeps {
  corpus: CorpusDb;
  sidecar: () => SidecarDb | null;
  voiceRuntime: typeof VoiceRuntimeInstance;
}

interface Position { chapterKey: string; sentenceIndex: number; offsetSec: number }

const RATE_SETTING: Record<AudiobookRate, string> = { 0.85: '0.85', 1: '1', 1.2: '1.2' };
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function parsePosition(raw: string | null | undefined): Partial<Position> | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Partial<Position>; } catch { return null; }
}

export class AudiobookController {
  readonly #deps: AudiobookDeps;
  readonly #store = new ChunkStore();
  readonly #player: AudiobookPlayer;
  #queue: RenderQueue | null = null;
  #listeners = new Set<() => void>();
  #editionId: string | null = null;
  #chapters: string[] = [];
  #chapterKey: string | null = null;
  #sentences: AudioSentence[] = [];
  #sentenceIndex = 0;
  #offsetSec = 0;
  #started = false;
  #atEnd = false;
  #playing = false;
  #buffering = false;
  #rate: AudiobookRate | null = null;
  #readyThrough: string | null = null;
  #openSeq = 0;
  #saveTimer: ReturnType<typeof setTimeout> | null = null;
  #snapshot: AudiobookState | null = null;

  constructor(deps: AudiobookDeps) {
    this.#deps = deps;
    this.#player = new AudiobookPlayer({ getChunk: (i) => this.#getChunk(i) });
    this.#player.on('sentence-start', (i) => this.#onSentenceStart(i));
    this.#player.on('buffering', () => { this.#buffering = true; this.#emit(); this.#queue?.pump(); });
    this.#player.on('chapter-end', () => { void this.#advanceChapter(); });
    deps.voiceRuntime.subscribe(() => this.#onVoice());
    onNetworkCostChange(() => { if (deps.voiceRuntime.audioOwner() !== 'sacristan') this.#queue?.pump(); });
  }

  // ── state ──────────────────────────────────────────────────────────

  subscribe(l: () => void): () => void {
    this.#listeners.add(l);
    return () => { this.#listeners.delete(l); };
  }

  #emit(): void {
    this.#snapshot = null;
    for (const l of this.#listeners) {
      try { l(); } catch (error) { debugEvent('audiobook', 'listener-failed', error, 'warn'); }
    }
  }

  #rateNow(): AudiobookRate {
    if (this.#rate === null) {
      const raw = Number(this.#deps.sidecar()?.getSetting('audiobook.rate') ?? '1');
      this.#rate = (AUDIOBOOK_RATES as readonly number[]).includes(raw) ? (raw as AudiobookRate) : 1;
      this.#player.setRate(this.#rate);
    }
    return this.#rate;
  }

  #secondsOf(s: AudioSentence): number {
    return this.#queue && this.#chapterKey ? this.#queue.secondsOf(this.#chapterKey, s) : 0;
  }

  #estimatedTotal(): number {
    return this.#sentences.reduce((a, s) => a + this.#secondsOf(s), 0);
  }

  #chapterEnd(): number {
    return this.#chapterDuration() ?? this.#estimatedTotal();
  }

  #chapterDuration(): number | null {
    return this.#queue && this.#chapterKey ? this.#queue.chapterTotal(this.#chapterKey) : null;
  }

  #startOf(index: number): number {
    let t = 0;
    for (let i = 0; i < index && i < this.#sentences.length; i++) t += this.#secondsOf(this.#sentences[i]);
    return t;
  }

  currentTime(): number {
    return this.#started ? this.#player.currentTime() : this.#offsetSec;
  }

  #positionSec(): number {
    if (this.#atEnd) return this.#chapterEnd();
    return this.#startOf(this.#sentenceIndex) + this.currentTime();
  }

  /**
   * Cached between emits: `useSyncExternalStore` needs the same object until
   * the store changes, or React re-renders without end (BA.8 fix).
   */
  getState(): AudiobookState {
    this.#snapshot ??= this.#computeState();
    return this.#snapshot;
  }

  // ── dock read accessors (BA.8 fix: the dock's line, word glow and scrub) ──

  /** The current chapter's sentences (E8/E10/E17); same array until the chapter changes. */
  sentences(): readonly AudioSentence[] {
    return this.#sentences;
  }

  /** Stored duration of sentence `index` (F6 word glow), or null while it is not stored. */
  sentenceDurationSec(index: number): number | null {
    const key = this.#chapterKey;
    return key && this.#queue ? this.#queue.storedDuration(key, index) ?? null : null;
  }

  /** The chapter end `seekFraction` scales by: `chapterDurationSec ?? estimate` (E15/E16). */
  chapterEndSec(): number {
    return this.#chapterEnd();
  }

  #computeState(): AudiobookState {
    const status = this.#deps.voiceRuntime.status();
    const key = this.#chapterKey;
    const storedCount = key && this.#queue
      ? this.#sentences.reduce((a, s) => a + (this.#queue!.statusOf(key, s.index) === 'stored' ? 1 : 0), 0) : 0;
    return {
      editionId: this.#editionId,
      chapterKey: key,
      chapterLabel: key ? chapterLabel(key) : '',
      blockIndex: this.#sentences[this.#sentenceIndex]?.blockIndex ?? 0,
      sentenceIndex: this.#sentenceIndex,
      sentenceCount: this.#sentences.length,
      storedCount,
      positionSec: this.#positionSec(),
      chapterDurationSec: this.#chapterDuration(),
      playing: this.#playing,
      buffering: this.#buffering,
      rate: this.#rateNow(),
      readyThrough: this.#readyThrough,
      voice: status.voice,
      voiceProgress: status.voiceProgress,
      voiceDownloadMB: status.downloadMB,
    };
  }

  // ── open (F2) ──────────────────────────────────────────────────────

  async open(editionId: string, chapterKey?: string, sentenceIndex?: number): Promise<void> {
    const seq = ++this.#openSeq;
    const { corpus } = this.#deps;
    const sidecar = this.#deps.sidecar();
    if (this.#editionId && this.#editionId !== editionId) {
      this.#queue?.abortAll();
      this.#player.pause();
      this.#playing = false;
    }
    const revision = await installedRevision(editionId);
    const chapters = chaptersOf(corpus, editionId, revision);
    let pos: Partial<Position> | null = chapterKey ? { chapterKey, sentenceIndex: sentenceIndex ?? 0, offsetSec: 0 } : null;
    pos ??= parsePosition(sidecar?.getSetting(`audiobook.position.${editionId}`));
    if (!pos?.chapterKey || !chapters.includes(pos.chapterKey)) {
      const progress = parsePosition(sidecar?.getSetting(`library.progress.${editionId}`));
      pos = progress?.chapterKey && chapters.includes(progress.chapterKey) ? { chapterKey: progress.chapterKey } : null;
    }
    const key = pos?.chapterKey ?? chapters[0] ?? null;
    const vkey = await voiceKey();
    await this.#store.purgeStale(editionId, revision, vkey);
    const calibration = await calibrate();
    if (seq !== this.#openSeq) return;
    this.#queue ??= this.#makeQueue(calibration);
    this.#queue.setEdition({
      editionId, revision, voiceKey: vkey, chapters,
      sentencesOf: (k) => chapterSentences(corpus, editionId, k),
    });
    const sentences = key ? chapterSentences(corpus, editionId, key) : [];
    if (key) await this.#queue.loadChapter(key);
    if (seq !== this.#openSeq) return;
    this.#editionId = editionId;
    this.#chapters = chapters;
    this.#chapterKey = key;
    this.#sentences = sentences;
    this.#sentenceIndex = clamp(Math.floor(Number(pos?.sentenceIndex ?? 0)) || 0, 0, Math.max(0, sentences.length - 1));
    this.#offsetSec = Math.max(0, Number(pos?.offsetSec ?? 0) || 0);
    this.#started = false;
    this.#atEnd = false;
    this.#buffering = false;
    const queue = this.#queue;
    this.#player.load(sentences, (i) => (key ? queue.statusOf(key, i) : 'missing'));
    this.#player.setRate(this.#rateNow());
    if (key) queue.setPlayhead(key, this.#sentenceIndex, this.#offsetSec);
    await this.#refreshReady();
    this.#emit();
    queue.pump();
  }

  #makeQueue(calibration: Awaited<ReturnType<typeof calibrate>>): RenderQueue {
    const q = new RenderQueue({ voiceRuntime: this.#deps.voiceRuntime, store: this.#store, calibration });
    q.onChange((chapterKey, index, status) => {
      if (chapterKey !== this.#chapterKey) return;
      if (index >= 0) this.#player.notifyStored(index);
      if (status === 'stored' && index >= 0) void this.#refreshReady().then(() => this.#emit());
      else this.#emit();
    });
    return q;
  }

  async #refreshReady(): Promise<void> {
    if (!this.#editionId || !this.#chapterKey) { this.#readyThrough = null; return; }
    this.#readyThrough = (await this.#store.summary(this.#editionId, this.#chapterKey, this.#chapters)).readyThrough;
  }

  async #getChunk(i: number): Promise<SynthesizedAudio | null> {
    const key = this.#chapterKey;
    const s = this.#sentences[i];
    if (!key || !s || !this.#queue) return null;
    const chunk = await this.#store.get(chunkKeyOf(this.#queue.refOf(key), i), s.text);
    if (!chunk && this.#queue.statusOf(key, i) === 'stored') {
      this.#queue.markMissing(key, i);
      this.#queue.pump();
    }
    return chunk;
  }

  // ── commands (F5) ──────────────────────────────────────────────────

  play(): void {
    if (!this.#editionId || !this.#chapterKey) return;
    const rt = this.#deps.voiceRuntime;
    if (rt.status().voice === 'error') rt.retry();
    rt.claimAudio('audiobook');
    if (this.#atEnd) { this.#atEnd = false; this.#sentenceIndex = 0; this.#offsetSec = 0; }
    this.#playing = true;
    const offset = this.currentTime();
    this.#started = true;
    void this.#player.playFrom(this.#sentenceIndex, offset);
    this.#queue?.pump();
    this.#emit();
  }

  pause(): void {
    this.#pause(true);
  }

  #pause(pump: boolean): void {
    if (this.#started) this.#offsetSec = this.#player.currentTime();
    this.#started = false;
    this.#playing = false;
    this.#buffering = false;
    this.#player.pause();
    this.#savePosition();
    if (pump) this.#queue?.pump();
    this.#emit();
  }

  toggle(): void {
    if (this.#playing) this.pause();
    else this.play();
  }

  /** skip(±SKIP_SEC): clamped to the chapter; never crosses a chapter. */
  skip(deltaSec: number = SKIP_SEC): void {
    this.seek(clamp(this.#positionSec() + deltaSec, 0, this.#chapterEnd()));
  }

  nextBlock(): void {
    const cur = this.#sentences[this.#sentenceIndex];
    const next = cur ? this.#sentences.find((s) => s.blockIndex > cur.blockIndex) : undefined;
    if (next) { this.#jumpTo(next.index, 0); return; }
    void this.#advanceChapter(true);
  }

  seek(sec: number): void {
    if (!this.#chapterKey || this.#sentences.length === 0) return;
    let start = 0;
    let target = this.#sentences.length - 1;
    for (const s of this.#sentences) {
      const len = this.#secondsOf(s);
      if (sec < start + len) { target = s.index; break; }
      start += len;
    }
    if (target === this.#sentences.length - 1 && sec >= start) start = this.#startOf(target);
    const stored = this.#queue?.statusOf(this.#chapterKey, target) === 'stored';
    const offset = stored ? clamp(sec - start, 0, this.#secondsOf(this.#sentences[target])) : 0;
    this.#jumpTo(target, offset);
  }

  seekFraction(f: number): void {
    this.seek(clamp(f, 0, 1) * this.#chapterEnd());
  }

  #jumpTo(index: number, offsetSec: number): void {
    this.#sentenceIndex = index;
    this.#offsetSec = offsetSec;
    this.#atEnd = false;
    if (this.#chapterKey) this.#queue?.setPlayhead(this.#chapterKey, index, offsetSec);
    if (this.#playing) {
      this.#started = true;
      void this.#player.playFrom(index, offsetSec);
    } else {
      this.#started = false;
    }
    this.#savePosition();
    this.#queue?.pump();
    this.#emit();
  }

  setRate(r: AudiobookRate): void {
    if (!(AUDIOBOOK_RATES as readonly number[]).includes(r)) return;
    this.#rate = r;
    this.#player.setRate(r);
    const sidecar = this.#deps.sidecar();
    if (sidecar) {
      sidecar.setSetting('audiobook.rate', RATE_SETTING[r]);
      void sidecar.persist().catch((error) => debugEvent('audiobook', 'persist-failed', error, 'warn'));
    }
    this.#emit();
  }

  downloadVoice(): void {
    this.#deps.voiceRuntime.downloadVoice();
  }

  // ── events ─────────────────────────────────────────────────────────

  #onSentenceStart(i: number): void {
    this.#sentenceIndex = i;
    this.#offsetSec = 0;
    this.#buffering = false;
    if (this.#chapterKey) this.#queue?.setPlayhead(this.#chapterKey, i, 0);
    this.#savePosition();
    this.#queue?.pump();
    this.#emit();
  }

  /** Chapter end → open(next, 0) and continue; edition end → pause at the chapter's end. */
  async #advanceChapter(explicit = false): Promise<void> {
    const wasPlaying = this.#playing || !explicit;
    const idx = this.#chapterKey ? this.#chapters.indexOf(this.#chapterKey) : -1;
    const next = this.#chapters[idx + 1];
    if (!next || !this.#editionId) {
      if (explicit) return;
      this.#playing = false;
      this.#started = false;
      this.#player.pause();
      this.#atEnd = true;
      this.#sentenceIndex = Math.max(0, this.#sentences.length - 1);
      this.#savePosition();
      this.#emit();
      return;
    }
    await this.open(this.#editionId, next, 0);
    if (wasPlaying) this.play();
  }

  #onVoice(): void {
    const owner = this.#deps.voiceRuntime.audioOwner();
    // Every claimAudio('sacristan') aborts background jobs and never re-pumps (F3 step 9);
    // a notify cannot be told apart from a repeat claim, so abort while the Sacristan owns the pool.
    const sacristan = owner === 'sacristan';
    if (sacristan) this.#queue?.abortAll();
    if (owner !== 'audiobook' && this.#playing) { this.#pause(!sacristan); return; }
    if (sacristan) { this.#emit(); return; }
    if (this.#deps.voiceRuntime.status().voice === 'ready') this.#queue?.pump();
    this.#emit();
  }

  /** `audiobook.position.<editionId>`, debounced 2 s, then persist(). */
  #savePosition(): void {
    if (this.#saveTimer) clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => {
      this.#saveTimer = null;
      const sidecar = this.#deps.sidecar();
      if (!sidecar || !this.#editionId || !this.#chapterKey) return;
      const value: Position = { chapterKey: this.#chapterKey, sentenceIndex: this.#sentenceIndex, offsetSec: this.currentTime() };
      sidecar.setSetting(`audiobook.position.${this.#editionId}`, JSON.stringify(value));
      void sidecar.persist().catch((error) => debugEvent('audiobook', 'persist-failed', error, 'warn'));
    }, 2000);
  }

  dispose(): void {
    this.#queue?.abortAll();
    this.#player.dispose();
  }
}
