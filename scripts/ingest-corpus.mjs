/**
 * ingest-corpus v2 — build assets/missal.db directly from the vendored
 * Divinum Officium flat-text tree (VENDORED/divinum-officium/web/www).
 * No path in this pipeline leaves the repository.
 *
 *   node --experimental-strip-types scripts/ingest-corpus.mjs [outDb]
 *
 * Ingested corpora (path keys match the legacy HelloWord-derived schema):
 *   Tempora/<f>            missa propers, temporal cycle
 *   Sancti/<f>             missa propers, sanctoral cycle
 *   Commune/<f>            the Commune (lives in horas/<lang>/Commune upstream)
 *   Psalterium/<rel>       psalter + common office material
 *   Ordo/Missae            the Ordinary of the Mass (missa Ordo/Ordo.txt, "#" headings)
 *   Horas/Tempora/<f>      office propers, temporal cycle
 *   Horas/Sancti/<f>       office propers, sanctoral cycle
 *
 * Directives (@include, &/$ macros, &psalm(n)) are resolved inline; INCLUDES
 * and EXPANDS edges record the graph realization. Broken directives NEVER
 * break generation — the V0.7 fallback chain (same-section elsewhere → vide
 * commune → vendored Vulgate/Douay-Rheims by citation → placeholder) fills
 * them, and every fill lands in DOCS/CORPUS-FILL-LOG.md.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { embedText, cosine, EMBED_DIM, normalizeText } from '../src/core/vector/embed.ts';
import { applyConditionals, vero, RUBRICS_1960 } from '../src/core/liturgy/conditionals.ts';
import { parseDOFile, parseRank, ruleVide, CorpusTree, loadPrayers, resolveContent, FillLog, firstCitation } from './do-parse.mjs';
import { ingestOfficePlane } from './ingest-office.mjs';
import { ingestBiblePlane } from './ingest-bible.mjs';
import { ingestCommentary } from './ingest-commentary.mjs';
import { Scripture } from './scripture.mjs';
import { CONCEPTS, IMAGERY_CONCEPTS } from '../src/core/ontology/concepts.ts';

const WWW = resolve('VENDORED/divinum-officium/web/www');
const OUT = process.argv[2] ?? 'assets/missal.db';
const FILL_LOG_PATH = 'DOCS/CORPUS-FILL-LOG.md';
const LANGS = ['Latin', 'English'];

if (!existsSync(WWW)) {
  console.error(`vendored corpus missing: ${WWW}`);
  process.exit(1);
}

const fillLog = new FillLog();
const scripture = new Scripture(
  resolve('VENDORED/vulgate-clementina/vul.tsv'),
  resolve('VENDORED/douay-rheims/EntireBible-DR.json'),
);
const legacyMeta = existsSync('scripts/legacy-file-meta.json')
  ? JSON.parse(readFileSync('scripts/legacy-file-meta.json', 'utf8'))
  : {};

// ── Output schema (unchanged from v1 — CorpusDb stays compatible) ──
mkdirSync(dirname(resolve(OUT)), { recursive: true });
const out = new DatabaseSync(resolve(OUT));
out.exec(`
  PRAGMA journal_mode = MEMORY;
  PRAGMA foreign_keys = OFF;
  DROP TABLE IF EXISTS search;
  DROP TABLE IF EXISTS embeddings;
  DROP TABLE IF EXISTS text_blocks;
  DROP TABLE IF EXISTS edges;
  DROP TABLE IF EXISTS nodes;
  CREATE TABLE nodes (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    title TEXT,
    category TEXT,
    rank_class TEXT,
    rank_num REAL,
    color TEXT,
    meta TEXT
  );
  CREATE TABLE edges (
    id INTEGER PRIMARY KEY,
    src INTEGER NOT NULL REFERENCES nodes(id),
    dst INTEGER NOT NULL REFERENCES nodes(id),
    rel TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0,
    meta TEXT
  );
  CREATE INDEX idx_nodes_kind ON nodes(kind);
  CREATE INDEX idx_edges_src ON edges(src, rel);
  CREATE INDEX idx_edges_dst ON edges(dst, rel);
  CREATE TABLE text_blocks (
    node_id INTEGER PRIMARY KEY REFERENCES nodes(id),
    section TEXT NOT NULL,
    latin TEXT,
    english TEXT
  );
  CREATE TABLE embeddings (
    node_id INTEGER PRIMARY KEY REFERENCES nodes(id),
    dim INTEGER NOT NULL,
    vec BLOB NOT NULL
  );
  CREATE VIRTUAL TABLE search USING fts5(key, section, content);
`);

const insNode = out.prepare(
  'INSERT INTO nodes (kind, key, title, category, rank_class, rank_num, color, meta) VALUES (?,?,?,?,?,?,?,?)',
);
const insEdge = out.prepare('INSERT INTO edges (src, dst, rel, weight, meta) VALUES (?,?,?,?,?)');
const insText = out.prepare('INSERT INTO text_blocks (node_id, section, latin, english) VALUES (?,?,?,?)');
const insEmb = out.prepare('INSERT INTO embeddings (node_id, dim, vec) VALUES (?,?,?)');
const insFts = out.prepare('INSERT INTO search (key, section, content) VALUES (?,?,?)');

// ── Corpus discovery ────────────────────────────────────────────────
/** Recursively list .txt files under dir, as relative paths without extension. */
function listTxt(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.txt')) found.push(relative(dir, p).replace(/\.txt$/, ''));
    }
  };
  walk(dir);
  return found.sort();
}

