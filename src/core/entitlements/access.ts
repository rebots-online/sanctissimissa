/**
 * Pure access rules (no I/O) — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.2 (offer table)
 * and §2.5 (rights gate).
 */
import { canPublishEdition, isReservedFreeEdition } from '../library/catalogue.ts';
import type { EditionRecord } from '../library/types.ts';
import {
  ENTITLEMENT_SUBSCRIPTION,
  OFFERING_BOOKSTORE,
  SELLABLE_EDITION_IDS,
  SUBSCRIPTION_OFFLINE_GRACE_MS,
  SUBSCRIPTION_PRODUCT_IDS,
  baseProductId,
  editionEntitlementId,
  editionProductId,
} from './ids.ts';
import type { AccessState, EntitlementGrant, OfferKind, PurchaseOffer, StorePackage } from './types.ts';

export interface AccessInput {
  editionId: string;
  edition: EditionRecord | null;
  grants: EntitlementGrant[];
  source: 'live' | 'cache' | 'none';
  signedIn: boolean;
  configured: boolean;
  offers: PurchaseOffer[] | null;
  territory: string;
  now: number;
}

/** Live grants are honoured while active; cached grants also within the offline grace (§2.3 rule 3). */
export function isHonoured(grant: EntitlementGrant, source: 'live' | 'cache' | 'none', now: number): boolean {
  if (!grant.isActive) return false;
  if (source === 'live') return true;
  if (source !== 'cache') return false;
  return grant.expiresAt === null || now < Date.parse(grant.expiresAt) + SUBSCRIPTION_OFFLINE_GRACE_MS;
}

export function computeAccess(i: AccessInput): AccessState {
  if (isReservedFreeEdition(i.editionId)) return { state: 'free', expiresAt: null, source: 'none' };
  const honoured = (id: string) => i.grants.find((g) => g.entitlementId === id && isHonoured(g, i.source, i.now)) ?? null;
  const own = honoured(editionEntitlementId(i.editionId));
  if (own) return { state: 'owned', expiresAt: own.expiresAt, source: i.source };
  if (i.edition && canPublishEdition(i.edition, i.territory)) {
    const sub = honoured(ENTITLEMENT_SUBSCRIPTION);
    if (sub) return { state: 'subscription', expiresAt: sub.expiresAt, source: i.source };
    if (i.configured && (!i.signedIn || i.offers === null || i.offers.length > 0)) {
      return { state: 'locked', expiresAt: null, source: 'none' };
    }
  }
  return { state: 'unavailable', expiresAt: null, source: 'none' };
}

interface OfferRow { productId: string; kind: OfferKind; title: string; terms: string }

/** Offer rows in table order (§2.2); each present only when offering `bookstore` carries it. */
export function offersFromPackages(editionId: string, packages: StorePackage[], rightsOk: boolean): PurchaseOffer[] {
  const rows: OfferRow[] = [];
  if ((SELLABLE_EDITION_IDS as readonly string[]).includes(editionId)) {
    rows.push({ productId: editionProductId(editionId), kind: 'lifetime', title: 'Own this edition', terms: 'One-time purchase · yours to keep' });
  }
  if (rightsOk) {
    rows.push({ productId: SUBSCRIPTION_PRODUCT_IDS[0], kind: 'subscription', title: 'All-Library Access — Monthly', terms: 'Renews monthly · cancel anytime in your store account' });
    rows.push({ productId: SUBSCRIPTION_PRODUCT_IDS[1], kind: 'subscription', title: 'All-Library Access — Annual', terms: 'Renews yearly · cancel anytime in your store account' });
  }
  const offers: PurchaseOffer[] = [];
  for (const row of rows) {
    const pkg = packages.find((p) => p.offeringId === OFFERING_BOOKSTORE && baseProductId(p.productId) === row.productId);
    if (!pkg) continue;
    offers.push({
      id: `${pkg.offeringId}/${pkg.packageId}`,
      title: row.title,
      priceText: pkg.priceText,
      currency: pkg.currency,
      kind: row.kind,
      terms: row.terms,
      productId: pkg.productId,
    });
  }
  return offers;
}
