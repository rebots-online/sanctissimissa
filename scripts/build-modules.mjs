#!/usr/bin/env node
/**
 * corpus:modules — split one finalized full corpus into the paid Catena module
 * and a Catena-free base corpus (BA.1).
 *
 *   node --experimental-strip-types scripts/build-modules.mjs <full.db> [--out <dir>]
 *
 * Normative source: DOCS/ARCHITECTURE/L-content-modules-search-20261106.md
 * §2.1 (files), §2.3 (module DDL / node set / digest), §2.4 (modules.json),
 * §2.9 (Catena NucleusSourceManifest), §3.1 build-modules.
 *
 * Outputs (defaults; `--out <dir>` sends both to <dir>):
 *   module  build/modules/catena-aurea-en-r<N>.db
 *   base    assets/corpus/missal.<V>.db
 *   index   content/library/modules.json (tracked; this script is its only writer)
 *
 * Exit codes (Closed set, Phase L): 0 ok/unchanged · 3 output exists · 4 invalid input.
 * The input file is opened read-only and is never written. No corpus pointer,
 * resolver, sync-db/build.rs edit or deploy is performed here (BA.9 owns those).
 */
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  EMBED_META_KEYS, MODULE_DDL, MODULE_EDGE_RELS, MODULE_KEY_RE, contentDigest,
} from './lib/module-db.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_ID = 'catena-aurea-en';
const MODULES_JSON = join(ROOT, 'content', 'library', 'modules.json');
const CATENA_DIR = join(ROOT, 'VENDORED', 'catena-aurea', 'catena-aurea-project', 'markdown_chapters');
const BOOK_ORDER = ['Matt', 'Marc', 'Luc', 'Joann'];
/** GLOB is case-sensitive, so it selects exactly MODULE_KEY_RE's set in SQL. */
const MODULE_GLOB = `(key GLOB 'commentary:catena-aurea/*' OR key GLOB 'catena:*' OR key GLOB 'father:*')`;

function fail(code, msg) {
  console.error(`✖ build-modules: ${msg}`);
  process.exit(code);
}

function parseArgs(argv) {
  let input = null;
  let out = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      out = argv[++i];
      if (!out) fail(4, '--out requires a directory');
    } else if (!input) input = argv[i];
    else fail(4, `unexpected argument ${argv[i]}`);
  }
  if (!input) fail(4, 'usage: build-modules.mjs <full.db> [--out <dir>]');
  return { input: resolve(input), out: out ? resolve(out) : null };
}

const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function parseMeta(s) {
  try { return s ? JSON.parse(String(s)) : {}; } catch { return {}; }
}

