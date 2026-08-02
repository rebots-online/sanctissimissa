/**
 * scripture — offline scripture lookup over the vendored Clementine Vulgate
 * (VENDORED/vulgate-clementina/vul.tsv, Latin) and Douay-Rheims
 * (VENDORED/douay-rheims/EntireBible-DR.json, English).
 *
 * Serves the V0.7 gap-fill pipeline: citations in Divinum Officium notation
 * ("Ps 27:8-9", "Rom 6:3-11", "Marc 8:1-9") are parsed and the verse text
 * returned with its normalized citation and source label.
 */

import { readFileSync } from 'node:fs';

// DO/Latin citation abbreviation → [vul.tsv book abbrev, Douay-Rheims book name]
const BOOKS = {
  gen: ['Gen', 'Genesis'], ex: ['Exo', 'Exodus'], exod: ['Exo', 'Exodus'],
  lev: ['Lev', 'Leviticus'], num: ['Num', 'Numbers'], deut: ['Deu', 'Deuteronomy'],
  jos: ['Josh', 'Josue'], judic: ['Jdgs', 'Judges'], judg: ['Jdgs', 'Judges'],
  ruth: ['Ruth', 'Ruth'],
  '1reg': ['1Sm', '1 Kings'], '2reg': ['2Sm', '2 Kings'], '3reg': ['1Ki', '3 Kings'], '4reg': ['2Ki', '4 Kings'],
  '1sam': ['1Sm', '1 Kings'], '2sam': ['2Sm', '2 Kings'],
  '1par': ['1Chr', '1 Paralipomenon'], '2par': ['2Chr', '2 Paralipomenon'],
  '1esdr': ['Ezra', '1 Esdras'], '2esdr': ['Neh', '2 Esdras'],
  tob: [null, 'Tobias'], judith: [null, 'Judith'], esth: ['Est', 'Esther'],
  job: ['Job', 'Job'], ps: ['Psa', 'Psalms'], psalm: ['Psa', 'Psalms'],
  prov: ['Prv', 'Proverbs'], eccle: ['Eccl', 'Ecclesiastes'], eccles: ['Eccl', 'Ecclesiastes'],
  cant: ['SSol', 'Canticles'], sap: [null, 'Wisdom'], eccli: [null, 'Ecclesiasticus'], sir: [null, 'Ecclesiasticus'],
  is: ['Isa', 'Isaias'], isa: ['Isa', 'Isaias'], jer: ['Jer', 'Jeremias'],
  thren: ['Lam', 'Lamentations'], lam: ['Lam', 'Lamentations'], bar: [null, 'Baruch'],
  ezech: ['Eze', 'Ezechiel'], ez: ['Eze', 'Ezechiel'], dan: ['Dan', 'Daniel'],
  os: ['Hos', 'Osee'], osee: ['Hos', 'Osee'], joel: ['Joel', 'Joel'], amos: ['Amos', 'Amos'],
  abd: ['Obad', 'Abdias'], jon: ['Jonah', 'Jonas'], mich: ['Mic', 'Micheas'],
  nah: ['Nahum', 'Nahum'], hab: ['Hab', 'Habacuc'], soph: ['Zep', 'Sophonias'],
  agg: ['Hag', 'Aggeus'], zach: ['Zec', 'Zacharias'], mal: ['Mal', 'Malachias'],
  '1mach': ['1Mac', '1 Machabees'], '2mach': ['2Mac', '2 Machabees'],
  matt: ['Mat', 'Matthew'], mt: ['Mat', 'Matthew'],
  marc: ['Mark', 'Mark'], mark: ['Mark', 'Mark'], mc: ['Mark', 'Mark'],
  luc: ['Luke', 'Luke'], luke: ['Luke', 'Luke'], lc: ['Luke', 'Luke'],
  joann: ['John', 'John'], john: ['John', 'John'], jo: ['John', 'John'], joh: ['John', 'John'],
  act: ['Acts', 'Acts'], rom: ['Rom', 'Romans'],
  '1cor': ['1Cor', '1 Corinthians'], '2cor': ['2Cor', '2 Corinthians'],
  gal: ['Gal', 'Galatians'], eph: ['Eph', 'Ephesians'],
  phil: ['Phi', 'Philippians'], philipp: ['Phi', 'Philippians'],
  col: ['Col', 'Colossians'],
  '1thess': ['1Th', '1 Thessalonians'], '2thess': ['2Th', '2 Thessalonians'],
  '1tim': ['1Tim', '1 Timothy'], '2tim': ['2Tim', '2 Timothy'],
  tit: ['Titus', 'Titus'], philem: ['Phmn', 'Philemon'], hebr: ['Heb', 'Hebrews'], heb: ['Heb', 'Hebrews'],
  jac: ['Jas', 'James'], jas: ['Jas', 'James'],
  '1petr': ['1Pet', '1 Peter'], '2petr': ['2Pet', '2 Peter'], '1pet': ['1Pet', '1 Peter'], '2pet': ['2Pet', '2 Peter'],
  '1joann': ['1Jn', '1 John'], '2joann': ['2Jn', '2 John'], '3joann': ['3Jn', '3 John'],
  '1john': ['1Jn', '1 John'], '2john': ['2Jn', '2 John'], '3john': ['3Jn', '3 John'],
  jud: ['Jude', 'Jude'], jude: ['Jude', 'Jude'], apoc: ['Rev', 'Apocalypse'],
};

