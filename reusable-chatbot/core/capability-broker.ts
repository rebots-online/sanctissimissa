// Capability broker (§7.8.1, decision 23): one capability-negotiation shape
// over every runtime. The broker reports OBSERVED truth — web probes the GPU
// adapter directly; the Tauri shell's native probe is invoked through the
// injected bridge. Consumers (registry, picker, provider selection) rank from
// this report and never from catalog claims. Honesty rule: a missing
// capability yields `unsupported` notes, never a pretend mode.

export type BrokerRuntime = 'web' | 'tauri' | 'android';

export interface CapabilityReport {
  runtime: BrokerRuntime;
  /** Working memory the runner may claim (weights + KV + scratch). */
  memoryBudgetBytes: number;
  /** e.g. 'webgpu', 'webgpu-subgroups', 'cuda', 'vulkan', 'metal', 'cpu-simd3'. */
  accelerations: string[];
  /** Largest context the runtime can honestly sustain. */
  contextCeiling: number;
  /** Weight quant formats the runtime can load (union over providers). */
  weightFormats: string[];
  /** KV formats the runtime can honor (turbo* only where fused kernels exist). */
  kvFormats: string[];
  threads: number;
  notes: string[];
}

export type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

interface GpuAdapterLike {
  limits: Record<string, number>;
  features: { has: (feature: string) => boolean } | Iterable<unknown>;
}

/** Pure derivation over injected inputs — the tests exercise this directly. */
export function reportFromInputs(inputs: {
  runtime: BrokerRuntime;
  gpuAdapter: GpuAdapterLike | null;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  nativeReport: Partial<CapabilityReport> | null;
}): CapabilityReport {
  const { runtime, gpuAdapter, deviceMemoryGb, hardwareConcurrency, nativeReport } = inputs;
  if (runtime !== 'web' && nativeReport) {
    return {
      runtime,
      memoryBudgetBytes: nativeReport.memoryBudgetBytes ?? 2 * 1024 ** 3,
      accelerations: nativeReport.accelerations ?? ['cpu-simd3'],
      contextCeiling: nativeReport.contextCeiling ?? 8192,
      weightFormats: nativeReport.weightFormats ?? ['Q4_K_M', 'Q6_K', 'Q8_0'],
      kvFormats: nativeReport.kvFormats ?? ['q8_0', 'f16'],
      threads: nativeReport.threads ?? 4,
      notes: nativeReport.notes ?? [],
    };
  }
  const notes: string[] = [];
  const accelerations: string[] = ['cpu-simd3'];
  let contextCeiling = 8192;
  const threads = Math.max(1, Math.min(hardwareConcurrency ?? 2, 8));
  // Conservative budget: leave the UI, corpus index and WebView headroom
  // (§7.8.3 — ≥20% safety headroom is a promotion gate, so probe low).
  const ramGb = Math.min(deviceMemoryGb ?? 4, 8);
  const memoryBudgetBytes = Math.floor(ramGb * 1024 ** 3 * 0.5);
  if (typeof navigator !== 'undefined' && gpuAdapter) {
    accelerations.unshift('webgpu');
    const limits = gpuAdapter.limits ?? {};
    const features = gpuAdapter.features as { has?: (feature: string) => boolean } | undefined;
    if (typeof features?.has === 'function' && features.has('subgroups')) {
      accelerations.push('webgpu-subgroups');
    }
    const maxBuffer = limits['maxBufferSize'] ?? 0;
    if (maxBuffer > 0 && maxBuffer < 1024 ** 3) {
      notes.push(`webgpu maxBufferSize ${maxBuffer} — large single-buffer weights unsupported`);
      contextCeiling = Math.min(contextCeiling, 4096);
    }
  } else {
    notes.push('no WebGPU adapter — browser generation needs the desktop app or a WebGPU browser');
  }
  return {
    runtime: 'web',
    memoryBudgetBytes,
    accelerations,
    contextCeiling,
    weightFormats: ['Q4_K_M', 'Q6_K', 'Q8_0'],
    kvFormats: ['q8_0', 'f16'],
    threads,
    notes,
  };
}

/** Live web probe. `adapterOverride` exists for tests. */
export async function probeWebCapabilities(
  adapterOverride: GpuAdapterLike | null = null,
): Promise<CapabilityReport> {
  let adapter: GpuAdapterLike | null = adapterOverride;
  if (adapter === null && typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      adapter = (await (
        navigator as unknown as {
          gpu: { requestAdapter(): Promise<GpuAdapterLike | null> };
        }
      ).gpu.requestAdapter()) as GpuAdapterLike | null;
    } catch {
      adapter = null;
    }
  }
  const nav = (typeof navigator === 'undefined' ? {} : navigator) as {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  return reportFromInputs({
    runtime: 'web',
    gpuAdapter: adapter,
    deviceMemoryGb: nav.deviceMemory ?? null,
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    nativeReport: null,
  });
}

/** Tauri-shell probe: the native side answers; the broker only frames it. */
export async function probeNativeCapabilities(invoke: TauriInvoke): Promise<CapabilityReport> {
  const native = (await invoke('inference_probe')) as Partial<CapabilityReport>;
  return reportFromInputs({
    runtime: 'tauri',
    gpuAdapter: null,
    deviceMemoryGb: null,
    hardwareConcurrency: null,
    nativeReport: native ?? {},
  });
}

/** True when the report can sustain the given weights + context demand. */
export function canDeploy(report: CapabilityReport, weightsBytes: number, kvBytes: number): boolean {
  return weightsBytes + kvBytes <= report.memoryBudgetBytes;
}
