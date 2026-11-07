/**
 * Android Play commerce adapter (§L.3; L-bookstore-commerce-20261106.md §2.7, §4.1).
 *
 * Bridges `CommerceAdapter` to the five Tauri app commands in
 * `src-tauri/src/commerce.rs`, which forward to the Kotlin `CommercePlugin`
 * (RevenueCat purchases-android over Play Billing). BA.3's `service.ts`
 * discovers this file through `import.meta.glob('./play.ts')` and constructs it
 * only on the `play` channel with a configured `VITE_REVENUECAT_ANDROID_API_KEY`.
 *
 * Every native rejection is a string `"<CODE>: <message>"`; the code is mapped
 * into the closed `CommerceErrorCode` set, anything else → `UNKNOWN`.
 * Play subscription product ids arrive as `<productId>:<basePlanId>` and are
 * passed through unchanged (BA.3's `baseProductId` compares).
 * see DOCS/sdk/tauri-plugins-ipc/calling-rust.md
 */
import {
  CommerceError,
  type CommerceAdapter,
  type CommerceErrorCode,
  type EntitlementGrant,
  type PurchaseOutcome,
  type StorePackage,
} from './types.ts';

const ERROR_CODES: readonly CommerceErrorCode[] = [
  'NOT_CONFIGURED',
  'NETWORK',
  'STORE_PROBLEM',
  'PURCHASE_NOT_ALLOWED',
  'PRODUCT_UNAVAILABLE',
  'ALREADY_OWNED',
  'PAYMENT_PENDING',
  'CONFIGURATION',
  'UNKNOWN',
];

const REJECTION_RE = /^([A-Z_]+): ([\s\S]*)$/;

/** Native package row (the Kotlin `offers` resolve, minus `offeringId`). */
type NativePackage = Omit<StorePackage, 'offeringId'>;

/** Native `CI` shape (Kotlin `restore` / `customerInfo`, and `purchase.customerInfo`). */
interface NativeCustomerInfo {
  appUserId: string;
  requestDate: string;
  entitlements: EntitlementGrant[];
}

/** Map a native rejection `"<CODE>: <message>"` into the closed `CommerceErrorCode` set. */
function toCommerceError(raw: unknown): CommerceError {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw);
  const m = REJECTION_RE.exec(text);
  if (m && (ERROR_CODES as readonly string[]).includes(m[1])) {
    return new CommerceError(m[1] as CommerceErrorCode, m[2]);
  }
  return new CommerceError('UNKNOWN', m ? m[2] : text);
}

/** `invoke` is loaded lazily (same pattern as `SidecarDb.persist`). */
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    throw toCommerceError(err);
  }
}

export class PlayPurchaseAdapter implements CommerceAdapter {
  readonly channel = 'play' as const;
  // Explicit field instead of a parameter property: tsconfig `erasableSyntaxOnly`.
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Idempotent: the first call configures the SDK, later calls switch user (logIn). */
  async configure(appUserId: string): Promise<void> {
    await call<{ configured: boolean; appUserId: string }>('commerce_configure', {
      apiKey: this.apiKey,
      appUserId,
    });
  }

  /** `[]` when the offering is absent in RevenueCat / Play (OP.1 pending). */
  async packages(offeringId: string): Promise<StorePackage[]> {
    const res = await call<{ offeringId: string; packages: NativePackage[] }>('commerce_offers', { offeringId });
    return res.packages.map((p) => ({ ...p, offeringId: res.offeringId }));
  }

  /** Play Billing supplies the sheet (Play balance / gift cards natively). */
  async purchase(pkg: StorePackage): Promise<{ outcome: PurchaseOutcome; grants: EntitlementGrant[] | null }> {
    const res = await call<{ outcome: PurchaseOutcome; customerInfo: NativeCustomerInfo | null }>(
      'commerce_purchase',
      { offeringId: pkg.offeringId, packageId: pkg.packageId },
    );
    return { outcome: res.outcome, grants: res.customerInfo ? res.customerInfo.entitlements : null };
  }

  async customerInfo(): Promise<EntitlementGrant[]> {
    return (await call<NativeCustomerInfo>('commerce_customer_info')).entitlements;
  }

  async restore(): Promise<EntitlementGrant[]> {
    return (await call<NativeCustomerInfo>('commerce_restore')).entitlements;
  }
}
