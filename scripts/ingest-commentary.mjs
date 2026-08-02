/**
 * ingest-commentary — the interpretive layer (ARCHITECTURE §7.7, CHECKLIST BM.3).
 *
 * Any public-domain source vendored under VENDORED/<source>/ ingests through
 * this one pass into the EXISTING graph tables — zero schema change per added
 * source:
 *
 *   nodes        kind='commentary', key `commentary:<source>/<Book>/<ch>/<verseStart>`,
 *                title `<label> on <Book> <ch>:<vs>[–<ve>]`, meta { source, verseEnd }
 *   text_blocks  english = the commentary text (PD translations are English;
 *                latin stays NULL — §7 decision 5 governs liturgical text, not commentary)
 *   edges        COMMENTS_ON  commentary node → each verse: node of its range
 *   search/embeddings  same FTS + hashed-trigram pipeline as every other node
 *
 * Wave 1 sources: Haydock 1859/1883 (whole Bible, USFM footnotes) and the
 * Catena Aurea (Newman tr. 1841–45, four Gospels, per-pericope Markdown).
 * A missing VENDORED dir is warned and skipped — the ingest never breaks.
 * No commentary text is ever fabricated: every english column below is
 * verbatim vendored text (whitespace/markup normalization only).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { embedText, EMBED_DIM, normalizeText } from '../src/core/vector/embed.ts';
import { BOOK_MAP } from './ingest-bible.mjs';

const byKey = new Map(BOOK_MAP.map((b) => [b.key, b]));

/** USFM book code (Haydock filenames) → canonical BOOK_MAP key. */
const USFM_TO_KEY = {
  GEN: 'Gen', EXO: 'Ex', LEV: 'Lev', NUM: 'Num', DEU: 'Deut', JOS: 'Jos',
  JDG: 'Judic', RUT: 'Ruth', '1SA': '1Reg', '2SA': '2Reg', '1KI': '3Reg',
  '2KI': '4Reg', '1CH': '1Par', '2CH': '2Par', EZR: '1Esdr', NEH: '2Esdr',
  TOB: 'Tob', JDT: 'Judith', EST: 'Esth', JOB: 'Job', PSA: 'Ps', PRO: 'Prov',
  ECC: 'Eccle', SNG: 'Cant', WIS: 'Sap', SIR: 'Eccli', ISA: 'Is', JER: 'Jer',
  LAM: 'Thren', BAR: 'Bar', EZK: 'Ezech', DAN: 'Dan', HOS: 'Os', JOL: 'Joel',
  AMO: 'Amos', OBA: 'Abd', JON: 'Jon', MIC: 'Mich', NAM: 'Nah', HAB: 'Hab',
  ZEP: 'Soph', HAG: 'Agg', ZEC: 'Zach', MAL: 'Mal', '1MA': '1Mach', '2MA': '2Mach',
  MAT: 'Matt', MRK: 'Marc', LUK: 'Luc', JHN: 'Joann', ACT: 'Act', ROM: 'Rom',
  '1CO': '1Cor', '2CO': '2Cor', GAL: 'Gal', EPH: 'Eph', PHP: 'Phil', COL: 'Col',
  '1TH': '1Thess', '2TH': '2Thess', '1TI': '1Tim', '2TI': '2Tim', TIT: 'Tit',
  PHM: 'Philem', HEB: 'Hebr', JAM: 'Jac', '1PE': '1Petr', '2PE': '2Petr',
  '1JN': '1Joann', '2JN': '2Joann', '3JN': '3Joann', JUD: 'Jud', REV: 'Apoc',
};