/** "Ps 27:8-9" / "1 Cor. 10:1-5" / "Marc 8, 1-9" → parsed parts, or null. */
export function parseCitation(raw) {
  const cleaned = String(raw ?? '')
    .replace(/^\s*!+\s*/, '')
    .replace(/\./g, '')
    .trim();
  const m = cleaned.match(/^([1-4]?)\s*([A-Za-zÆæŒœ]+)\s+(\d+)\s*[:,]\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!m) return null;
  const bookKey = `${m[1] ?? ''}${m[2].toLowerCase()}`.replace(/\s+/g, '');
  const book = BOOKS[bookKey] ?? null;
  if (!book) return null;
  return {
    bookKey,
    vulBook: book[0],
    drBook: book[1],
    chapter: Number(m[3]),
    from: Number(m[4]),
    to: m[5] ? Number(m[5]) : Number(m[4]),
  };
}

export class Scripture {
  constructor(vulTsvPath, drJsonPath) {
    this.vulPath = vulTsvPath;
    this.drPath = drJsonPath;
    this.vul = null; // Map "Book|ch|v" → text
    this.dr = null; // parsed JSON
  }

  loadVul() {
    if (this.vul) return this.vul;
    this.vul = new Map();
    const tsv = readFileSync(this.vulPath, 'utf8');
    for (const line of tsv.split('\n')) {
      const f = line.split('\t');
      if (f.length < 6) continue;
      this.vul.set(`${f[1]}|${f[3]}|${f[4]}`, f[5]);
    }
    return this.vul;
  }

  loadDr() {
    if (this.dr) return this.dr;
    this.dr = JSON.parse(readFileSync(this.drPath, 'utf8'));
    return this.dr;
  }

  /**
   * Look up a DO citation for a language.
   * @returns {{citation:string, text:string, source:string}|null}
   */
  lookup(rawCitation, lang) {
    const c = parseCitation(rawCitation);
    if (!c) return null;
    const verses = [];
    if (lang === 'Latin' && c.vulBook) {
      const vul = this.loadVul();
      for (let v = c.from; v <= c.to; v++) {
        const t = vul.get(`${c.vulBook}|${c.chapter}|${v}`);
        if (t) verses.push(t);
      }
      if (verses.length) {
        return {
          citation: `${rawCitation.replace(/^!\s*/, '').trim()}`,
          text: verses.join('\n'),
          source: 'Vulgata Clementina (VENDORED/vulgate-clementina)',
        };
      }
    }
    if (lang === 'English' && c.drBook) {
      const dr = this.loadDr();
      const chapter = dr[c.drBook]?.[String(c.chapter)];
      if (chapter) {
        for (let v = c.from; v <= c.to; v++) {
          const t = chapter[String(v)];
          if (t) verses.push(t.replace(/\*/g, ''));
        }
      }
      if (verses.length) {
        return {
          citation: `${rawCitation.replace(/^!\s*/, '').trim()}`,
          text: verses.join('\n'),
          source: 'Douay-Rheims (VENDORED/douay-rheims)',
        };
      }
    }
    return null;
  }

  /** Fallback used by include resolution when a hint may embed a citation. */
  lookupByHint(hint, lang) {
    const m = String(hint ?? '').match(/([1-4]?\s*[A-Za-z]+\s+\d+[:,]\d+(?:-\d+)?)/);
    return m ? this.lookup(m[1], lang) : null;
  }
}
