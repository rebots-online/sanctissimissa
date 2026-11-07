#!/usr/bin/env node
/**
 * corpus:split — split one finalized base corpus asset into the three shipped
 * parts `text`, `graph`, `vectors` (CS.1).
 *
 *   node scripts/split-corpus.mjs --in <base asset> [--out-dir assets/corpus/]
 *
 * Normative source: DOCS/ARCHITECTURE/L-corpus-split-20261106.md §2 (parts),
 * §3 (formats), §4 (build steps 1–5). Delivery of the parts (Android asset
 * packs: text install-time, graph/vectors fast-follow) is CS.2; see
 * DOCS/sdk/play-asset-delivery/size-limits.md and
 * DOCS/sdk/play-asset-delivery/integrate-java.md for why the corpus is split.
 *
 * Outputs (in <out-dir>): missal.<V>.text.db, missal.<V>.graph.db,
 * missal.<V>.vectors.db. Outputs are immutable: each is built in a temp file
 * and placed by exclusive create (hard link, fails if the name exists).
 *
 * Exit codes (Closed set, Phase L): 0 ok · 3 an output exists · 4 invalid input.
 * The input is opened read-only (SQLite `mode=ro`) and is never written.
 */
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, linkSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EMBED_META_KEYS } from './lib/module-db.mjs';

/** Part names (Closed set, Phase L; L-corpus-split §2). */
const PARTS = ['text', 'graph', 'vectors'];
/** Tables dropped from every part (L-corpus-split §2). */
const DROPPED = ['embeddings_trigram', 'edges_trigram_archive', 'embed_work', 'embed_progress', 'similar_done'];

function fail(code, msg) {
  console.error(`✖ split-corpus: ${msg}`);
  process.exit(code);
}

function parseArgs(argv) {
  let input = null;
  let outDir = 'assets/corpus/';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') input = argv[++i];
    else if (a === '--out-dir') outDir = argv[++i];
    else fail(4, `unexpected argument ${a}`);
  }
  if (!input) fail(4, 'usage: split-corpus.mjs --in <base asset> [--out-dir assets/corpus/]');
  if (!outDir) fail(4, '--out-dir requires a directory');
  return { input: resolve(input), outDir: resolve(outDir) };
}

const quoteLit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const quoteId = (s) => `"${String(s).replace(/"/g, '""')}"`;

function sha256File(p) {
  return new Promise((ok, ko) => {
    const h = createHash('sha256');
    createReadStream(p).on('data', (c) => h.update(c)).on('error', ko).on('end', () => ok(h.digest('hex')));
  });
}

function tableExists(db, name, schema = 'main') {
  return !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(name);
}

/** Step 1: refuse (exit 4) an input without complete embed_meta, embed_progress.finalize or corpus_version. */
function validateInput(src) {
  const msg = 'input lacks complete embed_meta / embed_progress.finalize';
  if (!tableExists(src, 'embed_meta') || !tableExists(src, 'embed_progress')) fail(4, msg);
  const keys = new Set(src.prepare('SELECT key FROM embed_meta').all().map((r) => String(r.key)));
  if (!EMBED_META_KEYS.every((k) => keys.has(k))) fail(4, msg);
  if (!src.prepare(`SELECT 1 FROM embed_progress WHERE phase = 'finalize'`).get()) fail(4, msg);
  if (!tableExists(src, 'corpus_meta')) fail(4, 'input lacks corpus_meta');
  const v = src.prepare(`SELECT value FROM corpus_meta WHERE key = 'corpus_version'`).get();
  if (!v || !String(v.value)) fail(4, 'input lacks corpus_meta.corpus_version');
  for (const t of ['edges', 'embeddings']) if (!tableExists(src, t)) fail(4, `input lacks table ${t}`);
  return String(v.value);
}

