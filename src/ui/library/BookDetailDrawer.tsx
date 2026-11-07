/**
 * Book detail drawer (BA.5; L-bookstore-commerce-20261106.md §4.2, §4.4, §3 F3).
 *
 * Bound to export B (LIBS/UI/STITCH/sanctissimissa-library-20260913/bookstore.html
 * :1691-1806, ids preserved): #drawer-overlay, #book-detail, tiers, the primary
 * action, the new #purchase-status line and the #proposal-modal purchase
 * confirmation. Not mounted: the "Proposed price structure" .proposal-callout,
 * the provenance "proofed against original printed impressions" paragraph, the
 * preview "side-by-side Latin Vulgate alignment" note and the modal's "Clicking
 * below logs your interest" paragraph.
 *
 * Purchase (F3): PurchaseController.purchase → the entitlement subscription
 * flips the badge (no reload) → ModuleInstaller.install → load →
 * CorpusDb.attachModule. Checkout is RevenueCat Web Billing (Stripe) on web and
 * Play Billing on Android (DOCS/sdk/revenuecat-purchases-js, DOCS/sdk/purchases-android).
 */
import { useEffect, useRef, useState } from 'react';
import type { CorpusDb } from '../../core/data/corpusDb.ts';
import type { CatalogueWork, EditionRecord } from '../../core/library/types.ts';
import { getCommerce } from '../../core/entitlements/service.ts';
import { COMMENTARY_SOURCE_EDITION, WORLDWIDE_TERRITORY } from '../../core/entitlements/ids.ts';
import { COMMERCE_MESSAGES } from '../../core/entitlements/types.ts';
import type { AccessKind, CommerceErrorCode, PurchaseOffer } from '../../core/entitlements/types.ts';
import { debugEvent } from '../../core/diagnostics/store.ts';
import { badgeFor, coverClass, planPriceText, primaryAction } from './bookstoreState.ts';
import { editionCopy } from './editionCopy.ts';
import type { LibraryViewProps } from './viewTypes.ts';

type DrawerTab = 'overview' | 'provenance' | 'preview';
interface Status { text: string; alert: boolean }

export interface BookDetailDrawerProps extends LibraryViewProps {
  work: CatalogueWork;
  state: AccessKind;
  offers: PurchaseOffer[] | null;
  onClose: () => void;
  onInstalled: () => void;
  onRead: (editionId: string) => void;
}

/** BA.2's CorpusDb.attachModule, reached structurally so this file compiles before BA.2 lands. */
type ModuleAttachable = { attachModule(id: string, bytes: Uint8Array): Promise<unknown> };

function isAlreadyAttached(e: unknown): boolean {
  return e === 'already-attached' || (e instanceof Error && e.message === 'already-attached');
}

function commerceCode(e: unknown): CommerceErrorCode {
  const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: unknown }).code : null;
  return typeof code === 'string' && code in (COMMERCE_MESSAGES as Record<string, string>) ? (code as CommerceErrorCode) : 'UNKNOWN';
}

const LANGUAGE_NAMES: Readonly<Record<string, string>> = { en: 'English', la: 'Latin' };
const APPARATUS = 'Verse links, Father attributions, meaning search and audiobook by SanctissiMissa';

