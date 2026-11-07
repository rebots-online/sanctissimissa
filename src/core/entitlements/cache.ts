/**
 * Offline entitlement cache in sidecar setting `entitlements.cache.v1`
 * — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.3 (finding #21).
 * Honouring (grace window) is computeAccess's rule, not this file's.
 */
import { SETTING_ENTITLEMENT_CACHE } from './ids.ts';
import type { EntitlementGrant } from './types.ts';

export interface SettingStore {
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  persist(): Promise<void>;
}

/** Closed set, Phase L. */ type CacheSource = 'web' | 'play';
interface CachedGrant { entitlementId: string; grantedAt: string; expiresAt: string | null; verifiedAt: string; source: CacheSource }
interface CacheUser { verifiedAt: string; grants: CachedGrant[] }
interface CacheDoc { schemaVersion: 1; users: Record<string, CacheUser> }

function emptyDoc(): CacheDoc {
  return { schemaVersion: 1, users: {} };
}

function isDoc(v: unknown): v is CacheDoc {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as { schemaVersion?: unknown; users?: unknown };
  return d.schemaVersion === 1 && typeof d.users === 'object' && d.users !== null && !Array.isArray(d.users);
}

export class EntitlementCache {
  #store: SettingStore;
  constructor(store: SettingStore) {
    this.#store = store;
  }

  /** Parse; unparseable JSON is preserved verbatim under `.corrupt.<ISO>` and an empty cache starts (rule 5). */
  #load(): CacheDoc {
    const raw = this.#store.getSetting(SETTING_ENTITLEMENT_CACHE);
    if (raw === null) return emptyDoc();
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isDoc(parsed)) return parsed;
    } catch { /* fall through to preservation */ }
    this.#store.setSetting(`${SETTING_ENTITLEMENT_CACHE}.corrupt.${new Date().toISOString()}`, raw);
    const fresh = emptyDoc();
    this.#store.setSetting(SETTING_ENTITLEMENT_CACHE, JSON.stringify(fresh));
    return fresh;
  }

  read(uid: string): EntitlementGrant[] {
    const user = this.#load().users[uid];
    if (!user || !Array.isArray(user.grants)) return [];
    return user.grants.map((g) => ({
      entitlementId: g.entitlementId,
      isActive: true,
      grantedAt: g.grantedAt,
      expiresAt: g.expiresAt,
      productId: '',
      store: g.source,
    }));
  }

  /**
   * Replace `uid`'s grants with the verified response's active grants — absent or inactive
   * grants are removed for that uid only (the only revocation path). Callers never call this
   * on a failure, so failures never change the cache. Other uids are never touched.
   */
  async writeVerified(uid: string, grants: EntitlementGrant[], source: CacheSource): Promise<void> {
    const doc = this.#load();
    const verifiedAt = new Date().toISOString();
    doc.users[uid] = {
      verifiedAt,
      grants: grants
        .filter((g) => g.isActive)
        .map((g) => ({ entitlementId: g.entitlementId, grantedAt: g.grantedAt, expiresAt: g.expiresAt, verifiedAt, source })),
    };
    this.#store.setSetting(SETTING_ENTITLEMENT_CACHE, JSON.stringify(doc));
    await this.#store.persist();
  }
}
