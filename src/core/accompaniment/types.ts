/**
 * Accompaniment domain types — the one object, four exposures (ARCHITECTURE §7.6).
 *
 * Journaling, homily management, bible-study materials, and parish newsletters
 * are one object type, differentially exposed. Highlights/margin notes are
 * lightweight accompaniments (the §7 `annotations` shape migrates in).
 * snake_case columns in the sidecar DDL ↔ camelCase fields here.
 */

export type Exposure = 'journal' | 'homily' | 'study' | 'newsletter';

export type Provenance = 'authored' | 'generated' | 'vendored';

/**
 * Occurrence selector — surfaces an accompaniment on concrete dates (§7.6).
 *
 * `value` grammar by kind:
 *  - `date`       ISO date, e.g. "2026-08-07"
 *  - `temporal`   DO week key (moveable feast), e.g. "Pasc0-2"
 *  - `sancti`     MM-DD (immovable feast), e.g. "08-15"
 *  - `season`     season name, e.g. "Lent"
 *  - `theme`      free-form tag (facet, never a day projection)
 *  - `recurrence` rule grammar:
 *      `weekly:<0-6>`            every week on that weekday (0 = Sunday),
 *                                e.g. every-Wednesday class = "weekly:3"
 *      `nth-weekday:<n>:<0-6>`   nth weekday of each month (n = 1-5),
 *                                e.g. First Friday = "nth-weekday:1:5"
 */
export interface OccurrenceSelector {
  id: string;
  accompanimentId: string;
  kind: 'date' | 'temporal' | 'sancti' | 'season' | 'theme' | 'recurrence';
  value: string;
}

export interface Accompaniment {
  id: string;
  deviceId: string;
  updatedAt: string;
  /** Tombstone — deletes never remove rows; lists filter `deleted_at IS NULL`. */
  deletedAt: string | null;
  title: string;
  /** ProseMirror JSON document. */
  bodyPm: string;
  /** Rendered HTML snapshot (share/print/export). */
  bodyHtml: string;
  /** Node keys ('verse:Gen/1/1', 'section:…') the accompaniment anchors to, or []. */
  anchors: string[];
  exposure: Exposure;
  provenance: Provenance;
  /** Lightweight highlight fields (annotation migration). */
  quote: string | null;
  /** Aligned counterpart line in the other language — §7.7 dual-pane highlight. */
  quoteAlt?: string | null;
  color: string | null;
  createdAt: string;
  /** Selector values of kind 'theme', denormalized by the store for convenience. */
  tags: string[];
  selectors: OccurrenceSelector[];
}
