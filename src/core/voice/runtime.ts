/**
 * L.6 F1 — VoiceRuntime: boots the Supertonic voice once per app lifetime
 * (voice first, then the L.4 embedding models — ModelPreloader awaits
 * `settled()`), gates the download on network cost and consent (§2.6), and
 * arbitrates audio focus between the audiobook, the Sacristan and reading.
 *
 * Voice bytes are acquired into OPFS on every platform (ORT runs in the
 * webview) from the R3 mirror only; the upstream URL is never a fallback.
 */

import { makeDownloadManager } from '../chat/models.ts';
import { debugEvent } from '../diagnostics/store.ts';
import { WebModelLibrary } from '../model-store/store.ts';
import type { LookupResult, ModelAsset } from '../model-store/types.ts';
import type { SidecarDb } from '../accompaniment/store.ts';
import { grantMeteredConsent, mayDownload, onNetworkCostChange } from '../net/metered.ts';
import { VOICE_ASSETS, voiceDownloadMB, type VoiceAssetRow } from './assets.ts';
import { calibrate } from './calibrate.ts';
import { createSupertonicVoice } from './supertonic.ts';
import type { SynthPriority, SynthesizedAudio, Voice } from './voice.ts';

export type VoiceState = 'loading' | 'ready' | 'waiting-metered' | 'error'; // Closed set, Phase L
export type AudioOwner = 'audiobook' | 'sacristan' | 'reading'; // Closed set, Phase L

export interface VoiceRuntimeStatus { voice: VoiceState; voiceProgress: number | null; downloadMB: number }

interface Deps { sidecar: () => SidecarDb | null }

let deps: Deps | null = null;
let state: VoiceState = 'loading';
let progress: number | null = null;
let voice: Voice | null = null;
let owner: AudioOwner | null = null;
let sacristanSpeaking = 0;
let booting = false;
let unwatchNetwork: (() => void) | null = null;
const listeners = new Set<() => void>();

let resolveSettled: () => void = () => undefined;
const settledPromise = new Promise<void>((resolve) => { resolveSettled = resolve; });

function notify(): void {
  for (const l of listeners) {
    try { l(); } catch (error) { debugEvent('voice', 'listener-failed', error, 'warn'); }
  }
}

function setState(next: VoiceState): void {
  state = next;
  if (next !== 'loading') resolveSettled();
  notify();
}

const assetOf = (r: VoiceAssetRow): ModelAsset => ({ sha256: r.sha256, bytes: r.sizeBytes, fileName: r.fileName });

function stopWatchingNetwork(): void {
  unwatchNetwork?.();
  unwatchNetwork = null;
}

async function acquireAndCreate(rows: readonly VoiceAssetRow[]): Promise<void> {
  const library = new WebModelLibrary();
  const manager = makeDownloadManager(library);
  const ids = new Set(rows.map((r) => r.id));
  const received = new Map<string, number>();
  const total = rows.reduce((a, r) => a + r.sizeBytes, 0) || 1;
  progress = 0;
  notify();
  const off = manager.onProgress((p) => {
    if (!ids.has(p.sha256)) return; // progressKey = row id
    received.set(p.sha256, p.received);
    let sum = 0;
    for (const n of received.values()) sum += n;
    progress = Math.min(1, sum / total);
    notify();
  });
  let results: LookupResult[];
  try {
    results = await Promise.all(rows.map((r) => manager.acquire(assetOf(r), r.mirrorUrl, r.sha256, r.id).promise));
  } finally {
    off();
  }
  const failed = results.findIndex((r) => r.kind !== 'ready');
  if (failed >= 0) {
    debugEvent('voice', 'acquire-failed', { id: rows[failed].id, result: results[failed] }, 'error');
    setState('error');
    return;
  }
  try {
    const assets = await Promise.all(rows.map(async (r) => ({
      fileName: r.fileName,
      sha256: r.sha256,
      file: await library.readFile(assetOf(r)),
    })));
    const inner = await createSupertonicVoice({ assets, calibration: await calibrate() });
    voice = wrap(inner);
    progress = null;
    setState('ready');
  } catch (error) {
    debugEvent('voice', 'init-failed', error, 'error');
    setState('error');
  }
}

