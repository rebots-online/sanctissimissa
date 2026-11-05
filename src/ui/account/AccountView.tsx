/**
 * SK.3 (§K.0/§K.1) — AccountView, bound to the frozen Stitch account screen
 * `LIBS/UI/STITCH/sanctissimissa-account-20261105/account.html`
 * (project 7192660594233084032, screen cf13a8e7895f4ffea5b6361763dbdad4).
 *
 * The freeze is the authority for layout/copy; all specimen-only details
 * (sample email, counts, transaction rows, version tag) render from real
 * account state instead. Wiring ids preserved: #account-signout,
 * #account-buy-5/#account-buy-10/#account-buy-25, #account-redeem,
 * #admin-code. Honesty rules: credits come from SK.3's client (never
 * fabricated), sync chips reflect the real SK.6 phase ('Local' until the
 * engine syncs), Buy buttons answer with an authored note (no dead clicks —
 * purchase rails arrive with the bookstore release), and the specimen's
 * encrypted-sync subtitle is NOT rendered as a product claim.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAccount } from '../../core/account/useAccount.ts';
import { readAccess, redeemCode, type CreditTx } from '../../core/billing/client.ts';
import './account.css';

const KICKER = 'Sanctificátio • Tradítio • Consecrátio';
const TITLE = 'Account';
const TAGLINE = 'Your missal, with you everywhere.';
const SIGNED_OUT_LABEL = 'Google account • Authenticated';
const CREDITS_LABEL = 'Hosted Sacristan credits';
const CREDITS_CAPTION = 'Each minted key draws on 40% of your remaining balance and expires in 60 seconds.';
const PACK_CAPTION = '40% becomes hosted chat credits';
const BUY_NOTE = 'Online purchase isn’t active in this build — redeem a code below.';
const FOLLOWS_TITLE = 'What follows you';
const LEDGER_TITLE = 'Transactions';
const LEDGER_EMPTY = 'No transactions yet.';
const REDEEM_TITLE = 'Redeem a code';
const REDEEM_SUBTITLE = 'Parish dispensation tokens, sacristan grants, or seminary diocesan codes.';
const REDEEM_OK = 'Code applied — balance updated.';
const FOOTNOTE = 'Everything also stays on this device — sync simply follows you.';
const SIGNED_OUT_NOTE = 'You’re signed out. Sign in to sync your work and use hosted credits.';

/** Top-up packs, per the freeze (Novena/Pew/Sacristy; Pew recommended). */
const PACKS = [
  { id: 'account-buy-5', name: 'Novena', price: 500 },
  { id: 'account-buy-10', name: 'Pew', price: 1000 },
  { id: 'account-buy-25', name: 'Sacristy', price: 2500 },
] as const;

/** Sync surfaces, per the freeze's "What follows you" rows. */
const SURFACES = [
  { key: 'journal', label: 'Journal entries' },
  { key: 'homily', label: 'Homily drafts' },
  { key: 'annotations', label: 'Annotations & highlights' },
  { key: 'bookmarks', label: 'Bookmarks' },
  { key: 'voice', label: 'Voice notes' },
] as const;

/** Credit units are cents; the freeze displays dollars. Null stays unknown. */
export function formatCredits(cents: number | null): string {
  return cents === null ? '—' : `$${(cents / 100).toFixed(2)}`;
}

/** Honest chip text per sync phase — 'Local' until SK.6's engine syncs. */
export function syncChipText(phase: 'idle' | 'syncing' | 'synced' | 'error'): string {
  switch (phase) {
    case 'synced': return 'Synced';
    case 'syncing': return 'Syncing…';
    case 'error': return 'Retry needed';
    default: return 'Local';
  }
}