function tableExists(db, name) {
  return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE name = ?`).get(name);
}

/** Refuse (exit 4) unless all seven embed_meta rows and embed_progress.finalize exist. */
function readEmbedMeta(src) {
  const msg = 'input lacks complete embed_meta / embed_progress.finalize';
  if (!tableExists(src, 'embed_meta') || !tableExists(src, 'embed_progress')) fail(4, msg);
  const rows = src.prepare('SELECT key, value FROM embed_meta').all();
  const map = new Map(rows.map((r) => [String(r.key), String(r.value)]));
  if (!EMBED_META_KEYS.every((k) => map.has(k))) fail(4, msg);
  if (!src.prepare(`SELECT 1 FROM embed_progress WHERE phase = 'finalize'`).get()) fail(4, msg);
  const embedMeta = {};
  for (const k of EMBED_META_KEYS) embedMeta[k] = map.get(k);
  return embedMeta;
}

function numCmp(a, b) {
  const na = Number(a), nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a ?? '') < String(b ?? '') ? -1 : String(a ?? '') > String(b ?? '') ? 1 : 0;
}

const keyCmp = (a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

/** Father slugs in scripts/catena-fathers.mjs table order (BA.11), when present. */
async function fatherOrder() {
  const p = join(ROOT, 'scripts', 'catena-fathers.mjs');
  if (!existsSync(p)) return null;
  const mod = await import(pathToFileURL(p).href);
  return Array.isArray(mod.CATENA_FATHERS) ? mod.CATENA_FATHERS.map((f) => String(f.slug)) : null;
}

/**
 * Insertion order (§2.3 `ord`): pericopes by Book TOC order Matt, Marc, Luc,
 * Joann, then meta.chapterFile, then meta.ord — each followed by its
 * quotations by ordinal — then the father nodes (Father-table order, else key).
 */
async function orderModuleNodes(nodes) {
  const peri = [], quot = [], fath = [];
  for (const n of nodes) {
    if (n.key.startsWith('commentary:catena-aurea/')) peri.push(n);
    else if (n.key.startsWith('catena:')) quot.push(n);
    else fath.push(n);
  }
  const bookIdx = (key) => {
    const i = BOOK_ORDER.indexOf(key.split('/')[1]);
    return i < 0 ? BOOK_ORDER.length : i;
  };
  peri.sort((a, b) => bookIdx(a.key) - bookIdx(b.key)
    || numCmp(a.meta.chapterFile, b.meta.chapterFile)
    || numCmp(a.meta.ord, b.meta.ord)
    || keyCmp(a, b));
  const qOrdinal = (n) => n.meta.ordinal ?? Number(/\/q(\d+)$/.exec(n.key)?.[1] ?? 0);
  const byPericope = new Map();
  for (const q of quot) {
    const pk = `commentary:catena-aurea/${q.key.slice('catena:'.length).replace(/\/q\d+$/, '')}`;
    if (!byPericope.has(pk)) byPericope.set(pk, []);
    byPericope.get(pk).push(q);
  }
  const ordered = [];
  for (const p of peri) {
    ordered.push(p);
    const qs = byPericope.get(p.key);
    if (!qs) continue;
    qs.sort((a, b) => numCmp(qOrdinal(a), qOrdinal(b)) || keyCmp(a, b));
    ordered.push(...qs);
    byPericope.delete(p.key);
  }
  // Quotations whose pericope is absent keep key order, ahead of the fathers.
  const orphans = [...byPericope.values()].flat().sort(keyCmp);
  if (orphans.length) console.warn(`⚠ ${orphans.length} quotation node(s) without a pericope node — ordered by key`);
  ordered.push(...orphans);
  const slugs = await fatherOrder();
  if (slugs) {
    const rank = new Map(slugs.map((s, i) => [`father:${s}`, i]));
    fath.sort((a, b) => (rank.get(a.key) ?? slugs.length) - (rank.get(b.key) ?? slugs.length) || keyCmp(a, b));
  } else fath.sort(keyCmp);
  ordered.push(...fath);
  return ordered;
}

/** sha256 of the 89 chapter files, concatenated in path-sorted order (§2.9). */
function catenaSourceSha256() {
  if (!existsSync(CATENA_DIR)) fail(4, `Catena source missing: ${relative(ROOT, CATENA_DIR)}`);
  const files = [];
  for (const d of readdirSync(CATENA_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of readdirSync(join(CATENA_DIR, d.name))) {
      if (f.endsWith('.md')) files.push(`${d.name}/${f}`);
    }
  }
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (files.length !== 89) console.warn(`⚠ expected 89 Catena chapter files, found ${files.length}`);
  const h = createHash('sha256');
  for (const f of files) h.update(readFileSync(join(CATENA_DIR, f)));
  return h.digest('hex');
}

function readModulesJson() {
  if (!existsSync(MODULES_JSON)) return { schema: 1, generatedAt: null, modules: [] };
  try {
    const j = JSON.parse(readFileSync(MODULES_JSON, 'utf8'));
    return { schema: 1, generatedAt: j.generatedAt ?? null, modules: Array.isArray(j.modules) ? j.modules : [] };
  } catch (e) {
    fail(4, `content/library/modules.json is not valid JSON (${e.message})`);
  }
}

/** (a) Fill the module tmp DB from the read-only input. */
async function fillModule(src, tmpPath) {
  const nodes = src.prepare(
    `SELECT id, key, kind, title, category, rank_class, rank_num, color, meta FROM nodes WHERE ${MODULE_GLOB}`,
  ).all()
    .map((r) => ({ ...r, key: String(r.key), metaRaw: r.meta, meta: parseMeta(r.meta) }))
    .filter((n) => MODULE_KEY_RE.test(n.key));
  if (!nodes.length) fail(4, 'input has no Catena module nodes');
  const ordered = await orderModuleNodes(nodes);
  const setIds = new Set(ordered.map((n) => Number(n.id)));
  const setKeys = new Set(ordered.map((n) => n.key));

  const mod = new DatabaseSync(tmpPath);
  mod.exec(MODULE_DDL);
  mod.exec('BEGIN');
  const insEmb = mod.prepare('INSERT INTO embed_meta(key, value) VALUES (?, ?)');
  for (const r of src.prepare('SELECT key, value FROM embed_meta ORDER BY key').all()) insEmb.run(r.key, r.value);

  const insNode = mod.prepare(
    `INSERT INTO mnodes(key, kind, title, category, rank_class, rank_num, color, meta, ord)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const getText = src.prepare('SELECT section, latin, english FROM text_blocks WHERE node_id = ?');
  const insText = mod.prepare('INSERT INTO mtext(node_key, section, latin, english) VALUES (?, ?, ?, ?)');
  const getVec = src.prepare('SELECT dim, vec FROM embeddings WHERE node_id = ? AND dim = 256');
  const insVec = mod.prepare('INSERT INTO memb(node_key, dim, vec) VALUES (?, ?, ?)');
  let ord = 0;
  for (const n of ordered) {
    insNode.run(n.key, n.kind, n.title ?? null, n.category ?? null, n.rank_class ?? null,
      n.rank_num ?? null, n.color ?? null, n.metaRaw ?? null, ++ord);
    const t = getText.get(n.id);
    if (t) insText.run(n.key, t.section, t.latin ?? null, t.english ?? null);
    const v = getVec.get(n.id);
    if (v) insVec.run(n.key, v.dim, v.vec);
  }

  const insSearch = mod.prepare('INSERT INTO msearch(key, section, content) VALUES (?, ?, ?)');
  for (const r of src.prepare('SELECT key, section, content FROM search').iterate()) {
    if (setKeys.has(String(r.key))) insSearch.run(r.key, r.section, r.content);
  }

  const rels = new Set(MODULE_EDGE_RELS);
  const insEdge = mod.prepare(
    'INSERT OR IGNORE INTO medges(src_key, dst_key, rel, weight, meta) VALUES (?, ?, ?, ?, ?)',
  );
  const edgeSql = `SELECT e.src, e.dst, s.key AS src_key, d.key AS dst_key, e.rel, e.weight, e.meta
    FROM edges e JOIN nodes s ON s.id = e.src JOIN nodes d ON d.id = e.dst`;
  for (const e of src.prepare(edgeSql).iterate()) {
    if (!rels.has(String(e.rel))) continue;
    if (!setIds.has(Number(e.src)) && !setIds.has(Number(e.dst))) continue;
    insEdge.run(e.src_key, e.dst_key, e.rel, e.weight ?? 1.0, e.meta ?? null);
  }
  mod.exec('COMMIT');
  return mod;
}

