/**
 * CP.7/CP.9 engine resolution (§7.8.5): pick the real provider for this
 * runtime from observed capability truth. There is NO mock path here — the
 * deterministic mock remains a test fixture in session.ts and is never
 * returned to the UI. Native (Tauri) prefers the CP.3 shared-library GGUF
 * behind the Rust llama.cpp bridge; web prefers WebLLM when a WebGPU adapter
 * exists; everything else is honestly unsupported.
 */

import type { EngineConfig, IInferenceEngine } from '../../../reusable-chatbot/core/engine-types.ts';
import { NativeRunnerProvider, type TauriInvoke } from '../../../reusable-chatbot/engines/native/index.ts';
import { loadWebLLM, webllmEntries } from '../../../reusable-chatbot/engines/webllm/index.ts';
import type { CapabilityReport } from '../../../reusable-chatbot/core/capability-broker.ts';

export type Resolution =
  | { kind: 'ready'; engine: IInferenceEngine; config: EngineConfig; label: string }
  | { kind: 'needs-model'; reason: string }
  | { kind: 'unsupported'; reason: string };

export const SELECTED_MODEL_KEY = 'chat.modelId';

export function selectedModelId(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(SELECTED_MODEL_KEY);
  } catch {
    return null;
  }
}

/**
 * Native resolution: the picker's `locate` returns `sha::locator` for a
 * downloaded model, or null. `candidates` are the ranked, non-unsupported
 * model ids with the default first — selection honors the persisted picker
 * choice, then the automatic qualified default.
 */
export async function resolveNativeEngine(
  invoke: TauriInvoke,
  report: CapabilityReport,
  locate: (id: string) => Promise<string | null>,
  candidates: { id: string; displayName: string }[],
): Promise<Resolution> {
  const persisted = selectedModelId();
  if (report.accelerations.length === 0) {
    // Windows cross-builds ship without the native engine (feature-gated;
    // cargo-xwin's clang cannot compile llama.cpp) — honest deferral to the
    // Windows-native host, exactly like the MSI/MSIX stages.
    return {
      kind: 'unsupported',
      reason:
        'This build ships without the on-device engine (Windows cross-build) — the Windows-native host build will enable it.',
    };
  }
  const order = [
    ...(persisted ? [persisted] : []),
    ...candidates.map((c) => c.id),
  ];
  for (const id of order) {
    const located = await locate(id);
    if (located) {
      const [sha, locator] = splitLocator(located);
      const engine = new NativeRunnerProvider(invoke);
      return {
        kind: 'ready',
        engine,
        config: {
          modelId: id,
          artifactUrl: locator,
          contextTokens: Math.min(report.contextCeiling, 4096),
        },
        label: sha.slice(0, 8),
      };
    }
  }
  return {
    kind: 'needs-model',
    reason: 'Download a model from the picker — it is stored once in the shared library and verified by digest.',
  };
}

export function splitLocator(located: string): [string, string] {
  const idx = located.indexOf('::');
  return idx === -1 ? [located, located] : [located.slice(0, idx), located.slice(idx + 2)];
}

/** Web resolution: WebLLM roster gated by the probed budget. */
export async function resolveWebEngine(report: CapabilityReport): Promise<Resolution> {
  if (!report.accelerations.includes('webgpu')) {
    return {
      kind: 'unsupported',
      reason:
        'This browser has no WebGPU adapter, so on-device chat needs the desktop app. Honest unsupported — never a pretend mode.',
    };
  }
  const module = await loadWebLLM();
  if (!module) return { kind: 'unsupported', reason: 'WebLLM runtime failed to load in this browser.' };
  const entries = webllmEntries(module).filter((e) => e.bytes <= report.memoryBudgetBytes);
  if (entries.length === 0) {
    return { kind: 'needs-model', reason: 'No compiled model fits this device budget yet.' };
  }
  const persisted = selectedModelId();
  const pick = entries.find((e) => e.id === persisted) ?? entries[0];
  const { WebLlmRunnerProvider } = await import('../../../reusable-chatbot/engines/webllm/index.ts');
  return {
    kind: 'ready',
    engine: new WebLlmRunnerProvider(),
    config: { modelId: pick.id, artifactUrl: 'webllm-manifest:' },
    label: pick.displayName,
  };
}
