// CP.4 model catalog (§7.8.5): resolve the Atomic Chat recommended/staff-pick
// names against the vendored catalog rows into concrete downloadable entries.
// The vendored snapshot is immutable input (see PROVENANCE.md); zero models
// are hardcoded — everything comes from the manifests.

import recommendedManifest from './data/atomic-chat-recommended.json' with { type: 'json' };

export interface CatalogQuant {
  model_id: string;
  path: string; // direct https download URL
  file_size?: string; // catalog notation, e.g. "2.4 GB"
}

export interface CatalogRow {
  model_name: string;
  developer: string;
  downloads: number;
  likes: number;
  description: string;
  num_quants: number;
  quants: CatalogQuant[];
}

export interface ModelCatalogEntry {
  /** Stable registry id: the GGUF repo name + quant. */
  id: string;
  repo: string;
  quant: string;
  displayName: string;
  url: string;
  bytes: number;
  license: string | null;
  /** Atomic Chat priority tier from the recommended manifest. */
  priority: 'recommended' | 'low-spec' | 'catalog';
}

interface RecommendedManifest {
  schema_version: number;
  updated_at: string;
  recommendations: { model_name: string; description_key: string }[];
  low_spec_recommendations?: { model_name: string; description_key: string; quant?: string }[];
}

/** "2.4 GB" | "850.1 MB" | "723.9 KB" -> bytes. */
export function parseFileSize(size: string | undefined): number {
  if (!size) return 0;
  const m = /([\d.]+)\s*(KB|MB|GB|TB)/i.exec(size);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2].toUpperCase();
  const scale = unit === 'KB' ? 1024 : unit === 'MB' ? 1024 ** 2 : unit === 'GB' ? 1024 ** 3 : 1024 ** 4;
  return Math.round(n * scale);
}

function quantFromUrl(url: string): string {
  const base = url.split('/').pop() ?? '';
  const m = /-([A-Z][A-Z0-9_]*(?:_[0-9]+)?)\.gguf$/i.exec(base);
  return (m?.[1] ?? 'GGUF').toUpperCase();
}

function displayName(repo: string): string {
  return repo
    .replace(/^.*\//, '')
    .replace(/-GGUF$/i, '')
    .replace(/-it$/i, ' (instruct)');
}

/** Preference order for quants when the manifest names none (guide §8 tiers). */
const QUANT_PREFERENCE = ['Q4_K_M', 'Q4_K_S', 'IQ4_XS', 'Q4_0', 'Q5_K_M', 'Q6_K', 'Q8_0', 'BF16', 'F16'];

function quantScore(quant: string): number {
  const idx = QUANT_PREFERENCE.indexOf(quant.toUpperCase());
  return idx === -1 ? QUANT_PREFERENCE.length : idx;
}

/**
 * Build entries for the given repo names. `catalogRows` is the decompressed
 * vendored catalog (injected — the browser decompresses via DecompressionStream,
 * node via zlib; tests inject fixtures).
 */
export function resolveCatalogEntries(repoNames: string[], catalogRows: CatalogRow[]): ModelCatalogEntry[] {
  const byName = new Map(catalogRows.map((row) => [row.model_name, row]));
  const entries: ModelCatalogEntry[] = [];
  for (const repo of repoNames) {
    const row = byName.get(repo);
    if (!row || row.quants.length === 0) continue; // honest absence, never a stub
    const ggufs = row.quants.filter((q) => q.path.toLowerCase().endsWith('.gguf') && !/mmproj/i.test(q.model_id));
    if (ggufs.length === 0) continue;
    const best = ggufs
      .map((q) => ({ q, score: quantScore(quantFromUrl(q.path)) }))
      .sort((a, b) => a.score - b.score || parseFileSize(a.q.file_size) - parseFileSize(b.q.file_size))[0].q;
    const license = /license:([a-z0-9._-]+)/i.exec(row.description)?.[1] ?? null;
    entries.push({
      id: `${repo}::${quantFromUrl(best.path)}`,
      repo,
      quant: quantFromUrl(best.path),
      displayName: displayName(repo),
      url: best.path,
      bytes: parseFileSize(best.file_size),
      license,
      priority: 'catalog',
    });
  }
  return entries;
}

/** The fullAtomic Chat fusion: recommended + low-spec, then resolved. */
export function loadRecommendedRepos(): { recommended: string[]; lowSpec: string[] } {
  const manifest = recommendedManifest as RecommendedManifest;
  return {
    recommended: manifest.recommendations.map((r) => r.model_name),
    lowSpec: (manifest.low_spec_recommendations ?? []).map((r) => r.model_name),
  };
}
