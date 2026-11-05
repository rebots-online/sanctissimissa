/**
 * BK.1 — POST /billing/key (§K.1).
 * Verifies the Firebase ID token, reads the account's remaining credits, and
 * mints a per-user OpenRouter key limited to 40% (BILLING_ALLOCATION_BPS
 * default) of that remainder with a 60 s expiry. Real deps wire lazily via
 * billing-admin.mts; tests inject fakes through createKeyHandler in
 * billing-core.mts.
 */
import { createKeyHandler } from './billing-core.mts';

export default async (req: Request): Promise<Response> => {
  const { realBillingDeps } = await import('./billing-admin.mts');
  return createKeyHandler(await realBillingDeps())(req);
};

export const config = { path: '/billing/key' };