/** Strip residual USFM inline markers from a footnote body. */
function cleanUsfm(text) {
  return text
    .replace(/\\\+?[a-z]+\d*\*?/g, ' ') // \fk, \it*, stray \x…
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Haydock 1883 USFM tree: one `NN-CODE-ENG[B]DRC1750[pd].p.sfm` per book,
 * commentary as `\f + \fr <ch>:<v>[-<v2>]\ft <text>\f*` footnotes. Multiple
 * footnotes on one verse merge into one record (nodes.key is UNIQUE).
 * Returns { records, skipped } — skipped counts unparseable \fr refs
 * (`<>:8`-style broken markers in the transcription).
 */
export function parseHaydock(dir) {
  const records = [];
  let skipped = 0;
  const files = readdirSync(dir).filter((f) => f.endsWith('.p.sfm'));
  for (const file of files.sort()) {
    const code = file.match(/^\d+-([0-9A-Z]+)-/)?.[1];
    const book = USFM_TO_KEY[code];
    if (!book) continue; // FRT / INT / BAK front-and-back matter
    const txt = readFileSync(join(dir, file), 'utf8');
    const merged = new Map(); // `${ch}/${vs}` → record
    for (const m of txt.matchAll(/\\f \+ \\fr\s*([^\\]*)\\ft\s?([\s\S]*?)\\f\*/g)) {
      const ref = m[1].trim().replace(/\.$/, '');
      const r = ref.match(/^(\d+):(\d+)(?:-(\d+))?$/);
      if (!r) { skipped++; continue; }
      const text = cleanUsfm(m[2]);
      if (!text) { skipped++; continue; }
      const chapter = Number(r[1]);
      const verseStart = Number(r[2]);
      const verseEnd = Number(r[3] ?? r[2]);
      const k = `${chapter}/${verseStart}`;
      const prev = merged.get(k);
      if (prev) {
        prev.text += `\n\n${text}`;
        prev.verseEnd = Math.max(prev.verseEnd, verseEnd);
      } else {
        merged.set(k, { book, chapter, verseStart, verseEnd, text });
      }
    }
    records.push(...merged.values());
  }
  return { records, skipped };
}

const CATENA_DIRS = { matthew: 'Matt', mark: 'Marc', luke: 'Luc', john: 'Joann' };

/** Markdown link/bold/escape cruft → plain text (the Newman text itself is untouched). */
function cleanMarkdown(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) → text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*-{2,}\|.*$/gm, '') // ---|--- table rules
    .replace(/\\([.)\]])/g, '$1') // "1\." escapes
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Catena Aurea (ecatholic2000 scrape of the Newman/Parker 1841–45 tr.):
 * `markdown_chapters/<gospel>/<gospel>_chapter_NN.md`, pericopes under
 * `### <ch>:<vs>[–<ve>]` headings. Each block = the quoted lection + the
 * patristic chain, kept whole (that is the Catena as published). Site-nav
 * preamble and the trailing site-footer copyright line are stripped.
 */