/** module_meta rows (Closed set, Phase L): §2.3 / §2.9. */
function writeModuleMeta(mod, { revision, corpusVersion, digest }) {
  const sourceSha = catenaSourceSha256();
  const count = (sql) => Number(mod.prepare(sql).get().c);
  const nucleus = {
    id: 'catena-aurea', label: 'Catena Aurea', authorityKind: 'patristics', workDate: '1262–1264',
    editionDate: '1841', translationDate: '1841–1845', languages: ['en'],
    translator: 'John Henry Newman (ed.), Oxford translation', publicationPlace: 'Oxford: John Henry Parker',
    rightsBasis: 'Public domain (pre-1900); commercial use and redistribution allowed; all territories; reviewed by Robin L. M. Cheung, MBA, 2026-11-06 (R4)',
    provenanceUrl: 'https://github.com/tj06man/catena-aurea-project/tree/d3829bbb8b31b72796073d8e8218d36179b62720',
    sha256: sourceSha, moduleId: MODULE_ID,
  };
  const rows = [
    ['schema_version', '1'], ['module_id', MODULE_ID], ['edition_id', MODULE_ID],
    ['revision', String(revision)], ['title', 'Catena Aurea'], ['corpus_version', corpusVersion],
    ['built_at', new Date().toISOString()], ['content_digest', digest], ['source_sha256', sourceSha],
    ['nucleus_source', 'catena-aurea'], ['authority_kind', 'patristics'],
    ['nucleus_manifest', JSON.stringify(nucleus)],
    ['node_count', String(count('SELECT count(*) c FROM mnodes'))],
    ['edge_count', String(count('SELECT count(*) c FROM medges'))],
    ['quotation_count', String(count(`SELECT count(*) c FROM mnodes WHERE kind = 'quotation'`))],
    ['father_count', String(count(`SELECT count(*) c FROM mnodes WHERE kind = 'father'`))],
    ['cites_unresolved', String(count(
      `SELECT COALESCE(SUM(json_extract(meta, '$.citesUnresolved')), 0) c FROM mnodes WHERE kind = 'quotation'`,
    ))],
  ];
  const ins = mod.prepare('INSERT INTO module_meta(key, value) VALUES (?, ?)');
  mod.exec('BEGIN');
  for (const [k, v] of rows) ins.run(k, v);
  mod.exec('COMMIT');
}

