/**
 * BK.1 — real billing deps for the Netlify deployment (server-side only).
 *
 * Loaded via dynamic import from the function entry points so the unit-test
 * path (which injects fakes) never pulls firebase-admin. Service-account
 * credentials arrive through the canonical `FIREBASE_ADMIN_*` env vars; the
 * OpenRouter provision key stays in `OPENROUTER_ADMIN_KEY` — both are server
 * env only, never `VITE_*`, never in any client bundle (SK.5 semantic check).
 */

import {
  type BillingDeps,
  type BillingRecord,
} from './billing-core.mts';

interface AdminEnv {
  OPENROUTER_ADMIN_KEY?: string;
  BILLING_ALLOCATION_BPS?: string;
  FIREBASE_ADMIN_PROJECT_ID?: string;
  FIREBASE_ADMIN_CLIENT_EMAIL?: string;
  FIREBASE_ADMIN_PRIVATE_KEY?: string;
  OPENROUTER_BASE_URL?: string;
}

function configured(env: AdminEnv): boolean {
  return Boolean(
    env.OPENROUTER_ADMIN_KEY &&
    env.FIREBASE_ADMIN_PROJECT_ID &&
    env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}

/** Real deps: firebase-admin token verification + Firestore credit docs + the OpenRouter mint API. */
export async function realBillingDeps(env: AdminEnv = process.env as AdminEnv): Promise<BillingDeps> {
  if (!configured(env)) {
    // Every handler answers 503 authored when env is absent — a deployment
    // without secrets stays honest instead of half-working.
    return {
      env,
      verifyIdToken: async () => {
        throw new Error('billing env unconfigured');
      },
      store: { read: async () => { throw new Error('billing env unconfigured'); } },
      minter: { createKey: async () => { throw new Error('billing env unconfigured'); } },
    };
  }

  // firebase-admin is ESM-compatible; keep it out of the unit-test import graph.
  const admin = await import('firebase-admin');
  if (admin.getApps().length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        // Canonical env-var form escapes newlines as \n.
        privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    });
  }

  const db = admin.firestore();
  const store = {
    async read(uid: string): Promise<BillingRecord | null> {
      const snap = await db.collection('billing').doc(uid).get();
      return snap.exists ? (snap.data() as BillingRecord) : null;
    },
  };

  // SK.3 — single-use admin codes: `redeemCodes/{CODE}` docs carry unitsCents;
  // the transaction marks use and increments the balance atomically.
  const redeemStore = {
    async apply(uid: string, code: string): Promise<{ ok: true; creditUnits: number } | { ok: false; reason: 'badCode' | 'usedCode' }> {
      return db.runTransaction(async (tx) => {
        const codeRef = db.collection('redeemCodes').doc(code.trim().toUpperCase());
        const billRef = db.collection('billing').doc(uid);
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists) return { ok: false as const, reason: 'badCode' as const };
        const data = codeSnap.data() as { unitsCents?: number; usedBy?: string; note?: string };
        if (data.usedBy) return { ok: false as const, reason: 'usedCode' as const };
        const billSnap = await tx.get(billRef);
        const current = billSnap.exists ? ((billSnap.data() as BillingRecord).creditUnits ?? 0) : 0;
        const prior = billSnap.exists ? ((billSnap.data() as BillingRecord).transactions ?? []) : [];
        const grant = data.unitsCents ?? 0;
        const at = new Date().toISOString();
        tx.set(codeRef, { ...data, usedBy: uid, usedAt: at });
        tx.set(billRef, {
          creditUnits: current + grant,
          transactions: [...prior, { kind: 'redeem', unitsCents: grant, at, note: data.note ?? 'admin code' }],
        });
        return { ok: true as const, creditUnits: current + grant };
      });
    },
  };

  const verifyIdToken = async (token: string): Promise<{ uid: string }> => {
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid };
  };

  const base = env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
  const minter = {
    async createKey(input: { label: string; limitUsd: number; expiresAtIso: string }): Promise<{ key: string; expiresAt: string }> {
      const res = await fetch(`${base}/keys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_ADMIN_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: input.label,
          limit: input.limitUsd,
          expires_at: input.expiresAtIso,
        }),
      });
      if (!res.ok) throw new Error(`openrouter mint failed: HTTP ${res.status}`);
      const body = (await res.json()) as { data?: { key?: string; expires_at?: string } };
      const key = body.data?.key;
      if (!key) throw new Error('openrouter mint response carried no key');
      return { key, expiresAt: body.data?.expires_at ?? input.expiresAtIso };
    },
  };

  return { env, verifyIdToken, store, minter, redeemStore };
}