export function parseCatena(dir) {
  const records = [];
  let skipped = 0;
  for (const [sub, book] of Object.entries(CATENA_DIRS)) {
    const d = join(dir, sub);
    if (!existsSync(d)) continue;
    for (const file of readdirSync(d).filter((f) => f.endsWith('.md')).sort()) {
      let txt = readFileSync(join(d, file), 'utf8');
      const start = txt.indexOf('# Catena Aurea');
      if (start > 0) txt = txt.slice(start);
      txt = txt.replace(/Copyright ©[\s\S]*$/, ''); // ecatholic2000 site footer
      const parts = txt.split(/^### +/m).slice(1);
      for (const part of parts) {
        const nl = part.indexOf('\n');
        const heading = part.slice(0, nl === -1 ? part.length : nl).trim();
        const h = heading.match(/^(\d+):(\d+)(?:[–-](\d+))?$/);
        if (!h) { skipped++; continue; }
        const text = cleanMarkdown(nl === -1 ? '' : part.slice(nl + 1));
        if (!text) { skipped++; continue; }
        records.push({
          book,
          chapter: Number(h[1]),
          verseStart: Number(h[2]),
          verseEnd: Number(h[3] ?? h[2]),
          text,
        });
      }
    }
  }
  return { records, skipped };
}

/**
 * The interpretive-layer source registry. Adding source N+1 = vendor it
 * (PROVENANCE.md first — INC-15), append a row here with a parse() that
 * emits { book, chapter, verseStart, verseEnd, text } records.
 */
export const COMMENTARY_SOURCES = [
  {
    id: 'haydock',
    dir: 'VENDORED/haydock/ENG-B-Haydock1883-pd-PSFM',
    label: 'Haydock',
    parse: parseHaydock,
  },
  {
    id: 'catena-aurea',
    dir: 'VENDORED/catena-aurea/catena-aurea-project/markdown_chapters',
    label: 'Catena Aurea',
    parse: parseCatena,
  },
];

/**
 * Ingest every available commentary source into an open missal.db handle.
 * Runs AFTER the Bible plane (COMMENTS_ON edges resolve against verse: nodes).
 * Per-source transaction; a failing source rolls back and warns, never throws.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ warn: Function, log?: Function }} log
 * @returns counts for the ingest summary
 */
export function ingestCommentary(db, log = console) {
  const insNode = db.prepare(
    'INSERT INTO nodes (kind, key, title, category, rank_class, rank_num, color, meta) VALUES (?,?,?,?,?,?,?,?)',
  );
  const insEdge = db.prepare('INSERT INTO edges (src, dst, rel, weight, meta) VALUES (?,?,?,?,?)');
  const insText = db.prepare('INSERT INTO text_blocks (node_id, section, latin, english) VALUES (?,?,?,?)');
  const insEmb = db.prepare('INSERT INTO embeddings (node_id, dim, vec) VALUES (?,?,?)');
  const insFts = db.prepare('INSERT INTO search (key, section, content) VALUES (?,?,?)');
  const verseId = db.prepare('SELECT id FROM nodes WHERE key = ?');

  let commentaryNodes = 0;
  let commentsOnEdges = 0;
  let commentarySkippedRefs = 0;
  const perSource = {};

  for (const source of COMMENTARY_SOURCES) {
    const dir = resolve(source.dir);
    if (!existsSync(dir)) {
      log.warn(`ingest-commentary: ${source.id} not vendored (${source.dir} absent) — skipped`);
      continue;
    }
    db.exec('BEGIN');
    try {
      const { records, skipped } = source.parse(dir);
      let nodes = 0;
      let edges = 0;
      let unresolved = skipped;
      for (const rec of records) {
        const bookEntry = byKey.get(rec.book);
        if (!bookEntry) { unresolved++; continue; }
        // COMMENTS_ON targets first: a record whose verses don't exist at all is skipped.
        const verseNodeIds = [];
        for (let v = rec.verseStart; v <= rec.verseEnd; v++) {
          const row = verseId.get(`verse:${rec.book}/${rec.chapter}/${v}`);
          if (row) verseNodeIds.push(Number(row.id));
        }
        if (verseNodeIds.length === 0) { unresolved++; continue; }

        const key = `commentary:${source.id}/${rec.book}/${rec.chapter}/${rec.verseStart}`;
        const range = rec.verseEnd > rec.verseStart ? `–${rec.verseEnd}` : '';
        const title = `${source.label} on ${bookEntry.dr} ${rec.chapter}:${rec.verseStart}${range}`;
        const r = insNode.run(
          'commentary', key, title, 'Commentarius', null, null, null,
          JSON.stringify({ source: source.id, verseEnd: rec.verseEnd }),
        );
        const nid = Number(r.lastInsertRowid);
        const section = `${rec.book} ${rec.chapter}:${rec.verseStart}${range ? `-${rec.verseEnd}` : ''}`;
        insText.run(nid, section, null, rec.text);
        for (const vid of verseNodeIds) {
          insEdge.run(nid, vid, 'COMMENTS_ON', 1.0, null);
          edges++;
        }
        const vec = embedText(rec.text);
        insEmb.run(nid, EMBED_DIM, Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength));
        const fts = normalizeText(rec.text);
        if (fts.trim()) insFts.run(key, section, fts);
        nodes++;
      }
      db.exec('COMMIT');
      commentaryNodes += nodes;
      commentsOnEdges += edges;
      commentarySkippedRefs += unresolved;
      perSource[source.id] = { nodes, edges, skipped: unresolved };
    } catch (err) {
      db.exec('ROLLBACK');
      log.warn(`ingest-commentary: ${source.id} failed (${err.message}) — rolled back, continuing`);
    }
  }

  return { commentaryNodes, commentsOnEdges, commentarySkippedRefs, commentarySources: perSource };
}
