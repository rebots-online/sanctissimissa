/**
 * Commerce identifiers (Closed set, Phase L) — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.1.
 * The only file under src/ that spells store product ids.
 */
export const COMMERCE_NAMESPACE = 'mba.robin.sanctissimissa';
export const OFFERING_BOOKSTORE = 'bookstore';                 // RC offering ofrngbbf1e4e25b
export const ENTITLEMENT_SUBSCRIPTION = 'study_library_all';  // RC entl49003aa9c5
/** Closed set, Phase L — from content/library/commerce.seed.json products[kind=subscription]. */
export const SUBSCRIPTION_PRODUCT_IDS = [
  'mba.robin.sanctissimissa.sub.study_library_all_monthly',   // P1M, RC prod4508cf8d27
  'mba.robin.sanctissimissa.sub.study_library_all_annual',    // P1Y, RC prod25cabf4437
] as const;
/** Closed set, Phase L — the only edition sold in this release. */
export const SELLABLE_EDITION_IDS = ['catena-aurea-en'] as const;
export const editionEntitlementId = (editionId: string) => `reference_${editionId}`;
export const editionProductId = (editionId: string) => `${COMMERCE_NAMESPACE}.iap.book.${editionId}`;
/** Play subscription ids arrive as `<productId>:<basePlanId>`; compare the part before ':'. */
export const baseProductId = (storeProductId: string) => storeProductId.split(':')[0];
export { RESERVED_FREE_EDITION_IDS, isReservedFreeEdition } from '../library/catalogue.ts';
/** Closed set, Phase L — commentary source id → edition id. */
export const COMMENTARY_SOURCE_EDITION = { haydock: 'haydock-1883-en', 'catena-aurea': 'catena-aurea-en' } as const;
export const WORLDWIDE_TERRITORY = '*';
export const SUBSCRIPTION_OFFLINE_GRACE_MS = 259_200_000;     // 72 h
export const SETTING_BOOKSTORE_TAB = 'bookstore.tab';
export const SETTING_ENTITLEMENT_CACHE = 'entitlements.cache.v1';
export const libraryProgressKey = (editionId: string) => `library.progress.${editionId}`;
