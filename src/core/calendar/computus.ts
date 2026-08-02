/**
 * Perpetual universal calendar — Butcher's Easter computus and Divinum
 * Officium week keys. `getWeekKey` is a 1:1 port of DO's
 * DivinumOfficium::Date::getweek (missa flavour), so the returned key IS the
 * Tempora file stem for the date: "Adv1-0", "Nat26", "Nat02", "Epi1-0",
 * "Quadp3-3", "Pasc0-0", "Pent05-3", "PentEpi5-0", …
 */

const DAY_MS = 86_400_000;

export type Season =
  | 'Advent'
  | 'Christmastide'
  | 'Time after Epiphany'
  | 'Pre-Lent'
  | 'Lent'
  | 'Paschaltide'
  | 'Time after Pentecost';

export type LiturgicalColor = 'purple' | 'white' | 'red' | 'green' | 'black' | 'rose';

/** Easter Sunday for a Gregorian year — Butcher's algorithm (UTC date). */
export function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day));
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return utcDate(y, m, d);
}

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** First Sunday of Advent (UTC date). */
export function getAdvent1(year: number): Date {
  const christmas = utcDate(year, 12, 25);
  const dow = christmas.getUTCDay() || 7;
  return addDays(christmas, -dow - 21);
}

/**
 * DO week key = Tempora file stem for a date. Port of Date.pm getweek($missa=1):
 *  - Advent:            Adv{1-4}-{dow}
 *  - Dec 25–31:         Nat{dd} weekdays, Nat1-0 for the Sunday in the octave
 *  - Jan 1 – first Sunday after Epiphany (excl.): Nat{0d} weekdays,
 *                       Nat2-0 for a Sunday on Jan 2–5
 *  - then:              Epi{n}-{dow} (Epi1-0 = Holy Family)
 *  - Pre-Lent:          Quadp{1-3}-{dow}; Lent: Quad{1-6}-{dow}
 *  - Easter → Whit Sat: Pasc{0-7}-{dow}
 *  - after:             Pent{01-24}-{dow}, with the final pre-Advent weeks
 *                       using the resumed Sundays PentEpi{3-6}-{dow}
 */
export function getWeekKey(date: Date): string {
  const year = date.getUTCFullYear();
  const day = date.getUTCDate();
  const dow = date.getUTCDay();

  const advent1 = getAdvent1(year);
  const christmas = utcDate(year, 12, 25);

  // Advent → Christmas week
  if (date >= advent1) {
    if (date < christmas) {
      const week = 1 + Math.floor(daysBetween(date, advent1) / 7);
      return `Adv${week}-${dow}`;
    }
    // Dec 25–31: day files; the Sunday within the octave is Nat1-0.
    if (dow === 0 && day >= 26) return 'Nat1-0';
    return `Nat${day}`;
  }

  // January before the first Sunday after Epiphany (exclusive).
  // ordtime = day-of-year of that Sunday (Jan 7–13).
  const jan6dow = utcDate(year, 1, 6).getUTCDay();
  const ordtime = 6 + 7 - (jan6dow === 0 ? 7 : jan6dow);
  const firstSundayAfterEpiphany = utcDate(year, 1, ordtime);

  if (date.getUTCMonth() === 0 && date < firstSundayAfterEpiphany) {
    // A Sunday on Jan 2–5 is the feast of the Holy Name (Nat2-0);
    // the Sunday within the Christmas octave can fall on Jan 1 at the latest
    // only as the Circumcision (Sancti side). Weekdays are Nat0d day files.
    if (dow === 0 && day >= 2 && day <= 5) return 'Nat2-0';
    return `Nat${String(day).padStart(2, '0')}`;
  }

  const easter = getEaster(year);
  const septuagesima = addDays(easter, -63);

  if (date < septuagesima) {
    const week = Math.floor(daysBetween(date, firstSundayAfterEpiphany) / 7) + 1;
    return `Epi${week}-${dow}`;
  }

  if (date < easter) {
    const lent1 = addDays(easter, -42);
    if (date < lent1) {
      const week = Math.floor(daysBetween(date, septuagesima) / 7) + 1;
      return `Quadp${week}-${dow}`;
    }
    const week = 1 + Math.floor(daysBetween(date, lent1) / 7);
    return `Quad${week}-${dow}`;
  }

  // Easter Sunday through Saturday in the octave of Pentecost.
  if (daysBetween(date, easter) < 56) {
    const week = Math.floor(daysBetween(date, easter) / 7);
    return `Pasc${week}-${dow}`;
  }

  // Time after Pentecost. Weeks count from Pentecost Sunday (easter+49).
  const n = Math.floor(daysBetween(date, addDays(easter, 49)) / 7);
  if (n < 23) return `Pent${String(n).padStart(2, '0')}-${dow}`;
  const wdist = Math.floor((daysBetween(advent1, date) + 6) / 7);
  if (wdist < 2) return `Pent24-${dow}`;
  if (n === 23) return `Pent23-${dow}`;
  return `PentEpi${8 - wdist}-${dow}`; // resumed Sundays after Epiphany
}

