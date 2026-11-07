/**
 * catena-graph — corpus pipeline step 2 (CHECKLIST BA.11; §L.4 D8, R2;
 * DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.6, §2.7, §3.1).
 *
 *   stage1-ingest.db (read-only) ──VACUUM INTO──▶ stage2-graph.db, then in the copy:
 *     father     nodes  `father:<slug>`                       (51, closed table)
 *     quotation  nodes  `catena:<Book>/<ch>/<verseStart>/q<n>`  (one per attribution)
 *     PART_OF       quotation → its pericope `commentary:catena-aurea/<Book>/<ch>/<verseStart>`
 *     ATTRIBUTED_TO quotation → `father:<slug>`
 *     CITES         quotation → each explicitly named, existing `verse:<Key>/<ch>/<v>`
 *
 * The Fathers become first-class traversable nodes. The attribution and
 * citation grammars are closed: an unknown attribution label rolls the
 * transaction back and exits 4. No text is fabricated: every quotation text
 * is a verbatim span of the vendored Newman translation (markup removal only).
 *
 * CLI (via ingest-commentary.mjs, kept 3 lines there):
 *   node --experimental-strip-types scripts/ingest-commentary.mjs --catena-graph <in.db> <out.db>
 * node:sqlite reference: DOCS/sdk/ has no node:sqlite snapshot; the calls used here
 * (DatabaseSync {readOnly}, prepare/run/get/all, exec, VACUUM INTO) are the same
 * ones ingest-corpus.mjs / ingest-commentary.mjs already use.
 */

import { existsSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { normalizeText } from '../src/core/vector/embed.ts';
import { parseCatena, cleanMarkdown } from './ingest-commentary.mjs';
import { CATENA_FATHERS, FATHER_BY_SLUG, aliasToSlug, normalizeFatherLabel } from './catena-fathers.mjs';

const MODULE_ID = 'catena-aurea-en';
const DEFAULT_CATENA_DIR = 'VENDORED/catena-aurea/catena-aurea-project/markdown_chapters';

/** §2.7 Evangelist map (Closed set, Phase L). */
export const EVANGELIST = Object.freeze({ Matt: 'Matthew', Marc: 'Mark', Luc: 'Luke', Joann: 'John' });
const BOOK_DIR = { Matt: 'matthew', Marc: 'mark', Luc: 'luke', Joann: 'john' };

/** Thrown by parseCatenaQuotations for a LABEL the closed Father table lacks. */
export class UnknownFatherLabel extends Error {
  constructor(label) {
    super(`unknown Catena Father label: ${label}`);
    this.name = 'UnknownFatherLabel';
    this.label = label;
  }
}

/** ATTR := "**" LABEL "**." — LABEL `[^*]+?`, may span a newline (§2.6). */
const ATTR_RE = /\*\*([^*]+?)\*\*\./g;
const LOCATOR_MAX = 200;

/**
 * Balanced-paren LOCATOR starting at `i` (which must be `(`), depth-counted,
 * at most 200 chars. Returns { locator (outer parens stripped), end } or null.
 */
function readLocator(raw, i) {
  let depth = 0;
  for (let j = i; j < raw.length && j - i < LOCATOR_MAX; j++) {
    const c = raw[j];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return { locator: raw.slice(i + 1, j), end: j + 1 };
    }
  }
  return null;
}

/**
 * §2.6 attribution grammar over one pericope's raw Markdown (after the
 * nav/footer trim, before cleanMarkdown). Text before the first ATTR (the
 * lection) stays only in the pericope. An empty quotation text is skipped
 * and counted but still consumes its ordinal.
 *
 * @param {string} raw
 * @returns {{ quotations: {label: string, slug: string, locator: string|null, text: string, ordinal: number}[], skipped: number }}
 */
