/**
 * SK.3 — the credit client + AccountView binding (§K.1/§K.0).
 *
 * Three layers:
 *  1. The browser client (readAccess / mintKey / redeemCode) over an injected
 *     fetch — every server status maps to an authored, honest client state
 *     (authRequired / unconfigured / noCredits / badCode / usedCode / network
 *     / server), never a fabricated balance.
 *  2. The CreditReader adapter (`creditReaderFromEnv`) bridging SK.1's
 *     account state to this client, and `billingBase`'s VITE_BILLING_BASE seam.
 *  3. AccountView's source contract against the frozen Stitch account screen:
 *     verbatim copy, the five wiring ids, honest data mapping (null credits →
 *     '—', 'Local' chips until SK.6 syncs, no fetch without a signed-in user,
 *     Buy buttons answer instead of dying).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  billingBase,
  creditReaderFromEnv,
  mintKey,
  readAccess,
  redeemCode,
} from '../src/core/billing/client.ts';
import { IDLE_SYNC } from '../src/core/account/useAccount.ts';
import {
  createRedeemHandler,
  type BillingDeps,
} from '../netlify/functions/billing-core.mts';

/* ───────────────────────── client states (injected fetch) ─────────────── */

function fetchJson(status: number, body: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
}

function fetchFail(): typeof fetch {
  return (async () => {
    throw new Error('connection refused');
  }) as typeof fetch;
}

test('SK.3: readAccess returns creditUnits + transactions on 200', async () => {
  const result = await readAccess('tok', {
    fetchImpl: fetchJson(200, { creditUnits: 420, transactions: [{ kind: 'redeem', unitsCents: 500, at: '2026-11-05T00:00:00Z', note: 'admin code' }] }),
  });
  assert.deepEqual(result, {
    ok: true,
    creditUnits: 420,
    transactions: [{ kind: 'redeem', unitsCents: 500, at: '2026-11-05T00:00:00Z', note: 'admin code' }],
  });
});

test('SK.3: readAccess maps 401 → authRequired, 503 → unconfigured, 5xx → server, throw → network', async () => {
  const auth = await readAccess('tok', { fetchImpl: fetchJson(401, { error: 'authRequired' }) });
  assert.deepEqual(auth, { ok: false, reason: 'authRequired', message: 'Sign in to view your credits.' });

  const unconf = await readAccess('tok', { fetchImpl: fetchJson(503, { error: 'unconfigured' }) });
  assert.equal(unconf.ok, false);
  assert.equal(unconf.ok ? null : unconf.reason, 'unconfigured');

  const srv = await readAccess('tok', { fetchImpl: fetchJson(502, { error: 'storeFailed' }) });
  assert.equal(srv.ok ? null : srv.reason, 'server');

  const net = await readAccess('tok', { fetchImpl: fetchFail() });
  assert.equal(net.ok ? null : net.reason, 'network');
  assert.match(net.ok ? '' : (net.message ?? ''), /can’t be reached/);
});

test('SK.3: mintKey maps 402 → noCredits and 200 → the mint envelope', async () => {
  const ok = await mintKey('tok', { fetchImpl: fetchJson(200, { key: 'sk-or-v1-x', expiresAt: '2026-11-05T12:01:00Z' }) });
  assert.deepEqual(ok, { ok: true, key: 'sk-or-v1-x', expiresAt: '2026-11-05T12:01:00Z' });

  const none = await mintKey('tok', { fetchImpl: fetchJson(402, { error: 'noCredits' }) });
  assert.equal(none.ok ? null : none.reason, 'noCredits');
  assert.match(none.ok ? '' : (none.message ?? ''), /top up in Account/);
});

test('SK.3: redeemCode maps 404 → badCode, 409 → usedCode, 200 → new balance', async () => {
  const ok = await redeemCode('tok', 'ADVENT-2026', { fetchImpl: fetchJson(200, { creditUnits: 1000 }) });
  assert.deepEqual(ok, { ok: true, creditUnits: 1000 });

  const bad = await redeemCode('tok', 'NOPE', { fetchImpl: fetchJson(404, { error: 'badCode' }) });
  assert.equal(bad.ok ? null : bad.reason, 'badCode');

  const used = await redeemCode('tok', 'OLD', { fetchImpl: fetchJson(409, { error: 'usedCode' }) });
  assert.equal(used.ok ? null : used.reason, 'usedCode');
});

