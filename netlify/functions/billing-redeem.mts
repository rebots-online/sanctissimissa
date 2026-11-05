/**
 * SK.3 — POST /billing/redeem (§K.1, admin code path per natally-v2).
 * Verifies the Firebase ID token, applies the code in a Firestore transaction
 * (single-use enforcement + creditUnits increment + ledger row). Real deps
 * wire lazily via billing-admin.mts.
 */
import { createRedeemHandler } from './billing-core.mts';

export default async (req: Request): Promise<Response> => {
  const { realBillingDeps } = await import('./billing-admin.mts');
  return createRedeemHandler(await realBillingDeps())(req);
};

export const config = { path: '/billing/redeem' };
