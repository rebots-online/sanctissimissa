// §K.4 AudioWorklet playback for Sacristan replies and reading-view speech (TT.3, amended
// 2026-11-06; DOCS/ARCHITECTURE/L-audiobook-20261106.md S2, S3: the audiobook never uses this
// worklet — it plays through BA.7's HTMLAudioElement pair).
//
// v1.32 pattern (natally `apps/local/src/voice/web.ts` KOKORO_WORKLET_SOURCE): the processor is
// kept as a source string and loaded with `audioWorklet.addModule` from a local Blob ES module, so
// no separate worklet entrypoint is bundled and nothing is fetched from a CDN. Each sentence's PCM
// is linearly resampled from its native rate to the context rate; every 20 ms of PCM actually
// written to the output is reduced to one RMS level in [0, 1] and posted as `{type:'frame', level}`.
//
// Unlike v1.32 (one node per utterance), one node plays a whole `speak()` call: sentences are
// queued back to back inside the processor, so no inter-sentence silence is added beyond the
// natural pauses already in the synthesized audio. While its queue is empty and more sentences may
// still arrive (`end` not yet received) it renders silence and stays alive.
//
// Port protocol (Closed set, Phase K):
//   in  {type:'push', index:number, pcm:Float32Array /*transferred*/, sourceRate:number}
//   in  {type:'end'}                      — no further pushes for this speak()
//   out {type:'started', index}           — first sample of sentence `index` reached the output
//   out {type:'ended', index}             — last sample of sentence `index` reached the output
//   out {type:'frame', level}             — 20 ms RMS envelope of the rendered output
//   out {type:'drained'}                  — `end` received and every pushed sentence has ended

/** Registered AudioWorkletProcessor name. */
export const PIPELINE_PROCESSOR_NAME = 'sanctissimissa-speech';

/** Messages the processor posts back to the main thread. */
export type WorkletOutMessage =
  | { type: 'started'; index: number }
  | { type: 'ended'; index: number }
  | { type: 'frame'; level: number }
  | { type: 'drained' };

/** Messages the main thread posts to the processor. */
export type WorkletInMessage =
  | { type: 'push'; index: number; pcm: Float32Array; sourceRate: number }
  | { type: 'end' };

export const PIPELINE_WORKLET_SOURCE = `
class SpeechPlayback extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.current = null;
    this.ended = false;
    this.done = false;
    this.window = Math.max(1, Math.round(sampleRate * 0.020));
    this.squares = 0;
    this.count = 0;
    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'push') {
        const outputLength = Math.ceil(data.pcm.length * sampleRate / data.sourceRate);
        this.queue.push({ index: data.index, pcm: data.pcm, step: data.sourceRate / sampleRate, outputLength, rendered: 0 });
      } else if (data.type === 'end') {
        this.ended = true;
      }
    };
  }
  flush() {
    if (this.count === 0) return;
    this.port.postMessage({ type: 'frame', level: Math.min(1, Math.sqrt(this.squares / this.count)) });
    this.squares = 0;
    this.count = 0;
  }
  next() {
    while (this.queue.length > 0) {
      const segment = this.queue.shift();
      this.port.postMessage({ type: 'started', index: segment.index });
      if (segment.outputLength > 0) return segment;
      this.port.postMessage({ type: 'ended', index: segment.index });
    }
    return null;
  }
  process(_inputs, outputs) {
    const output = outputs[0][0];
    output.fill(0);
    if (this.done) return false;
    let i = 0;
    while (i < output.length) {
      if (this.current === null) this.current = this.next();
      const segment = this.current;
      if (segment === null) break;
      const pcm = segment.pcm;
      const last = pcm.length - 1;
      for (; i < output.length && segment.rendered < segment.outputLength; i++) {
        const position = segment.rendered * segment.step;
        const index = Math.floor(position);
        const fraction = position - index;
        const left = pcm[Math.min(index, last)];
        const right = pcm[Math.min(index + 1, last)];
        const sample = Math.max(-1, Math.min(1, left + (right - left) * fraction));
        output[i] = sample;
        segment.rendered += 1;
        this.squares += sample * sample;
        this.count += 1;
        if (this.count === this.window) this.flush();
      }
      if (segment.rendered >= segment.outputLength) {
        this.flush();
        this.port.postMessage({ type: 'ended', index: segment.index });
        this.current = null;
      }
    }
    if (this.current === null && this.queue.length === 0 && this.ended) {
      this.port.postMessage({ type: 'drained' });
      this.done = true;
      return false;
    }
    return true;
  }
}
registerProcessor('${PIPELINE_PROCESSOR_NAME}', SpeechPlayback);
`;

const loaded = new WeakMap<BaseAudioContext, Promise<void>>();

/** Load the processor into `context` once (memoized per context; a failed load may be retried). */
export function loadPipelineWorklet(context: BaseAudioContext): Promise<void> {
  let ready = loaded.get(context);
  if (!ready) {
    ready = (async () => {
      const url = URL.createObjectURL(new Blob([PIPELINE_WORKLET_SOURCE], { type: 'text/javascript' }));
      try { await context.audioWorklet.addModule(url); }
      finally { URL.revokeObjectURL(url); }
    })();
    ready.catch(() => { loaded.delete(context); });
    loaded.set(context, ready);
  }
  return ready;
}
