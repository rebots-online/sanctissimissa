/**
 * SK.1 (§K.2) — Firebase identity core for SanctissiMissa accounts.
 *
 * Design contract (CHECKLIST SK.1):
 *  - Lazy `initializeApp` from `VITE_FIREBASE_*` env. Absent env ⇒ the app
 *    runs signed-out with zero auth pressure: `isAuthConfigured()` is false,
 *    `watchAuth` reports `null`, and every sign-in op resolves
 *    `{ ok: false, reason: 'unconfigured' }` — nothing throws.
 *  - All Firebase handles are injectable (`setAuthHandles`) so unit tests run
 *    with plain fakes — no network, no SDK singletons.
 *  - `AccountUser` is a structural type: Firebase's real `User` satisfies it;
 *    tests fake it with object literals. The rest of the app never imports
 *    firebase types.
 *
 * §K.2 tone: sign-in is a true choice that feels like a benefit. This module
 * is pure capability — it never nags, blocks, or withholds local features;
 * presentation lives in SK.2's SignInView, gating in SK.4.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { debugEvent } from '../diagnostics/store.ts';

/** Structural signed-in identity — Firebase `User` satisfies this shape. */
export interface AccountUser {
  readonly uid: string;
  readonly email: string | null;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

/** Minimal Firebase web-app config the auth core needs. */
export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/**
 * Every Firebase interaction behind one seam. The default handle set closes
 * over the lazy env-gated app/auth; tests inject fakes via `setAuthHandles`.
 */
export interface AuthHandles {
  /** Subscribe to auth state; fires `cb(null)` when signed out/unconfigured. */
  watch(cb: (user: AccountUser | null) => void): () => void;
  signInGoogle(): Promise<AccountUser>;
  signInEmail(email: string, password: string): Promise<AccountUser>;
  signUpEmail(email: string, password: string): Promise<AccountUser>;
  resetPassword(email: string): Promise<void>;
  signOutUser(): Promise<void>;
}

/** Unconfigured-env sentinel — mapped to `reason: 'unconfigured'`, never thrown to callers. */
const UNCONFIGURED = 'auth/unconfigured-env';

/** `import.meta.env` is absent under the Node test runner — read defensively. */
function envOf(env?: Record<string, string | undefined>): Record<string, string | undefined> {
  return env ?? (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
}

/** Firebase config from `VITE_FIREBASE_*` env, or null when anything required is missing. */
export function firebaseConfigFromEnv(env?: Record<string, string | undefined>): FirebaseEnvConfig | null {
  const e = envOf(env);
  const apiKey = e.VITE_FIREBASE_API_KEY;
  const projectId = e.VITE_FIREBASE_PROJECT_ID;
  const appId = e.VITE_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain: e.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    projectId,
    appId,
  };
}

/** True when the build carries a usable Firebase env (UI renders auth affordances only then). */
export function isAuthConfigured(env?: Record<string, string | undefined>): boolean {
  return firebaseConfigFromEnv(env) !== null;
}

const APP_NAME = 'sanctissimissa-account';

/** Adapt Firebase's `User` to the structural `AccountUser` (no SDK types escape this module). */
function accountUserOf(user: User): AccountUser {
  return {
    uid: user.uid,
    email: user.email,
    getIdToken: (forceRefresh?: boolean) => user.getIdToken(forceRefresh),
  };
}

function buildDefaultHandles(): AuthHandles {
  const authOf = (): Auth => {
    const config = firebaseConfigFromEnv();
    if (!config) throw new Error(UNCONFIGURED);
    const existing = getApps().find((a) => a.name === APP_NAME);
    const app: FirebaseApp = existing ?? initializeApp(config, APP_NAME);
    return getAuth(app);
  };
  return {
    watch(cb) {
      let auth: Auth | null = null;
      try {
        auth = authOf();
      } catch {
        cb(null);
        return () => {};
      }
      return onAuthStateChanged(auth, (user) => cb(user ? accountUserOf(user) : null));
    },
    async signInGoogle() {
      const cred = await signInWithPopup(authOf(), new GoogleAuthProvider());
      return accountUserOf(cred.user);
    },
    async signInEmail(email, password) {
      const cred = await signInWithEmailAndPassword(authOf(), email, password);
      return accountUserOf(cred.user);
    },
    async signUpEmail(email, password) {
      const cred = await createUserWithEmailAndPassword(authOf(), email, password);
      return accountUserOf(cred.user);
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(authOf(), email);
    },
    async signOutUser() {
      await signOut(authOf());
    },
  };
}

/** Test seam — inject fakes; pass null to return to the real Firebase handles. */
let injected: AuthHandles | null = null;
let fallback: AuthHandles | null = null;
export function setAuthHandles(handles: AuthHandles | null): void {
  injected = handles;
}
function authHandles(): AuthHandles {
  return injected ?? (fallback ??= buildDefaultHandles());
}

/** Auth op result — authored, never a bare throw; `user` is null for reset/sign-out success. */
export type AuthOutcome =
  | { ok: true; user: AccountUser | null }
  | { ok: false; reason: 'unconfigured' | 'cancelled' | 'error'; message: string | null };

function isCancelledCode(code: string): boolean {
  return code.includes('cancelled') || code.includes('popup-closed');
}

async function runOp(op: () => Promise<AccountUser | null>): Promise<AuthOutcome> {
  try {
    return { ok: true, user: await op() };
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    const message = (error as Error)?.message ?? String(error);
    if (message.includes(UNCONFIGURED) || code === UNCONFIGURED) {
      debugEvent('account', 'sign-in.unconfigured', {}, 'info');
      return { ok: false, reason: 'unconfigured', message: null };
    }
    if (isCancelledCode(code)) {
      // A closed popup is the user declining — a tacit choice, recorded, never an error surface.
      debugEvent('account', 'sign-in.cancelled', { code }, 'info');
      return { ok: false, reason: 'cancelled', message: null };
    }
    debugEvent('account', 'sign-in.failed', { code }, 'warn');
    console.error('[Account:sign-in]', error);
    return { ok: false, reason: 'error', message };
  }
}

/** Google popup sign-in. Resolves `{ ok: false }` on decline/unconfigured — never throws. */
export function signInGoogle(): Promise<AuthOutcome> {
  return runOp(() => authHandles().signInGoogle());
}

/** Existing email/password sign-in. */
export function signInEmail(email: string, password: string): Promise<AuthOutcome> {
  return runOp(() => authHandles().signInEmail(email, password));
}

/** New email/password account. */
export function signUpEmail(email: string, password: string): Promise<AuthOutcome> {
  return runOp(() => authHandles().signUpEmail(email, password));
}

/** Password-reset email; resolves ok with `user: null`. */
export function resetPassword(email: string): Promise<AuthOutcome> {
  return runOp(async () => {
    await authHandles().resetPassword(email);
    return null;
  });
}

/** Sign out; the watch subscription propagates the signed-out state. */
export async function signOutUser(): Promise<AuthOutcome> {
  try {
    await authHandles().signOutUser();
    debugEvent('account', 'signed-out', {}, 'info');
    return { ok: true, user: null };
  } catch (error) {
    debugEvent('account', 'sign-out.failed', {}, 'warn');
    console.error('[Account:sign-out]', error);
    return { ok: false, reason: 'error', message: (error as Error)?.message ?? String(error) };
  }
}

/**
 * Subscribe to auth state. Unconfigured env ⇒ one synchronous `cb(null)` and a
 * no-op unsubscribe — the signed-out default, zero pressure, zero throws.
 */
export function watchAuth(cb: (user: AccountUser | null) => void): () => void {
  return authHandles().watch(cb);
}
