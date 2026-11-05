/**
 * SK.3 (§K.1) — the credit client: browser-side half of the BK.1 endpoints.
 *
 * States are honest and exhaustive (authRequired / unconfigured / noCredits /
 * network / server) — the client never fabricates credits or fakes success.
 * The base URL comes from `VITE_BILLING_BASE`: empty ⇒ same-origin (the app
 * deployed beside the Netlify functions); surge-hosted builds set the
 * absolute function URL. Fetch is injectable so tests run with fakes.
 *
 * `creditReaderFromEnv` adapts this client to SK.1's `CreditReader` seam —
 * App passes it to AccountProvider so creditUnits flow through the account
 * state the SK.4 gate reads.
 */

import type { CreditReader } from '../account/useAccount.ts';

/** One billing ledger row (mirrors the server shape structurally). */
export interface CreditTx {
  kind: string;
  unitsCents: number;
  at: string;
  note?: string;
}

export type AccessResult =
  | { ok: true; creditUnits: number; transactions: CreditTx[] }
  | { ok: false; reason: 'authRequired' | 'unconfigured' | 'network' | 'server'; message: string | null };

export type MintResult =
  | { ok: true; key: string; expiresAt: string }
  | { ok: false; reason: 'authRequired' | 'unconfigured' | 'noCredits' | 'network' | 'server'; message: string | null };

export type RedeemResult =
  | { ok: true; creditUnits: number }
  | { ok: false; reason: 'authRequired' | 'unconfigured' | 'badCode' | 'usedCode' | 'network' | 'server'; message: string | null };

export interface ClientOpts {
  /** Override the configured base (tests). */
  base?: string;
  /** Injected fetch (tests). */
  fetchImpl?: typeof fetch;
}

/** `import.meta.env` is absent under the Node test runner — read defensively. */
function envOf(env?: Record<string, string | undefined>): Record<string, string | undefined> {
  return env ?? (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
}

/** Billing endpoint base: '' ⇒ same-origin; `VITE_BILLING_BASE` for remote hosting. */
export function billingBase(env?: Record<string, string | undefined>, override?: string): string {
  const raw = override ?? envOf(env).VITE_BILLING_BASE ?? '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

interface FailureBody {
  error?: string;
  message?: string;
}

/** One request → parsed body or an authored failure reason. */
async function callApi<T extends { ok: true } | { ok: false; reason: string; message: string | null }>(
  path: string,
  init: RequestInit,
  opts: ClientOpts,
  map: (status: number, body: FailureBody | null) => { ok: false } | null,
): Promise<T> {
  const base = billingBase(undefined, opts.base);
  let res: Response;
  try {
    res = await (opts.fetchImpl ?? fetch)(`${base}${path}`, init);
  } catch {
    return { ok: false, reason: 'network', message: 'The billing service can’t be reached — check your connection.' } as T;
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const failure = map(res.status, (body as FailureBody | null));
    return failure as T;
  }
  // The server's 200 bodies carry only the payload (no ok flag) — stamp the
  // success discriminant so the authored result shapes hold at every call site.
  return { ok: true, ...((body ?? {}) as Record<string, unknown>) } as T;
}

/** GET /billing/access → `{ creditUnits, transactions }` for this account. */
export async function readAccess(token: string, opts: ClientOpts = {}): Promise<AccessResult> {
  return callApi<AccessResult>('/billing/access', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }, opts, (status, body) => {
    if (status === 401) return { ok: false, reason: 'authRequired', message: body?.message ?? 'Sign in to view your credits.' };
    if (status === 503) return { ok: false, reason: 'unconfigured', message: body?.message ?? 'Billing isn’t configured on this deployment yet.' };
    return { ok: false, reason: 'server', message: body?.message ?? 'The billing service answered with an error — try again in a moment.' };
  });
}

/** POST /billing/key → mint a per-user hosted key `{ key, expiresAt }` (60 s). */
export async function mintKey(token: string, opts: ClientOpts = {}): Promise<MintResult> {
  return callApi<MintResult>('/billing/key', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }, opts, (status, body) => {
    if (status === 401) return { ok: false, reason: 'authRequired', message: body?.message ?? 'Sign in to use hosted chat.' };
    if (status === 402) return { ok: false, reason: 'noCredits', message: body?.message ?? 'No hosted Sacristan credits remain on this account — top up in Account.' };
    if (status === 503) return { ok: false, reason: 'unconfigured', message: body?.message ?? 'Billing isn’t configured on this deployment yet.' };
    return { ok: false, reason: 'server', message: body?.message ?? 'The hosted-Sacristan key couldn’t be minted — try again in a moment.' };
  });
}

/** POST /billing/redeem → apply an admin/voucher code to this account. */
export async function redeemCode(token: string, code: string, opts: ClientOpts = {}): Promise<RedeemResult> {
  return callApi<RedeemResult>('/billing/redeem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  }, opts, (status, body) => {
    if (status === 401) return { ok: false, reason: 'authRequired', message: body?.message ?? 'Sign in to redeem codes.' };
    if (status === 404) return { ok: false, reason: 'badCode', message: body?.message ?? 'That code isn’t recognized.' };
    if (status === 409) return { ok: false, reason: 'usedCode', message: body?.message ?? 'That code has already been used.' };
    if (status === 503) return { ok: false, reason: 'unconfigured', message: body?.message ?? 'Billing isn’t configured on this deployment yet.' };
    return { ok: false, reason: 'server', message: body?.message ?? 'The code couldn’t be applied — try again in a moment.' };
  });
}

/**
 * SK.1's `CreditReader` over this client: fresh ID token in, remaining credit
 * units out; null on any failure (the account state stays honest — never a
 * fabricated balance).
 */
export function creditReaderFromEnv(opts: ClientOpts = {}): CreditReader {
  return async (idToken) => {
    const result = await readAccess(idToken, opts);
    return result.ok ? result.creditUnits : null;
  };
}
