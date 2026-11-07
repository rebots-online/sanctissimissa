/**
 * L.6 §2.6 — network cost and metered-download consent (BA.7; shared with the
 * L.4 ModelPreloader). Consent is persisted per group in the sidecar as
 * `downloads.metered.<group>` = '1' and is never revoked this phase.
 *
 * The Network Information API is not in every engine (desktop WebKitGTK lacks
 * it): absence is unmetered.
 * see DOCS/sdk/network-information/mdn-network-information-api.md
 * see DOCS/sdk/network-information/mdn-networkinformation-savedata.md
 * see DOCS/sdk/network-information/mdn-networkinformation-type.md
 * see DOCS/sdk/network-information/mdn-networkinformation-effectivetype.md
 */

import type { SidecarDb } from '../accompaniment/store.ts';

export type NetworkCost = 'unmetered' | 'metered'; // Closed set, Phase L
export type DownloadGroup = 'voice' | 'embed-models'; // Closed set, Phase L

/** The structural slice of `NetworkInformation` this module reads (not in lib.dom). */
interface ConnectionLike extends EventTarget {
  saveData?: boolean;
  type?: string;
  effectiveType?: string;
}

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g', '3g']);

function connection(): ConnectionLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { connection?: ConnectionLike }).connection ?? null;
}

export function networkCost(): NetworkCost {
  const c = connection();
  if (!c) return 'unmetered';
  if (c.saveData === true || c.type === 'cellular' || SLOW_EFFECTIVE_TYPES.has(c.effectiveType ?? '')) {
    return 'metered';
  }
  return 'unmetered';
}

/** The name ModelPreloader (BA.13) consumes. */
export function isMetered(): boolean { return networkCost() === 'metered'; }

/** Subscribes to `navigator.connection`'s `change` event; a no-op unsubscribe when absent. */
export function onNetworkCostChange(cb: (c: NetworkCost) => void): () => void {
  const c = connection();
  if (!c || typeof c.addEventListener !== 'function') return () => undefined;
  const handler = () => cb(networkCost());
  c.addEventListener('change', handler);
  return () => c.removeEventListener('change', handler);
}

const consentKey = (group: DownloadGroup) => `downloads.metered.${group}`;

export function mayDownload(sidecar: SidecarDb | null, group: DownloadGroup): boolean {
  return networkCost() === 'unmetered' || sidecar?.getSetting(consentKey(group)) === '1';
}

export async function grantMeteredConsent(sidecar: SidecarDb | null, group: DownloadGroup): Promise<void> {
  if (!sidecar) return;
  sidecar.setSetting(consentKey(group), '1');
  await sidecar.persist();
}
