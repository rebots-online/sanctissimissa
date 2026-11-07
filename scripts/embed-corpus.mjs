#!/usr/bin/env node
/**
 * embed-corpus (BA.10) — semantic re-embed of a corpus file into a NEW
 * versioned file `<dir>/missal.<V>.full.db` via the pinned Ollama
 * `qwen3-embedding:0.6b` blob; semantic INSTANCE_OF + SIMILAR_TO; probe set;
 * MISSAL-DB-VERSIONS ledger entry. The input is opened read-only and never written.
 *
 *   node --experimental-strip-types scripts/embed-corpus.mjs <input.db> [--out <dir>] [--restart]
 *
 * Normative: DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.1, §2.2,
 * §2.8, §3.1 steps 1–3 (phases copy, vectors, centroids, instance_of,
 * similar_to, probe, finalize — Closed set, Phase L).
 * Exit codes (Closed set, Phase L): 0 ok, 2 model/Ollama, 3 work-file mismatch, 4 invalid input.
 *
 * Ollama HTTP API used: POST /api/show, GET /api/version, POST /api/embed
 * (`{model, input:[…], truncate, options}` → `{embeddings:[[…]]}`). DOCS/sdk/
 * carries no Ollama snapshot; the request shapes are the ones §3.1 fixes.
 * SQLite: node:sqlite DatabaseSync (built into Node ≥ 22.5; no DOCS/sdk snapshot).
 */

import { DatabaseSync } from 'node:sqlite';
import { createReadStream, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitClauses } from '../src/core/vector/clause.ts';
import { EMBED_META_KEYS, RUNTIME_EMBED_META } from '../src/core/vector/meta.ts';
import {
  DIM, toStoredVector, computeCentroids, loadMatrix, semanticInstanceOf, semanticSimilarTo,
  selectProbe, docText, vecBase64,
} from './lib/embed-graph.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = RUNTIME_EMBED_META.model;
const OLLAMA = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const BATCH = 32;
const NATIVE_DIM = 1024;
const PROBE_PATH = join(REPO, 'content/library/embed-probe.json');

class ExitError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const ollamaFail = (msg) => new ExitError(2, `${msg} — Ollama with ${MODEL} (blob sha256-${RUNTIME_EMBED_META.artifact_sha256}) is required; see OP.4`);
const log = (msg) => console.log(`[embed-corpus] ${msg}`);

// ── CLI ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { input: null, out: 'build/corpus', restart: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--restart') args.restart = true;
    else if (a === '--out') args.out = argv[++i];
    else if (!args.input) args.input = a;
    else throw new ExitError(4, `unexpected argument: ${a}`);
  }
  if (!args.input) throw new ExitError(4, 'usage: embed-corpus.mjs <input.db> [--out <dir>] [--restart]');
  if (!args.out) throw new ExitError(4, '--out needs a directory');
  return args;
}

function sha256File(path) {
  return new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(path).on('error', rej).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex')));
  });
}

