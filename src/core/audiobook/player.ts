/**
 * L.6 F4 — AudiobookPlayer: gapless-enough sentence playback through two
 * HTMLAudioElements (A plays sentence i while B preloads the next non-failed
 * sentence). Each sentence is a PCM16 mono WAV object URL; rate changes use
 * `playbackRate` with `preservesPitch`, so synthesis is never redone and
 * `currentTime()` stays in source seconds at every rate.
 * see DOCS/sdk/html-media-element/mdn-htmlmediaelement.md
 * see DOCS/sdk/html-media-element/mdn-htmlmediaelement-playbackrate.md
 * see DOCS/sdk/html-media-element/mdn-htmlmediaelement-preservespitch.md
 */

import type { SynthesizedAudio } from '../voice/voice.ts';
import type { AudiobookRate, SentenceStatus } from './constants.ts';
import type { AudioSentence } from './text.ts';

export type PlayerEvent = 'sentence-start' | 'buffering' | 'chapter-end'; // Closed set, Phase L

/** RIFF/WAVE PCM16 mono: a 44-byte header plus the Int16 samples. */
export function wav(chunk: SynthesizedAudio): Blob {
  const n = chunk.pcm.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ascii = (at: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i)); };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, chunk.sampleRate, true);
  v.setUint32(28, chunk.sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, chunk.pcm[i])) * 32767), true);
  return new Blob([buf], { type: 'audio/wav' });
}

interface Slot { el: HTMLAudioElement; index: number; url: string | null }

export class AudiobookPlayer {
  readonly #getChunk: (i: number) => Promise<SynthesizedAudio | null>;
  #slots: [Slot, Slot] | null = null;
  #active = 0;
  #sentences: AudioSentence[] = [];
  #statusOf: (i: number) => SentenceStatus = () => 'missing';
  #rate: AudiobookRate = 1;
  #playing = false;
  #waiting: number | null = null;
  #gen = 0;
  #listeners = new Map<PlayerEvent, Set<(i: number) => void>>();

  constructor({ getChunk }: { getChunk: (i: number) => Promise<SynthesizedAudio | null> }) {
    this.#getChunk = getChunk;
  }

  #els(): [Slot, Slot] {
    if (!this.#slots) {
      const make = (): Slot => {
        const el = new Audio();
        el.preload = 'auto';
        el.preservesPitch = true;
        if ('webkitPreservesPitch' in el) (el as HTMLAudioElement & { webkitPreservesPitch: boolean }).webkitPreservesPitch = true;
        el.playbackRate = this.#rate;
        const slot: Slot = { el, index: -1, url: null };
        el.addEventListener('ended', () => this.#onEnded(slot));
        return slot;
      };
      this.#slots = [make(), make()];
    }
    return this.#slots;
  }

  on(event: PlayerEvent, l: (i: number) => void): () => void {
    let set = this.#listeners.get(event);
    if (!set) this.#listeners.set(event, (set = new Set()));
    set.add(l);
    return () => { set.delete(l); };
  }

  #emit(event: PlayerEvent, i: number): void {
    for (const l of this.#listeners.get(event) ?? []) l(i);
  }

  load(sentences: AudioSentence[], statusOf: (i: number) => SentenceStatus): void {
    this.#gen++;
    this.#playing = false;
    this.#waiting = null;
    for (const slot of this.#slots ?? []) this.#release(slot);
    this.#sentences = sentences;
    this.#statusOf = statusOf;
  }

  #release(slot: Slot): void {
    slot.el.pause();
    if (slot.url) URL.revokeObjectURL(slot.url);
    slot.url = null;
    slot.index = -1;
    slot.el.removeAttribute('src');
  }

  #nextPlayable(from: number): number {
    for (let i = Math.max(0, from); i < this.#sentences.length; i++) if (this.#statusOf(i) !== 'failed') return i;
    return -1;
  }

  /** Loads sentence i into a slot; false when its chunk is not stored yet. */
  async #prepare(slot: Slot, i: number, gen: number): Promise<boolean> {
    if (slot.index === i && slot.url) return true;
    const chunk = this.#statusOf(i) === 'stored' ? await this.#getChunk(i) : null;
    if (!chunk || gen !== this.#gen) return false;
    this.#release(slot);
    slot.url = URL.createObjectURL(wav(chunk));
    slot.index = i;
    slot.el.src = slot.url;
    slot.el.playbackRate = this.#rate;
    return true;
  }

  async playFrom(i: number, offsetSec: number): Promise<void> {
    const gen = ++this.#gen;
    this.#playing = true;
    this.#waiting = null;
    const slots = this.#els();
    for (const s of slots) s.el.pause();
    const idx = this.#nextPlayable(i);
    if (idx < 0) { this.#playing = false; this.#emit('chapter-end', i); return; }
    const slot = slots[this.#active];
    if (!(await this.#prepare(slot, idx, gen))) {
      if (gen !== this.#gen) return;
      this.#waiting = idx;
      this.#emit('buffering', idx);
      return;
    }
    if (gen !== this.#gen) return;
    slot.el.currentTime = idx === i ? Math.max(0, offsetSec) : 0;
    this.#start(slot, gen);
  }

  #start(slot: Slot, gen: number): void {
    slot.el.playbackRate = this.#rate;
    void slot.el.play().catch(() => undefined);
    this.#emit('sentence-start', slot.index);
    const other = this.#els()[1 - this.#active];
    const next = this.#nextPlayable(slot.index + 1);
    if (next >= 0) void this.#prepare(other, next, gen);
  }

  #onEnded(slot: Slot): void {
    if (this.#slots?.[this.#active] !== slot || !this.#playing) return;
    const gen = this.#gen;
    const finished = slot.index;
    const next = this.#nextPlayable(finished + 1);
    if (next < 0) {
      this.#release(slot);
      this.#playing = false;
      this.#emit('chapter-end', finished);
      return;
    }
    const otherIdx = 1 - this.#active;
    const other = this.#els()[otherIdx];
    if (other.index === next && other.url) {
      this.#release(slot);
      this.#active = otherIdx;
      other.el.currentTime = 0;
      this.#start(other, gen);
      return;
    }
    this.#release(slot);
    this.#active = otherIdx;
    void this.playFrom(next, 0);
  }

  /** A sentence's chunk was stored (or failed): resume when playback was waiting for it. */
  notifyStored(i: number): void {
    const w = this.#waiting;
    if (!this.#playing || w === null || w > i) return;
    const st = this.#statusOf(w);
    if (st === 'stored' || st === 'failed') void this.playFrom(w, 0);
  }

  get waiting(): number | null { return this.#waiting; }

  pause(): void {
    this.#playing = false;
    this.#waiting = null;
    for (const s of this.#slots ?? []) s.el.pause();
  }

  setRate(r: AudiobookRate): void {
    this.#rate = r;
    for (const s of this.#slots ?? []) s.el.playbackRate = r;
  }

  /** The active element's currentTime (source seconds). */
  currentTime(): number {
    return this.#slots?.[this.#active].el.currentTime ?? 0;
  }

  dispose(): void {
    this.load([], () => 'missing');
  }
}
