/**
 * App-lifetime commerce singleton (first sidecar wins)
 * — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §3 F1, §4.1.
 */
import type { SidecarDb } from '../accompaniment/store.ts';
import { loadEditions } from '../library/editions.ts';
import { EntitlementCache } from './cache.ts';
import { commerceChannel, commerceKey, isCommerceConfigured } from './channel.ts';
import { EntitlementController } from './index.ts';
import { PurchaseController } from './purchases.ts';
import { currentTerritory } from './territory.ts';
import type { CommerceAdapter, CommerceChannel } from './types.ts';
import { WebPurchaseAdapter } from './web.ts';

/** BA.4's Play adapter; absent file → empty glob → adapter null → paid editions `unavailable`, no crash. */
const playModules = import.meta.glob<{ PlayPurchaseAdapter: new (apiKey: string) => CommerceAdapter }>('./play.ts', { eager: true });

let currentEmail: string | null = null;
export function setCommerceEmail(email: string | null): void {
  currentEmail = email;
}

export interface Commerce {
  entitlements: EntitlementController;
  purchases: PurchaseController;
  channel: CommerceChannel;
}

let instance: Commerce | null = null;
/** Listeners registered before/after the singleton exists (useEntitlement without an explicit controller). */
const listeners = new Set<() => void>();
const fanOut = (): void => { for (const l of listeners) { try { l(); } catch { /* listener faults stay local */ } } };

/** The singleton's controller, or null before AppShell has a sidecar. */
export function commerceController(): EntitlementController | null {
  return instance?.entitlements ?? null;
}
export function subscribeCommerce(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

function makeAdapter(channel: CommerceChannel): CommerceAdapter | null {
  const key = commerceKey(channel);
  if (!isCommerceConfigured(key)) return null;
  if (channel === 'web') return new WebPurchaseAdapter(key, () => currentEmail);
  const Play = Object.values(playModules)[0]?.PlayPurchaseAdapter;
  return Play ? new Play(key) : null;
}

export function getCommerce(sidecar: SidecarDb): Commerce {
  if (instance) return instance;
  const channel = commerceChannel();
  const adapter = makeAdapter(channel);
  const cache = new EntitlementCache(sidecar);
  const entitlements = new EntitlementController({ adapter, cache, editions: loadEditions(), territory: currentTerritory });
  const purchases = new PurchaseController({ adapter, entitlements, cache, currentUid: () => entitlements.uid });
  instance = { entitlements, purchases, channel };
  entitlements.subscribe(fanOut);
  fanOut();
  return instance;
}