export function getSeason(weekKey: string): Season {
  if (!weekKey) return 'Time after Pentecost';
  if (weekKey.startsWith('Adv')) return 'Advent';
  if (/^Nat(\d\d)?$/.test(weekKey) || /^Nat\d\d$/.test(weekKey)) {
    // Nat25–Nat31 = Christmas week; Nat01–Nat05 = before Epiphany;
    // Nat07–Nat12 = ferias after Epiphany.
    const n = Number(weekKey.slice(3));
    return n >= 7 && n <= 13 ? 'Time after Epiphany' : 'Christmastide';
  }
  if (weekKey.startsWith('Nat')) return 'Christmastide'; // Nat1-0, Nat2-0
  if (weekKey.startsWith('PentEpi')) return 'Time after Pentecost';
  if (weekKey.startsWith('Epi')) return 'Time after Epiphany';
  if (weekKey.startsWith('Quadp')) return 'Pre-Lent';
  if (weekKey.startsWith('Quad')) return 'Lent';
  if (weekKey.startsWith('Pasc')) return 'Paschaltide';
  if (weekKey.startsWith('Pent')) return 'Time after Pentecost';
  return 'Time after Pentecost';
}

/** Season fallback color, with feast-title overrides (martyr/virgin/confessor…). */
export function seasonColor(weekKey: string, feast: string | null = null): LiturgicalColor {
  if (feast) {
    const f = feast.toLowerCase();
    // Red before white: virgin-martyrs are red; Cathedra Petri before Apostoli.
    if (f.includes('cathedra')) return 'white';
    if (f.includes('martyr')) return 'red';
    if (f.includes('sanguinis') || f.includes('crucis') || f.includes('passion')) return 'red';
    if (f.includes('apostol') || f.includes('evangelist')) return 'red';
    if (f.includes('virgin') || f.includes('confessor')) return 'white';
    if (f.includes('mariæ') || f.includes('mariae') || f.includes('angel')) return 'white';
  }
  switch (getSeason(weekKey)) {
    case 'Advent':
    case 'Pre-Lent':
    case 'Lent':
      return 'purple';
    case 'Christmastide':
    case 'Paschaltide':
    case 'Time after Epiphany':
      return 'white';
    default:
      return 'green';
  }
}

/**
 * DO transfer-table keys for a year: the Easter code (mdd) and the
 * "sunday letter" file — see DivinumOfficium::Directorium::load_transfers.
 */
export function transferKeys(year: number): { easterCode: string; letter: string } {
  const easter = getEaster(year);
  const code = (easter.getUTCMonth() + 1) * 100 + easter.getUTCDate();
  const letter = 'abcdefg'[(code - 319 + (easter.getUTCMonth() + 1 === 4 ? 1 : 0)) % 7];
  return { easterCode: String(code), letter };
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Inverse of getWeekKey: the date nearest `nearISO` whose week key matches —
 * lets a Tempora reference ("Tempora/Pent05-3") open on its real calendar day.
 * Searches outward ±450 days (covers any movable-feast drift); null if the
 * key never occurs (malformed).
 */
export function dateForWeekKey(weekKey: string, nearISO: string): string | null {
  const near = parseISODate(nearISO);
  for (let off = 0; off <= 450; off++) {
    for (const sign of off === 0 ? [1] : [1, -1]) {
      const d = new Date(near.getTime() + sign * off * 86400000);
      if (getWeekKey(d) === weekKey) return toISODate(d);
    }
  }
  return null;
}