test('SK.3: billingBase resolves the VITE_BILLING_BASE seam (same-origin default, trailing slash trimmed)', () => {
  assert.equal(billingBase({}), '', 'empty env ⇒ same-origin');
  assert.equal(billingBase({ VITE_BILLING_BASE: 'https://missal.netlify.app/' }), 'https://missal.netlify.app');
  assert.equal(billingBase({ VITE_BILLING_BASE: 'https://missal.netlify.app' }), 'https://missal.netlify.app');
  assert.equal(billingBase({ VITE_BILLING_BASE: 'https://x/' }, '/override'), '/override', 'explicit override wins (tests)');
});

test('SK.3: creditReaderFromEnv bridges the client to SK.1’s CreditReader (null on any failure)', async () => {
  const reader = creditReaderFromEnv({ fetchImpl: fetchJson(200, { creditUnits: 420, transactions: [] }) });
  assert.equal(await reader('tok'), 420);

  const failing = creditReaderFromEnv({ fetchImpl: fetchJson(503, { error: 'unconfigured' }) });
  assert.equal(await failing('tok'), null, 'unreadable credits stay null — never a fabricated balance');

  const broken = creditReaderFromEnv({ fetchImpl: fetchFail() });
  assert.equal(await broken('tok'), null);
});

test('SK.3: IDLE_SYNC covers all five surfaces incl. bookmarks (the freeze renders five rows)', () => {
  assert.deepEqual(IDLE_SYNC, {
    journal: 'idle', homily: 'idle', annotations: 'idle', bookmarks: 'idle', voice: 'idle',
  });
});

/* ───────────────────────── /billing/redeem handler ────────────────────── */

function redeemDeps(): BillingDeps & { applied: Array<{ uid: string; code: string }> } {
  const applied: Array<{ uid: string; code: string }> = [];
  return {
    applied,
    env: { OPENROUTER_ADMIN_KEY: 'sk-or-admin-TEST-SECRET' },
    verifyIdToken: async (token: string) => {
      if (token !== 'good-token') throw new Error('ID token expired');
      return { uid: 'u-9' };
    },
    store: { read: async () => ({ creditUnits: 500, transactions: [] }) },
    minter: { createKey: async () => ({ key: 'unused', expiresAt: 'unused' }) },
    redeemStore: {
      apply: async (uid, code) => {
        applied.push({ uid, code });
        if (code.toUpperCase() === 'USED') return { ok: false, reason: 'usedCode' };
        if (code.toUpperCase() === 'GHOST') return { ok: false, reason: 'badCode' };
        return { ok: true, creditUnits: 1500 };
      },
    },
  } as BillingDeps & { applied: Array<{ uid: string; code: string }> };
}

function redeemRequest(init?: { token?: string | null; code?: string; method?: string }): Request {
  const headers: Record<string, string> = {};
  if (init?.token !== null) headers.authorization = `Bearer ${init?.token ?? 'good-token'}`;
  const body = init?.code === undefined ? undefined : JSON.stringify({ code: init.code });
  return new Request('https://missal.example/billing/redeem', {
    method: init?.method ?? 'POST',
    headers,
    body,
  });
}

