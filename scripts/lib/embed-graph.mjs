/**
 * Graph helpers for scripts/embed-corpus.mjs (BA.10): int8 vector format,
 * concept centroids, semantic INSTANCE_OF, semantic SIMILAR_TO (worker_threads)
 * and the deterministic probe set.
 *
 * Normative: DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.2, §2.8,
 * §3.1 phases 4–7. Node APIs: node:sqlite DatabaseSync (DOCS/sdk/ has no
 * node:sqlite snapshot; Node ≥ 22.5 built-in), node:worker_threads.
 *
 * Imports no `.ts` so worker threads load it without type stripping.
 */

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { availableParallelism } from 'node:os';

export const DIM = 256;
export const MODULE_KEY_RE = /^(commentary:catena-aurea\/|catena:|father:)/;
export const INSTANCE_OF_TOP_K = 3;
export const INSTANCE_OF_MIN = 0.50;
export const SIMILAR_MIN = 0.35;
export const SIMILAR_TOP = 8;
export const SIMILAR_BATCH = 1000;
export const SEMANTIC_META = '{"method":"semantic"}';
const INSTANCE_KINDS = new Set(['section', 'verse', 'commentary', 'quotation']);

/**
 * Stored-vector formula (identical to native `toStoredVector`, §2.2 of the
 * native-embed partial; inlined per Author resolution 7): first 256 dims,
 * L2-renormalize (`mag || 1`), round(x/mag·127) clamped to ±127.
 */
export function toStoredVector(v) {
  let mag = 0;
  for (let i = 0; i < DIM; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag) || 1;
  const out = new Int8Array(DIM);
  for (let i = 0; i < DIM; i++) out[i] = Math.max(-127, Math.min(127, Math.round((v[i] / mag) * 127)));
  return out;
}

/** BLOB (Uint8Array) → Int8Array view. */
export function asInt8(blob) {
  return new Int8Array(blob.buffer, blob.byteOffset, blob.byteLength);
}

/** Write row i of a Float32Array matrix as the L2-normalized dequantized int8 vector. */
function putNormalized(mat, i, i8) {
  let mag = 0;
  for (let d = 0; d < DIM; d++) mag += i8[d] * i8[d];
  mag = Math.sqrt(mag) || 1;
  const o = i * DIM;
  for (let d = 0; d < DIM; d++) mat[o + d] = i8[d] / mag;
}

function dot(mat, a, b) {
  let s = 0;
  const oa = a * DIM;
  const ob = b * DIM;
  for (let d = 0; d < DIM; d++) s += mat[oa + d] * mat[ob + d];
  return s;
}

/**
 * Phase `centroids` body (caller wraps one transaction). Curated and auto
 * concept vectors = normalized int8 mean of members' semantic vectors over
 * the existing INSTANCE_OF edges; then archive + delete the auto edges and
 * write the centroids into `embeddings_q3e256`. Returns counts.
 */
export function computeCentroids(db) {
  const rows = db.prepare(`
    SELECT e.dst AS cid, v.vec AS vec FROM edges e
    JOIN nodes c ON c.id = e.dst
    JOIN embeddings_q3e256 v ON v.node_id = e.src
    WHERE e.rel = 'INSTANCE_OF' AND c.kind = 'concept' AND c.category IN ('curated','auto')
    ORDER BY e.dst, e.src`).all();
  const sums = new Map();
  for (const r of rows) {
    let acc = sums.get(r.cid);
    if (!acc) sums.set(r.cid, (acc = new Float64Array(DIM)));
    const v = asInt8(r.vec);
    for (let d = 0; d < DIM; d++) acc[d] += v[d] / 127;
  }
  db.exec(`CREATE TABLE edges_trigram_archive AS
    SELECT src.key src_key, dst.key dst_key, e.rel, e.weight, e.meta FROM edges e
    JOIN nodes src ON src.id = e.src JOIN nodes dst ON dst.id = e.dst
    WHERE e.rel = 'INSTANCE_OF' AND dst.category = 'auto'`);
  const archived = db.prepare('SELECT count(*) c FROM edges_trigram_archive').get().c;
  db.exec(`DELETE FROM edges WHERE rel = 'INSTANCE_OF'
    AND dst IN (SELECT id FROM nodes WHERE category = 'auto')`);
  const ins = db.prepare('INSERT OR REPLACE INTO embeddings_q3e256 (node_id, dim, vec) VALUES (?,?,?)');
  for (const [cid, acc] of [...sums.entries()].sort((a, b) => a[0] - b[0])) {
    ins.run(cid, DIM, toStoredVector(acc));
  }
  return { centroids: sums.size, archived };
}

