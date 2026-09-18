/**
 * CP.4 app integration: capability probe + vendored catalog fusion +
 * download orchestration for the Companion model picker. Pure logic lives in
 * reusable-chatbot/model-registry; this module binds it to the platform
 * (Tauri invoke vs web) and the CP.3 library.
 */

import { loadRecommendedRepos, resolveCatalogEntries, type CatalogRow, type ModelCatalogEntry } from '../../../reusable-chatbot/model-registry/catalog.ts';
import { pickDefault, rankModels, type RankedModel } from '../../../reusable-chatbot/model-registry/rank.ts';
import { probeNativeCapabilities, probeWebCapabilities, type CapabilityReport, type TauriInvoke } from '../../../reusable-chatbot/core/capability-broker.ts';
import { DesktopModelLibrary, WebModelLibrary } from '../model-store/store.ts';
import { DownloadManager } from '../model-store/download-manager.ts';
import type { ModelAsset } from '../model-store/types.ts';
import { loadWebLLM, webllmEntries } from '../../../reusable-chatbot/engines/webllm/index.ts';
export { isTauri } from './runtime.ts';

import defaults from '../../../config/companion-defaults.json' with { type: 'json' };
import catalogUrl from '../../../reusable-chatbot/model-registry/data/atomic-chat-catalog.json?url';

export async function probeCapabilities(invoke?: TauriInvoke): Promise<CapabilityReport> {
  return invoke ? probeNativeCapabilities(invoke) : probeWebCapabilities();
}

/** Decompress + parse the vendored Atomic Chat catalog snapshot. */
export async function loadCatalogRows(url: string = catalogUrl): Promise<CatalogRow[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`catalog snapshot unavailable: HTTP ${response.status}`);
  const json = await response.json() as { models?: CatalogRow[]; models_flat?: CatalogRow[] } | CatalogRow[];
  const rows = Array.isArray(json) ? json : (json.models ?? json.models_flat ?? []);
  if (rows.length === 0) throw new Error('vendored catalog snapshot is empty — re-vendor (PROVENANCE.md)');
  return rows;
}

export interface CompanionCatalog {
  report: CapabilityReport;
  ranked: RankedModel[];
  defaultPick: RankedModel | null;
}

export async function buildCompanionCatalog(invoke?: TauriInvoke): Promise<CompanionCatalog> {
  const report = await probeCapabilities(invoke);
  if (!invoke) {
    const module = await loadWebLLM();
    if (!module) throw new Error('Browser inference module unavailable');
    const ranked: RankedModel[] = webllmEntries(module).map((entry) => ({
      id: entry.id, displayName: entry.displayName, bytes: entry.bytes, repo: entry.id,
      url: '', quant: '', license: null, priority: 'catalog', score: -entry.bytes,
      unsupported: !report.accelerations.includes('webgpu') || entry.bytes > report.memoryBudgetBytes,
    }));
    return { report, ranked, defaultPick: pickDefault(ranked) };
  }
  const rows = await loadCatalogRows();
  const { recommended, lowSpec } = loadRecommendedRepos();
  const entries: ModelCatalogEntry[] = [
    ...resolveCatalogEntries([defaults.preferredNativeRepo], rows).map((e) => ({ ...e, displayName: defaults.preferredDisplayName, priority: 'recommended' as const })),
    ...resolveCatalogEntries(recommended, rows).map((e) => ({ ...e, priority: 'recommended' as const })),
    ...resolveCatalogEntries(lowSpec, rows).map((e) => ({ ...e, priority: 'low-spec' as const })),
  ];
  const unique = entries.filter((entry, index) => entries.findIndex((other) => other.id === entry.id) === index);
  const ranked = rankModels(unique, report).map((entry) => ({ ...entry, unsupported: entry.unsupported || report.accelerations.length === 0 }));
  const defaultPick = preferredDefault(ranked);
  return { report, ranked, defaultPick };
}

/** Catalog-side download identity: digest unknown until the download proves it. */
export function entryAsset(entry: ModelCatalogEntry): ModelAsset {
  return {
    sha256: '',
    estimatedBytes: true,
    bytes: entry.bytes,
    fileName: `${entry.repo.split('/').pop()}-${entry.quant}.gguf`,
  };
}

/** Catalogue alias layer (§7.8.4): url → verified digest, persisted locally. */
const ALIAS_KEY = 'sam.model.alias';

export function readAliases(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ALIAS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function readInstalledAssets(): Record<string, ModelAsset> {
  try { return JSON.parse(localStorage.getItem(`${ALIAS_KEY}.assets`) ?? '{}') as Record<string, ModelAsset>; }
  catch { return {}; }
}

export function writeInstalledAsset(url: string, asset: ModelAsset): void {
  const assets = readInstalledAssets();
  assets[url] = asset;
  localStorage.setItem(`${ALIAS_KEY}.assets`, JSON.stringify(assets));
}

export function makeLibrary(invoke?: TauriInvoke, scopeDir?: string | null) {
  return invoke
    ? new DesktopModelLibrary(invoke, scopeDir ?? null)
    : new WebModelLibrary();
}

export function makeDownloadManager(library: ReturnType<typeof makeLibrary>): DownloadManager {
  return new DownloadManager(library);
}

// Amendment 2026-09-18 §C: the automatic default is the preferred 2B repo only —
// a heavier model is never auto-selected; absence of the preferred entry leaves
// the choice explicitly to the user.
export function preferredDefault(ranked: RankedModel[]): RankedModel | null {
  return ranked.find((entry) => entry.repo === defaults.preferredNativeRepo && !entry.unsupported) ?? null;
}
