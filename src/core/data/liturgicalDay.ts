/**
 * Day resolution — computed on demand from the perpetual calendar and the
 * corpus graph; never pre-generated (cache only what's used).
 *
 * Follows Divinum Officium's Rubrics-1960 reckoning:
 *  1. week key (= Tempora file stem) from the computus;
 *  2. sanctoral candidates from the resolved `kalendar` table (the
 *     Tabulae/Kalendaria chain), not from filename guessing;
 *  3. year-specific transfers (`kalendar_transfer`: Sunday-letter file +
 *     Easter-code file, Easter rows overriding) applied to both cycles;
 *  4. the 1960 occurrence rules (`resolveWinner`) pick the office.
 */

import { parseISODate, getWeekKey, getSeason, seasonColor, transferKeys, isLeapYear } from '../calendar/computus.ts';
import { resolveWinner, type DayFileMeta } from '../calendar/precedence.ts';
import type { CorpusDb } from './corpusDb.ts';
import type { DayInfo, SectionText } from './types.ts';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayCache = new Map<string, DayInfo>();

/** Jan 1 – Feb 23 (+ Feb 29) region regexes from Directorium::load_transfer_file. */
const JANFEB_RE = /^(?:01|02-[01]|02-2[0123]|02-29)/;

/**
 * The year's transfer map (mmdd → target), per Directorium::load_transfers:
 * Sunday-letter file first, Easter-code file overriding; leap years take
 * Jan/Feb from the shifted next-code files.
 */
function yearTransfers(db: CorpusDb, year: number): Map<string, string> {
  const { easterCode, letter } = transferKeys(year);
  const leap = isLeapYear(year);
  const map = new Map<string, string>();
  const apply = (source: string, filter: 0 | 1 | 2) => {
    for (const row of db.getTransfers(source)) {
      const inJanFeb = JANFEB_RE.test(row.mmdd) || JANFEB_RE.test(row.target);
      if (filter === 1 && inJanFeb) continue; // Feb 24 – Dec only
      if (filter === 2 && !JANFEB_RE.test(row.mmdd)) continue; // Jan + Feb only
      map.set(row.mmdd, row.target);
    }
  };
  apply(letter, leap ? 1 : 0);
  apply(easterCode, leap ? 1 : 0);
  if (leap) {
    const letters = 'abcdefg';
    const li = letters.indexOf(letter);
    apply(letters[(li + 1) % 7], 2);
    let next = Number(easterCode) + 1;
    if (next === 332) next = 401;
    apply(String(next), 2);
  }
  return map;
}

/**
 * The day's Mass propers with ferial delegation: a Tempora feria whose file
 * carries Office texts but no Mass sections says the preceding Sunday's Mass
 * ("de Dominica praecedenti", Divinum Officium behavior). Every returned row
 * keeps its real sourcePath, so delegated texts are labelled honestly.
 */
export function massTextsForDay(db: CorpusDb, day: DayInfo): { texts: SectionText[]; sourcePath: string } {
  const primary = day.winner?.key ?? day.temporaPath;
  let texts = db.getMassTexts(primary);
  if (texts.length > 0) return { texts, sourcePath: primary };
  const feria = primary.match(/^(Tempora\/.+)-[1-6]$/);
  if (feria) {
    const sunday = `${feria[1]}-0`;
    texts = db.getMassTexts(sunday);
    if (texts.length > 0) return { texts, sourcePath: sunday };
  }
  return { texts: [], sourcePath: primary };
}

export function resolveDay(db: CorpusDb, iso: string): DayInfo {
  const cached = dayCache.get(iso);
  if (cached) return cached;

  const date = parseISODate(iso);
  const year = date.getUTCFullYear();
  const dow = date.getUTCDay();
  const weekKey = getWeekKey(date);
  const season = getSeason(weekKey);
  const mmdd = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

  let temporaPath = `Tempora/${weekKey}`;
  const transfers = yearTransfers(db, year);

  // Sanctoral candidates for the date: transfer target if present, else the
  // kalendar entry; first file is the celebration, the rest commemorations.
  let sanctiFiles: string[] = [];
  const transferTarget = transfers.get(mmdd);
  if (transferTarget !== undefined) {
    for (const tok of transferTarget.split('~').map((t) => t.trim()).filter(Boolean)) {
      if (/^X+$/i.test(tok)) continue;
      if (tok.startsWith('Tempora/')) temporaPath = tok;
      else if (tok.includes('/')) sanctiFiles.push(tok.replace(/^\.\.\//, ''));
      else sanctiFiles.push(`Sancti/${tok}`);
    }
  } else {
    sanctiFiles = db.getKalendar(mmdd).map((k) => `Sancti/${k.file}`);
  }

  // Drop feasts transferred AWAY to another date this year (Directorium::transfered).
  sanctiFiles = sanctiFiles.filter((f) => {
    const stem = f.replace(/^Sancti\//, '');
    for (const [k, v] of transfers) {
      if (k === mmdd || !v || /v\s*$/i.test(v)) continue;
      if (/Tempora/i.test(v) && !/Epi1-0/i.test(v)) continue;
      if (!v.startsWith(k) && v.includes(stem)) return false;
    }
    return true;
  });

  let tempora = db.asDayMeta(db.getFileNode(temporaPath));
  // Ferias without their own Tempora file take the week's Sunday office
  // (missa "de Dominica praecedenti").
  if (!tempora && /-[1-6]$/.test(weekKey)) {
    const sunday = `Tempora/${weekKey.replace(/-[1-6]$/, '-0')}`;
    const meta = db.asDayMeta(db.getFileNode(sunday));
    if (meta) {
      temporaPath = sunday;
      tempora = { ...meta, rankNum: 1, rankClass: 'Feria' }; // feria of the week
    }
  }

  // Kalendar order is authoritative: the first entry is the celebration
  // candidate, the rest are commemorations.
  const sancti = sanctiFiles
    .map((f) => db.asDayMeta(db.getFileNode(f)))
    .filter((m): m is DayFileMeta => !!m && m.rankNum > 0);

  const winner = resolveWinner(dow, season, tempora, sancti, weekKey);
  const feastName = winner?.title ?? null;
  const rank = winner?.rankNum ?? 0.5;

  const info: DayInfo = {
    date: iso,
    weekday: WEEKDAYS[dow],
    weekKey,
    season,
    color: winner?.color ?? seasonColor(weekKey, feastName),
    temporaPath,
    winner,
    feastName,
    rank,
    commemorations: [tempora, ...sancti].filter(
      (m): m is DayFileMeta => !!m && m.key !== winner?.key && m.rankNum > 0,
    ),
  };
  dayCache.set(iso, info);
  return info;
}