/** Load every vector of `embeddings` (dim 256) with node kind/key, ordered by node_id. */
export function loadMatrix(db) {
  const rows = db.prepare(`SELECT n.id, n.kind, n.key, n.category, v.vec FROM embeddings v
    JOIN nodes n ON n.id = v.node_id WHERE v.dim = ${DIM} ORDER BY n.id`).all();
  const n = rows.length;
  const mat = new Float32Array(new SharedArrayBuffer(n * DIM * 4));
  const ids = new Int32Array(n);
  const kinds = new Array(n);
  const keys = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    ids[i] = r.id;
    kinds[i] = r.kind;
    keys[i] = r.key;
    putNormalized(mat, i, asInt8(r.vec));
  }
  return { n, mat, ids, kinds, keys };
}

/**
 * Phase `instance_of` body (caller wraps one transaction), §3.1 step 5 as
 * revised 2026-11-06: delete previous semantic INSTANCE_OF edges, then for
 * each section/verse/commentary/quotation node take its top
 * INSTANCE_OF_TOP_K (3) concepts by cosine to the centroid with cosine ≥
 * INSTANCE_OF_MIN (0.50), ties by concept id ascending; weight = cosine,
 * meta {"method":"semantic"}. A pair that already has a curated
 * (non-semantic) INSTANCE_OF edge is skipped but still counts toward the 3.
 */
export function semanticInstanceOf(db, m) {
  db.exec(`DELETE FROM edges WHERE rel = 'INSTANCE_OF' AND json_extract(meta, '$.method') = 'semantic'`);
  const existing = new Set(db.prepare(`SELECT src, dst FROM edges WHERE rel = 'INSTANCE_OF'`).all()
    .map((r) => `${r.src}:${r.dst}`));
  const concepts = [];
  for (let i = 0; i < m.n; i++) if (m.kinds[i] === 'concept') concepts.push(i);
  concepts.sort((a, b) => m.ids[a] - m.ids[b]);
  const ins = db.prepare('INSERT INTO edges (src, dst, rel, weight, meta) VALUES (?,?,?,?,?)');
  let count = 0;
  for (let i = 0; i < m.n; i++) {
    if (!INSTANCE_KINDS.has(m.kinds[i])) continue;
    const best = []; // [cos, conceptRow], cos desc then concept id asc, length ≤ TOP_K
    for (const c of concepts) {
      const cos = dot(m.mat, i, c);
      if (cos < INSTANCE_OF_MIN) continue;
      // concepts iterate by id ascending, so an equal cosine never displaces an earlier one
      if (best.length === INSTANCE_OF_TOP_K && cos <= best[INSTANCE_OF_TOP_K - 1][0]) continue;
      let j = best.length;
      while (j > 0 && best[j - 1][0] < cos) j--;
      best.splice(j, 0, [cos, c]);
      if (best.length > INSTANCE_OF_TOP_K) best.pop();
    }
    for (const [cos, c] of best) {
      if (existing.has(`${m.ids[i]}:${m.ids[c]}`)) continue;
      ins.run(m.ids[i], m.ids[c], 'INSTANCE_OF', cos, SEMANTIC_META);
      count++;
    }
  }
  return count;
}

/** Rank of each row by key ascending (tie-break for SIMILAR_TO ordering). */
function keyRanks(keys) {
  const order = keys.map((_, i) => i).sort((a, b) => (keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : 0));
  const rank = new Int32Array(new SharedArrayBuffer(keys.length * 4));
  order.forEach((row, r) => { rank[row] = r; });
  return rank;
}

/** Top-k neighbours of row s (cos desc, key asc); `flags` bit0 = concept, bit1 = module. */
function topK(mat, n, flags, rank, s) {
  const moduleSrc = (flags[s] & 2) !== 0;
  const best = []; // [cos, row], sorted best-first, length ≤ SIMILAR_TOP
  for (let t = 0; t < n; t++) {
    if (t === s || (flags[t] & 1) !== 0) continue;
    if (!moduleSrc && (flags[t] & 2) !== 0) continue;
    const cos = dot(mat, s, t);
    if (cos < SIMILAR_MIN) continue;
    if (best.length === SIMILAR_TOP) {
      const w = best[SIMILAR_TOP - 1];
      if (cos < w[0] || (cos === w[0] && rank[t] > rank[w[1]])) continue;
      best.pop();
    }
    let j = best.length;
    while (j > 0 && (best[j - 1][0] < cos || (best[j - 1][0] === cos && rank[best[j - 1][1]] > rank[t]))) j--;
    best.splice(j, 0, [cos, t]);
  }
  return best;
}

if (!isMainThread && workerData && workerData.kind === 'similar_to') {
  const { mat, n, flags, rank } = workerData;
  parentPort.on('message', ({ job, rows }) => {
    parentPort.postMessage({ job, out: rows.map((s) => topK(mat, n, flags, rank, s)) });
  });
}

/**
 * Phase `similar_to`: one transaction per batch of 1000 sources (ordered by
 * node_id), progress in `similar_done`. Concepts excluded as source/target;
 * base sources rank base targets only; module sources rank all. Deterministic:
 * each source's list depends only on the matrix, independent of worker split.
 */
