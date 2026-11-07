// §K.4 sentence-ahead SpeakingPipeline for Sacristan replies and reading-view speech (TT.3, amended
// 2026-11-06, §L.9; DOCS/ARCHITECTURE/L-audiobook-20261106.md S2, S3, S9).
// Scope (S2/S3): the audiobook never uses this pipeline or its worklet; it uses BA.7's RenderQueue
// and HTMLAudioElement pair.
//
// - Segmentation: `segmentSentences` (TT.1). Each sentence is synthesized whole (phonemized with
//   punctuation retained by the engine), so no word is dropped at a boundary.
// - Synthesis: `voice.synthesize(sentence, {signal, priority:'interactive'})`. The TT.2
//   `SynthesisPool` provides concurrency; this pipeline owns no workers.
// - Lookahead: sentence 0 is dispatched at once; sentence N+1 is dispatched when playback of N
//   starts (or when N is skipped after a synthesis failure). At most two jobs are ever in flight.
// - Playback: one AudioWorkletNode per speak() (`./worklet.ts`, v1.32 pattern) plays the sentences
//   back to back; its 20 ms RMS frames are re-emitted as `frame` events.
// - stop() or `signal` abort cancels synthesis and playback together and resolves speak().

import { debugEvent } from '../diagnostics/store';
import { segmentSentences } from './sentences';
import type { SynthesizedAudio, Voice } from './voice';
import { loadPipelineWorklet, PIPELINE_PROCESSOR_NAME, type WorkletInMessage, type WorkletOutMessage } from './worklet';

/** `phase`: Closed set, Phase K. */
export interface SentenceEvent { sentenceIndex: number; sentence: string; phase: 'started' | 'ended' }
/** `text` is the exact string passed to `speak()`. */
export interface SpokenEvent extends SentenceEvent { text: string }

type SentenceListener = (e: SentenceEvent) => void;
type FrameListener = (e: { level: number }) => void;

const MAX_IN_FLIGHT = 2;

// Module-level bus fed by every pipeline (consumed by TT.4's highlight).
const spokenListeners = new Set<(e: SpokenEvent) => void>();

export function subscribeSpoken(l: (e: SpokenEvent) => void): () => void {
  spokenListeners.add(l);
  return () => { spokenListeners.delete(l); };
}

function emitAll<E>(listeners: Iterable<(e: E) => void>, event: E): void {
  for (const listener of [...listeners]) {
    try { listener(event); }
    catch (error) { debugEvent('voice', 'pipeline-listener', { error: String(error) }, 'warn'); }
  }
}

let sharedContext: AudioContext | null = null;
function audioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === 'closed') sharedContext = new AudioContext();
  return sharedContext;
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
      (error: unknown) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}

type Outcome = { ok: true; audio: SynthesizedAudio } | { ok: false; error: string };

export class SpeakingPipeline {
  private readonly voice: Pick<Voice, 'synthesize'>;
  private readonly sentenceListeners = new Set<SentenceListener>();
  private readonly frameListeners = new Set<FrameListener>();
  private active: AbortController | null = null;

  constructor(voice: Pick<Voice, 'synthesize'>) {
    this.voice = voice;
  }

  on(type: 'sentence', l: (e: SentenceEvent) => void): () => void;
  on(type: 'frame', l: (e: { level: number }) => void): () => void;
  on(type: 'sentence' | 'frame', l: SentenceListener | FrameListener): () => void {
    if (type === 'sentence') {
      const listener = l as SentenceListener;
      this.sentenceListeners.add(listener);
      return () => { this.sentenceListeners.delete(listener); };
    }
    const listener = l as FrameListener;
    this.frameListeners.add(listener);
    return () => { this.frameListeners.delete(listener); };
  }

  stop(): void {
    this.active?.abort();
  }

  speak(text: string, opts: { signal?: AbortSignal }): Promise<void> {
    if (this.active) return Promise.reject(new Error('SpeakingPipeline is already speaking'));
    const sentences = segmentSentences(text);
    if (sentences.length === 0 || opts.signal?.aborted) return Promise.resolve();
    const controller = new AbortController();
    const onAbort = (): void => controller.abort();
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    this.active = controller;
    // Resume within the caller's (user-gesture) call stack, before any synthesis awaits.
    const context = audioContext();
    const resumed = context.resume();
    return this.run(text, sentences, context, resumed, controller.signal).finally(() => {
      opts.signal?.removeEventListener('abort', onAbort);
      controller.abort();   // cancel any synthesis still in flight after an error or drain
      if (this.active === controller) this.active = null;
    });
  }

