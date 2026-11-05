/**
 * BK.1 (§K.1) — shared core for the Netlify billing functions.
 *
 * Everything testable lives here as factories over injected deps
 * (`verifyIdToken`, `store`, `minter`, `env`) — the checklist's "injected
 * fetch/token-verifier" clause. The `.mts` default-export functions
 * (billing-key.mts / billing-access.mts) wire the real deps via
 * billing-admin.mts (dynamic import so unit tests never load firebase-admin).
 *
 * Secrets discipline (§K.1): `OPENROUTER_ADMIN_KEY` exists only inside these
 * server functions; minted per-user keys appear exactly once, in the 200
 * response body — never in logs (every log line passes through redactKeys).
 * These files are server-side: SK.5's semantic check (no `sk-or-` literals in
 * `src/` or `reusable-chatbot/`) does not cover `netlify/`.
 */

import { spendLimitCents, DEFAULT_ALLOCATION_BPS } from '../../src/core/billing/allowance.ts';

/* ── shapes ────────────────────────────────────────────────────────────── */

export interface BillingTx {
  kind: string;
  unitsCents: number;
  at: string;
  note?: string;
}

export interface BillingRecord {
  creditUnits: number;
  transactions: BillingTx[];
}

export interface TokenVerifier {
  (token: string): Promise<{ uid: string }>;
}

export interface BillingStore {
  read(uid: string): Promise<BillingRecord | null>;
}

/** Applies an admin/voucher code to the account (Firestore transaction server-side). */
export interface RedeemStore {
  apply(uid: string, code: string): Promise<{ ok: true; creditUnits: number } | { ok: false; reason: 'badCode' | 'usedCode' }>;
}

export interface OpenRouterMinter {
  createKey(input: { label: string; limitUsd: number; expiresAtIso: string }): Promise<{ key: string; expiresAt: string }>;
}

export interface BillingEnv {
  OPENROUTER_ADMIN_KEY?: string;
  BILLING_ALLOCATION_BPS?: string;
}

export interface BillingDeps {
  env: BillingEnv;
  verifyIdToken: TokenVerifier;
  store: BillingStore;
  minter: OpenRouterMinter;
  /** Present when the deployment supports admin-code redemption (SK.3). */
  redeemStore?: RedeemStore;
  now?: () => Date;
}

/** Minted per-user hosted keys live for 60 s (§K.1), then the client re-mints. */
export const KEY_TTL_MS = 60_000;

/* ── response plumbing ─────────────────────────────────────────────────── */

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

/** Redact any OpenRouter key literal before a string reaches a log. */
export function redactKeys(text: string): string {
  return text.replace(/sk-or-[A-Za-z0-9_-]+/g, 'sk-or-[redacted]');
}

