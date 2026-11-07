/**
 * Commerce types (Closed sets, Phase L) — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.2.
 * Each type name is defined once under src/.
 */

/** Closed set, Phase L. */ export type AccessKind = 'free' | 'owned' | 'subscription' | 'locked' | 'unavailable';
export interface AccessState { state: AccessKind; expiresAt: string | null; source: 'live' | 'cache' | 'none' }
/** Closed set, Phase L. */ export type CommerceChannel = 'web' | 'play';
/** Closed set, Phase L. */ export type OfferKind = 'lifetime' | 'subscription';
/** `id` = `<offeringId>/<packageId>`. */
export interface PurchaseOffer { id: string; title: string; priceText: string; currency: string; kind: OfferKind; terms: string; productId: string }
export interface StorePackage {
  offeringId: string; packageId: string; productId: string; title: string;
  priceText: string; currency: string; amountMicros: number; productType: 'non_subscription' | 'subscription'; period: string | null;
}
export interface EntitlementGrant { entitlementId: string; isActive: boolean; grantedAt: string; expiresAt: string | null; productId: string; store: string }
/** Closed set, Phase L. */ export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending';
/** Closed set, Phase L. */ export type CommerceErrorCode = 'NOT_CONFIGURED' | 'NETWORK' | 'STORE_PROBLEM'
  | 'PURCHASE_NOT_ALLOWED' | 'PRODUCT_UNAVAILABLE' | 'ALREADY_OWNED' | 'PAYMENT_PENDING' | 'CONFIGURATION' | 'UNKNOWN';

/** `message` = the SDK's message, for diagnostics only — never rendered raw (render COMMERCE_MESSAGES[code]). */
export class CommerceError extends Error {
  code: CommerceErrorCode;
  constructor(code: CommerceErrorCode, message: string) {
    super(message);
    this.name = 'CommerceError';
    this.code = code;
  }
}

/** Closed set of implementations, Phase L: Web (web.ts), Play (play.ts). */
export interface CommerceAdapter {
  readonly channel: CommerceChannel;
  /** Idempotent; switches user when already configured. */
  configure(appUserId: string): Promise<void>;
  /** `[]` when the offering is absent. */
  packages(offeringId: string): Promise<StorePackage[]>;
  purchase(pkg: StorePackage): Promise<{ outcome: PurchaseOutcome; grants: EntitlementGrant[] | null }>;
  /** Authoritative full set (active and inactive). */
  customerInfo(): Promise<EntitlementGrant[]>;
  restore(): Promise<EntitlementGrant[]>;
}

const PENDING_MESSAGE = 'Payment pending — access unlocks when the store confirms it.';
const UNAVAILABLE_MESSAGE = 'Purchases are unavailable in this build.';

/** User-facing `#purchase-status` sentences (Closed set, Phase L). `cancelled` has no message. */
export const COMMERCE_MESSAGES: Record<CommerceErrorCode | 'pending', string> = {
  NETWORK: "No connection — try again when you're online.",
  STORE_PROBLEM: 'The store had a problem completing this. Nothing was charged; try again.',
  PURCHASE_NOT_ALLOWED: 'Purchases are not allowed on this device or account.',
  PRODUCT_UNAVAILABLE: "This edition isn't available in your store right now.",
  ALREADY_OWNED: 'You already own this — restoring your purchase.',
  pending: PENDING_MESSAGE,
  PAYMENT_PENDING: PENDING_MESSAGE,
  CONFIGURATION: UNAVAILABLE_MESSAGE,
  NOT_CONFIGURED: UNAVAILABLE_MESSAGE,
  UNKNOWN: 'Something went wrong; nothing was unlocked. Try again.',
};