/** CREATE TABLE sql of `name` in the input, with every `REFERENCES t(c)` clause removed. */
function tableSqlWithoutFk(src, name) {
  const r = src.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
  return String(r.sql).replace(/\s+REFERENCES\s+("[^"]+"|\w+)\s*(\([^)]*\))?/gi, '');
}

/** CREATE INDEX statements of `table` in the input (auto-indexes have NULL sql). */
function indexSqls(src, table) {
  return src.prepare(`SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL ORDER BY name`)
    .all(table).map((r) => String(r.sql));
}

/** corpus_meta in a part: the input's rows plus corpus_part=<part> (§3). */
function writeCorpusMeta(db, part, fromSrc) {
  db.exec('CREATE TABLE IF NOT EXISTS corpus_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  if (fromSrc) db.exec('INSERT OR REPLACE INTO corpus_meta SELECT key, value FROM src.corpus_meta');
  db.prepare(`INSERT OR REPLACE INTO corpus_meta (key, value) VALUES ('corpus_part', ?)`).run(part);
}

/** Steps 2–3: one table (rows verbatim, no FK) plus optional extra copied tables, indexes, corpus_meta, VACUUM. */
function buildTablePart(src, inputUri, tmpPath, part, table, extraTables) {
  const db = new DatabaseSync(tmpPath);
  try {
    db.exec(`ATTACH DATABASE ${quoteLit(inputUri)} AS src`);
    db.exec(tableSqlWithoutFk(src, table));
    for (const t of extraTables) db.exec(tableSqlWithoutFk(src, t));
    db.exec('BEGIN');
    db.exec(`INSERT INTO main.${quoteId(table)} SELECT * FROM src.${quoteId(table)}`);
    for (const t of extraTables) db.exec(`INSERT INTO main.${quoteId(t)} SELECT * FROM src.${quoteId(t)}`);
    writeCorpusMeta(db, part, true);
    db.exec('COMMIT');
    for (const s of indexSqls(src, table)) db.exec(s);
    db.exec('DETACH DATABASE src');
    db.exec('VACUUM');
  } finally {
    db.close();
  }
}

/** Step 4: VACUUM INTO a copy, empty edges/embeddings, drop the dropped set, corpus_meta, corpus_parts, VACUUM. */
function buildTextPart(src, tmpPath, partRows) {
  src.exec(`VACUUM INTO ${quoteLit(tmpPath)}`);
  const db = new DatabaseSync(tmpPath);
  try {
    db.exec('BEGIN');
    db.exec('DELETE FROM edges');
    db.exec('DELETE FROM embeddings');
    for (const t of DROPPED) if (tableExists(db, t)) db.exec(`DROP TABLE ${quoteId(t)}`);
    writeCorpusMeta(db, 'text', false);
    db.exec('CREATE TABLE corpus_parts (part TEXT PRIMARY KEY, file TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL)');
    const ins = db.prepare('INSERT INTO corpus_parts (part, file, sha256, bytes) VALUES (?, ?, ?, ?)');
    for (const [part, r] of Object.entries(partRows)) ins.run(part, r.file, r.sha256, r.bytes);
    db.exec('COMMIT');
    db.exec('VACUUM');
  } finally {
    db.close();
  }
}

/** Exclusive placement: link(2) fails with EEXIST if `dest` exists, so no output is ever overwritten. */
function place(tmpPath, dest, placed) {
  try {
    linkSync(tmpPath, dest);
  } catch (e) {
    for (const d of placed) rmSync(d, { force: true }); // only files this run created
    if (e.code === 'EEXIST') fail(3, `output exists: ${dest}`);
    throw e;
  }
  placed.push(dest);
  rmSync(tmpPath);
}

async function main() {
  const { input, outDir } = parseArgs(process.argv.slice(2));
  if (!existsSync(input)) fail(4, `input not found: ${input}`);
  const inputUri = `file:${encodeURI(input).replace(/\?/g, '%3F').replace(/#/g, '%23')}?mode=ro`;
  let src;
  try {
    src = new DatabaseSync(input, { readOnly: true });
  } catch (e) {
    fail(4, `cannot open input: ${e.message}`);
  }
  const V = validateInput(src);
  const files = Object.fromEntries(PARTS.map((p) => [p, `missal.${V}.${p}.db`]));
  mkdirSync(outDir, { recursive: true });
  for (const p of PARTS) {
    const dest = join(outDir, files[p]);
    if (existsSync(dest)) fail(3, `output exists: ${dest}`);
  }
  const tmp = Object.fromEntries(PARTS.map((p) => [p, join(outDir, `.${files[p]}.tmp-${process.pid}`)]));
  const cleanup = () => { for (const p of PARTS) rmSync(tmp[p], { force: true }); };
  process.on('exit', cleanup);

  const t0 = Date.now();
  buildTablePart(src, inputUri, tmp.graph, 'graph', 'edges', []);
  console.error(`· graph built (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  buildTablePart(src, inputUri, tmp.vectors, 'vectors', 'embeddings', ['embed_meta']);
  console.error(`· vectors built (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  const parts = {};
  for (const p of ['graph', 'vectors']) {
    parts[p] = { file: files[p], sha256: await sha256File(tmp[p]), bytes: statSync(tmp[p]).size };
  }
  buildTextPart(src, tmp.text, parts);
  src.close();
  console.error(`· text built (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  parts.text = { file: files.text, sha256: await sha256File(tmp.text), bytes: statSync(tmp.text).size };

  // link(2) is the exclusive-create guarantee; a collision undoes this run's placements.
  const placed = [];
  for (const p of PARTS) place(tmp[p], join(outDir, files[p]), placed);
  console.log(JSON.stringify({ corpusVersion: V, parts: { text: parts.text, graph: parts.graph, vectors: parts.vectors } }));
}

main().catch((e) => {
  console.error(`✖ split-corpus: ${e?.stack ?? String(e)}`);
  process.exit(1); // unexpected I/O or SQLite failure (not a Closed-set refusal)
});
