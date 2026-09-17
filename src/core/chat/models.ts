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

import catalogUrl from '../../../reusable-chatbot/model-registry/data/atomic-chat-catalog.json?url';

export type TauriGlobals = { invoke: TauriInvoke };

/** The Tauri shell injects __TAURI_INTERNALS__; web builds do not have it. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

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
  const [report, rows] = await Promise.all([probeCapabilities(invoke), loadCatalogRows()]);
  const { recommended, lowSpec } = loadRecommendedRepos();
  const entries: ModelCatalogEntry[] = [
    ...resolveCatalogEntries(recommended, rows).map((e) => ({ ...e, priority: 'recommended' as const })),
    ...resolveCatalogEntries(lowSpec, rows).map((e) => ({ ...e, priority: 'low-spec' as const })),
  ];
  const ranked = rankModels(entries, report);
  return { report, ranked, defaultPick: pickDefault(ranked) };
}

/** Catalog-side download identity: digest unknown until the download proves it. */
export function entryAsset(entry: ModelCatalogEntry): ModelAsset {
  return {
    sha256: '',
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

export function writeAlias(url: string, sha256: string): void {
  const aliases = readAliases();
  aliases[url] = sha256;
  localStorage.setItem(ALIAS_KEY, JSON.stringify(aliases));
}

export function makeLibrary(invoke?: TauriInvoke, scopeDir?: string | null) {
  return invoke
    ? new DesktopModelLibrary(invoke, scopeDir ?? null)
    : new WebModelLibrary();
}

export function makeDownloadManager(library: ReturnType<typeof makeLibrary>): DownloadManager {
  return new DownloadManager(library);
}