/** (b) Base: VACUUM INTO a copy, then remove the module set from the copy only. */
function buildBase(src, basePath) {
  src.exec(`VACUUM INTO '${basePath.replaceAll("'", "''")}'`);
  const base = new DatabaseSync(basePath);
  base.exec('BEGIN');
  base.exec(`CREATE TEMP TABLE mod_set AS SELECT id, key FROM nodes WHERE ${MODULE_GLOB}`);
  base.exec('DELETE FROM search WHERE key IN (SELECT key FROM temp.mod_set)');
  base.exec('DELETE FROM embeddings WHERE node_id IN (SELECT id FROM temp.mod_set)');
  base.exec('DELETE FROM text_blocks WHERE node_id IN (SELECT id FROM temp.mod_set)');
  base.exec(`DELETE FROM edges WHERE src IN (SELECT id FROM temp.mod_set)
                                OR dst IN (SELECT id FROM temp.mod_set)`);
  if (tableExists(base, 'edges_trigram_archive')) {
    base.exec(`DELETE FROM edges_trigram_archive
      WHERE src_key GLOB 'commentary:catena-aurea/*' OR src_key GLOB 'catena:*' OR src_key GLOB 'father:*'
         OR dst_key GLOB 'commentary:catena-aurea/*' OR dst_key GLOB 'catena:*' OR dst_key GLOB 'father:*'`);
  }
  base.exec('DELETE FROM nodes WHERE id IN (SELECT id FROM temp.mod_set)');
  base.prepare('INSERT OR REPLACE INTO corpus_meta(key, value) VALUES (?, ?)').run('modules_split', MODULE_ID);
  base.exec('DROP TABLE temp.mod_set');
  base.exec('COMMIT');
  base.exec('VACUUM');
  const left = Number(base.prepare(
    `SELECT count(*) c FROM nodes WHERE key LIKE 'commentary:catena-aurea/%' OR key LIKE 'catena:%' OR key LIKE 'father:%'`,
  ).get().c);
  base.close();
  if (left !== 0) fail(4, `postcondition failed: base still has ${left} module node(s) (${basePath})`);
}

