// §K.4 startup calibration, amended 2026-11-06 (§L.9; DOCS/ARCHITECTURE/L-audiobook-20261106.md §2,
// S5, S6). Picks the backend once (v1.32 WebGPU→WASM adapter probe) and sizes the SynthesisPool.
// There is no COOP/COEP (L.4), so without `crossOriginIsolated` ORT runs one thread per worker and
// parallelism comes from workers, bounded by memory (S5). rtf is NOT measured here (S6).
// see DOCS/sdk/onnxruntime-web-1.31/README-js-web.md §Compatibility (WebGPU / WebAssembly EPs)

import { debugEvent } from '../diagnostics/store';
import type { Calibration, VoiceBackend } from './voice';

type GpuNavigator = Navigator & {
  gpu?: { requestAdapter?: () => Promise<object | null> };
  deviceMemory?: number;
};

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

async function probeBackend(nav: GpuNavigator): Promise<VoiceBackend> {
  try {
    // Browsers can expose navigator.gpu without a usable adapter; only a real adapter selects WebGPU.
    return (await nav.gpu?.requestAdapter?.()) ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

async function measure(): Promise<Calibration> {
  const nav = navigator as GpuNavigator;
  const backend = await probeBackend(nav);
  const threads = Math.max(1, Math.min((nav.hardwareConcurrency ?? 2) - 1, 8));
  const memCap = nav.deviceMemory ? Math.max(1, Math.floor(nav.deviceMemory / 2)) : 2;
  const synthWorkers = backend === 'webgpu' ? 1 : clamp(Math.min(threads, 4, memCap), 1, 4);
  const ortThreadsPerWorker = globalThis.crossOriginIsolated ? Math.max(1, Math.floor(threads / synthWorkers)) : 1;
  const calibration: Calibration = { backend, threads, synthWorkers, ortThreadsPerWorker };
  debugEvent('voice', 'calibrate', calibration);
  return calibration;
}

let memo: Promise<Calibration> | null = null;

/** Memoized for the process: the probe runs and `calibrate` is logged exactly once per launch. */
export function calibrate(): Promise<Calibration> {
  memo ??= measure();
  return memo;
}
