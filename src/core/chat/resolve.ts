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
import { HostedOpenRouterProvider } from '../../../reusable-chatbot/engines/hosted-openrouter/index.ts';
import defaults from '../../../config/companion-defaults.json' with { type: 'json' };
import { debugEvent, debugTrace } from '../diagnostics/store.ts';
import type { CapabilityReport } from '../../../reusable-chatbot/core/capability-broker.ts';
import { companionFeedback } from './feedback.ts';

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
  selected: string | null = selectedModelId(),
  onProgress?: (fraction: number, text: string) => void,
): Promise<Resolution> {
  const persisted = selected;
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
    ...(persisted ? [persisted] : candidates.map((c) => c.id)),
  ];
  for (const id of order) {
    const located = await locate(id);
    if (located) {
      const [, locator] = splitLocator(located);
      const traceId = debugTrace('native-load');
      const engine = new NativeRunnerProvider(invoke, undefined, (operation, detail) => debugEvent('native-loader', operation, detail, 'info', traceId), onProgress);
      return {
        kind: 'ready',
        engine,
        config: {
          modelId: id,
          artifactUrl: locator,
          contextTokens: Math.min(report.contextCeiling, 4096),
        },
        label: candidates.find((candidate) => candidate.id === id)?.displayName ?? 'Companion',
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
export async function resolveWebEngine(
  report: CapabilityReport,
  selected: string | null = selectedModelId(),
  onProgress?: (fraction: number, text: string) => void,
): Promise<Resolution> {
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
  const pick = selected ? entries.find((e) => e.id === selected) : entries[0];
  if (!pick) return { kind: 'needs-model', reason: 'Selected model is not available in this browser.' };
  const { WebLlmRunnerProvider } = await import('../../../reusable-chatbot/engines/webllm/index.ts');
  return {
    kind: 'ready',
    engine: new WebLlmRunnerProvider(onProgress, module, (operation, detail) => debugEvent('webllm', operation, detail, 'info', pick.id)),
    config: { modelId: pick.id, artifactUrl: 'webllm-manifest:' },
    label: pick.displayName,
  };
}

/**
 * Hosted-first resolution (§E, amendment 2026-09-18): the debug hosted
 * OpenRouter engine prepares before any local path whenever no local model
 * choice is persisted (or the picker's hosted entry is chosen). An absent
 * key is an honest unsupported with the authored hostedKeyMissing line —
 * the caller then falls through to the existing local resolution. The key
 * exists only inside the engine (Authorization header); it never crosses
 * into diagnostics payloads.
 */
/** Build-time identity (`VITE_APP_NAME`/`VITE_APP_URL` from `.env`'s `$REF`
 * expansion or build-local `.env.local`): an unset or unexpanded (`$…`)
 * value falls back to this checkout's canonical identity — a leaked
 * reference never reaches a request header. The building script exports the
 * per-app values at build time (dual-build sanctissimissa/helloword);
 * Admin-Manual intentionally stores only paper-recoverable credentials — cleartext + QR; no machine-readable data to corrupt —
 * never app configuration. */
function buildIdentity(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('$') ? value : fallback;
}

/** Vite injects `import.meta.env` in bundles; plain-Node test runs have none. */
const BUILD_ENV: Record<string, string | undefined> =
  (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export async function resolveHostedEngine(
  key: string | undefined,
  onProgress?: (fraction: number, text: string) => void,
): Promise<Resolution> {
  const cfg = defaults.hostedProvider;
  if (!key) {
    return { kind: 'unsupported', reason: companionFeedback.hostedKeyMissing };
  }
  return {
    kind: 'ready',
    engine: new HostedOpenRouterProvider(
      key,
      cfg.model,
      cfg.fallbackModel ?? null,
      buildIdentity(BUILD_ENV.VITE_APP_NAME, 'SanctissiMissa'),
      buildIdentity(BUILD_ENV.VITE_APP_URL, 'https://sanctissimissa.surge.sh'),
      onProgress,
      (operation, detail) => debugEvent('hosted-openrouter', operation, detail, 'info'),
    ),
    config: {
      modelId: cfg.model,
      artifactUrl: `${cfg.baseUrl}/chat/completions`,
      contextTokens: 32768,
    },
    label: `${cfg.modelLabel} · hosted (free)`,
  };
}
