/**
 * SK.1 — Firebase auth core + useAccount (§K.2).
 *
 * Two layers, per the house testing convention:
 *  1. Real behavior tests over `auth.ts` with injected `AuthHandles` fakes —
 *     the module's injection seam means no Firebase network/SDK singletons
 *     ever run (bare Node has no `VITE_FIREBASE_*` env, which exercises the
 *     unconfigured path for free).
 *  2. Source-contract assertions over `useAccount.ts` (same convention as
 *     companionSurfaces.test.ts — the Node strip-types runner cannot render
 *     React, so provider wiring is contracted against its exact source).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  firebaseConfigFromEnv,
  isAuthConfigured,
  setAuthHandles,
  signInGoogle,
  signOutUser,
  watchAuth,
  type AccountUser,
  type AuthHandles,
} from '../src/core/account/auth.ts';
import { readCredits } from '../src/core/account/useAccount.ts';

const useAccountSrc = readFileSync(new URL('../src/core/account/useAccount.ts', import.meta.url), 'utf8');

const fakeUser: AccountUser = {
  uid: 'u-1',
  email: 'ecclesia@sanctissimissa.org',
  getIdToken: async () => 'tok-1',
};

/** Minimal fake set: watch registers the listener; ops propagate through it like Firebase would. */
function fakeHandles(user: AccountUser | null = fakeUser): AuthHandles {
  let listener: ((u: AccountUser | null) => void) | null = null;
  return {
    watch(cb) {
      listener = cb;
      return () => { listener = null; };
    },
    async signInGoogle() {
      listener?.(user);
      return user!;
    },
    async signInEmail() { return user!; },
    async signUpEmail() { return user!; },
    async resetPassword() {},
    async signOutUser() { listener?.(null); },
  };
}

/* ───────────────────────── unconfigured env (the fresh-clone default) ── */

test('SK.1: absent/partial VITE_FIREBASE_* env configures nothing', () => {
  assert.equal(firebaseConfigFromEnv({}), null, 'empty env → null config');
  assert.equal(firebaseConfigFromEnv({ VITE_FIREBASE_API_KEY: 'k' }), null, 'missing project id → null');
  assert.equal(
    firebaseConfigFromEnv({ VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_PROJECT_ID: 'p' }),
    null,
    'missing app id → null',
  );
});

test('SK.1: full env yields config with derived auth domain', () => {
  const config = firebaseConfigFromEnv({
    VITE_FIREBASE_API_KEY: 'AIza',
    VITE_FIREBASE_PROJECT_ID: 'sanctissimissa',
    VITE_FIREBASE_APP_ID: '1:2:web:3',
  });
  assert.ok(config, 'full env → config');
  assert.equal(config.projectId, 'sanctissimissa');
  assert.equal(config.authDomain, 'sanctissimissa.firebaseapp.com', 'authDomain derives from project id');
});

test('SK.1: bare Node (no import.meta.env) reads as unconfigured and never throws', () => {
  assert.equal(isAuthConfigured(), false, 'no VITE_ env in the test runner → unconfigured');
});

test('SK.1: watchAuth on unconfigured env reports signed-out exactly once, no throw', () => {
  setAuthHandles(null); // real default handles → env-gated
  const seen: (AccountUser | null)[] = [];
  const off = watchAuth((user) => seen.push(user));
  assert.equal(typeof off, 'function', 'unsubscribe is a callable no-op');
  off();
  assert.deepEqual(seen, [null], 'one synchronous signed-out report');
  setAuthHandles(null);
});

/* ───────────────────────── fake sign-in flows ─────────────────────────── */

test('SK.1: fake Google sign-in sets the user and propagates through watch', async (t) => {
  t.after(() => setAuthHandles(null));
  setAuthHandles(fakeHandles());
  const seen: (AccountUser | null)[] = [];
  watchAuth((user) => seen.push(user));
  const outcome = await signInGoogle();
  assert.ok(outcome.ok, 'fake sign-in succeeds');
  assert.equal(outcome.ok && outcome.user?.uid, 'u-1');
  assert.ok(seen.includes(fakeUser), 'the watch listener received the signed-in user');
});

test('SK.1: a declined popup maps to cancelled, never an error surface', async (t) => {
  t.after(() => setAuthHandles(null));
  const base = fakeHandles();
  setAuthHandles({
    ...base,
    signInGoogle: async () => {
      throw Object.assign(new Error('popup closed'), { code: 'auth/cancelled-popup-closed' });
    },
  });
  const outcome = await signInGoogle();
  assert.deepEqual(
    outcome,
    { ok: false, reason: 'cancelled', message: null },
    'a decline is a tacit choice: reason cancelled, no authored shame text',
  );
});

test('SK.1: a real failure maps to error with its message', async (t) => {
  t.after(() => setAuthHandles(null));
  const base = fakeHandles();
  setAuthHandles({
    ...base,
    signInGoogle: async () => {
      throw Object.assign(new Error('bad credential'), { code: 'auth/invalid-credential' });
    },
  });
  const outcome = await signInGoogle();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.reason, 'error');
  assert.equal(outcome.ok === false && outcome.message, 'bad credential');
});

test('SK.1: signOut resolves ok with null user', async (t) => {
  t.after(() => setAuthHandles(null));
  setAuthHandles(fakeHandles());
  const outcome = await signOutUser();
  assert.deepEqual(outcome, { ok: true, user: null });
});

/* ───────────────────────── creditUnits from the injected reader ───────── */

test('SK.1: readCredits resolves units from the injected reader with the fresh token', async () => {
  let receivedToken: string | null = null;
  const units = await readCredits(fakeUser, async (token) => {
    receivedToken = token;
    return 42;
  });
  assert.equal(units, 42);
  assert.equal(receivedToken, 'tok-1', 'the reader receives the user ID token');
});

test('SK.1: readCredits without a reader stays null (never fabricated)', async () => {
  assert.equal(await readCredits(fakeUser, null), null);
});

test('SK.1: readCredits survives reader failure and nonsense values', async () => {
  assert.equal(await readCredits(fakeUser, async () => { throw new Error('network'); }), null, 'reader throw → null');
  assert.equal(await readCredits(fakeUser, async () => -5), null, 'negative → null');
  assert.equal(await readCredits(fakeUser, async () => Number.NaN), null, 'NaN → null');
  assert.equal(await readCredits(fakeUser, async () => '12' as unknown as number), null, 'non-number → null');
});

/* ───────────────────────── useAccount provider contract (source) ──────── */

test('SK.1: AccountProvider wires watchAuth + injected credit reader + honest resets', () => {
  assert.match(useAccountSrc, /const unsubscribe = watchAuth\(\(user\) =>/, 'one watchAuth subscription');
  assert.match(useAccountSrc, /readCredits\(user, readerRef\.current\)/, 'credits flow through the injected reader');
  assert.match(useAccountSrc, /creditUnits: user \? s\.creditUnits : null/, 'signed-out zeroes credits');
  assert.match(useAccountSrc, /syncState: user \? s\.syncState : IDLE_SYNC/, 'signed-out resets sync phases');
  assert.match(useAccountSrc, /configured: isAuthConfigured\(\)/, 'configured-ness surfaced to UI');
  assert.match(useAccountSrc, /createElement\(AccountContext\.Provider/, '.ts module composes the provider without JSX');
  assert.match(useAccountSrc, /result\.message \?\? result\.reason/, 'auth failures surface authored text, never swallowed');
});

test('SK.1: useAccount outside its provider throws a directed error', () => {
  assert.match(useAccountSrc, /throw new Error\('AccountProvider is missing'\)/);
});