export function logFailure(stage: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Billing:${stage}]`, redactKeys(message));
}

/* ── auth extraction ───────────────────────────────────────────────────── */

export function bearerOf(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]!.trim() : null;
}

/** Resolve the verified uid or an authored rejection Response. */
async function verifyUid(req: Request, deps: BillingDeps): Promise<{ uid: string } | Response> {
  const token = bearerOf(req);
  if (!token) {
    return jsonResponse(401, { error: 'authRequired', message: 'Sign in to use your hosted Sacristan credits.' });
  }
  try {
    return await deps.verifyIdToken(token);
  } catch (error) {
    logFailure('verify', error);
    return jsonResponse(401, { error: 'invalidToken', message: 'That sign-in has expired — sign in again to continue.' });
  }
}

function unconfigured(): Response {
  return jsonResponse(503, {
    error: 'unconfigured',
    message: 'Billing isn’t configured on this deployment yet — hosted Sacristan chat stays unavailable until setup completes.',
  });
}

/* ── /billing/key ──────────────────────────────────────────────────────── */

/**
 * POST /billing/key — mint a per-user OpenRouter key with a 40%-of-remaining
 * spend limit and a 60 s expiry. The mint envelope is `{ key, expiresAt }`.
 */
export function createKeyHandler(deps: BillingDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return jsonResponse(405, { error: 'methodNotAllowed', message: 'POST only.' });

    if (!deps.env.OPENROUTER_ADMIN_KEY) return unconfigured();

    const verified = await verifyUid(req, deps);
    if (verified instanceof Response) return verified;
    const { uid } = verified;

    let record: BillingRecord | null;
    try {
      record = await deps.store.read(uid);
    } catch (error) {
      logFailure('store', error);
      return jsonResponse(502, { error: 'storeFailed', message: 'Your credit balance couldn’t be read — try again in a moment.' });
    }

    const bps = Number(deps.env.BILLING_ALLOCATION_BPS ?? String(DEFAULT_ALLOCATION_BPS));
    const now = deps.now?.() ?? new Date();
    const limit = spendLimitCents(record?.creditUnits ?? 0, bps);
    if (limit <= 0) {
      return jsonResponse(402, { error: 'noCredits', message: 'No hosted Sacristan credits remain on this account — top up in Account.' });
    }

    try {
      const minted = await deps.minter.createKey({
        label: `sanctissimissa:${uid}:${now.getTime()}`,
        limitUsd: limit / 100,
        expiresAtIso: new Date(now.getTime() + KEY_TTL_MS).toISOString(),
      });
      return jsonResponse(200, { key: minted.key, expiresAt: minted.expiresAt });
    } catch (error) {
      logFailure('mint', error);
      return jsonResponse(502, { error: 'mintFailed', message: 'The hosted-Sacristan key couldn’t be minted — try again in a moment.' });
    }
  };
}

/* ── /billing/access ───────────────────────────────────────────────────── */

/** GET /billing/access — `{ creditUnits, transactions }` for the verified uid. */
export function createAccessHandler(deps: BillingDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'GET') return jsonResponse(405, { error: 'methodNotAllowed', message: 'GET only.' });

    if (!deps.env.OPENROUTER_ADMIN_KEY) {
      // Access reads don't touch the admin key, but an unconfigured deployment
      // has no store to read either — answer honestly instead of faking zeros.
      return unconfigured();
    }

    const verified = await verifyUid(req, deps);
    if (verified instanceof Response) return verified;
    const { uid } = verified;

    try {
      const record = await deps.store.read(uid);
      return jsonResponse(200, {
        creditUnits: record?.creditUnits ?? 0,
        transactions: record?.transactions ?? [],
      });
    } catch (error) {
      logFailure('store', error);
      return jsonResponse(502, { error: 'storeFailed', message: 'Your credit balance couldn’t be read — try again in a moment.' });
    }
  };
}

/* ── /billing/redeem (SK.3) ────────────────────────────────────────────── */

/** POST /billing/redeem — apply an admin/voucher code: `{ creditUnits }` after grant. */
export function createRedeemHandler(deps: BillingDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return jsonResponse(405, { error: 'methodNotAllowed', message: 'POST only.' });

    if (!deps.env.OPENROUTER_ADMIN_KEY || !deps.redeemStore) return unconfigured();

    const verified = await verifyUid(req, deps);
    if (verified instanceof Response) return verified;
    const { uid } = verified;

    let code = '';
    try {
      const body = (await req.json()) as { code?: unknown };
      code = String(body?.code ?? '').trim();
    } catch {
      code = '';
    }
    if (!code) {
      return jsonResponse(404, { error: 'badCode', message: 'Enter a code to redeem.' });
    }

    try {
      const outcome = await deps.redeemStore.apply(uid, code);
      if (!outcome.ok) {
        if (outcome.reason === 'usedCode') {
          return jsonResponse(409, { error: 'usedCode', message: 'That code has already been used.' });
        }
        return jsonResponse(404, { error: 'badCode', message: 'That code isn’t recognized.' });
      }
      return jsonResponse(200, { creditUnits: outcome.creditUnits });
    } catch (error) {
      logFailure('redeem', error);
      return jsonResponse(502, { error: 'storeFailed', message: 'The code couldn’t be applied — try again in a moment.' });
    }
  };
}
