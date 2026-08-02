/**
 * Deterministic offline text embeddings — hashed character trigrams.
 *
 * 128-dim, L2-normalized, int8-quantized (×127). Byte-stable across platforms
 * and runtimes so vectors computed at ingest time (Node) match query vectors
 * computed in the browser/WebView. The `embeddings` table is model-agnostic:
 * a real sentence-transformer can replace this without schema change.
 */

import { normalizeText } from '../text/normalize.ts';
export { normalizeText };

export const EMBED_DIM = 128;

/** FNV-1a 32-bit hash. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Embed text into a signed-int8, L2-normalized 128-d vector. */
export function embedText(text: string): Int8Array {
  const norm = normalizeText(text);
  const acc = new Float64Array(EMBED_DIM);
  const padded = `  ${norm}  `;
  for (let i = 0; i + 3 <= padded.length; i++) {
    const tri = padded.slice(i, i + 3);
    if (tri.trim().length === 0) continue;
    const h = fnv1a(tri);
    const bucket = h % EMBED_DIM;
    const sign = (h >>> 8) & 1 ? 1 : -1;
    acc[bucket] += sign;
  }
  let mag = 0;
  for (let i = 0; i < EMBED_DIM; i++) mag += acc[i] * acc[i];
  mag = Math.sqrt(mag) || 1;
  const out = new Int8Array(EMBED_DIM);
  for (let i = 0; i < EMBED_DIM; i++) {
    out[i] = Math.max(-127, Math.min(127, Math.round((acc[i] / mag) * 127)));
  }
  return out;
}

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
