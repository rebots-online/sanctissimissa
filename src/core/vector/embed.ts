/**
 * Vector primitives shared by the semantic search stack (§L.4 D5).
 * Vectors are 256 int8, L2-normalized (`embed_meta` §2.2). The trigram
 * `embedText` hasher is retired from `src/` (kept on branch
 * `archive/trigram-embed-20261106`; ingest uses `scripts/lib/trigram-embed.mjs`).
 */

import { normalizeText } from '../text/normalize.ts';
export { normalizeText };

export const EMBED_DIM = 256;

/** Cosine similarity between two int8 embeddings. */
export function cosine(a: Int8Array | Uint8Array, b: Int8Array | Uint8Array): number {
  const av = a instanceof Int8Array ? a : new Int8Array(a.buffer, a.byteOffset, a.byteLength);
  const bv = b instanceof Int8Array ? b : new Int8Array(b.buffer, b.byteOffset, b.byteLength);
  let dot = 0;
  let ma = 0;
  let mb = 0;
  const n = Math.min(av.length, bv.length);
  for (let i = 0; i < n; i++) {
    dot += av[i] * bv[i];
    ma += av[i] * av[i];
    mb += bv[i] * bv[i];
  }
  const denom = Math.sqrt(ma) * Math.sqrt(mb);
  return denom === 0 ? 0 : dot / denom;
}
