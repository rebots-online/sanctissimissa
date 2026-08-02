/**
 * ingest-bible — Pass 4: the vendored Bibles become first-class graph citizens.
 *
 * Clementine Vulgate (VENDORED/vulgate-clementina/vul.tsv, Latin) and
 * Douay-Rheims (VENDORED/douay-rheims/EntireBible-DR.json, English) land in
 * the SAME nodes/edges/text_blocks/embeddings/search tables as the liturgical
 * corpus: nodes `book:Gen` / `chapter:Gen/1` / `verse:Gen/1/1`, edges
 * HAS_CHAPTER / HAS_VERSE, verse-level FTS + embeddings — so every existing
 * query surface (concordance, vector similarity, concepts, MeaningPanel)
 * spans scripture with zero UI change. ARCHITECTURE §7.6, CHECKLIST BA.1–BA.2.
 *
 * CITES edges: liturgical sections whose text opens with a `!` citation line
 * gain section→verse edges with meta { citation, quality: exact|adapted }.
 * The DISPLAYED liturgical text is never replaced by verse references —
 * liturgical quotations are adapted (spliced verses, alleluias, Old-Latin
 * psalter readings) and the prayed text is normative (§7.6 normalization
 * boundary).
 *
 * Canon note: vul.tsv carries 68 books — Tobias, Judith, Wisdom,
 * Ecclesiasticus and Baruch are absent upstream, so their Latin is honestly
 * NULL (English from DR) until a complete Clementine source is vendored.
 * Psalm numbering is Vulgate/LXX in BOTH sources (verified: Ps 22 = "Dominus
 * regit me" / "The Lord ruleth me").
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { embedText, EMBED_DIM, normalizeText } from '../src/core/vector/embed.ts';
import { parseCitation } from './scripture.mjs';

const VUL_TSV = 'VENDORED/vulgate-clementina/vul.tsv';
const DR_JSON = 'VENDORED/douay-rheims/EntireBible-DR.json';

/**
 * The 73-book canon in Douay-Rheims order. Canonical keys follow the
 * Divinum Officium citation abbreviations (BOOKS in scripture.mjs), so
 * `parseCitation` output maps onto node keys without a second vocabulary.
 * `vul` = vul.tsv column-2 abbrev (null where the snapshot lacks the book).
 */