async function main() {
  const { input, out } = parseArgs(process.argv.slice(2));
  const moduleOut = out ?? join(ROOT, 'build', 'modules');
  const baseOut = out ?? join(ROOT, 'assets', 'corpus');
  if (!existsSync(input) || !statSync(input).isFile()) fail(4, `input not found: ${input}`);

  let src;
  try { src = new DatabaseSync(input, { readOnly: true }); } catch (e) { fail(4, `cannot open input (${e.message})`); }
  let embedMeta;
  try { embedMeta = readEmbedMeta(src); } catch (e) { fail(4, `input lacks complete embed_meta / embed_progress.finalize (${e.message})`); }
  const cv = tableExists(src, 'corpus_meta')
    ? src.prepare(`SELECT value FROM corpus_meta WHERE key = 'corpus_version'`).get() : null;
  if (!cv) fail(4, 'input lacks corpus_meta.corpus_version');
  const V = String(cv.value);

  // (a) Module.
  mkdirSync(moduleOut, { recursive: true });
  const tmpPath = join(moduleOut, `.${MODULE_ID}.tmp.db`);
  if (existsSync(tmpPath)) rmSync(tmpPath); // stale tmp from an interrupted run of this script
  const mod = await fillModule(src, tmpPath);
  const digest = contentDigest(mod);
  const index = readModulesJson();
  const prev = index.modules.find((m) => m.moduleId === MODULE_ID) ?? null;
  if (prev && prev.contentDigest === digest) {
    mod.close();
    rmSync(tmpPath);
    console.log('unchanged');
    process.exit(0);
  }
  const N = prev ? Number(prev.revision) + 1 : 1;
  const file = `${MODULE_ID}-r${N}.db`;
  const modulePath = join(moduleOut, file);
  const basePath = join(baseOut, `missal.${V}.db`);
  // Both existence refusals are checked before anything is finalized, so an
  // exit 3 never leaves a renamed module without its modules.json entry.
  for (const p of [modulePath, basePath]) {
    if (existsSync(p)) {
      mod.close();
      rmSync(tmpPath);
      fail(3, `output exists: ${p}`);
    }
  }
  writeModuleMeta(mod, { revision: N, corpusVersion: V, digest });
  mod.close();
  renameSync(tmpPath, modulePath);

  // (b) Base.
  mkdirSync(baseOut, { recursive: true });
  buildBase(src, basePath);
  src.close();

  // (c) content/library/modules.json — §2.4 exactly.
  const appVersion = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf8')).version;
  const entry = {
    moduleId: MODULE_ID, editionId: MODULE_ID, title: 'Catena Aurea', file, revision: N, appVersion,
    corpusVersion: V, sizeBytes: statSync(modulePath).size, sha256: sha256File(modulePath),
    contentDigest: digest, entitlementId: `reference_${MODULE_ID}`, nucleusSource: 'catena-aurea',
    authorityKind: 'patristics', androidPack: `module_${MODULE_ID.replaceAll('-', '_')}`, embedMeta,
  };
  const modules = index.modules.filter((m) => m.moduleId !== MODULE_ID);
  modules.push(entry);
  mkdirSync(dirname(MODULES_JSON), { recursive: true });
  writeFileSync(MODULES_JSON, `${JSON.stringify({ schema: 1, generatedAt: new Date().toISOString(), modules }, null, 2)}\n`);

  // (d) One line for BA.9's vendoring (release-inputs.mjs --vendor).
  console.log(`vendor-input base=${basePath} sha256=${sha256File(basePath)} corpusVersion=${V} module=${modulePath} revision=${N}`);
}

await main();
