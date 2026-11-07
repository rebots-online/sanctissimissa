// Supertonic synthesis worker (§K.4 TT.2, amended 2026-11-06; DOCS/ARCHITECTURE/L-audiobook-20261106.md
// §2, S5). One pool slot: owns its own ORT session set and synthesizes one sentence per job.
// Engine: Supertonic as deployed in the natally family (provenance only, never fetched); session
// discipline from natally v1.32 `apps/local/src/voice/web.ts` (input/output names validated at
// init, WebGPU→WASM fallback, no CDN, no browser speech).
// see DOCS/sdk/onnxruntime-web-1.31/README-js-web.md §Compatibility; DOCS/sdk/onnxruntime-web-1.31/INDEX.md

import type { InferenceSession, Tensor } from 'onnxruntime-web';
// Static imports: Vite's default worker format (iife) cannot code-split, so both ORT builds ride the
// worker chunk and `init` selects one by backend. phonemizer bundles eSpeak-NG (no browser speech).
import * as ortWebgpu from 'onnxruntime-web/webgpu';
import * as ortWasm from 'onnxruntime-web/wasm';
import { phonemize } from 'phonemizer';
// Same-origin ORT runtime files, hashed into dist-web/assets/ by Vite — never a CDN.
import wasmPlain from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import mjsPlain from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import wasmGpu from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import mjsGpu from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import type { VoiceBackend } from './voice';

/** Closed set, Phase L. */
export type SynthWorkerIn =
  | { type: 'init'; assets: { fileName: string; buffer: ArrayBuffer }[]; backend: VoiceBackend; ortThreads: number }
  | { type: 'synth'; id: number; text: string };
/** Closed set, Phase L. */
export type SynthWorkerOut =
  | { type: 'ready'; sampleRate: number }
  | { type: 'error'; message: string }
  | { type: 'done'; id: number; pcm: Float32Array; sampleRate: number }
  | { type: 'failed'; id: number; message: string };

type Ort = typeof import('onnxruntime-web');
type Vocabulary = ReadonlyMap<string, number>;

/** Denoising steps per sentence (natally Supertonic default); not a model-config value. */
const DENOISE_STEPS = 5;
const SPEED = 1;
const ENCODER_IN = ['input_ids', 'attention_mask', 'style'];
const DENOISER_IN = ['noisy_latents', 'latent_mask', 'style', 'encoder_outputs', 'attention_mask', 'timestep', 'num_inference_steps'];
const DECODER_IN = ['latents'];

interface ModelConfig { sampleRate: number; latentSize: number; latentChannels: number; styleDim: number }
interface Engine {
  ort: Ort; config: ModelConfig; vocab: Vocabulary; phonemic: boolean; style: Tensor;
  encoder: InferenceSession; denoiser: InferenceSession; decoder: InferenceSession;
}

const post = (message: SynthWorkerOut, transfer: Transferable[] = []): void => self.postMessage(message, { transfer });
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const json = (buffer: ArrayBuffer): unknown => JSON.parse(new TextDecoder().decode(buffer));

function positiveInt(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw new TypeError(`Voice config.json lacks a positive ${key}`);
  return value;
}

/** `sampleRate` and latent geometry come from the voice config asset — never literals. */
function configFrom(value: unknown): ModelConfig {
  const source = (value ?? {}) as Record<string, unknown>;
  const compress = positiveInt(source, 'chunk_compress_factor');
  return {
    sampleRate: positiveInt(source, 'sampling_rate'),
    latentSize: positiveInt(source, 'base_chunk_size') * compress,
    latentChannels: positiveInt(source, 'latent_dim') * compress,
    styleDim: positiveInt(source, 'style_dim'),
  };
}

/** Character vocabulary from tokenizer.json `model.vocab` (one symbol per id). */
function vocabularyFrom(value: unknown): Vocabulary {
  const vocab = (value as { model?: { vocab?: unknown } } | null)?.model?.vocab;
  if (!vocab || typeof vocab !== 'object' || Array.isArray(vocab)) throw new TypeError('Expected Supertonic tokenizer.json model.vocab');
  const entries = Object.entries(vocab as Record<string, unknown>);
  if (!entries.length || entries.some(([key, id]) => [...key].length !== 1 || !Number.isSafeInteger(id) || (id as number) < 0)) {
    throw new TypeError('Invalid Supertonic character vocabulary');
  }
  return new Map(entries as [string, number][]);
}