test('SK.3: redeem applies a valid code and returns the new balance', async () => {
  const deps = redeemDeps();
  const res = await createRedeemHandler(deps)(redeemRequest({ code: ' advent-2026 ' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { creditUnits: 1500 });
  assert.deepEqual(deps.applied, [{ uid: 'u-9', code: 'advent-2026' }], 'the handler trims before validating; upper-casing is the store’s canonicalization');
});

test('SK.3: redeem rejects unknown codes (404), used codes (409), empty bodies (404), bad auth (401)', async () => {
  const handler = createRedeemHandler(redeemDeps());

  const ghost = await handler(redeemRequest({ code: 'GHOST' }));
  assert.equal(ghost.status, 404);
  assert.equal(((await ghost.json()) as { error: string }).error, 'badCode');

  const used = await handler(redeemRequest({ code: 'USED' }));
  assert.equal(used.status, 409);
  assert.equal(((await used.json()) as { error: string }).error, 'usedCode');

  const empty = await handler(redeemRequest({ code: '   ' }));
  assert.equal(empty.status, 404);
  assert.match(((await empty.json()) as { message: string }).message, /Enter a code/);

  const none = await handler(redeemRequest({ token: null, code: 'X' }));
  assert.equal(none.status, 401);

  const noBody = await handler(new Request('https://x/billing/redeem', { method: 'POST', headers: { authorization: 'Bearer good-token' } }));
  assert.equal(noBody.status, 404, 'a bodyless POST redeems nothing');
});

test('SK.3: redeem without a redeemStore answers 503 unconfigured (never half-works)', async () => {
  const deps = redeemDeps();
  delete (deps as Partial<BillingDeps>).redeemStore;
  const res = await createRedeemHandler(deps)(redeemRequest({ code: 'ANY' }));
  assert.equal(res.status, 503);
  assert.equal(((await res.json()) as { error: string }).error, 'unconfigured');
});

test('SK.3: redeem store failure → 502; wrong method → 405', async () => {
  const deps = redeemDeps();
  deps.redeemStore = { apply: async () => { throw new Error('firestore down'); } };
  const fail = await createRedeemHandler(deps)(redeemRequest({ code: 'ANY' }));
  assert.equal(fail.status, 502);

  const get = await createRedeemHandler(redeemDeps())(redeemRequest({ method: 'GET' }));
  assert.equal(get.status, 405);
});

/* ───────────────────────── AccountView source contract ────────────────── */

const viewSrc = readFileSync(new URL('../src/ui/account/AccountView.tsx', import.meta.url), 'utf8');

test('SK.3: AccountView carries the frozen screen’s copy verbatim', () => {
  for (const frozen of [
    'Sanctificátio • Tradítio • Consecrátio',
    'Hosted Sacristan credits',
    'Each minted key draws on 40% of your remaining balance and expires in 60 seconds.',
    '40% becomes hosted chat credits',
    'What follows you',
    'Transactions',
    'No transactions yet.',
    'Redeem a code',
    'Enter voucher or admin code',
    'Everything also stays on this device — sync simply follows you.',
    'Novena', 'Pew', 'Sacristy', 'Recommended',
    'Journal entries', 'Homily drafts', 'Annotations & highlights', 'Bookmarks', 'Voice notes',
  ]) {
    assert.ok(viewSrc.includes(frozen), `frozen copy missing: ${frozen}`);
  }
});

test('SK.3: AccountView keeps all five wiring ids from the specimen', () => {
  for (const id of ['account-signout', 'account-buy-5', 'account-buy-10', 'account-buy-25', 'account-redeem', 'admin-code']) {
    assert.ok(viewSrc.includes(`'${id}'`) || viewSrc.includes(`"${id}"`), `wiring id missing: ${id}`);
  }
});

test('SK.3: AccountView fetches nothing without a signed-in user (unconfigured env stays fetch-free)', () => {
  // The ledger effect guards on the user before any client call; the redeem
  // path guards too; the whole signed-out branch returns before any fetch.
  assert.match(viewSrc, /const user = account\.user;\s*\n\s*if \(!user\) return;/, 'reloadLedger guards on the user');
  assert.match(viewSrc, /if \(!user \|\| !code\.trim\(\) \|\| busy\) return;/, 'redeem guards on user + code + busy');
  assert.match(viewSrc, /if \(!account\.user\) \{[\s\S]*?SIGNED_OUT_NOTE/, 'signed-out branch renders the calm note, no cards, no calls');
});

test('SK.3: AccountView stays honest — null credits render “—”, Buy answers instead of dying', () => {
  assert.match(viewSrc, /return cents === null \? '—'/, 'unknown credits are never fabricated');
  assert.match(viewSrc, /BUY_NOTE/, 'Buy buttons surface an authored note');
  assert.ok(!viewSrc.includes('display: none'), 'gating is by mount, not display (SK.4 discipline)');
  assert.match(viewSrc, /syncChipText/, 'chips render the real sync phase');
  assert.match(viewSrc, /account-surface as-page/, 'top-aligned page variant (no clipped-overflow centering)');
});
