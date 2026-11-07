/**
 * WebPurchaseAdapter — RevenueCat Web Billing via @revenuecat/purchases-js 1.74.0
 * (DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.2, §2.6; §3 F1/F2/F4).
 * The SDK is loaded ONLY by the dynamic import below, so it lives in a lazy chunk.
 * Typings: DOCS/sdk/revenuecat-purchases-js/purchases-js-1.74.0.d.ts.md (line refs = its code block).
 */
import type { CustomerInfo, Package } from '@revenuecat/purchases-js';
import { CommerceError, type CommerceAdapter, type CommerceErrorCode, type EntitlementGrant, type PurchaseOutcome, type StorePackage } from './types.ts';

type Sdk = typeof import('@revenuecat/purchases-js');

let sdkPromise: Promise<Sdk> | null = null;
function sdk(): Promise<Sdk> {
  sdkPromise ??= import('@revenuecat/purchases-js');
  return sdkPromise;
}

/** PurchasesError.errorCode → CommerceErrorCode (§2.2); see DOCS/sdk/revenuecat-purchases-js/purchases-js-1.74.0.d.ts.md §ErrorCode, §PurchasesError (L2064). */
function codeOf(m: Sdk, error: unknown): CommerceErrorCode | 'cancelled' | 'pending' {
  if (!(error instanceof m.PurchasesError)) return 'UNKNOWN';
  switch (error.errorCode) {
    case m.ErrorCode.NetworkError: return 'NETWORK';
    case m.ErrorCode.StoreProblemError: return 'STORE_PROBLEM';
    case m.ErrorCode.PurchaseNotAllowedError: return 'PURCHASE_NOT_ALLOWED';
    case m.ErrorCode.ProductNotAvailableForPurchaseError: return 'PRODUCT_UNAVAILABLE';
    case m.ErrorCode.ProductAlreadyPurchasedError: return 'ALREADY_OWNED';
    case m.ErrorCode.PaymentPendingError: return 'pending';
    case m.ErrorCode.InvalidCredentialsError:
    case m.ErrorCode.ConfigurationError: return 'CONFIGURATION';
    case m.ErrorCode.UserCancelledError: return 'cancelled';
    default: return 'UNKNOWN';
  }
}

/** Outside `purchase`, pending → PAYMENT_PENDING and cancelled → UNKNOWN. */
function toCommerceError(m: Sdk, error: unknown): CommerceError {
  const code = codeOf(m, error);
  const message = error instanceof Error ? error.message : String(error);
  if (code === 'pending') return new CommerceError('PAYMENT_PENDING', message);
  if (code === 'cancelled') return new CommerceError('UNKNOWN', message);
  return new CommerceError(code, message);
}

function toPackage(offeringId: string, p: Package): StorePackage {
  const product = p.webBillingProduct;
  return {
    offeringId,
    packageId: p.identifier,
    productId: product.identifier,
    title: product.title,
    priceText: product.price.formattedPrice,
    currency: product.price.currency,
    amountMicros: product.price.amountMicros,
    productType: product.normalPeriodDuration ? 'subscription' : 'non_subscription',
    period: product.normalPeriodDuration ?? null,
  };
}

/** see DOCS/sdk/revenuecat-purchases-js/purchases-js-1.74.0.d.ts.md §EntitlementInfo (L216), §EntitlementInfos.all (L297). */
function grantsOf(info: CustomerInfo): EntitlementGrant[] {
  return Object.values(info.entitlements.all).map((e) => ({
    entitlementId: e.identifier,
    isActive: e.isActive,
    grantedAt: e.originalPurchaseDate.toISOString(),
    expiresAt: e.expirationDate ? e.expirationDate.toISOString() : null,
    productId: e.productIdentifier,
    store: String(e.store),
  }));
}

export class WebPurchaseAdapter implements CommerceAdapter {
  readonly channel = 'web' as const;
  #apiKey: string;
  #customerEmail: () => string | null;
  #uid: string | null = null;

  constructor(apiKey: string, customerEmail: () => string | null) {
    this.#apiKey = apiKey;
    this.#customerEmail = customerEmail;
  }

  async configure(appUserId: string): Promise<void> {
    const m = await sdk();
    try {
      if (!m.Purchases.isConfigured()) {
        // see DOCS/sdk/revenuecat-purchases-js/configuring-sdk.md §Initialization; d.ts.md §Purchases.configure (L1730)
        m.Purchases.configure({ apiKey: this.#apiKey, appUserId });
      } else if (this.#uid !== appUserId) {
        // see DOCS/sdk/revenuecat-purchases-js/identifying-customers.md §Logging in after configuration; d.ts.md §changeUser (L1902)
        await m.Purchases.getSharedInstance().changeUser(appUserId);
      }
      this.#uid = appUserId;
    } catch (error) {
      throw toCommerceError(m, error);
    }
  }

  async #offeringPackages(m: Sdk, offeringId: string): Promise<Package[]> {
    // see DOCS/sdk/revenuecat-purchases-js/displaying-products.md §Custom Offering identifiers; d.ts.md §getOfferings (L1768), §GetOfferingsParams (L407)
    const offerings = await m.Purchases.getSharedInstance().getOfferings({ offeringIdentifier: offeringId });
    return offerings.all[offeringId]?.availablePackages ?? [];
  }

  async packages(offeringId: string): Promise<StorePackage[]> {
    const m = await sdk();
    try {
      return (await this.#offeringPackages(m, offeringId)).map((p) => toPackage(offeringId, p));
    } catch (error) {
      throw toCommerceError(m, error);
    }
  }

  async purchase(pkg: StorePackage): Promise<{ outcome: PurchaseOutcome; grants: EntitlementGrant[] | null }> {
    const m = await sdk();
    try {
      const rcPackage = (await this.#offeringPackages(m, pkg.offeringId)).find((p) => p.identifier === pkg.packageId);
      if (!rcPackage) throw new CommerceError('PRODUCT_UNAVAILABLE', `package ${pkg.packageId} absent`);
      // see DOCS/sdk/revenuecat-purchases-js/making-purchases.md; d.ts.md §purchase (L1856), §PurchaseParams (L1554), §PurchaseResult
      const result = await m.Purchases.getSharedInstance().purchase({ rcPackage, customerEmail: this.#customerEmail() ?? undefined });
      return { outcome: 'purchased', grants: grantsOf(result.customerInfo) };
    } catch (error) {
      if (error instanceof CommerceError) throw error;
      const code = codeOf(m, error);
      if (code === 'cancelled') return { outcome: 'cancelled', grants: null };
      if (code === 'pending') return { outcome: 'pending', grants: null };
      throw toCommerceError(m, error);
    }
  }

  async customerInfo(): Promise<EntitlementGrant[]> {
    const m = await sdk();
    try {
      // see DOCS/sdk/revenuecat-purchases-js/customer-info.md §Getting subscription status via the SDK; d.ts.md §getCustomerInfo (L1880)
      return grantsOf(await m.Purchases.getSharedInstance().getCustomerInfo());
    } catch (error) {
      throw toCommerceError(m, error);
    }
  }

  /** Web Billing state is server-side per app user id — see DOCS/sdk/revenuecat-purchases-js/restoring-purchases.md §Restore behavior. */
  restore(): Promise<EntitlementGrant[]> {
    return this.customerInfo();
  }
}
