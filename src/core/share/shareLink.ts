/**
 * shareLink — hash-route deep links (§7.6): the address layer shares,
 * widgets, and the companion all target. Routes:
 *   #/verse/<book>/<chapter>[/<verse>]   → BibleView at that position
 *   #/day/<YYYY-MM-DD>                   → reader on that liturgical day
 *   #/section/<path>%23<name>            → liturgical section (source day)
 */

export interface DeepLink {
  view: 'bible' | 'reader' | 'journal' | 'share';
  /** "Gen/1" or "Gen/1/5" for bible; undefined otherwise. */
  verseRef?: string;
  /** ISO date for day links. */
  date?: string;
  /** "section:<path>#<name>" node key for section links. */
  sectionKey?: string;
  /** Accompaniment ID for journal deep links. */
  accId?: string;
  /** Decoded share payload for `#/s/…` landing links. */
  share?: SharePayload;
}

/**
 * Share-passage landing (operator directive 2026-08-16): a shared link opens
 * a standalone landing page — the excerpt as a souvenir plaque, an
 * invitation, a link into the app, and the store badges — NOT the raw app.
 * `dest` is the app hash route the landing's CTA opens.
 */
export interface SharePayload {
  quote: string;
  quoteAlt?: string;
  /** Section / book title for the attribution line. */
  title?: string;
  /** Source path or citation line for the attribution. */
  source?: string;
  /** App hash route the CTA opens ('#/day/…', '#/verse/…', …). */
  dest: string;
}

const b64urlEncode = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64urlDecode = (s: string): string => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function encodeShare(p: SharePayload): string {
  return b64urlEncode(JSON.stringify(p));
}

export function decodeShare(s: string): SharePayload | null {
  try {
    const p = JSON.parse(b64urlDecode(s)) as SharePayload;
    return typeof p?.quote === 'string' && typeof p?.dest === 'string' ? p : null;
  } catch {
    return null;
  }
}

/** Landing hash for sharing a passage: `#/s/<base64url(payload)>`. */
export function shareLandingHash(p: SharePayload): string {
  return `#/s/${encodeShare(p)}`;
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
  m = h.match(/^\/s\/([A-Za-z0-9_-]+)$/);
  if (m) {
    const share = decodeShare(m[1]);
    if (share) return { view: 'share', share };
  }
  return null;
}

export function verseHash(book: string, chapter: number, verse?: number): string {
  return verse ? `#/verse/${book}/${chapter}/${verse}` : `#/verse/${book}/${chapter}`;
}

/** Absolute share URL for a deep link (the deployed web app resolves it). */
export function shareUrl(hash: string): string {
  return `${location.origin}${location.pathname}${hash}`;
}
