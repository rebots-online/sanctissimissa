/** Store territory for the rights gate — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.5. */
export function currentTerritory(): string {
  let region = '';
  try {
    region = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale).region ?? '';
  } catch {
    region = '';
  }
  const upper = region.toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : 'ZZ';
}