// [corpus path prefix, DO-relative dir root under www/<missa|horas>/<lang>/]
const SOURCES = [
  { prefix: 'Tempora', sub: 'Tempora', roots: ['missa'] },
  { prefix: 'Sancti', sub: 'Sancti', roots: ['missa'] },
  { prefix: 'Commune', sub: 'Commune', roots: ['horas'] },
  { prefix: 'Psalterium', sub: 'Psalterium', roots: ['horas'] },
  { prefix: 'Horas/Tempora', sub: 'Tempora', roots: ['horas'] },
  { prefix: 'Horas/Sancti', sub: 'Sancti', roots: ['horas'] },
];

const trees = Object.fromEntries(LANGS.map((l) => [l, new CorpusTree(WWW, l)]));
const prayers = Object.fromEntries(LANGS.map((l) => [l, loadPrayers(WWW, l)]));

// Sections that are rubrical bookkeeping, not prayed text.
const META_SECTIONS = new Set(['Rank', 'Rule', 'Name', 'Officium', 'Missa', 'Prelude', 'Comment', 'Rank1960', 'RankNewcal']);

// Rubric context for load-time conditional processing: the version is fixed;
// runtime-only subjects (season, weekday, hour…) stay deferred in the text.
const RUBRIC_CTX = { version: RUBRICS_1960 };

/**
 * Realize a parsed section list under the 1960 rubrics:
 *  - "[Name] (condition)" headers evaluate; true replaces the plain [Name]
 *    section, false is dropped, undecidable is preserved under a decorated
 *    name so the runtime pass can still reach it;
 *  - conditional LINES inside each section run through the DO processor
 *    (version facts resolved, runtime facts deferred).
 */
function realizeSections(secs) {
  if (!secs) return null;
  const order = [];
  const byName = new Map();
  for (const s of secs) {
    let name = s.name;
    if (s.qualifier != null) {
      const cond = s.qualifier.replace(/^\s*(?:(?:sed|vero|atque|attamen|si|deinde)\b\s*)*/i, '');
      const verdict = vero(cond, RUBRIC_CTX);
      if (verdict === false) continue;
      if (verdict === null) name = `${s.name} (${s.qualifier})`;
    }
    const content = applyConditionals(s.content, RUBRIC_CTX);
    if (!byName.has(name)) order.push(name);
    byName.set(name, { name, qualifier: s.qualifier, content });
  }
  return order.map((n) => byName.get(n));
}

// ── Helpers ─────────────────────────────────────────────────────────
/**
 * Resolve a raw section for one language: directive expansion + orphan
 * citation fill (a "!Citation" line followed by no text gets its verses
 * from the vendored Vulgate/Douay-Rheims).
 */
function resolveLang(lang, filePath, treePath, sectionName, content, videPath, edgeSink) {
  const ctx = {
    tree: trees[lang],
    prayers: prayers[lang],
    fillLog,
    scripture,
    filePath: treePath,
    sectionName,
    videPath,
    edges: edgeSink,
  };
  const res = resolveContent(content, ctx);
  return fillOrphanCitations(res, lang, filePath, sectionName);
}

