/** React binding for EntitlementController — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §4.1. */
import { useSyncExternalStore } from 'react';
import type { EntitlementController } from './index.ts';
import { commerceController, subscribeCommerce } from './service.ts';
import type { AccessState } from './types.ts';

export type { AccessState } from './types.ts';

const NO_COMMERCE: AccessState = { state: 'unavailable', expiresAt: null, source: 'none' };

/**
 * `useEntitlement(editionId, controller)` per BA.3. The controller argument may be omitted
 * (BA.8's consumed form `useEntitlement(editionId)`): the app singleton from getCommerce is
 * then used, reading `unavailable` until AppShell has created it.
 */
export function useEntitlement(editionId: string, controller?: EntitlementController): AccessState {
  return useSyncExternalStore(
    controller ? controller.subscribe : subscribeCommerce,
    () => (controller ?? commerceController())?.accessFor(editionId) ?? NO_COMMERCE,
  );
}
