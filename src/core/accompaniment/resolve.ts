/**
 * Occurrence-selector resolution — projects every selector kind onto a
 * concrete date via the existing computus (ARCHITECTURE §7.6): fixed dates,
 * moveable feasts (temporal week keys), immovable feasts (MM-DD), seasons,
 * and non-liturgical recurrences. Theme selectors are facets, never day
 * projections — they never match a day.
 */

import { parseISODate } from '../calendar/computus.ts';
import { resolveDay } from '../data/liturgicalDay.ts';
import type { CorpusDb } from '../data/corpusDb.ts';
import type { Accompaniment, OccurrenceSelector } from './types.ts';
import type { SidecarDb } from './store.ts';

/** The slice of a resolved day a selector is matched against. */
export interface DayProjection {
  date: string;
  weekKey: string;
  season: string;
  winner?: { key?: string } | null;
}

/**
 * Recurrence rule grammar (see `OccurrenceSelector`):
 *  `weekly:<0-6>` (0 = Sunday) · `nth-weekday:<n>:<0-6>` (First Friday = `nth-weekday:1:5`).
 * UTC-safe weekday math via `parseISODate` (mirrors computus.ts).
 */
function matchesRecurrence(rule: string, iso: string): boolean {
  const date = parseISODate(iso);
  const weekly = rule.match(/^weekly:([0-6])$/);
  if (weekly) return date.getUTCDay() === Number(weekly[1]);
  const nth = rule.match(/^nth-weekday:([1-5]):([0-6])$/);
  if (nth) {
    return date.getUTCDay() === Number(nth[2]) && Math.ceil(date.getUTCDate() / 7) === Number(nth[1]);
  }
  return false;
}

/** Pure selector-vs-day predicate (unit-testable without a database). */
export function matchesSelector(
  sel: Pick<OccurrenceSelector, 'kind' | 'value'>,
  day: DayProjection,
): boolean {
  switch (sel.kind) {
    case 'date':
      return sel.value === day.date;
    case 'temporal':
      return sel.value === day.weekKey;
    case 'sancti':
      // MM-DD of the date, or the resolved winner celebrating that Sancti file.
      return day.date.slice(5) === sel.value || (day.winner?.key?.includes(`Sancti/${sel.value}`) ?? false);
    case 'season':
      return sel.value.toLowerCase() === day.season.toLowerCase();
    case 'theme':
      return false; // themes are facets, not day projections
    case 'recurrence':
      return matchesRecurrence(sel.value, day.date);
  }
}

/** Every live accompaniment whose selectors project onto the given date. */
export function accompanimentsForDay(db: CorpusDb, sidecar: SidecarDb, iso: string): Accompaniment[] {
  const day = resolveDay(db, iso);
  const projection: DayProjection = {
    date: day.date,
    weekKey: day.weekKey,
    season: day.season,
    winner: day.winner,
  };
  return sidecar.list().filter((a) => a.selectors.some((s) => matchesSelector(s, projection)));
}

/** Live accompaniments anchored to a node key (delegates to the store). */
export function forAnchor(sidecar: SidecarDb, nodeKey: string): Accompaniment[] {
  return sidecar.forAnchor(nodeKey);
}