/** The ready Voice, with `speak` claiming the Sacristan's audio focus first. */
function wrap(inner: Voice): Voice {
  return {
    backend: inner.backend,
    speak: async (text: string, opts: { signal?: AbortSignal }): Promise<void> => {
      voiceRuntime.claimAudio('sacristan');
      sacristanSpeaking++;
      try { await inner.speak(text, opts); } finally { sacristanSpeaking--; }
    },
    synthesize: (text: string, opts: { signal?: AbortSignal; priority?: SynthPriority }): Promise<SynthesizedAudio> =>
      inner.synthesize(text, opts),
    stop: (): void => inner.stop(),
    dispose: (): Promise<void> => inner.dispose(),
  };
}

/** Steps 2–4 of F1. `consented` skips the metered gate (downloadVoice granted it). */
async function boot(consented = false): Promise<void> {
  if (booting || !deps) return;
  booting = true;
  try {
    progress = null;
    if (state !== 'loading') setState('loading');
    if (VOICE_ASSETS.length === 0) {
      debugEvent('voice', 'no-assets', null, 'warn');
      setState('error');
      return;
    }
    if (!consented && !mayDownload(deps.sidecar(), 'voice')) {
      setState('waiting-metered');
      unwatchNetwork ??= onNetworkCostChange((cost) => {
        if (cost === 'unmetered' && state === 'waiting-metered') {
          stopWatchingNetwork();
          void boot();
        }
      });
      return;
    }
    stopWatchingNetwork();
    await acquireAndCreate(VOICE_ASSETS);
  } catch (error) {
    debugEvent('voice', 'init-failed', error, 'error');
    setState('error');
  } finally {
    booting = false;
  }
}

/** Idempotent: the first call boots the voice; later calls are no-ops. */
export function startVoiceRuntime(d: Deps): void {
  if (deps) return;
  deps = d;
  void boot();
}

export const voiceRuntime = {
  status(): VoiceRuntimeStatus {
    return { voice: state, voiceProgress: progress, downloadMB: voiceDownloadMB() };
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  /** Resolves the ready Voice; rejects in `error`; waits while loading or waiting-metered. */
  getVoice(): Promise<Voice> {
    if (state === 'ready' && voice) return Promise.resolve(voice);
    if (state === 'error') return Promise.reject(new Error('Voice unavailable'));
    return new Promise<Voice>((resolve, reject) => {
      const off = voiceRuntime.subscribe(() => {
        if (state === 'ready' && voice) { off(); resolve(voice); }
        else if (state === 'error') { off(); reject(new Error('Voice unavailable')); }
      });
    });
  },
  /** Metered consent for the voice group, then download (from `error`: a retry). */
  downloadVoice(): void {
    if (state === 'error') { voiceRuntime.retry(); return; }
    if (state !== 'waiting-metered' || !deps) return;
    const sidecar = deps.sidecar();
    stopWatchingNetwork();
    void grantMeteredConsent(sidecar, 'voice')
      .catch((error) => debugEvent('voice', 'consent-persist-failed', error, 'warn'))
      .then(() => boot(true));
  },
  /** Re-runs F1 from step 2 when in `error`. */
  retry(): void {
    if (state === 'error') void boot();
  },
  /** Resolves at the first `ready`, `error` or `waiting-metered`; callable before start. */
  settled(): Promise<void> {
    return settledPromise;
  },
  claimAudio(o: AudioOwner): void {
    if (o !== 'sacristan' && sacristanSpeaking > 0) voice?.stop();
    owner = o;
    notify();
  },
  audioOwner(): AudioOwner | null {
    return owner;
  },
};

/** Free-function form of `voiceRuntime.settled()` (BA.13 App wiring). */
export function settled(): Promise<void> {
  return settledPromise;
}