  private async run(text: string, sentences: string[], context: AudioContext, resumed: Promise<void>,
    signal: AbortSignal): Promise<void> {
    const outcomes = new Map<number, Outcome>();
    let dispatched = 0;   // next sentence index to dispatch
    let wanted = 0;       // highest index whose synthesis should have started
    let inFlight = 0;
    let posted = 0;       // next sentence index to hand to the worklet (in order)
    let node: AudioWorkletNode | null = null;
    let playing = -1;     // sentence started but not yet ended
    let settle: ((error?: unknown) => void) | null = null;

    const emitSentence = (sentenceIndex: number, phase: SentenceEvent['phase']): void => {
      const event: SentenceEvent = { sentenceIndex, sentence: sentences[sentenceIndex], phase };
      emitAll(this.sentenceListeners, event);
      emitAll(spokenListeners, { ...event, text });
    };

    const post = (message: WorkletInMessage, transfer: Transferable[] = []): void => {
      node?.port.postMessage(message, transfer);
    };

    const want = (index: number): void => {
      if (index > wanted) wanted = index;
      pump();
    };

    const flush = (): void => {
      if (!node || signal.aborted) return;
      while (posted < sentences.length && outcomes.has(posted)) {
        const index = posted++;
        const outcome = outcomes.get(index) as Outcome;
        outcomes.delete(index);
        if (outcome.ok) {
          const { pcm, sampleRate } = outcome.audio;
          const own = pcm.byteOffset === 0 && pcm.byteLength === pcm.buffer.byteLength ? pcm : pcm.slice();
          post({ type: 'push', index, pcm: own, sourceRate: sampleRate }, [own.buffer as ArrayBuffer]);
        } else {
          // Never stall: record the skip and keep the lookahead moving past it.
          debugEvent('voice', 'pipeline-skip', { sentenceIndex: index, error: outcome.error }, 'warn');
          want(index + 1);
        }
      }
      if (posted === sentences.length) post({ type: 'end' });
    };

    const pump = (): void => {
      while (!signal.aborted && dispatched <= wanted && dispatched < sentences.length && inFlight < MAX_IN_FLIGHT) {
        const index = dispatched++;
        inFlight += 1;
        this.voice.synthesize(sentences[index], { signal, priority: 'interactive' }).then(
          (audio): Outcome => ({ ok: true, audio }),
          (error: unknown): Outcome => ({ ok: false, error: error instanceof Error ? error.message : String(error) }),
        ).then((outcome) => {
          inFlight -= 1;
          if (signal.aborted) return;
          outcomes.set(index, outcome);
          flush();
          pump();
        });
      }
    };

    pump();   // sentence 0 starts synthesizing while the context resumes and the worklet loads

    try {
      await abortable(resumed, signal);
      await abortable(loadPipelineWorklet(context), signal);
      const created = new AudioWorkletNode(context, PIPELINE_PROCESSOR_NAME, {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1],
      });
      node = created;
      await new Promise<void>((resolve, reject) => {
        let finished = false;
        settle = (error?: unknown): void => {
          if (finished) return;
          finished = true;
          signal.removeEventListener('abort', onAbort);
          context.removeEventListener('statechange', onStateChange);
          created.port.onmessage = null;
          created.onprocessorerror = null;
          created.disconnect();
          created.port.close();
          if (playing >= 0) { const index = playing; playing = -1; emitSentence(index, 'ended'); }
          if (error !== undefined) reject(error);
          else resolve();
        };
        const onAbort = (): void => settle?.();
        const onStateChange = (): void => {
          if (context.state === 'closed') settle?.(new Error('Audio playback was interrupted'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
        context.addEventListener('statechange', onStateChange);
        created.onprocessorerror = () => settle?.(new Error('Speech AudioWorklet failed'));
        created.port.onmessage = (event: MessageEvent<WorkletOutMessage>) => {
          const data = event.data;
          if (data.type === 'started') {
            playing = data.index;
            emitSentence(data.index, 'started');
            want(data.index + 1);
          } else if (data.type === 'ended') {
            if (playing === data.index) playing = -1;
            emitSentence(data.index, 'ended');
          } else if (data.type === 'frame') {
            emitAll(this.frameListeners, { level: data.level });
          } else if (data.type === 'drained') {
            settle?.();
          }
        };
        created.connect(context.destination);
        flush();   // hand over anything synthesized while the worklet was loading
      });
    } catch (error) {
      if (signal.aborted) return;   // stop()/abort resolves speak
      debugEvent('voice', 'pipeline-error', { error: error instanceof Error ? error.message : String(error) }, 'error');
      throw error;
    } finally {
      settle = null;
      outcomes.clear();
    }
  }
}