export const BOOK_MAP = [
  { key: 'Gen', dr: 'Genesis', vul: 'Gen', nt: false },
  { key: 'Ex', dr: 'Exodus', vul: 'Exo', nt: false },
  { key: 'Lev', dr: 'Leviticus', vul: 'Lev', nt: false },
  { key: 'Num', dr: 'Numbers', vul: 'Num', nt: false },
  { key: 'Deut', dr: 'Deuteronomy', vul: 'Deu', nt: false },
  { key: 'Jos', dr: 'Josue', vul: 'Josh', nt: false },
  { key: 'Judic', dr: 'Judges', vul: 'Jdgs', nt: false },
  { key: 'Ruth', dr: 'Ruth', vul: 'Ruth', nt: false },
  { key: '1Reg', dr: '1 Kings', vul: '1Sm', nt: false },
  { key: '2Reg', dr: '2 Kings', vul: '2Sm', nt: false },
  { key: '3Reg', dr: '3 Kings', vul: '1Ki', nt: false },
  { key: '4Reg', dr: '4 Kings', vul: '2Ki', nt: false },
  { key: '1Par', dr: '1 Paralipomenon', vul: '1Chr', nt: false },
  { key: '2Par', dr: '2 Paralipomenon', vul: '2Chr', nt: false },
  { key: '1Esdr', dr: '1 Esdras', vul: 'Ezra', nt: false },
  { key: '2Esdr', dr: '2 Esdras', vul: 'Neh', nt: false },
  { key: 'Tob', dr: 'Tobias', vul: null, nt: false },
  { key: 'Judith', dr: 'Judith', vul: null, nt: false },
  { key: 'Esth', dr: 'Esther', vul: 'Est', nt: false },
  { key: 'Job', dr: 'Job', vul: 'Job', nt: false },
  { key: 'Ps', dr: 'Psalms', vul: 'Psa', nt: false },
  { key: 'Prov', dr: 'Proverbs', vul: 'Prv', nt: false },
  { key: 'Eccle', dr: 'Ecclesiastes', vul: 'Eccl', nt: false },
  { key: 'Cant', dr: 'Canticles', vul: 'SSol', nt: false },
  { key: 'Sap', dr: 'Wisdom', vul: null, nt: false },
  { key: 'Eccli', dr: 'Ecclesiasticus', vul: null, nt: false },
  { key: 'Is', dr: 'Isaias', vul: 'Isa', nt: false },
  { key: 'Jer', dr: 'Jeremias', vul: 'Jer', nt: false },
  { key: 'Thren', dr: 'Lamentations', vul: 'Lam', nt: false },
  { key: 'Bar', dr: 'Baruch', vul: null, nt: false },
  { key: 'Ezech', dr: 'Ezechiel', vul: 'Eze', nt: false },
  { key: 'Dan', dr: 'Daniel', vul: 'Dan', nt: false },
  { key: 'Os', dr: 'Osee', vul: 'Hos', nt: false },
  { key: 'Joel', dr: 'Joel', vul: 'Joel', nt: false },
  { key: 'Amos', dr: 'Amos', vul: 'Amos', nt: false },
  { key: 'Abd', dr: 'Abdias', vul: 'Obad', nt: false },
  { key: 'Jon', dr: 'Jonas', vul: 'Jonah', nt: false },
  { key: 'Mich', dr: 'Micheas', vul: 'Mic', nt: false },
  { key: 'Nah', dr: 'Nahum', vul: 'Nahum', nt: false },
  { key: 'Hab', dr: 'Habacuc', vul: 'Hab', nt: false },
  { key: 'Soph', dr: 'Sophonias', vul: 'Zep', nt: false },
  { key: 'Agg', dr: 'Aggeus', vul: 'Hag', nt: false },
  { key: 'Zach', dr: 'Zacharias', vul: 'Zec', nt: false },
  { key: 'Mal', dr: 'Malachias', vul: 'Mal', nt: false },
  { key: '1Mach', dr: '1 Machabees', vul: '1Mac', nt: false },
  { key: '2Mach', dr: '2 Machabees', vul: '2Mac', nt: false },
  { key: 'Matt', dr: 'Matthew', vul: 'Mat', nt: true },
  { key: 'Marc', dr: 'Mark', vul: 'Mark', nt: true },
  { key: 'Luc', dr: 'Luke', vul: 'Luke', nt: true },
  { key: 'Joann', dr: 'John', vul: 'John', nt: true },
  { key: 'Act', dr: 'Acts', vul: 'Acts', nt: true },
  { key: 'Rom', dr: 'Romans', vul: 'Rom', nt: true },
  { key: '1Cor', dr: '1 Corinthians', vul: '1Cor', nt: true },
  { key: '2Cor', dr: '2 Corinthians', vul: '2Cor', nt: true },
  { key: 'Gal', dr: 'Galatians', vul: 'Gal', nt: true },
  { key: 'Eph', dr: 'Ephesians', vul: 'Eph', nt: true },
  { key: 'Phil', dr: 'Philippians', vul: 'Phi', nt: true },
  { key: 'Col', dr: 'Colossians', vul: 'Col', nt: true },
  { key: '1Thess', dr: '1 Thessalonians', vul: '1Th', nt: true },
  { key: '2Thess', dr: '2 Thessalonians', vul: '2Th', nt: true },
  { key: '1Tim', dr: '1 Timothy', vul: '1Tim', nt: true },
  { key: '2Tim', dr: '2 Timothy', vul: '2Tim', nt: true },
  { key: 'Tit', dr: 'Titus', vul: 'Titus', nt: true },
  { key: 'Philem', dr: 'Philemon', vul: 'Phmn', nt: true },
  { key: 'Hebr', dr: 'Hebrews', vul: 'Heb', nt: true },
  { key: 'Jac', dr: 'James', vul: 'Jas', nt: true },
  { key: '1Petr', dr: '1 Peter', vul: '1Pet', nt: true },
  { key: '2Petr', dr: '2 Peter', vul: '2Pet', nt: true },
  { key: '1Joann', dr: '1 John', vul: '1Jn', nt: true },
  { key: '2Joann', dr: '2 John', vul: '2Jn', nt: true },
  { key: '3Joann', dr: '3 John', vul: '3Jn', nt: true },
  { key: 'Jud', dr: 'Jude', vul: 'Jude', nt: true },
  { key: 'Apoc', dr: 'Apocalypse', vul: 'Rev', nt: true },
];

const byDrName = new Map(BOOK_MAP.map((b) => [b.dr, b]));

/** vul.tsv → abbrev → chapter → verse → Latin text. */
function loadVul() {
  const map = new Map();
  for (const line of readFileSync(resolve(VUL_TSV), 'utf8').split('\n')) {
    const f = line.split('\t');
    if (f.length < 6) continue;
    const [, abbrev, , ch, v, text] = f;
    if (!map.has(abbrev)) map.set(abbrev, new Map());
    const book = map.get(abbrev);
    if (!book.has(ch)) book.set(ch, new Map());
    book.get(ch).set(v, text.trim());
  }
  return map;
}

/**
 * Ingest the Bible plane into an open missal.db handle.
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns counts for the ingest summary
 */
