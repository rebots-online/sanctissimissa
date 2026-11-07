// SynthesisPool (§K.4 TT.2, amended 2026-11-06; DOCS/ARCHITECTURE/L-audiobook-20261106.md §2, §5, S5).
// `n` = calibrate().synthWorkers dedicated module Workers, each owning its own ORT session set.
// Two FIFO lanes: a free worker always takes 'interactive' before 'background'; one job per worker.
// Interactive jobs pre-empt only by priority — they never abort background jobs.
// see DOCS/sdk/onnxruntime-web-1.31/INDEX.md (Supertonic voice sessions only)

import { calibrate } from './calibrate';
import type { SynthWorkerIn, SynthWorkerOut } from './synth.worker';
import type { SynthesizedAudio, SynthPriority, VoiceAssetFile } from './voice';

const abortError = (): DOMException => new DOMException('Aborted', 'AbortError');

interface Job {
  id: number;
  text: string;
  resolve(audio: SynthesizedAudio): void;
  reject(error: unknown): void;
  signal?: AbortSignal;
  onAbort?: () => void;
}
interface Slot { worker: Worker; ready: boolean; alive: boolean; job: Job | null; discarding: boolean }

export class SynthesisPool {
  readonly #lanes: Record<SynthPriority, Job[]> = { interactive: [], background: [] };
  readonly #slots: Slot[] = [];
  readonly #inflight = new Map<number, Slot>();
  readonly #ready: Promise<{ sampleRate: number }>;
  #nextId = 1;
  #failure: Error | null = null;
  #disposed = false;

  constructor(n: number, ortThreads: number, assets: readonly VoiceAssetFile[]) {
    this.#ready = this.#start(Math.max(1, Math.floor(n)), Math.max(1, Math.floor(ortThreads)), assets);
    this.#ready.catch((error: unknown) => {
      this.#failure = error instanceof Error ? error : new Error(String(error));
      this.#rejectQueued(this.#failure);
      // Any worker init failure fails the pool; the survivors are not kept half-loaded.
      for (const slot of this.#slots) { slot.alive = false; slot.worker.terminate(); }
    });
  }

  ready(): Promise<{ sampleRate: number }> { return this.#ready; }

  async #start(n: number, ortThreads: number, assets: readonly VoiceAssetFile[]): Promise<{ sampleRate: number }> {
    const { backend } = await calibrate();
    const rates = await Promise.all(Array.from({ length: n }, async () => {
      // Each worker gets its own copy of the bytes (transferred, so never shared).
      const files = await Promise.all(assets.map(async (a) => ({ fileName: a.fileName, buffer: await a.file.arrayBuffer() })));
      if (this.#disposed) throw abortError();
      return this.#spawn({ type: 'init', assets: files, backend, ortThreads }, files.map((f) => f.buffer));
    }));
    return { sampleRate: rates[0] };
  }

  #spawn(init: SynthWorkerIn, transfer: Transferable[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./synth.worker.ts', import.meta.url), { type: 'module' });
      const slot: Slot = { worker, ready: false, alive: true, job: null, discarding: false };
      this.#slots.push(slot);
      worker.onmessage = (event: MessageEvent<SynthWorkerOut>) => {
        const message = event.data;
        if (message.type === 'ready') {
          slot.ready = true;
          resolve(message.sampleRate);
          this.#pump();
        } else if (message.type === 'error') {
          this.#lose(slot, new Error(message.message));
          reject(new Error(message.message));
        } else this.#settle(slot, message);
      };
      worker.onerror = (event) => {
        event.preventDefault();
        const error = new Error(event.message || 'The voice worker stopped');
        this.#lose(slot, error);
        reject(error);
      };
      worker.postMessage(init, transfer);
    });
  }

  run(text: string, opts: { signal?: AbortSignal; priority?: SynthPriority }): Promise<SynthesizedAudio> {
    const { signal } = opts;
    const priority = opts.priority ?? 'background';
    if (this.#disposed) return Promise.reject(abortError());
    if (signal?.aborted) return Promise.reject(abortError());
    if (this.#failure) return Promise.reject(this.#failure);
    return new Promise<SynthesizedAudio>((resolve, reject) => {
      const job: Job = { id: this.#nextId++, text, resolve, reject, signal };
      if (signal) {
        job.onAbort = () => this.#abortJob(job, priority);
        signal.addEventListener('abort', job.onAbort, { once: true });
      }
      this.#lanes[priority].push(job);
      this.#pump();
    });
  }

  /** Rejects every queued and in-flight job with AbortError; in-flight slots free when their result arrives. */
  abortAll(): void {
    this.#rejectQueued(abortError());
    for (const slot of this.#inflight.values()) this.#detach(slot, abortError());
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.abortAll();
    for (const slot of this.#slots) { slot.alive = false; slot.worker.terminate(); }
    this.#inflight.clear();
  }

  #abortJob(job: Job, priority: SynthPriority): void {
    const lane = this.#lanes[priority];
    const queued = lane.indexOf(job);
    if (queued >= 0) {
      lane.splice(queued, 1);
      this.#finish(job, abortError());
      return;
    }
    const slot = this.#inflight.get(job.id);
    if (slot) this.#detach(slot, abortError());
  }

  /** Rejects the slot's job now; the worker's later result is discarded and only then frees the slot. */
  #detach(slot: Slot, error: unknown): void {
    if (!slot.job || slot.discarding) return;
    slot.discarding = true;
    this.#finish(slot.job, error);
  }

  #pump(): void {
    for (const slot of this.#slots) {
      if (!slot.alive || !slot.ready || slot.job) continue;
      const job = this.#lanes.interactive.shift() ?? this.#lanes.background.shift();
      if (!job) return;
      slot.job = job;
      slot.discarding = false;
      this.#inflight.set(job.id, slot);
      slot.worker.postMessage({ type: 'synth', id: job.id, text: job.text } satisfies SynthWorkerIn);
    }
  }

  #settle(slot: Slot, message: Extract<SynthWorkerOut, { type: 'done' | 'failed' }>): void {
    const job = slot.job;
    if (!job || job.id !== message.id) return;
    const discarded = slot.discarding;
    slot.job = null;
    slot.discarding = false;
    this.#inflight.delete(job.id);
    if (!discarded) {
      if (message.type === 'done') {
        this.#finish(job, null, { pcm: message.pcm, sampleRate: message.sampleRate, durationSec: message.pcm.length / message.sampleRate });
      } else this.#finish(job, new Error(message.message));
    }
    this.#pump();
  }

  /** A crashed worker takes its in-flight job with it; when none is left, queued jobs fail too. */
  #lose(slot: Slot, error: Error): void {
    if (!slot.alive) return;
    slot.alive = false;
    slot.worker.terminate();
    if (slot.job) {
      this.#inflight.delete(slot.job.id);
      if (!slot.discarding) this.#finish(slot.job, error);
      slot.job = null;
    }
    if (!this.#slots.some((s) => s.alive)) {
      // No lane left: record the failure so later run() calls reject instead of queueing forever.
      this.#failure ??= error;
      this.#rejectQueued(error);
    } else this.#pump();
  }

  #rejectQueued(error: unknown): void {
    for (const lane of [this.#lanes.interactive, this.#lanes.background]) {
      for (const job of lane.splice(0)) this.#finish(job, error);
    }
  }

  #finish(job: Job, error: unknown, audio?: SynthesizedAudio): void {
    if (job.onAbort) job.signal?.removeEventListener('abort', job.onAbort);
    if (audio) job.resolve(audio);
    else job.reject(error);
  }
}