/** Insert scripture for citations that have no following text. */
function fillOrphanCitations(res, lang, filePath, sectionName) {
  const lines = res.text.split('\n');
  const out = [];
  let filled = res.filled;
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const cit = lines[i].match(/^!\s*(.+)$/);
    if (!cit) continue;
    // Orphan when next non-blank line is absent or is another directive/citation.
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    const orphan = j >= lines.length || /^[!@&$]/.test(lines[j].trim());
    if (!orphan) continue;
    const hit = scripture.lookup(cit[1], lang);
    if (hit) {
      out.push(hit.text);
      filled = true;
      fillLog.add({
        file: filePath, section: sectionName, directive: lines[i].trim(),
        resolution: 'filled-orphan-citation', source: hit.source, citation: hit.citation, preview: hit.text,
      });
    }
  }
  return { text: out.join('\n'), filled };
}

/** Parse missa Ordo/Ordo.txt ("#" headings) into DO-style sections. */
function parseOrdoFile(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const sections = [];
  let current = { name: 'Prelude', lines: [] };
  const seen = new Map();
  for (const line of lines) {
    const m = line.match(/^#\s*(.+?)\s*$/);
    if (m) {
      if (current.lines.length) sections.push(current);
      const base = m[1];
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      current = { name: n === 1 ? base : `${base} ${n}`, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length) sections.push(current);
  return sections.map((s) => ({ name: s.name, qualifier: null, content: s.lines.join('\n').replace(/\s+$/, '') }));
}

// ── Pass 1: build the merged corpus in memory ───────────────────────
/** files: path → { title, rankClass, rankNum, color, vide, category, sections: Map<name, {latin, english, filled, qualifier}> } */
const corpus = new Map();
const pendingEdges = []; // { srcKey, dstKey, rel, directive }

for (const src of SOURCES) {
  for (const root of src.roots) {
    const latDir = join(WWW, root, 'Latin', src.sub);
    for (const rel of listTxt(latDir)) {
      const path = `${src.prefix}/${rel}`;
      if (corpus.has(path)) continue;
      const treePath = `${src.sub}/${rel}`; // DO-relative (CorpusTree resolves missa→horas)
      let latSections = realizeSections(trees.Latin.sections(treePath));
      if (!latSections) continue;
      // Psalm files carry no [Section] headers — synthesize one.
      if (latSections.length === 0 && rel.startsWith('Psalmorum/')) {
        const raw = trees.Latin.psalm(rel.replace(/^Psalmorum\/Psalm/, ''));
        if (raw) latSections = [{ name: 'Psalmus', qualifier: null, content: raw }];
      }
      let engSections = realizeSections(trees.English.sections(treePath));
      if (engSections && engSections.length === 0 && rel.startsWith('Psalmorum/')) {
        const raw = trees.English.psalm(rel.replace(/^Psalmorum\/Psalm/, ''));
        if (raw) engSections = [{ name: 'Psalmus', qualifier: null, content: raw }];
      }
      const engByName = new Map((engSections ?? []).map((s) => [s.name, s]));

      const officium = latSections.find((s) => s.name === 'Officium')?.content?.split('\n')[0]?.trim() ?? null;
      const rankSec = latSections.find((s) => s.name === 'Rank');
      const rank = parseRank(rankSec?.content ?? '');
      const ruleSec = latSections.find((s) => s.name === 'Rule');
      const vide = rank.vide ?? ruleVide(ruleSec?.content ?? '');
      const festumDomini = /Festum Domini/i.test(ruleSec?.content ?? '');
      const legacy = legacyMeta[path] ?? {};

      const entry = {
        title: officium ?? rank.name ?? path,
        rankClass: rank.rankClass ?? legacy.rankClass ?? null,
        rankNum: rank.rankNum || legacy.rankNum || 0,
        color: legacy.color ?? null,
        vide,
        festumDomini,
        category: src.prefix.split('/')[0],
        sections: new Map(),
      };

      const edgeSink = (rel2, target, directive) => {
        const dstKey = target.startsWith('Prayers#')
          ? null // prayer expansions are recorded in the fill/edge meta only
          : target.includes('#')
            ? `section:${normalizeTarget(target, src)}`
            : `file:${normalizeTarget(target, src)}`;
        if (dstKey) pendingEdges.push({ srcKey: `section:${path}#${CURRENT.section}`, dstKey, rel: rel2, directive });
      };
      const CURRENT = { section: '' };

      for (const s of latSections) {
        CURRENT.section = s.name;
        const eng = engByName.get(s.name);
        const lat = resolveLang('Latin', path, treePath, s.name, s.content, vide, edgeSink);
        const en = eng ? resolveLang('English', path, treePath, s.name, eng.content, vide, null) : { text: null, filled: false };
        entry.sections.set(s.name, {
          latin: lat.text || null,
          english: en.text || null,
          filled: lat.filled || en.filled,
          qualifier: s.qualifier,
        });
      }
      // English-only sections (rare) still ingest.
      for (const s of engSections ?? []) {
        if (entry.sections.has(s.name)) continue;
        CURRENT.section = s.name;
        const en = resolveLang('English', path, treePath, s.name, s.content, vide, null);
        entry.sections.set(s.name, { latin: null, english: en.text || null, filled: en.filled, qualifier: s.qualifier });
      }
      corpus.set(path, entry);
    }
  }
}

// Ordinary of the Mass — "#"-heading file, one per language.
{
  const path = 'Ordo/Missae';
  const latP = join(WWW, 'missa', 'Latin', 'Ordo', 'Ordo.txt');
  const engP = join(WWW, 'missa', 'English', 'Ordo', 'Ordo.txt');
  const lat = existsSync(latP) ? parseOrdoFile(applyConditionals(readFileSync(latP, 'utf8'), RUBRIC_CTX)) : [];
  const eng = existsSync(engP) ? parseOrdoFile(applyConditionals(readFileSync(engP, 'utf8'), RUBRIC_CTX)) : [];
  const engByName = new Map(eng.map((s) => [s.name, s]));
  const entry = {
    title: 'Ordo Missae — the Ordinary of the Mass',
    rankClass: null, rankNum: 0, color: null, vide: null, category: 'Ordo',
    sections: new Map(),
  };
  for (const s of lat) {
    const e = engByName.get(s.name);
    const lr = resolveLang('Latin', path, 'Ordo/Ordo', s.name, s.content, null, null);
    const er = e ? resolveLang('English', path, 'Ordo/Ordo', s.name, e.content, null, null) : { text: null, filled: false };
    entry.sections.set(s.name, { latin: lr.text || null, english: er.text || null, filled: lr.filled || er.filled, qualifier: null });
  }
  corpus.set(path, entry);
}

/** Map a DO-relative include target back to a corpus path. */
function normalizeTarget(target, src) {
  const [p, sec] = target.split('#');
  let mapped = p;
  if (p.startsWith('Commune/') || p.startsWith('Psalterium/')) mapped = p;
  else if (p.startsWith('Tempora/') || p.startsWith('Sancti/')) mapped = src.prefix.startsWith('Horas/') ? `Horas/${p}` : p;
  return sec ? `${mapped}#${sec}` : mapped;
}

// ── Pass 2: emit nodes / edges / text / embeddings / FTS ───────────
out.exec('BEGIN');
const nodeId = new Map(); // key → id
let sectionCount = 0;
let filledCount = 0;

for (const [path, f] of corpus) {
  const r = insNode.run(
    'file', `file:${path}`, f.title, f.category, f.rankClass, f.rankNum, f.color,
    JSON.stringify({
      office_name: f.title,
      cross_ref: f.vide ?? null,
      ...(f.festumDomini ? { festum_domini: true } : {}),
    }),
  );
  nodeId.set(`file:${path}`, Number(r.lastInsertRowid));
}

let crossRefCount = 0;
for (const [path, f] of corpus) {
  if (!f.vide) continue;
  const dst = nodeId.get(`file:${f.vide}`);
  if (!dst) continue;
  insEdge.run(nodeId.get(`file:${path}`), dst, 'CROSS_REF', 1.0, JSON.stringify({ directive: `vide ${f.vide}` }));
  crossRefCount++;
}

for (const [path, f] of corpus) {
  const fid = nodeId.get(`file:${path}`);
  for (const [name, s] of f.sections) {
    const key = `section:${path}#${name}`;
    if (nodeId.has(key)) continue;
    const meta = { ...(s.filled ? { filled: true } : {}), ...(s.qualifier ? { qualifier: s.qualifier } : {}) };
    const r = insNode.run('section', key, name, f.category, null, null, null, Object.keys(meta).length ? JSON.stringify(meta) : null);
    const nid = Number(r.lastInsertRowid);
    nodeId.set(key, nid);
    insEdge.run(fid, nid, 'HAS_SECTION', 1.0, null);
    insText.run(nid, name, s.latin, s.english);
    if (s.filled) filledCount++;
    const isMeta = META_SECTIONS.has(name);
    const embedSource = isMeta ? '' : (s.latin ?? s.english ?? '');
    const ftsSource = isMeta ? '' : normalizeText([s.latin, s.english].filter(Boolean).join('\n'));
    if (embedSource.trim()) {
      const vec = embedText(embedSource);
      insEmb.run(nid, EMBED_DIM, Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength));
    }
    if (ftsSource.trim()) insFts.run(key, name, ftsSource);
    sectionCount++;
  }
}

let includeEdges = 0;
for (const e of pendingEdges) {
  const src = nodeId.get(e.srcKey);
  const dst = nodeId.get(e.dstKey);
  if (!src || !dst) continue;
  insEdge.run(src, dst, e.rel, 1.0, JSON.stringify({ directive: e.directive }));
  includeEdges++;
}

out.exec('COMMIT');

// ── Pass 3a: Curated concept nodes + INSTANCE_OF edges + centroids ──
out.exec('BEGIN');
let conceptCount = 0;
let instanceEdgeCount = 0;
let broaderEdgeCount = 0;

// Build a lookup of all section nodes with their text for concept matching.
const allSections = out.prepare(
  `SELECT n.id, n.key, n.title, tb.latin, tb.english
   FROM nodes n JOIN text_blocks tb ON tb.node_id = n.id
   WHERE n.kind = 'section'`,
).all();

// Map concept id → node id for BROADER_THAN edges.
const conceptNodeId = new Map();

for (const concept of CONCEPTS) {
  const conceptKey = `concept:${concept.id}`;
  const meta = JSON.stringify({ description: concept.description, source: 'curated' });
  const r = insNode.run('concept', conceptKey, concept.label, 'curated', null, null, null, meta);
  const cid = Number(r.lastInsertRowid);
  conceptNodeId.set(concept.id, cid);
  conceptCount++;

  // Match sections to this concept.
  const matchedSectionIds = new Set();
  for (const sec of allSections) {
    const secName = String(sec.title ?? '');
    const latin = normalizeText(String(sec.latin ?? ''));
    const english = normalizeText(String(sec.english ?? ''));
    const combined = `${latin} ${english}`;

    let matched = false;

    // Match by section name.
    if (concept.sectionNames.includes(secName)) matched = true;

    // Match by regex patterns on normalized text.
    if (!matched) {
      for (const pat of concept.patterns) {
        if (pat.test(combined)) { matched = true; break; }
      }
    }

    // Match by keyword substring on normalized text.
    if (!matched) {
      for (const kw of concept.keywords) {
        const normKw = normalizeText(kw);
        if (normKw && combined.includes(normKw)) { matched = true; break; }
      }
    }

    if (matched) matchedSectionIds.add(Number(sec.id));
  }

  // Create INSTANCE_OF edges.
  for (const sid of matchedSectionIds) {
    insEdge.run(sid, cid, 'INSTANCE_OF', 1.0, null);
    instanceEdgeCount++;
  }

  // Compute centroid embedding from matched sections' embeddings.
  if (matchedSectionIds.size > 0) {
    const placeholders = [...matchedSectionIds].map(() => '?').join(',');
    const vecRows = out.prepare(
      `SELECT e.vec FROM embeddings e WHERE e.node_id IN (${placeholders})`,
    ).all(...matchedSectionIds);
    if (vecRows.length > 0) {
      const acc = new Float64Array(EMBED_DIM);
      for (const vr of vecRows) {
        const raw = vr.vec;
        const vec = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        for (let i = 0; i < EMBED_DIM; i++) acc[i] += vec[i];
      }
      // Average and normalize.
      const n = vecRows.length;
      let mag = 0;
      for (let i = 0; i < EMBED_DIM; i++) { acc[i] /= n; mag += acc[i] * acc[i]; }
      mag = Math.sqrt(mag) || 1;
      const centroid = new Int8Array(EMBED_DIM);
      for (let i = 0; i < EMBED_DIM; i++) {
        centroid[i] = Math.max(-127, Math.min(127, Math.round((acc[i] / mag) * 127)));
      }
      insEmb.run(cid, EMBED_DIM, Buffer.from(centroid.buffer, centroid.byteOffset, centroid.byteLength));
    }
  }
}

// Create BROADER_THAN edges for concept hierarchy.
for (const concept of CONCEPTS) {
  if (!concept.broader) continue;
  const childId = conceptNodeId.get(concept.id);
  const parentId = conceptNodeId.get(concept.broader);
  if (childId && parentId) {
    insEdge.run(parentId, childId, 'BROADER_THAN', 1.0, null);
    broaderEdgeCount++;
  }
}

out.exec('COMMIT');

// ── Pass 3b: Auto-derived concepts via embedding clustering ─────────
out.exec('BEGIN');
let autoConceptCount = 0;
let autoInstanceEdgeCount = 0;

// Load all section embeddings.
const sectionEmbRows = out.prepare(
  `SELECT e.node_id, e.vec, n.key, n.title
   FROM embeddings e JOIN nodes n ON n.id = e.node_id
   WHERE n.kind = 'section'`,
).all();

// Build section embedding vectors.
const sectionVecs = sectionEmbRows.map((r) => {
  const raw = r.vec;
  return {
    nodeId: Number(r.node_id),
    key: String(r.key),
    title: String(r.title ?? ''),
    vec: new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength),
  };
});

// Track which sections already have a curated INSTANCE_OF edge.
const curatedTagged = new Set();
const instanceRows = out.prepare(
  `SELECT src FROM edges WHERE rel = 'INSTANCE_OF'`,
).all();
for (const r of instanceRows) curatedTagged.add(Number(r.src));

// Greedy threshold clustering: group sections with cosine > 0.85.
const CLUSTER_THRESHOLD = 0.85;
const MIN_CLUSTER_SIZE = 3;
const visited = new Set();
let autoIdx = 0;

for (let i = 0; i < sectionVecs.length; i++) {
  if (visited.has(i)) continue;
  // Skip if this section is already well-covered by curated concepts.
  if (curatedTagged.has(sectionVecs[i].nodeId)) {
    visited.add(i);
    continue;
  }

  const cluster = [i];
  visited.add(i);
  for (let j = i + 1; j < sectionVecs.length; j++) {
    if (visited.has(j)) continue;
    if (curatedTagged.has(sectionVecs[j].nodeId)) continue;
    const sim = cosine(sectionVecs[i].vec, sectionVecs[j].vec);
    if (sim > CLUSTER_THRESHOLD) {
      cluster.push(j);
      visited.add(j);
    }
  }

  if (cluster.length < MIN_CLUSTER_SIZE) continue;

  // Create auto concept node.
  autoIdx++;
  const autoId = `auto_${autoIdx}`;
  const autoLabel = `Auto: ${sectionVecs[cluster[0]].title}`;
  const meta = JSON.stringify({ source: 'auto', clusterSize: cluster.length });
  const r = insNode.run('concept', `concept:${autoId}`, autoLabel, 'auto', null, null, null, meta);
  const cid = Number(r.lastInsertRowid);
  autoConceptCount++;

  // INSTANCE_OF edges + accumulate centroid.
  const acc = new Float64Array(EMBED_DIM);
  for (const idx of cluster) {
    insEdge.run(sectionVecs[idx].nodeId, cid, 'INSTANCE_OF', 1.0, null);
    autoInstanceEdgeCount++;
    for (let d = 0; d < EMBED_DIM; d++) acc[d] += sectionVecs[idx].vec[d];
  }
  // Centroid embedding.
  const n = cluster.length;
  let mag = 0;
  for (let d = 0; d < EMBED_DIM; d++) { acc[d] /= n; mag += acc[d] * acc[d]; }
  mag = Math.sqrt(mag) || 1;
  const centroid = new Int8Array(EMBED_DIM);
  for (let d = 0; d < EMBED_DIM; d++) {
    centroid[d] = Math.max(-127, Math.min(127, Math.round((acc[d] / mag) * 127)));
  }
  insEmb.run(cid, EMBED_DIM, Buffer.from(centroid.buffer, centroid.byteOffset, centroid.byteLength));
}

out.exec('COMMIT');

// ── Office plane: psalm schemas, hour skeletons, kalendar, transfers ──
const officeCounts = ingestOfficePlane(out, WWW);

// ── Bible plane (Pass 4): book/chapter/verse nodes + CITES edges ─────
const bibleCounts = ingestBiblePlane(out);

// ── Pass 4b: imagery concepts × Bible verses (§7.7) ─────────────────
// Pass 3a matched concepts before verse nodes existed; the imagery layer
// additionally tags verses so meaning-first Scripture navigation
// (CorpusDb.conceptVerseCounts / the Imagery Atlas) spans OT/Psalms/NT.
// Keywords match at WORD boundaries here — verses are short, and substring
// hits on terse Latin keywords ("via" in "deviant") would pollute counts.
let verseInstanceEdges = 0;
{
  const allVerses = out.prepare(
    `SELECT n.id, tb.latin, tb.english
     FROM nodes n JOIN text_blocks tb ON tb.node_id = n.id
     WHERE n.kind = 'verse'`,
  ).all();
  const verseNorm = allVerses.map((v) => ({
    id: Number(v.id),
    padded: ` ${normalizeText(String(v.latin ?? ''))} ${normalizeText(String(v.english ?? ''))} `,
  }));
  out.exec('BEGIN');
  for (const concept of IMAGERY_CONCEPTS) {
    const cid = conceptNodeId.get(concept.id);
    if (!cid) continue;
    const kws = concept.keywords
      .map((k) => normalizeText(k))
      .filter(Boolean)
      .map((k) => (k.includes(' ') ? k : ` ${k} `));
    for (const v of verseNorm) {
      let matched = false;
      for (const pat of concept.patterns) {
        if (pat.test(v.padded)) { matched = true; break; }
      }
      if (!matched) {
        for (const kw of kws) {
          if (v.padded.includes(kw)) { matched = true; break; }
        }
      }
      if (matched) {
        insEdge.run(v.id, cid, 'INSTANCE_OF', 1.0, null);
        verseInstanceEdges++;
      }
    }
  }
  out.exec('COMMIT');
}

// ── Interpretive layer (§7.7): vendored commentary → COMMENTS_ON edges ─
// Guarded: an absent VENDORED source dir warns and skips; never breaks.
let commentaryCounts = {};
try {
  commentaryCounts = ingestCommentary(out, console);
} catch (err) {
  console.warn('ingest-commentary skipped:', err.message);
}

out.exec('VACUUM');

// ── Fill log + summary ──────────────────────────────────────────────
mkdirSync(dirname(resolve(FILL_LOG_PATH)), { recursive: true });
writeFileSync(FILL_LOG_PATH, fillLog.toMarkdown());

const counts = {
  files: corpus.size,
  sections: sectionCount,
  crossRefEdges: crossRefCount,
  includeExpandEdges: includeEdges,
  filledSections: filledCount,
  fillLogEntries: fillLog.entries.length,
  embeddings: out.prepare('SELECT COUNT(*) c FROM embeddings').get().c,
  edges: out.prepare('SELECT COUNT(*) c FROM edges').get().c,
  curatedConcepts: conceptCount,
  conceptInstanceEdges: instanceEdgeCount,
  conceptBroaderEdges: broaderEdgeCount,
  autoConcepts: autoConceptCount,
  autoInstanceEdges: autoInstanceEdgeCount,
  verseInstanceEdges,
  ...officeCounts,
  ...bibleCounts,
  ...commentaryCounts,
};
console.log('ingest v2 complete:', JSON.stringify(counts, null, 2));
console.log('fill log →', FILL_LOG_PATH);

// Mirror to public/ so the web build serves the same bytes the native build embeds.
try {
  copyFileSync(resolve(OUT), resolve('public/missal.db'));
  console.log('copied →', resolve('public/missal.db'));
} catch (err) {
  console.warn('public copy skipped:', err.message);
}
