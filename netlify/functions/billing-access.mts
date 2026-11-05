/**
 * BK.1 — GET /billing/access (§K.1).
 * Returns `{ creditUnits, transactions }` for the verified uid, reading the
 * account's Firestore billing doc. Real deps wire lazily via
 * billing-admin.mts; tests inject fakes through createAccessHandler.
 */
import { createAccessHandler } from './billing-core.mts';

export default async (req: Request): Promise<Response> => {
  const { realBillingDeps } = await import('./billing-admin.mts');
  return createAccessHandler(await realBillingDeps())(req);
};

export const config = { path: '/billing/access' };
