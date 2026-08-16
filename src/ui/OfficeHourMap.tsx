/**
 * OfficeHourMap — the Office's own map (ARCHITECTURE.md §11.2/§11.3 decision
 * 23): the hour's actual shape, not an SVG loop. The hour's parts (Incipit,
 * Antiphonae, Psalmi, Lectiones, Capitulum, Hymnus, Canticum, Oratio…) are
 * rendered as the strip's stations in the office view by `MapStrip`; this
 * module owns the shared derivation so the strip and any other consumer
 * agree on what a "part" is. Anchors match OfficeView's sections
 * (`{source}#{index}` over the same `buildHour` entries array).
 */

import type { OfficeEntry } from '../core/office/engine.ts';

export interface OfficePart {
  label: string;
  anchor: string;
}

/** The hour's parts in order: every titled entry, consecutive duplicates
 *  (repeated antiphon frames) collapsed to the first. */
export function officePartsOf(entries: OfficeEntry[]): OfficePart[] {
  return entries
    .map((e, i) => ({ label: e.title, anchor: `${e.source}#${i}` }))
    .filter((p, i, arr) => p.label && !(i > 0 && p.label === arr[i - 1].label));
}
