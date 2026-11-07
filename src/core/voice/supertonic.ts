// §K.4 Supertonic voice (TT.2, amended 2026-11-06; DOCS/ARCHITECTURE/L-audiobook-20261106.md §2, S1,
// S5, S8). `synthesize` is served by the SynthesisPool; `speak` is the K.4 sentence-ahead pipeline
// (TT.3), which calls `synthesize` with 'interactive'. No browser speech API, no CDN, no same-origin
// voice path: the assets arrive sha256-pinned from the runtime model store (S8).
// see DOCS/sdk/onnxruntime-web-1.31/INDEX.md (Supertonic voice sessions only)

import { SpeakingPipeline } from './pipeline';
import { SynthesisPool } from './pool';
import type { SupertonicVoiceOptions, SynthesizedAudio, Voice } from './voice';

/** Builds the pool and waits for every worker to load; any worker init failure rejects. */
export async function createSupertonicVoice(options: SupertonicVoiceOptions): Promise<Voice> {
  const { calibration, assets } = options;
  const pool = new SynthesisPool(calibration.synthWorkers, calibration.ortThreadsPerWorker, assets);
  try {
    await pool.ready();
  } catch (error) {
    await pool.dispose();
    throw error;
  }
  let active: SpeakingPipeline | null = null;

  const voice: Voice = {
    backend: calibration.backend,
    async synthesize(text, { signal, priority } = {}): Promise<SynthesizedAudio> {
      const { pcm, sampleRate } = await pool.run(text, { signal, priority: priority ?? 'background' });
      return { pcm, sampleRate, durationSec: pcm.length / sampleRate };
    },
    async speak(text, { signal } = {}): Promise<void> {
      // One spoken stream at a time: a new speak() replaces the one still playing.
      active?.stop();
      const pipeline = new SpeakingPipeline(voice);
      active = pipeline;
      try {
        await pipeline.speak(text, { signal });
      } finally {
        if (active === pipeline) active = null;
      }
    },
    stop(): void {
      active?.stop();
    },
    async dispose(): Promise<void> {
      active?.stop();
      active = null;
      await pool.dispose();
    },
  };
  return voice;
}