export function parseCatenaQuotations(raw) {
  const attrs = [];
  for (const m of raw.matchAll(ATTR_RE)) {
    const label = normalizeFatherLabel(m[1]);
    const slug = aliasToSlug(label);
    if (!slug) throw new UnknownFatherLabel(label);
    attrs.push({ label, slug, start: m.index, end: m.index + m[0].length });
  }
  const quotations = [];
  let skipped = 0;
  attrs.forEach((a, idx) => {
    let bodyStart = a.end;
    let locator = null;
    const ws = raw.slice(a.end).match(/^\s*/)[0].length;
    if (raw[a.end + ws] === '(') {
      const loc = readLocator(raw, a.end + ws);
      if (loc) { locator = loc.locator; bodyStart = loc.end; }
    }
    const bodyEnd = idx + 1 < attrs.length ? attrs[idx + 1].start : raw.length;
    const text = cleanMarkdown(raw.slice(bodyStart, bodyEnd));
    if (!text) { skipped++; return; }
    quotations.push({ label: a.label, slug: a.slug, locator, text, ordinal: idx + 1 });
  });
  return { quotations, skipped };
}

/**
 * §2.6 CITES abbreviation map (Closed set, Phase L): source abbreviation →
 * canonical BOOK_MAP key (scripts/ingest-bible.mjs:46). Digit-prefixed
 * names are stored as `<d> <Name>`.
 */
export const CATENA_CITE_BOOKS = Object.freeze({
  Gen: 'Gen',
  Ex: 'Ex', Exod: 'Ex', Exodus: 'Ex',
  Lev: 'Lev', Levit: 'Lev',
  Num: 'Num', Numb: 'Num',
  Deut: 'Deut',
  Josh: 'Jos', Joshua: 'Jos',
  Judges: 'Judic',
  '1 Sam': '1Reg',
  '1 Chron': '1Par',
  '2 Chron': '2Par',
  Ezra: '1Esdr',
  Tobit: 'Tob',
  Job: 'Job',
  Prov: 'Prov',
  Eccl: 'Eccle', Eccles: 'Eccle', Ecc: 'Eccle',
  Cant: 'Cant',
  Wisd: 'Sap', Sap: 'Sap',
  Ecclus: 'Eccli',
  Is: 'Is', Isa: 'Is', Isai: 'Is', Isaiah: 'Is',
  Jer: 'Jer', Jerem: 'Jer',
  Lam: 'Thren',
  Ez: 'Ezech', Ezek: 'Ezech',
  Dan: 'Dan',
  Hos: 'Os', Hosea: 'Os',
  Joel: 'Joel',
  Amos: 'Amos',
  Jonah: 'Jon',
  Mic: 'Mich', Micah: 'Mich',
  Hab: 'Hab',
  Hag: 'Agg',
  Zech: 'Zach',
  Mal: 'Mal',
  '1 Macc': '1Mach',
  Matt: 'Matt', Mat: 'Matt',
  Mark: 'Marc',
  Luke: 'Luc',
  John: 'Joann',
  Acts: 'Act', Act: 'Act',
  Rom: 'Rom',
  '1 Cor': '1Cor',
  '2 Cor': '2Cor',
  Gal: 'Gal',
  Eph: 'Eph', Ephes: 'Eph',
  Phil: 'Phil', Philip: 'Phil',
  Col: 'Col', Colos: 'Col', Coloss: 'Col',
  '1 Thess': '1Thess', '1 Thes': '1Thess', '1 These': '1Thess',
  '2 Thess': '2Thess',
  '1 Tim': '1Tim',
  '2 Tim': '2Tim',
  Tit: 'Tit',
  Heb: 'Hebr',
  James: 'Jac', Jam: 'Jac',
  '1 Pet': '1Petr',
  '2 Pet': '2Petr',
  '1 John': '1Joann',
  Rev: 'Apoc', Apoc: 'Apoc',
});

/** §2.6 excluded names (Psalter numbering, Samuel/Kings ambiguity, non-books). */
export const CATENA_CITE_EXCLUDED = Object.freeze(new Set(['Ps', 'Psalm', '1 Kings', '2 Kings', 'Infra', 'Luck']));

