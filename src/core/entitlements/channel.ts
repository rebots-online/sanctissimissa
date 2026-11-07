/** Commerce channel and key configuration — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.6. */
import { isTauri } from '../data/loadCorpus.ts';
import type { CommerceChannel } from './types.ts';

export function commerceChannel(): CommerceChannel {
  return isTauri() && /Android/i.test(navigator.userAgent) ? 'play' : 'web';
}

/** Non-empty and not an unexpanded `$REF` — same rule as `buildIdentity` (src/core/chat/resolve.ts:137). */
export function isCommerceConfigured(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && !key.startsWith('$');
}

export function commerceKey(channel: CommerceChannel): unknown {
  return channel === 'play'
    ? import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY
    : import.meta.env.VITE_REVENUECAT_API_KEY;
}
