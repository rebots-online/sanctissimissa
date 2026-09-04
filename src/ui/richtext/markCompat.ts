/**
 * Legacy-content compatibility for the TipTap → CKEditor migration.
 *
 * TipTap's Highlight extension emitted bare `<mark>` elements; CKEditor's
 * Highlight feature only recognises `<mark class="marker-*">`. Normalizing at
 * load keeps old highlights visible and round-trippable. Marks that already
 * carry a class (newer saves) pass through untouched.
 */

const BARE_MARK = /<mark(?![^>]*\bclass=)[^>]*>/gi;

export function normalizeLegacyHtml(html: string): string {
  if (!html) return html;
  return html.replace(BARE_MARK, '<mark class="marker-yellow">');
}