export default function AccountView() {
  const account = useAccount();
  const [ledger, setLedger] = useState<CreditTx[] | null>(null);
  const [buyNote, setBuyNote] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Real ledger once, per sign-in — never on unconfigured/unauthed mounts.
  const reloadLedger = useCallback(async () => {
    const user = account.user;
    if (!user) return;
    const token = await user.getIdToken();
    const result = await readAccess(token);
    setLedger(result.ok ? result.transactions : []);
  }, [account.user]);

  useEffect(() => {
    void reloadLedger();
  }, [reloadLedger]);

  async function onRedeem() {
    const user = account.user;
    if (!user || !code.trim() || busy) return;
    setBusy(true);
    setRedeemStatus(null);
    const token = await user.getIdToken();
    const result = await redeemCode(token, code.trim());
    setBusy(false);
    if (result.ok) {
      setRedeemStatus(REDEEM_OK);
      setCode('');
      await account.refreshCredits();
      void reloadLedger();
    } else {
      setRedeemStatus(result.message ?? 'The code couldn’t be applied.');
    }
  }

  if (!account.user) {
    return (
      <div className="account-surface as-page">
        <div className="account-masthead">
          <div className="account-kicker">{KICKER}</div>
          <h1 className="account-title">{TITLE}</h1>
          <p className="account-tagline">{TAGLINE}</p>
          <div className="ornament-rule" />
        </div>
        <div className="account-panel">
          <p className="account-panel-note" role="note">{SIGNED_OUT_NOTE}</p>
        </div>
        <p className="account-footnote">{FOOTNOTE}</p>
      </div>
    );
  }

  const initial = (account.user.email ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="account-surface as-page">
      <div className="account-masthead">
        <div className="account-kicker">{KICKER}</div>
        <h1 className="account-title">{TITLE}</h1>
        <p className="account-tagline">{TAGLINE}</p>
        <div className="ornament-rule" />
      </div>

      <div className="account-column">
        {/* Identity card */}
        <div className="account-panel account-panel-row">
          <div className="account-identity">
            <span className="account-avatar" aria-hidden="true">{initial}</span>
            <div>
              <p className="account-email">{account.user.email ?? account.user.uid}</p>
              <p className="account-sublabel">{SIGNED_OUT_LABEL}</p>
            </div>
          </div>
          <button type="button" id="account-signout" className="account-signout" disabled={account.busy}
            onClick={() => void account.signOut()}>
            Sign out
          </button>
        </div>

        {/* Credits card */}
        <div className="account-panel">
          <p className="account-panel-label">{CREDITS_LABEL}</p>
          <div className="account-credit-line">
            <span className="account-credit-stat">{formatCredits(account.creditUnits)}</span>
            <span className="account-credit-unit">CR Balance</span>
          </div>
          <p className="account-panel-caption">{CREDITS_CAPTION}</p>
          <div className="account-pack-grid">
            {PACKS.map((pack) => (
              <div className={`account-pack${pack.id === 'account-buy-10' ? ' recommended' : ''}`} key={pack.id}>
                {pack.id === 'account-buy-10' && <span className="account-pack-flag">Recommended</span>}
                <span className="account-pack-name">{pack.name}</span>
                <span className="account-pack-price">{formatCredits(pack.price)}</span>
                <p className="account-pack-caption">{PACK_CAPTION}</p>
                <button type="button" id={pack.id} className="account-pack-buy" disabled={account.busy}
                  onClick={() => setBuyNote(BUY_NOTE)}>
                  Buy {formatCredits(pack.price)}
                </button>
              </div>
            ))}
          </div>
          {buyNote && <p className="account-status" role="status">{buyNote}</p>}
        </div>

        {/* What follows you */}
        <div className="account-panel">
          <p className="account-panel-title">{FOLLOWS_TITLE}</p>
          <div className="account-sync-rows">
            {SURFACES.map((surface) => (
              <div className="account-sync-row" key={surface.key}>
                <span>{surface.label}</span>
                <span className={`account-chip ${account.syncState[surface.key]}`} data-sync-phase={account.syncState[surface.key]}>
                  {syncChipText(account.syncState[surface.key])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="account-panel">
          <div className="account-panel-head">
            <p className="account-panel-title">{LEDGER_TITLE}</p>
          </div>
          <div className="account-ledger-rows">
            {ledger === null ? (
              <p className="account-panel-note">Reading your ledger…</p>
            ) : ledger.length === 0 ? (
              <p className="account-panel-note">{LEDGER_EMPTY}</p>
            ) : (
              ledger.map((tx, i) => (
                <div className="account-ledger-row" key={`${tx.at}-${i}`}>
                  <div>
                    <p className="account-ledger-label">{tx.note ?? tx.kind}</p>
                    <p className="account-ledger-date">{new Date(tx.at).toLocaleDateString()}</p>
                  </div>
                  <span className={`account-ledger-amount ${tx.unitsCents >= 0 ? 'credit' : 'debit'}`}>
                    {tx.unitsCents >= 0 ? '+' : '−'}{formatCredits(Math.abs(tx.unitsCents))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Redeem */}
        <div className="account-panel">
          <p className="account-panel-title">{REDEEM_TITLE}</p>
          <p className="account-panel-caption">{REDEEM_SUBTITLE}</p>
          <div className="account-redeem-row">
            <label className="sr-only" htmlFor="admin-code">Admin code</label>
            <input id="admin-code" type="text" placeholder="Enter voucher or admin code"
              value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="button" id="account-redeem" className="account-redeem-btn" disabled={busy || !code.trim()}
              onClick={() => void onRedeem()}>
              Redeem
            </button>
          </div>
          {redeemStatus && (
            <p className={redeemStatus === REDEEM_OK ? 'account-status' : 'account-alert'} role={redeemStatus === REDEEM_OK ? 'status' : 'alert'}>
              {redeemStatus}
            </p>
          )}
        </div>
      </div>

      <p className="account-footnote">{FOOTNOTE}</p>
    </div>
  );
}
