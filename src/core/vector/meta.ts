/**
 * `embed_meta` identity (§L.4 D5; L-content-modules-search-20261106.md §2.2).
 * The block below is shared verbatim with BA.10 (create-if-absent, identical
 * text); `readEmbedMeta`/`compatible` are BA.14's additions.
 */

export const EMBED_META_KEYS = ['model','artifact_sha256','dim','quant','prefix_query','prefix_doc','norm'] as const;
export type EmbedMetaKey = (typeof EMBED_META_KEYS)[number];
export type EmbedMeta = Readonly<Record<EmbedMetaKey, string>>;
export const RUNTIME_EMBED_META: EmbedMeta = { model: 'qwen3-embedding:0.6b', artifact_sha256: '06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439', dim: '256', quant: 'int8', prefix_query: 'Instruct: Given a passage of Catholic liturgy, Scripture or commentary, retrieve passages relevant to this query\nQuery:{text}', prefix_doc: '', norm: 'l2' };

/** `embed_meta` rows → EmbedMeta; null unless all seven keys are present. */
export function readEmbedMeta(rows: { key: unknown; value: unknown }[]): EmbedMeta | null {
  const map = new Map<string, string>();
  for (const r of rows) map.set(String(r.key), String(r.value ?? ''));
  const out: Partial<Record<EmbedMetaKey, string>> = {};
  for (const k of EMBED_META_KEYS) {
    const v = map.get(k);
    if (v === undefined) return null;
    out[k] = v;
  }
  return out as EmbedMeta;
}

/** True iff both are present and all seven keys are equal (§2.2). */
export function compatible(a: EmbedMeta | null, b: EmbedMeta | null): boolean {
  if (!a || !b) return false;
  return EMBED_META_KEYS.every((k) => a[k] === b[k]);
}