const CITE_RE = /[\(\[]((?:[1-4] ?)?[A-Z][a-z]+)\.? ?(\d+):(\d+)(?:[-–](\d+))?/g;
const CITE_MAX_RANGE = 30;

/**
 * §2.6 CITES grammar over one quotation text. `hasVerse(key)` reports
 * whether `verse:<Key>/<ch>/<v>` exists in the corpus (defaults to true).
 * Unmapped, excluded or over-long (> 30 verses) matches count 1 each toward
 * `unresolved`; each non-existent verse target counts 1.
 *
 * @param {string} text
 * @param {(verseKey: string) => boolean} [hasVerse]
 * @returns {{ targets: string[], unresolved: number }} deduped verse keys
 */
export function citesFor(text, hasVerse = () => true) {
  const targets = new Set();
  let unresolved = 0;
  for (const m of text.matchAll(CITE_RE)) {
    const name = m[1].replace(/^([1-4]) ?/, '$1 ');
    if (CATENA_CITE_EXCLUDED.has(name)) { unresolved++; continue; }
    const book = CATENA_CITE_BOOKS[name];
    if (!book) { unresolved++; continue; }
    const ch = Number(m[2]);
    const v1 = Number(m[3]);
    const v2 = m[4] !== undefined ? Math.max(v1, Number(m[4])) : v1;
    if (v2 - v1 + 1 > CITE_MAX_RANGE) { unresolved++; continue; }
    for (let v = v1; v <= v2; v++) {
      const key = `verse:${book}/${ch}/${v}`;
      if (hasVerse(key)) targets.add(key);
      else unresolved++;
    }
  }
  return { targets: [...targets], unresolved };
}

function utcStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

function sqlQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

/**
 * Pipeline step 2. Copies `input` (opened read-only, never written) to
 * `output` with VACUUM INTO — an existing `output` is renamed to
 * `<output>.<UTC>.superseded.db`, never deleted — then adds the Father and
 * quotation graph to the copy in one transaction and prints the census.
 *
 * @param {string} input   stage1 corpus (nodes/edges/text_blocks/search schema)
 * @param {string} output  stage2 corpus
 * @param {{ catenaDir?: string }} [opts]
 * @returns {number} exit code: 0 ok, 4 invalid input
 */
export function runCatenaGraph(input, output, opts = {}) {
  if (!input || !output) {
    console.error('usage: ingest-commentary.mjs --catena-graph <stage1.db> <stage2.db>');
    return 4;
  }
  const inPath = resolve(input);
  const outPath = resolve(output);
  if (!existsSync(inPath)) {
    console.error(`catena-graph: input not found: ${inPath}`);
    return 4;
  }
  const catenaDir = resolve(opts.catenaDir ?? DEFAULT_CATENA_DIR);
  if (!existsSync(catenaDir)) {
    console.error(`catena-graph: Catena source dir not found: ${catenaDir}`);
    return 4;
  }

  const src = new DatabaseSync(inPath, { readOnly: true });
  try {
    const tables = new Set(src.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all().map((r) => r.name));
    for (const t of ['nodes', 'edges', 'text_blocks', 'search']) {
      if (!tables.has(t)) {
        console.error(`catena-graph: input lacks table ${t}`);
        return 4;
      }
    }
    const pericopeCount = Number(src.prepare("SELECT count(*) c FROM nodes WHERE key LIKE 'commentary:catena-aurea/%'").get().c);
    if (pericopeCount === 0) {
      console.error('catena-graph: input has no Catena pericope nodes (run corpus:ingest first)');
      return 4;
    }
    if (Number(src.prepare("SELECT count(*) c FROM nodes WHERE kind IN ('father','quotation')").get().c) > 0) {
      console.error('catena-graph: input already carries father/quotation nodes (expected a stage1 corpus)');
      return 4;
    }
    if (existsSync(outPath)) {
      const superseded = `${outPath}.${utcStamp()}.superseded.db`;
      renameSync(outPath, superseded);
      console.log(`catena-graph: previous output kept → ${superseded}`);
    }
    mkdirSync(dirname(outPath), { recursive: true });
    src.exec(`VACUUM INTO ${sqlQuote(outPath)}`);
  } finally {
    src.close();
  }

  const db = new DatabaseSync(outPath);
  const insNode = db.prepare(
    'INSERT INTO nodes (kind, key, title, category, rank_class, rank_num, color, meta) VALUES (?,?,?,?,?,?,?,?)',
  );
  const insEdge = db.prepare('INSERT INTO edges (src, dst, rel, weight, meta) VALUES (?,?,?,?,?)');
  const insText = db.prepare('INSERT INTO text_blocks (node_id, section, latin, english) VALUES (?,?,?,?)');
  const insFts = db.prepare('INSERT INTO search (key, section, content) VALUES (?,?,?)');
  const nodeId = db.prepare('SELECT id FROM nodes WHERE key = ?');
  const sectionOf = db.prepare('SELECT section FROM text_blocks WHERE node_id = ? LIMIT 1');

  const verseCache = new Map();
  const verseIdOf = (key) => {
    if (!verseCache.has(key)) {
      const row = nodeId.get(key);
      verseCache.set(key, row ? Number(row.id) : null);
    }
    return verseCache.get(key);
  };

  const census = { pericopes: 0, attributions: 0, quotations: 0, skippedEmpty: 0, fathers: 0, cites: 0, citesUnresolved: 0 };
  let currentFile = '';
  db.exec('BEGIN');
  try {
    const fatherIds = new Map();
    for (const f of CATENA_FATHERS) {
      const r = insNode.run(
        'father', `father:${f.slug}`, f.title, 'Catena', null, null, null,
        JSON.stringify({ aliases: f.aliases, class: f.class, moduleId: MODULE_ID }),
      );
      fatherIds.set(f.slug, Number(r.lastInsertRowid));
      census.fathers++;
    }

    const { records } = parseCatena(catenaDir);
    for (const rec of records) {
      currentFile = `${BOOK_DIR[rec.book]}/${BOOK_DIR[rec.book]}_chapter_${String(rec.chapterFile).padStart(2, '0')}.md`;
      const pKey = `commentary:catena-aurea/${rec.book}/${rec.chapter}/${rec.verseStart}`;
      const pRow = nodeId.get(pKey);
      if (!pRow) {
        console.warn(`catena-graph: pericope node ${pKey} absent from input — its quotations skipped`);
        continue;
      }
      const pid = Number(pRow.id);
      const section = sectionOf.get(pid)?.section ?? `${rec.book} ${rec.chapter}:${rec.verseStart}`;
      census.pericopes++;

      const { quotations, skipped } = parseCatenaQuotations(rec.raw);
      census.attributions += quotations.length + skipped;
      census.skippedEmpty += skipped;

      for (const q of quotations) {
        const { targets, unresolved } = citesFor(q.text, (k) => verseIdOf(k) !== null);
        const father = FATHER_BY_SLUG.get(q.slug);
        const key = `catena:${rec.book}/${rec.chapter}/${rec.verseStart}/q${q.ordinal}`;
        const title = `${father.title} on ${EVANGELIST[rec.book]} ${rec.chapter}:${rec.verseStart}`;
        const r = insNode.run(
          'quotation', key, title, 'Catena', null, null, null,
          JSON.stringify({
            source: 'catena-aurea',
            moduleId: MODULE_ID,
            father: q.slug,
            label: q.label,
            locator: q.locator,
            ordinal: q.ordinal,
            chapterFile: rec.chapterFile,
            citesUnresolved: unresolved,
          }),
        );
        const qid = Number(r.lastInsertRowid);
        insText.run(qid, section, null, q.text);
        insFts.run(key, section, normalizeText(q.text));
        insEdge.run(qid, pid, 'PART_OF', 1.0, null);
        insEdge.run(qid, fatherIds.get(q.slug), 'ATTRIBUTED_TO', 1.0, null);
        for (const t of targets) {
          insEdge.run(qid, verseIdOf(t), 'CITES', 1.0, null);
          census.cites++;
        }
        census.citesUnresolved += unresolved;
        census.quotations++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    db.close();
    if (err instanceof UnknownFatherLabel) {
      console.error(`catena-graph: unknown Father label "${err.label}" in ${currentFile} — closed table (scripts/catena-fathers.mjs); rolled back`);
      return 4;
    }
    throw err;
  }
  db.close();
  console.log('catena-graph census:', JSON.stringify(census));
  console.log('catena-graph →', outPath);
  return 0;
}
