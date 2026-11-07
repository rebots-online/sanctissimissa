/**
 * L.6 F3 — RenderQueue: background synthesis of audiobook sentences into the
 * ChunkStore. Buffer mode keeps BUFFER_AHEAD_SEC ahead of the playhead;
 * idle-fill mode (after RTF_WARMUP samples with rtf/N ≤ IDLE_FILL_RTF_EFF)
 * renders the rest of the edition within the store budget. Every job calls
 * `voice.synthesize(text, { signal, priority: 'background' })` — the audiobook
 * never uses the speaking pipeline (S2/S3).
 */

import { debugEvent } from '../diagnostics/store.ts';
import type { Calibration } from '../voice/voice.ts';
import type { voiceRuntime as VoiceRuntimeInstance } from '../voice/runtime.ts';
import {
  BUFFER_AHEAD_SEC, CHUNK_STORE_BUDGET_BYTES, DEFAULT_SEC_PER_CHAR, IDLE_FILL_RTF_EFF, RTF_ALPHA, RTF_WARMUP,
  type SentenceStatus,
} from './constants.ts';
import { chapterRefOf, chunkKeyOf, type ChunkStore } from './store.ts';
import type { AudioSentence } from './text.ts';

export type QueueMode = 'buffer' | 'idle-fill'; // Closed set, Phase L

export interface QueueEdition {
  editionId: string;
  revision: number;
  voiceKey: string;
  chapters: readonly string[];
  sentencesOf(chapterKey: string): AudioSentence[];
}

interface ChapterState { statuses: SentenceStatus[]; durations: Map<number, number>; totalSec: number | null }

export interface RenderQueueDeps {
  voiceRuntime: typeof VoiceRuntimeInstance;
  store: ChunkStore;
  calibration: Calibration;
}

export class RenderQueue {
  readonly #voice: typeof VoiceRuntimeInstance;
  readonly #store: ChunkStore;
  readonly #calibration: Calibration;
  #edition: QueueEdition | null = null;
  #chapters = new Map<string, ChapterState>();
  #jobs = new Map<string, AbortController>();
  #playhead = { chapterKey: '', sentenceIndex: 0, offsetSec: 0 };
  #rtf = 0;
  #samples = 0;
  #sumDur = 0;
  #sumChars = 0;
  #sumBytes = 0;
  #mode: QueueMode = 'buffer';
  #pumping = false;
  #again = false;
  /** Serializes chapter-row read-modify-writes across concurrent jobs. */
  #rows: Promise<void> = Promise.resolve();
  #listeners = new Set<(chapterKey: string, index: number, status: SentenceStatus) => void>();

  constructor({ voiceRuntime, store, calibration }: RenderQueueDeps) {
    this.#voice = voiceRuntime;
    this.#store = store;
    this.#calibration = calibration;
  }

  get secPerChar(): number {
    return this.#sumChars > 0 ? this.#sumDur / this.#sumChars : DEFAULT_SEC_PER_CHAR;
  }

  /** Edition change: aborts every job and drops the cached statuses. */
  setEdition(edition: QueueEdition): void {
    const e = this.#edition;
    if (e && e.editionId === edition.editionId && e.revision === edition.revision && e.voiceKey === edition.voiceKey) {
      this.#edition = edition;
      return;
    }
    this.abortAll();
    this.#chapters.clear();
    this.#edition = edition;
  }