// ── Ollama ───────────────────────────────────────────────────────────
async function ollama(path, body) {
  let resp;
  try {
    resp = await fetch(`${OLLAMA}${path}`, body === undefined ? {} : {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch (err) {
    throw ollamaFail(`cannot reach Ollama at ${OLLAMA} (${err.cause?.code || err.message})`);
  }
  if (!resp.ok) throw ollamaFail(`Ollama ${path} → HTTP ${resp.status} ${(await resp.text()).slice(0, 200)}`);
  return resp.json();
}

/** Embed texts → stored int8 vectors (each native vector must be 1024-d). */
async function embedBatch(texts) {
  const r = await ollama('/api/embed', { model: MODEL, input: texts, truncate: true, options: { num_ctx: 8192 } });
  if (!Array.isArray(r.embeddings) || r.embeddings.length !== texts.length) {
    throw ollamaFail(`/api/embed returned ${r.embeddings?.length ?? 'no'} vectors for ${texts.length} inputs`);
  }
  return r.embeddings.map((v) => {
    if (!Array.isArray(v) || v.length !== NATIVE_DIM) throw ollamaFail(`/api/embed vector length ${v?.length} ≠ ${NATIVE_DIM}`);
    return toStoredVector(v);
  });
}

/** Phase 1 — preflight: pinned blob identity + Ollama version. */
async function preflight() {
  const show = await ollama('/api/show', { model: MODEL });
  const m = /^FROM (.+)$/m.exec(show.modelfile || '');
  if (!m) throw ollamaFail(`/api/show ${MODEL}: modelfile has no FROM line`);
  const blob = m[1].trim();
  const want = `sha256-${RUNTIME_EMBED_META.artifact_sha256}`;
  if (basename(blob) !== want) throw ollamaFail(`model blob ${basename(blob)} ≠ pinned ${want}`);
  let got;
  try { got = await sha256File(blob); } catch (err) { throw ollamaFail(`cannot read model blob ${blob} (${err.code || err.message})`); }
  if (got !== RUNTIME_EMBED_META.artifact_sha256) throw ollamaFail(`model blob sha256 ${got} ≠ pinned`);
  const ver = await ollama('/api/version');
  if (!ver.version) throw ollamaFail('/api/version returned no version');
  log(`preflight ok: ${MODEL} blob verified, ollama ${ver.version}`);
  return ver.version;
}

// ── Work file ────────────────────────────────────────────────────────
const tableExists = (db, name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE name = ?").get(name);
const kv = (db, table, key) => db.prepare(`SELECT value FROM ${table} WHERE key = ?`).get(key)?.value;

function utcVersion(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `corpus-${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}-q3e256`;
}

/** Phase 2 — `copy`: create (or validate) `<dir>/embed-work.db`. Returns the open work db. */
async function openWork(args, outDir) {
  const inputPath = resolve(args.input);
  if (!existsSync(inputPath)) throw new ExitError(4, `input not found: ${inputPath}`);
  let input;
  try { input = new DatabaseSync(inputPath, { readOnly: true }); } catch (err) { throw new ExitError(4, `cannot open input: ${err.message}`); }
  try {
    for (const t of ['nodes', 'text_blocks']) if (!tableExists(input, t)) throw new ExitError(4, `input lacks table ${t}`);
  } catch (err) { input.close(); throw err; }
  const inputSha = await sha256File(inputPath);
  const workPath = join(outDir, 'embed-work.db');

  if (existsSync(workPath)) {
    const w = new DatabaseSync(workPath);
    const prevSha = tableExists(w, 'embed_work') ? kv(w, 'embed_work', 'input_sha256') : undefined;
    const startedAt = tableExists(w, 'embed_work') ? kv(w, 'embed_work', 'started_at') : undefined;
    if (args.restart) {
      w.close();
      const stamp = (startedAt || new Date().toISOString()).replace(/[:]/g, '-'); // ':' is illegal in Windows file names
      const dest = join(outDir, `embed-work.${stamp}.abandoned.db`);
      renameSync(workPath, dest);
      log(`--restart: previous work file kept as ${dest}`);
    } else if (prevSha !== inputSha) {
      w.close();
      input.close();
      throw new ExitError(3, 'work file belongs to another input; rerun with --restart');
    } else {
      input.close();
      return { work: w, workPath, inputPath, inputSha };
    }
  }

  // Fresh copy: VACUUM INTO a tmp name, stamp it, then rename (a kill never leaves a half work file).
  const tmp = join(outDir, 'embed-work.tmp.db');
  rmSync(tmp, { force: true });
  input.prepare('VACUUM INTO ?').run(tmp);
  input.close();
  const t = new DatabaseSync(tmp);
  const startedAt = new Date();
  t.exec(`CREATE TABLE embed_work (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS embed_progress (phase TEXT PRIMARY KEY, completed_at TEXT NOT NULL);`);
  const put = t.prepare('INSERT OR REPLACE INTO embed_work (key, value) VALUES (?,?)');
  put.run('input_sha256', inputSha);
  put.run('corpus_version', utcVersion(startedAt));
  put.run('started_at', startedAt.toISOString());
  put.run('input_path', inputPath);
  t.prepare('INSERT OR REPLACE INTO embed_progress (phase, completed_at) VALUES (?,?)').run('copy', new Date().toISOString());
  t.close();
  renameSync(tmp, workPath);
  log(`copy: ${inputPath} → ${workPath}`);
  return { work: new DatabaseSync(workPath), workPath, inputPath, inputSha };
}

const isDone = (db, phase) => !!db.prepare('SELECT 1 FROM embed_progress WHERE phase = ?').get(phase);
const markDone = (db, phase) => db.prepare('INSERT OR REPLACE INTO embed_progress (phase, completed_at) VALUES (?,?)')
  .run(phase, new Date().toISOString());

function inTxn(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (err) { db.exec('ROLLBACK'); throw err; }
}

// ── Phase 3 — vectors ────────────────────────────────────────────────
async function phaseVectors(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS embeddings_q3e256 (node_id INTEGER PRIMARY KEY, dim INTEGER NOT NULL, vec BLOB NOT NULL)`);
  const pending = db.prepare(`SELECT node_id, latin, english FROM text_blocks
    WHERE (coalesce(latin,'') <> '' OR coalesce(english,'') <> '')
      AND node_id NOT IN (SELECT node_id FROM embeddings_q3e256) ORDER BY node_id`).all();
  const ins = db.prepare('INSERT INTO embeddings_q3e256 (node_id, dim, vec) VALUES (?,?,?)');
  const t0 = Date.now();
  log(`vectors: ${pending.length} pending`);
  for (let b = 0; b < pending.length; b += BATCH) {
    const rows = pending.slice(b, b + BATCH);
    const vecs = await embedBatch(rows.map((r) => docText(r.latin, r.english)));
    inTxn(db, () => rows.forEach((r, i) => ins.run(r.node_id, DIM, vecs[i])));
    const doneN = b + rows.length;
    if ((b / BATCH) % 50 === 0 || doneN === pending.length) {
      const rate = doneN / Math.max(1, (Date.now() - t0) / 1000);
      log(`vectors: ${doneN}/${pending.length} (${rate.toFixed(1)}/s)`);
    }
  }
  markDone(db, 'vectors');
}

// ── Phase 4 — centroids (+ archive, swap) ────────────────────────────
function phaseCentroids(db) {
  const r = inTxn(db, () => {
    const res = computeCentroids(db);
    if (tableExists(db, 'embeddings')) db.exec('ALTER TABLE embeddings RENAME TO embeddings_trigram');
    db.exec('ALTER TABLE embeddings_q3e256 RENAME TO embeddings');
    markDone(db, 'centroids');
    return res;
  });
  log(`centroids: ${r.centroids} concept vectors; ${r.archived} trigram auto INSTANCE_OF edges archived`);
}

// ── Phase 7 — probe ──────────────────────────────────────────────────
async function phaseProbe(db, V, ollamaVersion) {
  const picked = selectProbe(db, splitClauses);
  if (picked.length !== 20) log(`probe: warning — only ${picked.length} of 20 candidates found`);
  const docVecs = await embedBatch(picked.map((p) => p.doc));
  const qVecs = await embedBatch(picked.map((p) => RUNTIME_EMBED_META.prefix_query.replace('{text}', p.query)));
  const id = (c, i) => `${c}${String(i + 1).padStart(2, '0')}`;
  const items = [
    ...picked.map((p, i) => ({ id: id('d', i), role: 'doc', key: p.key, text: p.doc, vec: vecBase64(docVecs[i]) })),
    ...picked.map((p, i) => ({ id: id('q', i), role: 'query', key: p.key, text: p.query, vec: vecBase64(qVecs[i]) })),
  ];
  const embedMeta = Object.fromEntries(EMBED_META_KEYS.map((k) => [k, RUNTIME_EMBED_META[k]]));
  mkdirSync(dirname(PROBE_PATH), { recursive: true });
  writeFileSync(PROBE_PATH, `${JSON.stringify({ schema: 1, corpusVersion: V, embedMeta, ollamaVersion, items }, null, 2)}\n`);
  markDone(db, 'probe');
  log(`probe: ${items.length} items → ${PROBE_PATH}`);
}

// ── Phase 8 — finalize ───────────────────────────────────────────────
function phaseFinalizeTxn(db, V, ollamaVersion) {
  inTxn(db, () => {
    db.exec('CREATE TABLE IF NOT EXISTS corpus_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const derivedFrom = kv(db, 'embed_work', 'derived_from') ?? kv(db, 'corpus_meta', 'corpus_version') ?? 'unknown';
    db.prepare('INSERT OR REPLACE INTO embed_work (key, value) VALUES (?,?)').run('derived_from', derivedFrom);
    db.exec('DROP TABLE IF EXISTS embed_meta; CREATE TABLE embed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const em = db.prepare('INSERT INTO embed_meta (key, value) VALUES (?,?)');
    for (const k of EMBED_META_KEYS) em.run(k, RUNTIME_EMBED_META[k]);
    const cm = db.prepare('INSERT OR REPLACE INTO corpus_meta (key, value) VALUES (?,?)');
    cm.run('corpus_version', V);
    cm.run('derived_from', derivedFrom);
    cm.run('embed_ollama_version', ollamaVersion);
    cm.run('embed_completed_at', new Date().toISOString());
    db.exec('DROP TABLE IF EXISTS similar_done');
    markDone(db, 'finalize');
  });
}

function ledgerEntry(db, V) {
  const c = (sql) => db.prepare(sql).get().c;
  const derived = kv(db, 'corpus_meta', 'derived_from');
  const vendored = kv(db, 'corpus_meta', 'vendored_commit') ?? 'unknown';
  const archived = tableExists(db, 'edges_trigram_archive') ? c('SELECT count(*) c FROM edges_trigram_archive') : 0;
  return [
    `### ${V} — semantic re-embed (Qwen3-Embedding-0.6B, 256-d) and Catena module split`,
    '',
    `- Derived from \`${derived}\` by \`scripts/embed-corpus.mjs\` (model \`${MODEL}\`, blob \`sha256-${RUNTIME_EMBED_META.artifact_sha256}\`, Ollama ${kv(db, 'corpus_meta', 'embed_ollama_version')}).`,
    `- Vendored Divinum Officium commit: \`${vendored}\`.`,
    '- Catena moved to module `catena-aurea-en` (R2), so the base no longer contains `commentary:catena-aurea/*`.',
    `- Trigram auto-concept INSTANCE_OF edges archived in \`edges_trigram_archive\` (${archived} rows); trigram vectors kept as \`embeddings_trigram\`.`,
    `- Counts: nodes ${c('SELECT count(*) c FROM nodes')}; embeddings (dim 256) ${c(`SELECT count(*) c FROM embeddings WHERE dim = ${DIM}`)}; ` +
      `SIMILAR_TO ${c("SELECT count(*) c FROM edges WHERE rel = 'SIMILAR_TO'")}; ` +
      `semantic INSTANCE_OF ${c("SELECT count(*) c FROM edges WHERE rel = 'INSTANCE_OF' AND json_extract(meta,'$.method') = 'semantic'")}.`,
    '- Rollback: prior corpus file untouched; revert the pointer commit.',
    '',
  ].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  const ollamaVersion = await preflight();
  const { work: db, workPath } = await openWork(args, outDir);
  try {
    db.exec('PRAGMA synchronous = NORMAL');
    const V = kv(db, 'embed_work', 'corpus_version');
    if (!V) throw new ExitError(3, `work file ${workPath} has no corpus_version; rerun with --restart`);
    const outPath = join(outDir, `missal.${V}.full.db`);
    if (isDone(db, 'finalize') && existsSync(outPath)) { console.log(outPath); return; }
    if (!isDone(db, 'vectors')) await phaseVectors(db);
    if (!isDone(db, 'centroids')) phaseCentroids(db);
    let m = null;
    const matrix = () => (m ??= loadMatrix(db));
    if (!isDone(db, 'instance_of')) {
      const n = inTxn(db, () => { const k = semanticInstanceOf(db, matrix()); markDone(db, 'instance_of'); return k; });
      log(`instance_of: ${n} semantic edges`);
    }
    if (!isDone(db, 'similar_to')) {
      const n = await semanticSimilarTo(db, matrix(), log);
      markDone(db, 'similar_to');
      log(`similar_to: ${n} edges this run`);
    }
    m = null;
    if (!isDone(db, 'probe')) await phaseProbe(db, V, ollamaVersion);
    if (!isDone(db, 'finalize')) phaseFinalizeTxn(db, V, ollamaVersion);
    const tmp = join(outDir, `.missal.${V}.full.tmp.db`);
    rmSync(tmp, { force: true });
    db.prepare('VACUUM INTO ?').run(tmp);
    renameSync(tmp, outPath);
    const entry = ledgerEntry(db, V);
    writeFileSync(join(outDir, 'MISSAL-DB-VERSIONS.entry.md'), entry);
    console.log(entry);
    console.log(outPath);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  if (err instanceof ExitError) {
    console.error(`[embed-corpus] ${err.message}`);
    process.exit(err.code);
  }
  console.error(err);
  process.exit(4); // exit codes are a closed set (0/2/3/4)
});
