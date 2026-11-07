/**
 * PurchaseController — purchase and restore flows
 * (DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §3 F2/F4/F5).
 * Module install/attach after a purchase is not done here (BA.5's drawer does it).
 */
import type { EntitlementCache } from './cache.ts';
import type { EntitlementController } from './index.ts';
import { CommerceError, type CommerceAdapter, type PurchaseOffer, type PurchaseOutcome } from './types.ts';

export interface PurchaseControllerOptions {
  adapter: CommerceAdapter | null;
  entitlements: EntitlementController;
  cache: EntitlementCache;
  currentUid: () => string | null;
}

export class PurchaseController {
  #adapter: CommerceAdapter | null;
  #entitlements: EntitlementController;
  #cache: EntitlementCache;
  #currentUid: () => string | null;

  constructor(o: PurchaseControllerOptions) {
    this.#adapter = o.adapter;
    this.#entitlements = o.entitlements;
    this.#cache = o.cache;
    this.#currentUid = o.currentUid;
  }

  async offers(editionId: string): Promise<PurchaseOffer[]> {
    let offers = this.#entitlements.offersFor(editionId);
    if (offers === null) {
      await this.#entitlements.refresh();
      offers = this.#entitlements.offersFor(editionId);
    }
    return offers ?? [];
  }

  #ready(): { adapter: CommerceAdapter; uid: string } {
    if (!this.#adapter) throw new CommerceError('NOT_CONFIGURED', 'commerce adapter not configured');
    const uid = this.#currentUid();
    if (uid === null) throw new CommerceError('PURCHASE_NOT_ALLOWED', 'signed out');
    return { adapter: this.#adapter, uid };
  }

  async purchase(offerId: string): Promise<PurchaseOutcome> {
    const { adapter, uid } = this.#ready();
    let packages = this.#entitlements.packages();
    if (packages === null) {
      await this.#entitlements.refresh();
      packages = this.#entitlements.packages();
    }
    const pkg = (packages ?? []).find((p) => `${p.offeringId}/${p.packageId}` === offerId);
    if (!pkg) throw new CommerceError('PRODUCT_UNAVAILABLE', `no package for offer ${offerId}`);
    const { outcome, grants } = await adapter.purchase(pkg);
    if (outcome === 'purchased') {
      if (grants !== null) await this.#cache.writeVerified(uid, grants, adapter.channel);
      await this.#entitlements.refresh();
    }
    return outcome;
  }

  /** F4: restore = authoritative customer state, written to the cache, then a refresh. */
  async restore(): Promise<void> {
    const { adapter, uid } = this.#ready();
    const grants = await adapter.restore();
    await this.#cache.writeVerified(uid, grants, adapter.channel);
    await this.#entitlements.refresh();
  }
}