  onChange(l: (chapterKey: string, index: number, status: SentenceStatus) => void): () => void {
    this.#listeners.add(l);
    return () => { this.#listeners.delete(l); };
  }

  #emit(chapterKey: string, index: number, status: SentenceStatus): void {
    for (const l of this.#listeners) l(chapterKey, index, status);
  }

  refOf(chapterKey: string): string {
    const e = this.#edition!;
    return chapterRefOf(e.editionId, e.revision, e.voiceKey, chapterKey);
  }

  /** Loads (once) a chapter's statuses from the store; durations fill in the background. */
  async loadChapter(chapterKey: string): Promise<void> {
    if (!this.#edition || this.#chapters.has(chapterKey)) return;
    const ref = this.refOf(chapterKey);
    const count = this.#edition.sentencesOf(chapterKey).length;
    const [stored, row] = await Promise.all([this.#store.storedIndices(ref), this.#store.chapter(ref)]);
    if (this.#chapters.has(chapterKey)) return;
    const st: ChapterState = {
      statuses: Array.from({ length: count }, (_, i): SentenceStatus => (stored.has(i) ? 'stored' : 'missing')),
      durations: new Map(),
      totalSec: row && row.storedCount === count ? row.totalSec : null,
    };
    this.#chapters.set(chapterKey, st);
    if (stored.size > 0) {
      void this.#store.durations(ref).then((d) => {
        for (const [i, sec] of d) if (!st.durations.has(i)) st.durations.set(i, sec);
        this.#emit(chapterKey, -1, 'stored');
      }).catch((error) => debugEvent('audiobook', 'durations-failed', { ref, error }, 'warn'));
    }
  }

  statusOf(chapterKey: string, i: number): SentenceStatus {
    return this.#chapters.get(chapterKey)?.statuses[i] ?? 'missing';
  }

  /** A stored chunk that read back as a miss (text changed): re-render it. */
  markMissing(chapterKey: string, i: number): void {
    const st = this.#chapters.get(chapterKey);
    if (st && st.statuses[i] === 'stored') st.statuses[i] = 'missing';
  }

  /** Stored duration, else the estimate `text.length × secPerChar`. */
  secondsOf(chapterKey: string, s: AudioSentence): number {
    return this.#chapters.get(chapterKey)?.durations.get(s.index) ?? s.text.length * this.secPerChar;
  }

  storedDuration(chapterKey: string, i: number): number | undefined {
    return this.#chapters.get(chapterKey)?.durations.get(i);
  }

  chapterTotal(chapterKey: string): number | null {
    return this.#chapters.get(chapterKey)?.totalSec ?? null;
  }

  setPlayhead(chapterKey: string, sentenceIndex: number, offsetSec: number): void {
    this.#playhead = { chapterKey, sentenceIndex, offsetSec };
  }

  abortAll(): void {
    for (const ac of this.#jobs.values()) ac.abort();
    this.#jobs.clear();
  }

  stats(): { mode: QueueMode; rtf: number; rtfEff: number; inflight: number } {
    const n = Math.max(1, this.#calibration.synthWorkers);
    return { mode: this.#mode, rtf: this.#rtf, rtfEff: this.#rtf / n, inflight: this.#jobs.size };
  }

  pump(): void {
    if (this.#pumping) { this.#again = true; return; }
    this.#pumping = true;
    void this.#run()
      .catch((error) => debugEvent('audiobook', 'pump-failed', error, 'warn'))
      .finally(() => {
        this.#pumping = false;
        if (this.#again) { this.#again = false; this.pump(); }
      });
  }

  async #run(): Promise<void> {
    const e = this.#edition;
    if (!e || this.#voice.status().voice !== 'ready') return;
    const head = e.chapters.indexOf(this.#playhead.chapterKey);
    if (head < 0) return;
    const n = Math.max(1, this.#calibration.synthWorkers);
    const mode: QueueMode = this.#samples >= RTF_WARMUP && this.#rtf / n <= IDLE_FILL_RTF_EFF ? 'idle-fill' : 'buffer';
    if (mode !== this.#mode) {
      this.#mode = mode;
      debugEvent('audiobook', 'queue', this.stats());
    }
    if (mode === 'buffer') await this.#buffer(e, head, n);
    else await this.#idleFill(e, head, n);
  }

  /** Buffer: extend the contiguous stored/inflight run from the playhead to BUFFER_AHEAD_SEC. */
  async #buffer(e: QueueEdition, head: number, n: number): Promise<void> {
    let ahead = -this.#playhead.offsetSec;
    let start = this.#playhead.sentenceIndex;
    for (let c = head; c < e.chapters.length; c++, start = 0) {
      const key = e.chapters[c];
      await this.loadChapter(key);
      const st = this.#chapters.get(key)!;
      const sentences = e.sentencesOf(key);
      for (let i = start; i < sentences.length; i++) {
        if (this.#jobs.size >= n || ahead >= BUFFER_AHEAD_SEC) return;
        const status = st.statuses[i];
        if (status === 'failed') continue; // playback skips failed sentences
        if (status === 'missing') this.#dispatch(key, sentences[i], st);
        ahead += this.secondsOf(key, sentences[i]);
      }
    }
  }

  /** Idle-fill: Priority 1, then the chapter before the playhead, then following chapters within budget. */
  async #idleFill(e: QueueEdition, head: number, n: number): Promise<void> {
    const current = e.chapters[head];
    await this.loadChapter(current);
    const cur = this.#chapters.get(current)!;
    const curSentences = e.sentencesOf(current);
    const p = this.#playhead.sentenceIndex;
    const order = [...curSentences.slice(p), ...curSentences.slice(0, p)];
    for (const s of order) {
      if (this.#jobs.size >= n) return;
      if (cur.statuses[s.index] === 'missing') this.#dispatch(current, s, cur);
    }
    const bytesPerSec = this.#sumDur > 0 ? this.#sumBytes / this.#sumDur : 0;
    const fullBytes = (key: string): number =>
      e.sentencesOf(key).reduce((a, s) => a + this.secondsOf(key, s), 0) * bytesPerSec;
    let projected = fullBytes(current);
    for (let c = head + 1; c < e.chapters.length; c++) {
      const key = e.chapters[c];
      projected += fullBytes(key);
      if (projected > CHUNK_STORE_BUDGET_BYTES) return; // admission would exceed the budget after eviction
      await this.loadChapter(key);
      const st = this.#chapters.get(key)!;
      for (const s of e.sentencesOf(key)) {
        if (this.#jobs.size >= n) return;
        if (st.statuses[s.index] === 'missing') this.#dispatch(key, s, st);
      }
    }
  }

  #dispatch(chapterKey: string, s: AudioSentence, st: ChapterState): void {
    const ref = this.refOf(chapterKey);
    const key = chunkKeyOf(ref, s.index);
    const ac = new AbortController();
    st.statuses[s.index] = 'inflight';
    this.#jobs.set(key, ac);
    void this.#job(chapterKey, ref, key, s, st, ac);
  }

  async #job(chapterKey: string, ref: string, key: string, s: AudioSentence, st: ChapterState, ac: AbortController): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = performance.now();
      try {
        const voice = await this.#voice.getVoice();
        const audio = await voice.synthesize(s.text, { signal: ac.signal, priority: 'background' });
        if (ac.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const bytes = await this.#store.put(key, audio, s.text, ref);
        const wallSec = (performance.now() - t0) / 1000;
        if (this.#jobs.get(key) === ac) this.#jobs.delete(key);
        st.statuses[s.index] = 'stored';
        st.durations.set(s.index, audio.durationSec);
        if (audio.durationSec > 0) {
          const sample = wallSec / audio.durationSec;
          this.#rtf = this.#samples === 0 ? sample : RTF_ALPHA * sample + (1 - RTF_ALPHA) * this.#rtf;
          this.#samples++;
        }
        this.#sumDur += audio.durationSec;
        this.#sumChars += s.text.length;
        this.#sumBytes += bytes;
        const update = this.#rows.then(() => this.#updateChapter(chapterKey, ref, st, bytes));
        this.#rows = update.catch(() => undefined);
        await update;
        await this.#evict();
        this.#emit(chapterKey, s.index, 'stored');
        this.pump();
        return;
      } catch (error) {
        const aborted = ac.signal.aborted || (error as { name?: string })?.name === 'AbortError';
        if (aborted) {
          if (this.#jobs.get(key) === ac) this.#jobs.delete(key);
          if (st.statuses[s.index] === 'inflight') st.statuses[s.index] = 'missing';
          return;
        }
        if (attempt === 0) continue; // first failure → retry once
        if (this.#jobs.get(key) === ac) this.#jobs.delete(key);
        st.statuses[s.index] = 'failed';
        debugEvent('audiobook', 'synth-failed', { key, error }, 'warn');
        this.#emit(chapterKey, s.index, 'failed');
        this.pump();
      }
    }
  }

  async #updateChapter(chapterKey: string, ref: string, st: ChapterState, bytes: number): Promise<void> {
    const e = this.#edition!;
    const sentenceCount = st.statuses.length;
    const prev = await this.#store.chapter(ref);
    const storedCount = st.statuses.filter((x) => x === 'stored').length;
    let totalSec: number | null = null;
    if (storedCount === sentenceCount) {
      const d = await this.#store.durations(ref);
      totalSec = [...d.values()].reduce((a, b) => a + b, 0);
      for (const [i, sec] of d) st.durations.set(i, sec);
      st.totalSec = totalSec;
    }
    await this.#store.putChapter({
      editionId: e.editionId, revision: e.revision, voiceKey: e.voiceKey, chapterKey,
      sentenceCount, storedCount, totalSec, bytes: (prev?.bytes ?? 0) + bytes, lastAccess: Date.now(),
    });
  }

  async #evict(): Promise<void> {
    const e = this.#edition!;
    const head = e.chapters.indexOf(this.#playhead.chapterKey);
    const keep = [e.chapters[head], e.chapters[head + 1]].filter(Boolean).map((k) => this.refOf(k));
    for (const ref of await this.#store.evict(keep)) {
      const chapterKey = ref.split('/').slice(3).join('/');
      for (const [k, ac] of this.#jobs) if (k.startsWith(`${ref}/`)) { ac.abort(); this.#jobs.delete(k); }
      this.#chapters.delete(chapterKey);
    }
  }
}
