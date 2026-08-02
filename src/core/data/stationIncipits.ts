/**
 * First words of the day's actual texts, per subway-map station — the live
 * layer of the map flyouts. Dual-language like everything else: Latin is
 * normative, English rides along when the corpus carries it (may be null —
 * flagged, never fabricated).
 */

import type { CorpusDb } from './corpusDb.ts';
import type { DayInfo } from './types.ts';
import { MASS_ORDO, ORDO_STATION_SECTION } from '../model/massOrdo.ts';
import { massTextsForDay } from './liturgicalDay.ts';

export interface Incipit {
  la: string | null;
  en: string | null;
}

/** First ~n words of a corpus text, skipping citation (!) lines and verse markers. */
export function firstWords(text: string | null | undefined, n = 9): string | null {
  if (!text) return null;
  const prose = text
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('!'))
    .join(' ')
    .replace(/\bv\.\s/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!prose) return null;
  const words = prose.split(' ');
  return words.slice(0, n).join(' ') + (words.length > n ? ' …' : '');
}

/** station id → dual-language incipit of the day's own text for that stop. */
export function stationIncipits(db: CorpusDb, day: DayInfo): Map<string, Incipit> {
  const out = new Map<string, Incipit>();
  const propers = new Map(massTextsForDay(db, day).texts.map((s) => [s.section, s]));
  const ordo = db.getOrdoTexts();
  for (const st of MASS_ORDO) {
    const src = st.sectionKey
      ? propers.get(st.sectionKey)
      : ORDO_STATION_SECTION[st.id]
        ? ordo.get(ORDO_STATION_SECTION[st.id])
        : undefined;
    if (!src) continue;
    const la = firstWords(src.latin);
    const en = firstWords(src.english);
    if (la || en) out.set(st.id, { la, en });
  }
  return out;
}
