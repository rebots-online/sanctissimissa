/**
 * Bookstore pure state (BA.5; L-bookstore-commerce-20261106.md §4.2 coverClass
 * rule, §4.4 state table, #state-filter mapping). No React, no I/O.
 */
import type { AccessKind, PurchaseOffer } from '../../core/entitlements/types.ts';
import type { CatalogueWork } from '../../core/library/types.ts';

/** Lower-case, accent-stripped, whitespace-collapsed (same rule as catalogue.ts). */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Closed set, Phase L — the 8 export cover classes in rule order. */
const COVER_CLASSES = [
  'cover-haydock', 'cover-aquinas', 'cover-sales', 'cover-kempis',
  'cover-alphonsus', 'cover-cochem', 'cover-raccolta', 'cover-baltimore',
] as const;

const AUTHOR_COVERS: readonly [string, string][] = [
  ['haydock', 'cover-haydock'],
  ['aquinas', 'cover-aquinas'],
  ['francis de sales', 'cover-sales'],
  ['kempis', 'cover-kempis'],
  ['liguori', 'cover-alphonsus'],
  ['cochem', 'cover-cochem'],
];
const TITLE_COVERS: readonly [string, string][] = [
  ['raccolta', 'cover-raccolta'],
  ['baltimore', 'cover-baltimore'],
];

export function coverClass(work: Pick<CatalogueWork, 'author' | 'title' | 'catalogueId'>): string {
  const author = fold(work.author);
  for (const [needle, cls] of AUTHOR_COVERS) if (author.includes(needle)) return cls;
  const title = fold(work.title);
  for (const [needle, cls] of TITLE_COVERS) if (title.includes(needle)) return cls;
  const n = Number(work.catalogueId.slice(1));
  return COVER_CLASSES[(Number.isFinite(n) ? n : 0) % COVER_CLASSES.length];
}

export interface Badge { text: string; className: string }

/** §4.4 badge column (Closed set, Phase L). */
export function badgeFor(state: AccessKind): Badge {
  switch (state) {
    case 'free': return { text: 'Free included', className: 'badge-free-included' };
    case 'owned': return { text: 'Owned', className: 'badge-owned' };
    case 'subscription': return { text: 'Subscription access', className: 'badge-owned' };
    case 'locked': return { text: 'Available', className: 'badge-available' };
    default: return { text: 'Edition review', className: 'badge-edition-review' };
  }
}

export type PrimaryKind = 'read' | 'sign-in' | 'buy' | 'none';
export interface PrimaryAction { kind: PrimaryKind; label: string; disabled: boolean }

export interface PrimaryInput {
  state: AccessKind;
  signedIn: boolean;
  offers: readonly PurchaseOffer[] | null;
  selected: PurchaseOffer | null;
  purchasing: boolean;
  installing: boolean;
}

/** §4.4 `#primary-action-btn` column (Closed set, Phase L). */
export function primaryAction(i: PrimaryInput): PrimaryAction {
  if (i.purchasing) return { kind: 'none', label: 'Opening checkout…', disabled: true };
  switch (i.state) {
    case 'free':
    case 'owned':
    case 'subscription':
      return i.installing
        ? { kind: 'none', label: 'Downloading…', disabled: true }
        : { kind: 'read', label: 'Read', disabled: false };
    case 'locked': {
      if (!i.signedIn) return { kind: 'sign-in', label: 'Sign in to buy', disabled: false };
      const offer = i.selected ?? i.offers?.[0] ?? null;
      if (i.offers === null || !offer) return { kind: 'none', label: 'Loading price…', disabled: true };
      return { kind: 'buy', label: `Buy · ${offer.priceText}`, disabled: false };
    }
    default:
      return { kind: 'none', label: 'Purchases unavailable', disabled: true };
  }
}

/** Closed set, Phase L — the export's 4 `#state-filter` options. */
export type StateFilter = 'all' | 'free' | 'owned' | 'review';

export function matchesStateFilter(state: AccessKind, filter: StateFilter): boolean {
  switch (filter) {
    case 'free': return state === 'free';
    case 'owned': return state === 'owned' || state === 'subscription';
    case 'review': return state === 'unavailable';
    default: return true;
  }
}

/** `#modal-plan-price` suffix: lifetime one-time, monthly or annual subscription. */
export function planPriceText(offer: PurchaseOffer): string {
  if (offer.kind === 'lifetime') return `${offer.priceText} · one-time`;
  return /annual/i.test(offer.productId) ? `${offer.priceText} · per year` : `${offer.priceText} · per month`;
}
