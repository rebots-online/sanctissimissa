/**
 * sanitizeHtml — the render-boundary guard for stored rich-text HTML.
 *
 * Annotation notes are authored through CKEditor (schema-filtered) under
 * LinkPolicy (https:// or internal #/ hrefs only), but the sidecar is built
 * to sync across devices (ARCHITECTURE decision 10) and content modules are
 * built to arrive as downloads (decision 19) — so stored HTML is untrusted at
 * render time no matter how carefully it entered. DOMPurify's default profile
 * keeps everything CKEditor emits (spans with class, figures, img data:-URIs)
 * and strips scripts, event handlers, and javascript:/vbscript: URIs. This is
 * the backstop; LinkPolicy remains the authoring-time gate.
 *
 * Memoized in a small LRU: margin-note callouts re-render on every selection
 * and hover change, and re-sanitizing the same strings each time is wasted
 * work on the reading hot path.
 */

import DOMPurify from 'dompurify';

const CACHE_MAX = 500;
const cache = new Map<string, string>();

export function sanitizeHtml(dirty: string): string {
  const hit = cache.get(dirty);
  if (hit !== undefined) {
    cache.delete(dirty);
    cache.set(dirty, hit);
    return hit;
  }
  const clean = DOMPurify.sanitize(dirty);
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(dirty, clean);
  return clean;
}