export async function semanticSimilarTo(db, m, log) {
  db.exec('CREATE TABLE IF NOT EXISTS similar_done (node_id INTEGER PRIMARY KEY)');
  const done = new Set(db.prepare('SELECT node_id FROM similar_done').all().map((r) => r.node_id));
  const flags = new Uint8Array(new SharedArrayBuffer(m.n));
  for (let i = 0; i < m.n; i++) {
    flags[i] = (m.kinds[i] === 'concept' ? 1 : 0) | (MODULE_KEY_RE.test(m.keys[i]) ? 2 : 0);
  }
  const rank = keyRanks(m.keys);
  const pending = [];
  for (let i = 0; i < m.n; i++) if ((flags[i] & 1) === 0 && !done.has(m.ids[i])) pending.push(i);
  const nWorkers = Math.max(1, availableParallelism() - 1);
  const workers = Array.from({ length: nWorkers }, () => new Worker(new URL(import.meta.url), {
    workerData: { kind: 'similar_to', mat: m.mat, n: m.n, flags, rank },
  }));
  const ins = db.prepare('INSERT INTO edges (src, dst, rel, weight, meta) VALUES (?,?,?,?,?)');
  const mark = db.prepare('INSERT INTO similar_done (node_id) VALUES (?)');
  let edges = 0;
  let job = 0;
  try {
    for (let b = 0; b < pending.length; b += SIMILAR_BATCH) {
      const batch = pending.slice(b, b + SIMILAR_BATCH);
      const chunk = Math.ceil(batch.length / nWorkers);
      const parts = await Promise.all(workers.map((w, wi) => new Promise((res, rej) => {
        const rows = batch.slice(wi * chunk, (wi + 1) * chunk);
        if (rows.length === 0) return res([]);
        const id = ++job;
        const onMsg = (msg) => { if (msg.job === id) { w.off('message', onMsg); w.off('error', rej); res(msg.out); } };
        w.on('message', onMsg);
        w.once('error', rej);
        w.postMessage({ job: id, rows });
      })));
      const results = parts.flat();
      db.exec('BEGIN');
      try {
        batch.forEach((s, k) => {
          for (const [cos, t] of results[k]) { ins.run(m.ids[s], m.ids[t], 'SIMILAR_TO', cos, SEMANTIC_META); edges++; }
          mark.run(m.ids[s]);
        });
        db.exec('COMMIT');
      } catch (err) { db.exec('ROLLBACK'); throw err; }
      log(`similar_to: ${Math.min(b + SIMILAR_BATCH, pending.length)}/${pending.length} sources`);
    }
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
  return edges;
}

/** Probe strata (§2.8), in d01..d20 order; base keys only. */
const STRATA = [
  (k) => k.startsWith('section:') && !k.startsWith('section:Horas/'),
  (k) => k.startsWith('section:Horas/'),
  (k) => k.startsWith('verse:'),
  (k) => k.startsWith('commentary:haydock/'),
];

/** `[latin, english].filter(non-empty).join('\n\n')` — the document text, no prefix. */
export function docText(latin, english) {
  return [latin, english].filter((s) => typeof s === 'string' && s.length > 0).join('\n\n');
}

/**
 * Deterministic 40-item probe selection (§2.8): 5 per stratum by sha256(key)
 * ascending among candidates with docText 200–1200 chars whose first
 * `splitClauses` clause (English, else Latin) is 25–200 chars.
 */
export function selectProbe(db, splitClauses) {
  const rows = db.prepare(`SELECT n.key, t.latin, t.english FROM text_blocks t JOIN nodes n ON n.id = t.node_id
    WHERE n.key LIKE 'section:%' OR n.key LIKE 'verse:%' OR n.key LIKE 'commentary:haydock/%'`).all();
  const buckets = STRATA.map(() => []);
  for (const r of rows) {
    if (MODULE_KEY_RE.test(r.key)) continue;
    const si = STRATA.findIndex((f) => f(r.key));
    if (si < 0) continue;
    const doc = docText(r.latin, r.english);
    if (doc.length < 200 || doc.length > 1200) continue;
    const src = r.english && r.english.length > 0 ? r.english : r.latin;
    if (!src) continue;
    const first = splitClauses(src)[0];
    if (!first || first.text.length < 25 || first.text.length > 200) continue;
    buckets[si].push({ key: r.key, doc, query: first.text, h: createHash('sha256').update(r.key).digest('hex') });
  }
  const picked = [];
  for (const b of buckets) {
    b.sort((x, y) => (x.h < y.h ? -1 : x.h > y.h ? 1 : 0));
    picked.push(...b.slice(0, 5));
  }
  return picked;
}

/** Base64 of the raw 256 int8 bytes. */
export function vecBase64(i8) {
  return Buffer.from(i8.buffer, i8.byteOffset, i8.byteLength).toString('base64');
}
