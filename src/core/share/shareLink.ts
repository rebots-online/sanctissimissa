/**
 * shareLink — hash-route deep links (§7.6): the address layer shares,
 * widgets, and the companion all target. Routes:
 *   #/verse/<book>/<chapter>[/<verse>]   → BibleView at that position
 *   #/day/<YYYY-MM-DD>                   → reader on that liturgical day
 *   #/section/<path>%23<name>            → liturgical section (source day)
 */

export interface DeepLink {
  view: 'bible' | 'reader' | 'journal';
  /** "Gen/1" or "Gen/1/5" for bible; undefined otherwise. */
  verseRef?: string;
  /** ISO date for day links. */
  date?: string;
  /** "section:<path>#<name>" node key for section links. */
  sectionKey?: string;
  /** Accompaniment ID for journal deep links. */
  accId?: string;
}

export function parseHashRoute(hash: string): DeepLink | null {
  const h = decodeURIComponent(hash.replace(/^#/, ''));
  let m = h.match(/^\/verse\/([A-Za-z0-9]+)\/(\d+)(?:\/(\d+))?$/);
  if (m) return { view: 'bible', verseRef: m[3] ? `${m[1]}/${m[2]}/${m[3]}` : `${m[1]}/${m[2]}` };
  m = h.match(/^\/day\/(\d{4}-\d{2}-\d{2})$/);
  if (m) return { view: 'reader', date: m[1] };
  m = h.match(/^\/section\/(.+)$/);
  if (m) return { view: 'reader', sectionKey: `section:${m[1]}` };
  m = h.match(/^\/acc\/([A-Za-z0-9-]+)$/);
  if (m) return { view: 'journal', accId: m[1] };
  return null;
}

export function verseHash(book: string, chapter: number, verse?: number): string {
  return verse ? `#/verse/${book}/${chapter}/${verse}` : `#/verse/${book}/${chapter}`;
}

/** Absolute share URL for a deep link (the deployed web app resolves it). */
export function shareUrl(hash: string): string {
  return `${location.origin}${location.pathname}${hash}`;
}
