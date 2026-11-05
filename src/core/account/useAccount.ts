/**
 * SK.1 (§K.2) — the account state surface: `useAccount()` and `AccountProvider`.
 *
 * Composition contract:
 *  - Auth state arrives from SK.1's `watchAuth` (auth.ts) — the provider never
 *    touches Firebase directly.
 *  - `creditUnits` arrive from an injected `CreditReader` (SK.3's billing
 *    client in production; fakes in tests). Unknown/unavailable credits stay
 *    `null` — never fabricated. SK.4's visibility gate treats null as zero.
 *  - `syncState` is per-surface phase (journal/homily/annotations/voice);
 *    SK.6's sync engine drives it — the shape ships now, idle by default.
 *
 * §K.2: signing in must feel additive. Nothing here blocks, nags, or gates
 * local behavior; the provider is inert until mounted and honest about every
 * failure (busy/error are surfaced, never swallowed into fake success).
 */

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  isAuthConfigured,
  resetPassword,
  signInEmail,
  signInGoogle,
  signUpEmail,
  signOutUser,
  watchAuth,
  type AccountUser,
  type AuthOutcome,
} from './auth.ts';

/** Surfaces that follow the account across devices (SK.6 wires the engine). */
export type SyncSurface = 'journal' | 'homily' | 'annotations' | 'voice';
export type SyncPhase = 'idle' | 'syncing' | 'synced' | 'error';
export type SyncStateMap = Record<SyncSurface, SyncPhase>;

/** Signed-out / pre-engine default — every surface quiet. */
export const IDLE_SYNC: SyncStateMap = { journal: 'idle', homily: 'idle', annotations: 'idle', voice: 'idle' };

/**
 * Reads the account's remaining credits from the billing backend, given a
 * fresh Firebase ID token. SK.3's client is the production reader; null
 * reader ⇒ credits stay unknown (null), never guessed.
 */
export type CreditReader = (idToken: string) => Promise<number | null>;

/**
 * Pure credit resolution: token from the user, units from the reader, null on
 * any absence/failure. Exported for direct unit testing (SK.1 verify clause:
 * "creditUnits from injected reader").
 */
export async function readCredits(user: AccountUser, reader: CreditReader | null): Promise<number | null> {
  if (!reader) return null;
  try {
    const token = await user.getIdToken();
    const units = await reader(token);
    return typeof units === 'number' && Number.isFinite(units) && units >= 0 ? units : null;
  } catch {
    return null;
  }
}

export interface AccountState {
  /** Whether the build carries a usable Firebase env (auth UI renders only then). */
  configured: boolean;
  user: AccountUser | null;
  /** Remaining prepaid credit units; null = unknown (treated as zero by the SK.4 gate). */
  creditUnits: number | null;
  syncState: SyncStateMap;
  /** An auth op is in flight (buttons disable, never block local use). */
  busy: boolean;
  /** Last auth failure, authored for display; null when everything is fine. */
  error: string | null;
}

export interface AccountApi extends AccountState {
  signInGoogle(): Promise<void>;
  signInEmail(email: string, password: string): Promise<void>;
  signUpEmail(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Re-read credits for the current user (AccountView refresh; SK.3). */
  refreshCredits(): Promise<void>;
}

const AccountContext = createContext<AccountApi | null>(null);

export function AccountProvider({ children, creditReader = null }: { children: ReactNode; creditReader?: CreditReader | null }) {
  const [state, setState] = useState<AccountState>(() => ({
    configured: isAuthConfigured(),
    user: null,
    creditUnits: null,
    syncState: IDLE_SYNC,
    busy: false,
    error: null,
  }));
  const userRef = useRef<AccountUser | null>(null);
  const readerRef = useRef<CreditReader | null>(creditReader);
  useEffect(() => {
    readerRef.current = creditReader;
  }, [creditReader]);

  // One subscription for the provider's lifetime: user changes flow in from
  // auth.ts; credits follow each sign-in when a reader is configured.
  useEffect(() => {
    const unsubscribe = watchAuth((user) => {
      userRef.current = user;
      setState((s) => ({
        ...s,
        user,
        // Signed out ⇒ credits and sync phases reset honestly (no stale cloud state).
        creditUnits: user ? s.creditUnits : null,
        syncState: user ? s.syncState : IDLE_SYNC,
        error: user ? null : s.error,
      }));
      if (user) {
        void readCredits(user, readerRef.current).then((creditUnits) => {
          setState((s) => ({ ...s, creditUnits }));
        });
      }
    });
    return unsubscribe;
  }, []);

  const run = useCallback(async (outcome: Promise<AuthOutcome>): Promise<void> => {
    setState((s) => ({ ...s, busy: true, error: null }));
    const result = await outcome;
    setState((s) => ({ ...s, busy: false, error: result.ok ? null : (result.message ?? result.reason) }));
  }, []);

  const signInGoogleCb = useCallback(() => run(signInGoogle()), [run]);
  const signInEmailCb = useCallback((email: string, password: string) => run(signInEmail(email, password)), [run]);
  const signUpEmailCb = useCallback((email: string, password: string) => run(signUpEmail(email, password)), [run]);
  const resetPasswordCb = useCallback((email: string) => run(resetPassword(email)), [run]);
  const signOutCb = useCallback(() => run(signOutUser()), [run]);

  const refreshCredits = useCallback(async (): Promise<void> => {
    const user = userRef.current;
    if (!user) return;
    const creditUnits = await readCredits(user, readerRef.current);
    setState((s) => ({ ...s, creditUnits }));
  }, []);

  const api = useMemo<AccountApi>(() => ({
    ...state,
    signInGoogle: signInGoogleCb,
    signInEmail: signInEmailCb,
    signUpEmail: signUpEmailCb,
    resetPassword: resetPasswordCb,
    signOut: signOutCb,
    refreshCredits,
  }), [state, signInGoogleCb, signInEmailCb, signUpEmailCb, resetPasswordCb, signOutCb, refreshCredits]);

  // Plain createElement (not JSX): the checklist pins this file as `.ts`, and
  // esbuild only rewrites JSX inside `.tsx` modules.
  return createElement(AccountContext.Provider, { value: api }, children);
}

/** Account surface for any component under `AccountProvider`. */
export function useAccount(): AccountApi {
  const api = useContext(AccountContext);
  if (!api) throw new Error('AccountProvider is missing');
  return api;
}
