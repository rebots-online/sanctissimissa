// §K.4 voice contract, amended 2026-11-06 (§L.9; DOCS/ARCHITECTURE/L-audiobook-20261106.md §2, S1).
// The amendment is additive: `synthesize` and `SynthPriority` are new; `speak`, `stop` and
// `dispose` are unchanged from §K.4 (the natally `WebVoice` contract shape).
// Erasable-only TypeScript (no enum, no parameter properties) so Node can strip-load this file.

/** Closed set, Phase K. */
export type VoiceBackend = 'webgpu' | 'wasm';

/** Closed set, Phase L. */
export type SynthPriority = 'interactive' | 'background';

/** Mono PCM produced by `Voice.synthesize`. `durationSec = pcm.length / sampleRate`. */
export interface SynthesizedAudio { pcm: Float32Array; sampleRate: number; durationSec: number }

export interface Voice {
  backend: VoiceBackend;
  /** K.4, unchanged: segments `text`, synthesizes sentence-ahead and plays through the AudioWorklet. */
  speak(text: string, opts: { signal?: AbortSignal }): Promise<void>;
  /**
   * Synthesize exactly one sentence without playing it.
   *
   * - Input: exactly one sentence, as produced by `segmentSentences` (`./sentences.ts`) or the
   *   audiobook sub-split (L-audiobook §2.4). It is phonemized whole, with punctuation retained
   *   (K.4 discipline).
   * - Output: mono PCM in [-1, 1] at the engine's native rate. `sampleRate` is read from the
   *   Supertonic config and is never a literal. `durationSec = pcm.length / sampleRate`.
   * - It never touches an AudioContext and never plays.
   * - On `signal` abort it rejects with `new DOMException('Aborted', 'AbortError')` and frees its
   *   pool slot.
   * - `priority` defaults to `'background'`; `speak()` uses `'interactive'` internally.
   * - Concurrent calls are safe: they are served by `SynthesisPool` (`./pool.ts`, TT.2).
   */
  synthesize(text: string, opts: { signal?: AbortSignal; priority?: SynthPriority }): Promise<SynthesizedAudio>;
  stop(): void;
  dispose(): Promise<void>;
}

/** `calibrate()` result (TT.2), as amended by L-audiobook §2. */
export interface Calibration { backend: VoiceBackend; threads: number; synthWorkers: number; ortThreadsPerWorker: number }

/** One sha256-pinned voice asset (model / config / voice-style file) handed to the engine. */
export interface VoiceAssetFile { fileName: string; sha256: string; file: Blob }

/** Options for `createSupertonicVoice` (TT.2). */
export interface SupertonicVoiceOptions { assets: readonly VoiceAssetFile[]; calibration: Calibration }
