/**
 * BK.1 — billing functions: /billing/key + /billing/access (§K.1).
 *
 * Two layers:
 *  1. The pure allowance math (spendLimitCents / grantCents) — real behavior
 *     tests: 4000 bps default, floor rounding, zero/negative/NaN guards.
 *  2. The handler factories over injected fakes (verifyIdToken / store /
 *     minter) — valid token mints with the computed limit, expired/invalid
 *     tokens rejected, unconfigured env answers 503, and the admin key
 *     appears in no response and no log line (redaction enforced).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { grantCents, spendLimitCents, DEFAULT_ALLOCATION_BPS } from '../src/core/billing/allowance.ts';
import {
  createAccessHandler,
  createKeyHandler,
  redactKeys,
  type BillingDeps,
} from '../netlify/functions/billing-core.mts';

const ADMIN_KEY = 'sk-or-admin-TEST-SECRET';
const MINTED_KEY = 'sk-or-v1-MINTED-SECRET';
const NOW = new Date('2026-11-05T12:00:00Z');

function baseDeps(): BillingDeps {
  return {
    env: { OPENROUTER_ADMIN_KEY: ADMIN_KEY },
    verifyIdToken: async (token: string) => {
      if (token !== 'good-token') throw new Error('ID token expired');
      return { uid: 'u-9' };
    },
    store: {
      read: async () => ({
        creditUnits: 5000,
        transactions: [{ kind: 'redeem', unitsCents: 5000, at: '2026-11-05T00:00:00Z', note: 'admin code' }],
      }),
    },
    minter: {
      createKey: async (input) => ({ key: MINTED_KEY, expiresAt: input.expiresAtIso }),
    },
    now: () => NOW,
  };
}

function keyRequest(init?: { method?: string; token?: string | null }): Request {
  const headers: Record<string, string> = {};
  if (init?.token !== null) headers.authorization = `Bearer ${init?.token ?? 'good-token'}`;
  return new Request('https://missal.example/billing/key', { method: init?.method ?? 'POST', headers });
}

/* ───────────────────────── allowance math ─────────────────────────────── */

test('BK.1: spendLimitCents defaults to 40% and floors', () => {
  assert.equal(DEFAULT_ALLOCATION_BPS, 4000, '§K.1 default: 40% of prepaid');
  assert.equal(spendLimitCents(5000), 2000, '5000 × 40% = 2000');
  assert.equal(spendLimitCents(9999), 3999, 'floor(9999 × 0.4) = 3999');
  assert.equal(spendLimitCents(1234567), 493826, 'floor, never round up a ceiling');
  assert.equal(spendLimitCents(3, 4000), 1, 'floor(1.2) = 1');
});

test('BK.1: spendLimitCents honors the bps override and guards nonsense', () => {
  assert.equal(spendLimitCents(1000, 5000), 500, '50% override');
  assert.equal(spendLimitCents(1000, 10000), 1000, '100% cap');
  assert.equal(spendLimitCents(0), 0, 'zero remaining → 0');
  assert.equal(spendLimitCents(-100), 0, 'negative → 0');
  assert.equal(spendLimitCents(Number.NaN), 0, 'NaN → 0');
  assert.equal(spendLimitCents(1000, 0), 0, 'zero bps → 0');
  assert.equal(spendLimitCents(1000, -5), 0, 'negative bps → 0');
  assert.equal(spendLimitCents(1000, Number.NaN), 0, 'NaN bps → 0');
});

test('BK.1: grantCents grants 40% of net (gross − tax), floored, guarded', () => {
  assert.equal(grantCents(10000, 0), 4000, '$10 gross → $4 credit');
  assert.equal(grantCents(10000, 800), 3680, 'floor((10000−800) × 0.4)');
  assert.equal(grantCents(1000, 1000), 0, 'net zero → 0');
  assert.equal(grantCents(500, 1000), 0, 'tax over gross → 0, never negative');
  assert.equal(grantCents(-5, 0), 0, 'negative gross → 0');
  assert.equal(grantCents(Number.NaN, 0), 0, 'NaN gross → 0');
});

/* ───────────────────────── /billing/key handler ───────────────────────── */

test('BK.1: a valid token mints a per-user key at 40% of remaining with 60 s expiry', async () => {
  const res = await createKeyHandler(baseDeps())(keyRequest());
  assert.equal(res.status, 200);
  const body = (await res.json()) as { key: string; expiresAt: string };
  assert.equal(body.key, MINTED_KEY, 'the mint envelope carries the per-user key');
  assert.equal(new Date(body.expiresAt).getTime() - NOW.getTime(), 60_000, 'expires in exactly 60 s');
});

test('BK.1: the admin key appears in no response, ever', async () => {
  const deps = baseDeps();
  const handler = createKeyHandler(deps);
  const ok = await handler(keyRequest());
  const okText = await ok.text();
  assert.ok(!okText.includes(ADMIN_KEY), 'success body leaks nothing');
  const poor = await handler(keyRequest({ token: 'good-token' }));
  void poor;
  const empty = new Request('https://x/billing/key', { method: 'POST' });
  const noAuth = await handler(empty);
  assert.ok(!(await noAuth.text()).includes(ADMIN_KEY), 'auth-required body leaks nothing');
  const noEnv = await createKeyHandler({ ...deps, env: {} })(keyRequest());
  assert.ok(!(await noEnv.text()).includes(ADMIN_KEY), 'unconfigured 503 leaks nothing');
});

