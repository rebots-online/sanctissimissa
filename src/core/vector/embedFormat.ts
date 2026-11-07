// §L.4 embedding format — L-native-embed-engine §2.2 (BA.13). No imports at all:
// BA.10's `.mjs` scripts load this file under `--experimental-strip-types`.
// see DOCS/sdk/qwen3-embedding/model-card.md (instruct prefix, last-token pooling, MRL truncation).

export const MAX_EMBED_CHARS = 4000, MAX_RERANK_QUERY_CHARS = 500, MAX_RERANK_DOC_CHARS = 1200;

export const PREFIX_QUERY = 'Instruct: Given a passage of Catholic liturgy, Scripture or commentary, retrieve passages relevant to this query\nQuery:';

/** Length cap in code points (never splits a surrogate pair). */
export function capText(text: string, max = MAX_EMBED_CHARS): string {
  return Array.from(text).slice(0, max).join('');
}

/** Query side only: documents get no prefix (§2.2). */
export function formatQuery(text: string): string {
  return PREFIX_QUERY + capText(text);
}

/** Matryoshka 256 → L2 → int8; the rounding of `embed.ts:43`, invariant to any prior normalization. */
export function toStoredVector(v: Float32Array): Int8Array {
  const head = v.subarray(0, 256);
  let sum = 0;
  for (let i = 0; i < head.length; i++) sum += head[i] * head[i];
  const mag = Math.sqrt(sum) || 1;
  const out = new Int8Array(256);
  for (let i = 0; i < head.length; i++) out[i] = Math.max(-127, Math.min(127, Math.round((head[i] / mag) * 127)));
  return out;
}

/** Single source of truth for D5 (BA.10 and BA.14 import it and `MAX_EMBED_CHARS`). */
export const CURRENT_EMBED_META = {
  model: 'qwen3-embedding-0.6b-q8_0',
  artifact_sha256: '06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439',
  dim: '256',
  quant: 'int8',
  prefix_query: PREFIX_QUERY,
  prefix_doc: '',
  norm: 'l2',
} as const;
