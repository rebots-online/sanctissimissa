/**
 * 1960 rubrical occurrence — which office "wins" a given day.
 * Port of the `Rubrics 1960` branch of Divinum Officium's
 * horascommon.pl winner selection (see the "Sort out occurrence between the
 * sanctoral and temporal cycles" block):
 *
 *  - sanctoral rank ≤ 1.1 is only ever a commemoration;
 *  - higher numeric rank wins;
 *  - on Sundays a sanctoral office that does NOT outrank the Sunday can still
 *    win only when the Sunday is II class (rank ≤ 5) AND the feast is
 *    I class (rank ≥ 6) or a II-class feast of the Lord (rank ≥ 5 with
 *    "Festum Domini" in its Rule); the Immaculate Conception beats Advent II
 *    by exception (RG 15);
 *  - a "dies infra Octavam Epiphaniæ" (5.6) never outranks the Holy Family
 *    Sunday (Epi1-0).
 */

import type { Season } from './computus.ts';

export interface DayFileMeta {
  key: string; // corpus path, e.g. "Sancti/02-25"
  title: string | null;
  rankClass: string | null;
  rankNum: number;
  color: string | null;
  /** [Rule] contains "Festum Domini" — feast of the Lord (beats II-cl Sundays). */
  festumDomini?: boolean;
}

/** Is the temporal office a Sunday office? (rank name or title carries Dominica) */
function isDominica(tempora: DayFileMeta | null): boolean {
  if (!tempora) return false;
  return /Dominica/i.test(tempora.title ?? '') || /Dominica/i.test(tempora.rankClass ?? '');
}

export function resolveWinner(
  _dayOfWeek: number,
  _season: Season,
  tempora: DayFileMeta | null,
  sancti: DayFileMeta[],
  weekKey = '',
): DayFileMeta | null {
  const top = sancti[0] ?? null;
  let srank = top?.rankNum ?? 0;
  const trank = tempora?.rankNum ?? 0;

  // Days within the (suppressed) octave of the Epiphany never outrank the
  // Sunday office of the Holy Family.
  if (weekKey === 'Epi1-0' && srank === 5.6) srank = 2.9;

  // No sanctoral candidate, or one reduced to a commemoration by Cum nostra.
  if (!top || srank <= 1.1) return tempora ?? null;

  // Main case: numeric outranking.
  if (srank > trank) return top;

  if (isDominica(tempora) && !weekKey.startsWith('Nat1')) {
    // 1960: II-class Sundays yield only to I-class feasts and II-class
    // feasts of the Lord.
    if (trank <= 5 && (srank >= 6 || (srank >= 5 && top.festumDomini))) return top;
    if (/Conceptione Immaculata/i.test(top.title ?? '')) return top;
    return tempora;
  }

  return tempora ?? top;
}

/** Nominal rank of a Sunday, for display fallbacks. */
export function sundayRank(dayOfWeek: number, season: Season): number {
  if (dayOfWeek !== 0) return 0;
  return (['Advent', 'Lent', 'Paschaltide'] as Season[]).includes(season) ? 8 : 5;
}