/** Straight quotes, NFKD, collapsed whitespace, ASCII dashes, and a closing stop so the sentence ends. */
function speakable(text: string): string {
  const straight = text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').normalize('NFKD').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  return /[.!?…]["')\]]*$/.test(straight) ? straight : `${straight}.`;
}

/** v1.32 discipline: eSpeak-NG IPA of the whole sentence, punctuation kept in place between pieces. */
async function phonemesFor(text: string): Promise<string> {
  const pieces = text.split(/([;!?¡¿—…"«»“”(){}[\]]+|(?<!\d)[,:.]+|[,:.]+(?!\d))/u);
  const out: string[] = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    if (index % 2 === 1 || !piece.trim()) out.push(piece);
    else out.push(`${/^\s/.test(piece) ? ' ' : ''}${(await phonemize(piece.trim(), 'en-us')).join(' ')}${/\s$/.test(piece) ? ' ' : ''}`);
  }
  return out.join('').trim();
}

/** Standard normal noise (Box–Muller) for the initial latents. */
function gaussian(length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 2) {
    const radius = Math.sqrt(-2 * Math.log(1 - Math.random()));
    const angle = 2 * Math.PI * Math.random();
    out[i] = radius * Math.cos(angle);
    if (i + 1 < length) out[i + 1] = radius * Math.sin(angle);
  }
  return out;
}

const longTensor = (ort: Ort, values: ArrayLike<number>, dims: number[]): Tensor =>
  new ort.Tensor('int64', BigInt64Array.from(Array.from(values), (v) => BigInt(v)), dims);

async function openSessions(ort: Ort, assets: Map<string, ArrayBuffer>, backend: VoiceBackend): Promise<InferenceSession[]> {
  const sessions: InferenceSession[] = [];
  try {
    // One InferenceSession per `.onnx` asset; its `<name>.onnx_data` (if vendored) is the external data.
    for (const [fileName, model] of assets) {
      if (!fileName.endsWith('.onnx')) continue;
      const dataName = `${fileName}_data`;
      const data = assets.get(dataName);
      const options: InferenceSession.SessionOptions = {
        executionProviders: backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'],
        graphOptimizationLevel: 'all',
        ...(data ? { externalData: [{ path: dataName, data: new Uint8Array(data) }] } : {}),
      };
      sessions.push(await ort.InferenceSession.create(new Uint8Array(model), options));
    }
    return sessions;
  } catch (error) {
    await Promise.allSettled(sessions.map((s) => s.release()));
    throw error;
  }
}

const has = (session: InferenceSession, names: string[]): boolean => names.every((name) => session.inputNames.includes(name));

async function load(message: Extract<SynthWorkerIn, { type: 'init' }>): Promise<Engine> {
  const ort: Ort = message.backend === 'webgpu' ? ortWebgpu : ortWasm;
  ort.env.wasm.numThreads = message.ortThreads;
  ort.env.wasm.wasmPaths = message.backend === 'webgpu' ? { wasm: wasmGpu, mjs: mjsGpu } : { wasm: wasmPlain, mjs: mjsPlain };
  const assets = new Map(message.assets.map((a) => [a.fileName, a.buffer]));
  const need = (fileName: string): ArrayBuffer => {
    const buffer = assets.get(fileName);
    if (!buffer) throw new TypeError(`Voice asset ${fileName} is missing`);
    return buffer;
  };
  const config = configFrom(json(need('config.json')));
  const vocab = vocabularyFrom(json(need('tokenizer.json')));
  const voiceName = [...assets.keys()].find((name) => name.endsWith('.bin'));
  if (!voiceName) throw new TypeError('Voice style (.bin) asset is missing');
  const floats = new Float32Array(need(voiceName).slice(0));
  if (!floats.length || floats.length % config.styleDim !== 0 || !floats.every(Number.isFinite)) throw new TypeError('Invalid Supertonic voice style');
  const style = new ort.Tensor('float32', floats, [1, floats.length / config.styleDim, config.styleDim]);
  const sessions = await openSessions(ort, assets, message.backend);
  const encoder = sessions.find((s) => has(s, ENCODER_IN));
  const denoiser = sessions.find((s) => has(s, DENOISER_IN));
  const decoder = sessions.find((s) => s !== encoder && s !== denoiser && has(s, DECODER_IN));
  if (sessions.length !== 3 || !encoder || !denoiser || !decoder || encoder.outputNames.length < 2 || !denoiser.outputNames.length || !decoder.outputNames.length) {
    await Promise.allSettled(sessions.map((s) => s.release()));
    throw new TypeError('Expected Supertonic text_encoder / latent_denoiser / voice_decoder ONNX sessions');
  }
  // Phonemic vocabularies take eSpeak IPA; grapheme vocabularies take the sentence text itself.
  const phonemic = vocab.has('ə') || vocab.has('ˈ');
  return { ort, config, vocab, phonemic, style, encoder, denoiser, decoder };
}

async function synth(engine: Engine, text: string): Promise<Float32Array> {
  const { ort, config, vocab } = engine;
  const sentence = speakable(text);
  const symbols = engine.phonemic ? await phonemesFor(sentence) : sentence;
  // The model's own tokenizer drops what it has no symbol for; nothing else is removed.
  const ids = [...symbols].filter((c) => vocab.has(c)).map((c) => vocab.get(c) as number);
  if (!ids.length) return new Float32Array(0);
  const inputIds = longTensor(ort, ids, [1, ids.length]);
  const attentionMask = longTensor(ort, new Array<number>(ids.length).fill(1), [1, ids.length]);
  const encoded = await engine.encoder.run({ input_ids: inputIds, attention_mask: attentionMask, style: engine.style });
  const [hiddenName, durationName] = engine.encoder.outputNames;
  const seconds = (encoded[durationName].data as Float32Array)[0];
  const length = Math.max(1, Math.ceil(Math.floor((seconds / SPEED) * config.sampleRate) / config.latentSize));
  const latentMask = longTensor(ort, new Array<number>(length).fill(1), [1, length]);
  const steps = new ort.Tensor('float32', Float32Array.of(DENOISE_STEPS), [1]);
  let latents: Tensor = new ort.Tensor('float32', gaussian(config.latentChannels * length), [1, config.latentChannels, length]);
  for (let step = 0; step < DENOISE_STEPS; step += 1) {
    const out = await engine.denoiser.run({
      noisy_latents: latents, latent_mask: latentMask, style: engine.style, encoder_outputs: encoded[hiddenName],
      attention_mask: attentionMask, timestep: new ort.Tensor('float32', Float32Array.of(step), [1]), num_inference_steps: steps,
    });
    latents = out[engine.denoiser.outputNames[0]];
  }
  const decoded = await engine.decoder.run({ latents });
  const wave = decoded[engine.decoder.outputNames[0]].data as Float32Array;
  const pcm = wave.slice(0, length * config.latentSize);
  for (let i = 0; i < pcm.length; i += 1) pcm[i] = Number.isFinite(pcm[i]) ? Math.max(-1, Math.min(1, pcm[i])) : 0;
  return pcm;
}

let engine: Engine | null = null;
let work: Promise<void> = Promise.resolve();

self.onmessage = (event: MessageEvent<SynthWorkerIn>) => {
  const message = event.data;
  if (message.type === 'init') {
    work = work.then(async () => {
      try {
        engine = await load(message);
        post({ type: 'ready', sampleRate: engine.config.sampleRate });
      } catch (error) {
        post({ type: 'error', message: messageOf(error) });
      }
    });
  } else if (message.type === 'synth') {
    work = work.then(async () => {
      try {
        if (!engine) throw new Error('The voice is not loaded');
        const pcm = await synth(engine, message.text);
        post({ type: 'done', id: message.id, pcm, sampleRate: engine.config.sampleRate }, [pcm.buffer]);
      } catch (error) {
        post({ type: 'failed', id: message.id, message: messageOf(error) });
      }
    });
  }
};