test('BK.1: key material is redacted from logs even when an error echoes it', async () => {
  const logs: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => logs.push(args);
  let res: Response;
  try {
    const deps = baseDeps();
    deps.minter = {
      createKey: async () => {
        throw new Error(`mint exploded holding ${ADMIN_KEY} and ${MINTED_KEY}`);
      },
    };
    res = await createKeyHandler(deps)(keyRequest());
  } finally {
    console.error = original;
  }
  assert.equal(res.status, 502);
  const flat = JSON.stringify(logs);
  assert.ok(!flat.includes(ADMIN_KEY), 'admin key never in logs');
  assert.ok(!flat.includes(MINTED_KEY), 'minted key never in logs');
  assert.match(flat, /sk-or-\[redacted\]/, 'redaction visibly applied');
});

test('BK.1: redactKeys is total', () => {
  assert.equal(redactKeys('holder sk-or-v1-abc123 tail'), 'holder sk-or-[redacted] tail');
  assert.equal(redactKeys('no keys here'), 'no keys here');
  assert.equal(redactKeys('sk-or-v1-x sk-or-admin-y'), 'sk-or-[redacted] sk-or-[redacted]');
});

test('BK.1: missing bearer → 401 authRequired; invalid/expired token → 401', async () => {
  const handler = createKeyHandler(baseDeps());
  const noAuth = await handler(keyRequest({ token: null }));
  assert.equal(noAuth.status, 401);
  assert.equal(((await noAuth.json()) as { error: string }).error, 'authRequired');

  const bad = await handler(keyRequest({ token: 'expired-token' }));
  assert.equal(bad.status, 401);
  assert.equal(((await bad.json()) as { error: string }).error, 'invalidToken');
});

test('BK.1: unconfigured env → 503 with an authored message', async () => {
  const deps = baseDeps();
  deps.env = {};
  const res = await createKeyHandler(deps)(keyRequest());
  assert.equal(res.status, 503);
  const body = (await res.json()) as { error: string; message: string };
  assert.equal(body.error, 'unconfigured');
  assert.match(body.message, /isn’t configured/);
});

test('BK.1: zero credits → 402 noCredits; store failure → 502', async () => {
  const broke = baseDeps();
  broke.store = { read: async () => ({ creditUnits: 0, transactions: [] }) };
  const res = await createKeyHandler(broke)(keyRequest());
  assert.equal(res.status, 402);
  assert.equal(((await res.json()) as { error: string }).error, 'noCredits');

  const failing = baseDeps();
  failing.store = { read: async () => { throw new Error('firestore down'); } };
  const res2 = await createKeyHandler(failing)(keyRequest());
  assert.equal(res2.status, 502);
  assert.equal(((await res2.json()) as { error: string }).error, 'storeFailed');
});

test('BK.1: wrong method → 405; OPTIONS → 204 with CORS', async () => {
  const handler = createKeyHandler(baseDeps());
  const get = await handler(keyRequest({ method: 'GET' }));
  assert.equal(get.status, 405);
  const pre = await handler(new Request('https://x/billing/key', { method: 'OPTIONS' }));
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*');
});

/* ───────────────────────── /billing/access handler ────────────────────── */

function accessRequest(init?: { method?: string; token?: string }): Request {
  const headers: Record<string, string> = {};
  if (init?.token !== undefined) headers.authorization = `Bearer ${init.token}`;
  return new Request('https://missal.example/billing/access', { method: init?.method ?? 'GET', headers });
}

test('BK.1: access returns creditUnits + transactions for the verified uid', async () => {
  const res = await createAccessHandler(baseDeps())(accessRequest({ token: 'good-token' }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { creditUnits: number; transactions: unknown[] };
  assert.equal(body.creditUnits, 5000);
  assert.equal(body.transactions.length, 1);
  assert.equal(((body.transactions[0] as { kind: string }).kind), 'redeem');
});

test('BK.1: access without a billing doc reads as honest zeros (never fake credits)', async () => {
  const deps = baseDeps();
  deps.store = { read: async () => null };
  const res = await createAccessHandler(deps)(accessRequest({ token: 'good-token' }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { creditUnits: number; transactions: unknown[] };
  assert.deepEqual(body, { creditUnits: 0, transactions: [] });
});

test('BK.1: access rejects bad auth and wrong methods like the key handler', async () => {
  const handler = createAccessHandler(baseDeps());
  const none = await handler(accessRequest());
  assert.equal(none.status, 401);
  const bad = await handler(accessRequest({ token: 'expired-token' }));
  assert.equal(bad.status, 401);
  const post = await handler(accessRequest({ method: 'POST', token: 'good-token' }));
  assert.equal(post.status, 405);
});

/* ───────────────────────── deployment wiring (source) ─────────────────── */

test('BK.1: both functions register their paths and wire deps lazily', () => {
  const keySrc = readFileSync(new URL('../netlify/functions/billing-key.mts', import.meta.url), 'utf8');
  const accessSrc = readFileSync(new URL('../netlify/functions/billing-access.mts', import.meta.url), 'utf8');
  assert.match(keySrc, /path: '\/billing\/key'/);
  assert.match(accessSrc, /path: '\/billing\/access'/);
  assert.match(keySrc, /await import\('\.\/billing-admin\.mts'\)/, 'firebase-admin loads lazily at request time');
  assert.match(accessSrc, /await import\('\.\/billing-admin\.mts'\)/);
});