export function ingestBiblePlane(db) {
  const insNode = db.prepare(
    'INSERT INTO nodes (kind, key, title, category, rank_class, rank_num, color, meta) VALUES (?,?,?,?,?,?,?,?)',
  );
  const insEdge = db.prepare('INSERT INTO edges (src, dst, rel, weight, meta) VALUES (?,?,?,?,?)');
  const insText = db.prepare('INSERT INTO text_blocks (node_id, section, latin, english) VALUES (?,?,?,?)');
  const insEmb = db.prepare('INSERT INTO embeddings (node_id, dim, vec) VALUES (?,?,?)');
  const insFts = db.prepare('INSERT INTO search (key, section, content) VALUES (?,?,?)');

  const vul = loadVul();
  const dr = JSON.parse(readFileSync(resolve(DR_JSON), 'utf8'));

  db.exec('BEGIN');
  let books = 0;
  let chapters = 0;
  let verses = 0;
  const verseNodeId = new Map(); // 'Gen/1/1' → node id

  for (let ord = 0; ord < BOOK_MAP.length; ord++) {
    const b = BOOK_MAP[ord];
    const drBook = dr[b.dr];
    if (!drBook) throw new Error(`DR book missing: ${b.dr}`);
    const vulBook = b.vul ? vul.get(b.vul) : null;
    const chapterNums = Object.keys(drBook).map(Number).sort((x, y) => x - y);
    const bookRow = insNode.run(
      'book', `book:${b.key}`, b.dr, 'Biblia', null, null, null,
      JSON.stringify({ ord: ord + 1, testament: b.nt ? 'NT' : 'OT', chapters: chapterNums.length, vulSource: b.vul !== null }),
    );
    const bookId = Number(bookRow.lastInsertRowid);
    books++;

    for (const ch of chapterNums) {
      const drCh = drBook[String(ch)];
      const vulCh = vulBook?.get(String(ch)) ?? null;
      const chRow = insNode.run('chapter', `chapter:${b.key}/${ch}`, `${b.dr} ${ch}`, 'Biblia', null, null, null, null);
      const chId = Number(chRow.lastInsertRowid);
      insEdge.run(bookId, chId, 'HAS_CHAPTER', 1.0, null);
      chapters++;

      // Union of verse numbers: editions occasionally split/merge verses.
      const nums = new Set(Object.keys(drCh).map(Number));
      if (vulCh) for (const v of vulCh.keys()) nums.add(Number(v));
      for (const v of [...nums].sort((x, y) => x - y)) {
        const english = drCh[String(v)]?.replace(/\*/g, '') ?? null;
        const latin = vulCh?.get(String(v)) ?? null;
        if (!latin && !english) continue;
        const key = `verse:${b.key}/${ch}/${v}`;
        const r = insNode.run('verse', key, `${b.dr} ${ch}:${v}`, 'Biblia', null, null, null, null);
        const nid = Number(r.lastInsertRowid);
        insEdge.run(chId, nid, 'HAS_VERSE', 1.0, null);
        insText.run(nid, `${b.key} ${ch}:${v}`, latin, english);
        verseNodeId.set(`${b.key}/${ch}/${v}`, nid);
        const embedSource = latin ?? english ?? '';
        if (embedSource.trim()) {
          const vec = embedText(embedSource);
          insEmb.run(nid, EMBED_DIM, Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength));
        }
        const ftsSource = normalizeText([latin, english].filter(Boolean).join('\n'));
        if (ftsSource.trim()) insFts.run(key, `${b.key} ${ch}:${v}`, ftsSource);
        verses++;
      }
    }
  }

  // ── CITES: liturgical section → verse range ────────────────────────
  // A section whose Latin/English text opens with a `!` citation line
  // (e.g. "!Ps 44:3") cites those verses. quality: 'exact' when the verse
  // text (normalized) appears inside the section text, else 'adapted'.
  const sections = db
    .prepare(
      `SELECT n.id, n.key, tb.latin, tb.english FROM nodes n
       JOIN text_blocks tb ON tb.node_id = n.id
       WHERE n.kind = 'section'`,
    )
    .all();
  const verseText = db.prepare('SELECT latin, english FROM text_blocks WHERE node_id = ?');
  let citesEdges = 0;
  let citedSections = 0;
  for (const s of sections) {
    const src = String(s.latin ?? s.english ?? '');
    const m = src.match(/^!\s*(.+)$/m);
    if (!m) continue;
    const c = parseCitation(m[1]);
    if (!c) continue;
    const book = byDrName.get(c.drBook);
    if (!book) continue;
    const normSection = normalizeText(src);
    let linked = false;
    for (let v = c.from; v <= c.to; v++) {
      const nid = verseNodeId.get(`${book.key}/${c.chapter}/${v}`);
      if (!nid) continue;
      const vt = verseText.get(nid);
      const normVerse = normalizeText(String(vt?.latin ?? vt?.english ?? ''));
      const quality = normVerse && normSection.includes(normVerse) ? 'exact' : 'adapted';
      insEdge.run(Number(s.id), nid, 'CITES', 1.0, JSON.stringify({ citation: m[1].trim(), quality }));
      citesEdges++;
      linked = true;
    }
    if (linked) citedSections++;
  }

  db.exec('COMMIT');
  return { bibleBooks: books, bibleChapters: chapters, bibleVerses: verses, citesEdges, citedSections };
}