export default function BookDetailDrawer(p: BookDetailDrawerProps) {
  const { work, state, offers, db, installer, purchases, signedIn } = p;
  const editionId = work.editionId;
  const edition: EditionRecord | null = editionId ? (p.editions.get(editionId) as EditionRecord | null) : null;
  const copy = editionCopy(editionId);
  const cover = coverClass(work);
  const badge = badgeFor(state);
  const channel: string = getCommerce(p.sidecar).channel;

  const [tab, setTab] = useState<DrawerTab>('overview');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const abortRef = useRef<AbortController>(new AbortController());

  const selected = offers?.find((o: PurchaseOffer) => o.id === selectedOfferId) ?? offers?.[0] ?? null;
  const action = primaryAction({ state, signedIn, offers, selected, purchasing, installing });
  const showTiers = state === 'locked' && signedIn;

  const { onClose } = p;
  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalOpen) setModalOpen(false);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, onClose]);

  /** install (when absent or forced) → load → attachModule; failure leaves Owned/Read for a retry. */
  async function ensureAttached(id: string, forceInstall: boolean): Promise<boolean> {
    setInstalling(true);
    try {
      let bytes: Uint8Array | null = forceInstall ? null : ((await installer.load(id)) as Uint8Array | null);
      if (!bytes) {
        await installer.install(id, abortRef.current.signal, (_f: number) => undefined);
        bytes = (await installer.load(id)) as Uint8Array | null;
      }
      if (!bytes) throw new Error('module-missing');
      try {
        await (db as CorpusDb & ModuleAttachable).attachModule(id, bytes);
      } catch (e) {
        if (!isAlreadyAttached(e)) throw e;
      }
      p.onInstalled();
      return true;
    } catch {
      debugEvent('commerce', 'install.failed', { editionId: id }, 'warn');
      return false;
    } finally {
      setInstalling(false);
    }
  }

  async function read() {
    if (!editionId) return;
    if (editionId === COMMENTARY_SOURCE_EDITION.haydock) {
      p.onOpenKey('verse:Matt/1/1');
      return;
    }
    if (await ensureAttached(editionId, false)) p.onRead(editionId);
  }

  async function confirmPurchase() {
    if (!selected || !editionId) return;
    setModalOpen(false);
    setStatus(null);
    setPurchasing(true);
    try {
      const outcome = await purchases.purchase(selected.id);
      setPurchasing(false);
      if (outcome === 'purchased') await ensureAttached(editionId, true);
      else if (outcome === 'pending') setStatus({ text: COMMERCE_MESSAGES.pending, alert: false });
    } catch (e) {
      setPurchasing(false);
      const code = commerceCode(e);
      setStatus({ text: COMMERCE_MESSAGES[code], alert: true });
      if (code === 'ALREADY_OWNED') {
        try {
          await purchases.restore();
        } catch (e2) {
          setStatus({ text: COMMERCE_MESSAGES[commerceCode(e2)], alert: true });
        }
      }
    }
  }

  function onPrimary() {
    if (action.kind === 'read') void read();
    else if (action.kind === 'sign-in') p.onSignIn();
    else if (action.kind === 'buy') setModalOpen(true);
  }

  const rights = edition?.rights?.[0] ?? null;
  const territories: string[] = edition?.territories ?? rights?.territories ?? [];
  const provenance: [string, string][] = edition
    ? [
        ['Historical Date:', copy?.historicalDate ?? (rights?.publicationYear != null ? String(rights.publicationYear) : '—')],
        ['Author / Doctor:', edition.author],
        ['Editor / Translator:', rights?.translator ?? '—'],
        ['Languages:', edition.languages.map((l: string) => LANGUAGE_NAMES[l] ?? l).join(', ')],
        ['Rights Territory:', territories.includes(WORLDWIDE_TERRITORY) ? 'Worldwide (public domain)' : territories.join(', ')],
        ['Apparatus:', APPARATUS],
      ]
    : [
        ['Author / Doctor:', work.author],
        ['Status:', 'Edition review'],
      ];

  return (
    <>
      <div id="drawer-overlay" className="drawer-overlay open" onClick={onClose}></div>
      <aside id="book-detail" className="open" role="dialog" aria-modal="true" aria-labelledby="drawer-book-title">
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-kicker">Volume Dossier</span>
            <span id="drawer-state-badge" className={`state-badge ${badge.className}`}>{badge.text}</span>
          </div>
          <button ref={closeRef} type="button" id="drawer-close" className="drawer-close-btn" title="Close drawer (Escape)" aria-label="Close" onClick={onClose}>
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-book-hero">
            <div id="drawer-cover-box" className={`drawer-cover-preview ${cover}`}>
              <span style={{ fontSize: '8.5px', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>{work.category}</span>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 12, fontWeight: 600, lineHeight: 1.2 }} id="drawer-cover-title">{work.title}</div>
              <div style={{ fontSize: '9.5px', opacity: 0.8 }} id="drawer-cover-author">{work.author}</div>
            </div>
            <div className="drawer-hero-meta">
              <h2 id="drawer-book-title" className="drawer-hero-title">{work.title}</h2>
              <div id="drawer-book-author" className="drawer-hero-author">{edition?.author ?? work.author}</div>
              <p id="drawer-book-synopsis" style={{ fontSize: '12.5px', color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                {copy?.synopsis ?? 'This work is in edition review and is not yet available.'}
              </p>
            </div>
          </div>

          <div className="drawer-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'overview'} className={`drawer-tab${tab === 'overview' ? ' active' : ''}`} data-tab="overview" onClick={() => setTab('overview')}>Overview & Benefits</button>
            <button type="button" role="tab" aria-selected={tab === 'provenance'} className={`drawer-tab${tab === 'provenance' ? ' active' : ''}`} data-tab="provenance" onClick={() => setTab('provenance')}>Edition Provenance</button>
            {copy && (
              <button type="button" role="tab" aria-selected={tab === 'preview'} className={`drawer-tab${tab === 'preview' ? ' active' : ''}`} data-tab="preview" onClick={() => setTab('preview')}>Specimen Excerpt</button>
            )}
          </div>

          <div id="tab-overview" className={`tab-content${tab === 'overview' ? ' active' : ''}`}>
            {copy && copy.benefits.length > 0 && (
              <div className="benefits-box">
                <div className="benefits-title">
                  <svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  Missal Integration Benefits
                </div>
                <ul id="drawer-benefits-list" className="benefits-list">
                  {copy.benefits.map((b) => (
                    <li key={b}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {copy && (
              <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 18 }}>
                <p>This volume binds seamlessly with the SanctissiMissa apparatus. When reading the day's Mass propers or praying the Divine Office, verse citations display inline marginalia linked directly to this commentary.</p>
              </div>
            )}
          </div>

          <div id="tab-provenance" className={`tab-content${tab === 'provenance' ? ' active' : ''}`}>
            <div id="edition-provenance">
              <div className="provenance-grid" id="drawer-provenance-grid">
                {provenance.map(([label, value]) => (
                  <span key={label} style={{ display: 'contents' }}>
                    <span className="prov-label">{label}</span>
                    <span className="prov-value">{value}</span>
                  </span>
                ))}
                {!edition && work.sourceUrls.length > 0 && (
                  <>
                    <span className="prov-label">Sources:</span>
                    <span className="prov-value">
                      {work.sourceUrls.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" style={{ display: 'block' }}>{u}</a>
                      ))}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {copy && (
            <div id="tab-preview" className={`tab-content${tab === 'preview' ? ' active' : ''}`}>
              <div className="preview-box">
                <div className="preview-citation" id="drawer-preview-citation">{copy.previewCitation}</div>
                <div id="drawer-preview-text">{`"${copy.previewText}"`}</div>
              </div>
            </div>
          )}
        </div>

        <div id="purchase-options">
          <div className="options-heading">Access & Support Options</div>
          {showTiers && (
            <div className="access-tiers" id="drawer-tiers-list">
              {(offers ?? []).map((o: PurchaseOffer) => (
                <label key={o.id} className={`tier-card${selected?.id === o.id ? ' selected' : ''}`}>
                  <div className="tier-left">
                    <input type="radio" name="access-tier-radio" className="tier-radio" checked={selected?.id === o.id} onChange={() => setSelectedOfferId(o.id)} />
                    <div>
                      <div className="tier-title">{o.title}</div>
                      <div className="tier-desc">{o.terms}</div>
                    </div>
                  </div>
                  <div className="tier-cost">
                    <div className="tier-price-val">{o.priceText}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <button type="button" id="primary-action-btn" className="btn-action-primary" disabled={action.disabled} onClick={onPrimary}>
            <span>{action.label}</span>
            <svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
          <p id="purchase-status" role={status?.alert ? 'alert' : 'status'} style={{ fontSize: 12, marginTop: 8, color: status?.alert ? 'var(--burgundy)' : 'var(--ink-soft)' }}>
            {status?.text ?? ''}
          </p>
        </div>
      </aside>

      {modalOpen && selected && (
        <div id="proposal-modal" className="proposal-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="proposal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-book-title">
            <h3 className="proposal-dialog-title" id="modal-book-title">{`${work.title} — Confirm purchase`}</h3>
            <div className="proposal-dialog-text">
              You are buying the SanctissiMissa edition of this work: its text together with verse links, Father attributions, meaning search, the audiobook and Sacristan synthesis.
            </div>
            <div className="proposal-feature-note">
              <strong>Selected Plan:</strong> <span id="modal-plan-name">{selected.title}</span><br />
              <strong>Indicated Price:</strong> <span id="modal-plan-price">{planPriceText(selected)}</span><br />
              <strong>Status:</strong> {channel === 'play' ? 'Payment is processed by Google Play.' : 'Payment is processed by RevenueCat (Stripe).'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-inspect" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-action-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => void confirmPurchase()}>Continue to payment</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
