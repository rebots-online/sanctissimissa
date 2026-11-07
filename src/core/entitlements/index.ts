/**
 * EntitlementController — the single access authority
 * (DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.3, §2.5, §3 F1/F2).
 */
import { debugEvent } from '../diagnostics/store.ts';
import { canPublishEdition } from '../library/catalogue.ts';
import type { EditionIndex } from '../library/editions.ts';
import { computeAccess, isHonoured, offersFromPackages } from './access.ts';
import type { EntitlementCache } from './cache.ts';
import { OFFERING_BOOKSTORE } from './ids.ts';
import type { AccessState, CommerceAdapter, EntitlementGrant, PurchaseOffer, StorePackage } from './types.ts';

export type RefreshResult = 'verified' | 'cached' | 'signed-out' | 'unconfigured';

export interface EntitlementControllerOptions {
  adapter: CommerceAdapter | null;
  cache: EntitlementCache;
  editions: EditionIndex;
  territory: () => string;
}

export class EntitlementController {
  #adapter: CommerceAdapter | null;
  #cache: EntitlementCache;
  #editions: EditionIndex;
  #territory: () => string;
  #uid: string | null = null;
  #grants: EntitlementGrant[] = [];
  #source: 'live' | 'cache' | 'none' = 'none';
  #packages: StorePackage[] | null = null;
  #version = 0;
  #listeners = new Set<() => void>();
  #memo = new Map<string, AccessState>();
  #memoVersion = -1;
  #configuredUid: string | null = null;

  constructor(o: EntitlementControllerOptions) {
    this.#adapter = o.adapter;
    this.#cache = o.cache;
    this.#editions = o.editions;
    this.#territory = o.territory;
  }

  get signedIn(): boolean { return this.#uid !== null; }
  get configured(): boolean { return this.#adapter !== null; }
  get version(): number { return this.#version; }
  get uid(): string | null { return this.#uid; }

  #notify(): void {
    this.#version++;
    for (const l of this.#listeners) {
      try { l(); } catch { /* a listener cannot break commerce state */ }
    }
  }

  async setUser(uid: string | null): Promise<void> {
    const switched = this.#uid !== uid;
    this.#uid = uid;
    if (switched) {
      // Another user's live grants/offers never carry over (the cache is per uid).
      this.#grants = [];
      this.#source = 'none';
      this.#packages = null;
    }
    if (uid === null) {
      this.#grants = [];
      this.#source = 'none';
      this.#packages = null;
      this.#notify();
      return;
    }
    if (this.#adapter) {
      if (this.#configuredUid !== uid) debugEvent('commerce', 'configure', { channel: this.#adapter.channel });
      try {
        await this.#adapter.configure(uid);
        this.#configuredUid = uid;
      } catch (error) {
        debugEvent('commerce', 'configure.error', { code: (error as { code?: unknown }).code ?? null }, 'warn');
      }
    }
    await this.refresh();
  }

  async refresh(): Promise<RefreshResult> {
    const uid = this.#uid;
    let result: RefreshResult;
    if (!this.#adapter) {
      if (uid !== null) {
        this.#grants = this.#cache.read(uid);
        this.#source = 'cache';
      }
      result = 'unconfigured';
    } else if (uid === null) {
      result = 'signed-out';
    } else {
      const adapter = this.#adapter;
      try {
        const [grants, packages] = await Promise.all([adapter.customerInfo(), adapter.packages(OFFERING_BOOKSTORE)]);
        if (this.#uid !== uid) return 'signed-out';
        await this.#cache.writeVerified(uid, grants, adapter.channel);
        this.#grants = grants;
        this.#packages = packages;
        this.#source = 'live';
        result = 'verified';
      } catch {
        if (this.#uid !== uid) return 'signed-out';
        if (this.#source !== 'live') {
          this.#grants = this.#cache.read(uid);
          this.#source = 'cache';
          this.#packages = null;
        }
        result = 'cached';
      }
    }
    debugEvent('commerce', 'refresh', { result });
    this.#notify();
    return result;
  }

  has(entitlementId: string): boolean {
    const now = Date.now();
    return this.#grants.some((g) => g.entitlementId === entitlementId && isHonoured(g, this.#source, now));
  }

  accessFor(editionId: string): AccessState {
    if (this.#memoVersion !== this.#version) {
      this.#memo.clear();
      this.#memoVersion = this.#version;
    }
    const hit = this.#memo.get(editionId);
    if (hit) return hit;
    const state = computeAccess({
      editionId,
      edition: this.#editions.get(editionId),
      grants: this.#grants,
      source: this.#source,
      signedIn: this.signedIn,
      configured: this.configured,
      offers: this.offersFor(editionId),
      territory: this.#territory(),
      now: Date.now(),
    });
    this.#memo.set(editionId, state);
    return state;
  }

  offersFor(editionId: string): PurchaseOffer[] | null {
    if (this.#packages === null) return null;
    const edition = this.#editions.get(editionId);
    return offersFromPackages(editionId, this.#packages, edition !== null && canPublishEdition(edition, this.#territory()));
  }

  /** The kept package list (null until loaded) — PurchaseController resolves offer ids against it. */
  packages(): StorePackage[] | null {
    return this.#packages;
  }

  subscribe = (l: () => void): (() => void) => {
    this.#listeners.add(l);
    return () => { this.#listeners.delete(l); };
  };
}
