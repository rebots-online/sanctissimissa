/**
 * Ecclesiastical Latin normalization — the universal search-time transform.
 *
 * Every text string entering any search path (FTS5, vector, concept graph,
 * LLM-issued query) passes through this function. Lowercases, maps liturgical
 * ligatures (æ→ae, ǽ→ae, œ→oe), strips combining diacritics via NFD, and
 * collapses non-letters to spaces. The original text is never mutated — only
 * the indexed/query form is normalized.
 */

/** Lowercase, strip diacritics (ǽ→ae æ→ae œ→oe), collapse non-letters to spaces. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[æǽ]/g, 'ae')
    .replace(/[œ]/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}
