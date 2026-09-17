/**
 * Settings workspace — six tabs; every tab presents real wired controls or
 * real state (CP.0; ARCHITECTURE §10.2: a static-description-only tab is a
 * defect and a release blocker, operator 2026-09-16).
 */

import { useMemo, useState } from 'react';
import ThemePicker from './ThemePicker.tsx';
import ModelPicker, { useCompanionModels } from './ModelPicker.tsx';
import { SidecarDb } from '../core/accompaniment/store.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';

const PREVIEW_MATERIAL = [
  { role: 'rubric', la: '℟. Et cum spiritu tuo.', en: '℟. And with your spirit.' },
  { role: 'dialogue-p', la: '℣. Dóminus vobíscum.', en: '℣. The Lord be with you.' },
  { role: 'dialogue-s', la: '℣. Orémus.', en: '℣. Let us pray.' },
  { role: 'body', la: 'Omnípotens sempitérne Deus…', en: 'Almighty everlasting God…' },
];

type Tab = 'appearance' | 'missal' | 'account' | 'library' | 'journal' | 'sync';

const TABS: { id: Tab; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'missal', label: 'Missal' },
  { id: 'account', label: 'Account' },
  { id: 'library', label: 'Library' },
  { id: 'journal', label: 'Journal' },
  { id: 'sync', label: 'Sync' },
];

const MASS_FORMS = [
  { id: 'lecta', label: 'Missa lecta (Low Mass)' },
  { id: 'cantata', label: 'Missa cantata' },
  { id: 'sollemnis', label: 'Missa solemnis' },
] as const;

const ROLE_LENSES = [
  { id: 'off', label: 'All parts' },
  { id: 'celebrans', label: 'Celebrans (Priest)' },
  { id: 'diaconus', label: 'Diaconus' },
  { id: 'subdiaconus', label: 'Subdiaconus' },
  { id: 'ministri', label: 'Ministri (Servers)' },
  { id: 'laity', label: 'Laity' },
] as const;

const JOURNAL_MODES = [
  { id: 'priest', label: 'Priest — homily-preparation exposure' },
  { id: 'laity', label: 'Laity — devotional exposure' },
] as const;

function labelize(source: string): string {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export default function SettingsView({
  sidecar = null,
  corpus = null,
  onOpenJournal,
}: {
  sidecar?: SidecarDb | null;
  corpus?: CorpusDb | null;
  onOpenJournal?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('appearance');
  const [, bump] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const massForm = sidecar?.getSetting('mass.form') ?? 'lecta';
  const roleLens = sidecar?.getSetting('mass.roleLens') ?? 'off';
  const journalMode = sidecar?.getSetting('mode') ?? 'priest';
  const billingConfigured = !!import.meta.env.VITE_REVENUECAT_API_KEY;
  const sources = useMemo(() => (corpus ? corpus.commentarySources() : []), [corpus]);

  const setSetting = (key: string, value: string) => {
    sidecar?.setSetting(key, value);
    void sidecar?.persist();
    bump((n) => n + 1);
  };

  const applyMassForm = (id: string) => {
    setSetting('mass.form', id);
    // Same derivation the presentation tray performs, so ReaderView's
    // mass.solemn read is correct even when the tray is not mounted.
    setSetting('mass.solemn', id === 'lecta' ? '0' : '1');
  };

  const exportSnapshot = () => {
    if (!sidecar) return;
    try {
      const bytes = sidecar.export();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sanctissimissa-sidecar-${new Date().toISOString().slice(0, 10)}.db`;
      a.click();
      URL.revokeObjectURL(a.href);
      setSyncMsg('Snapshot exported.');
    } catch (error) {
      setSyncMsg(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const importSnapshot = async (file: File) => {
    setSyncBusy(true);
    setSyncMsg(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await SidecarDb.importBytes(bytes);
      setSyncMsg('Snapshot restored — reloading…');
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setSyncMsg(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
      setSyncBusy(false);
    }
  };

  return (
    <div className="content settings-workspace">
      <h2>Settings</h2>
      <div className="settings-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'appearance' && (
        <section className="settings-section">
          <h3>Appearance</h3>
          <p className="settings-desc">Theme family and light/dark mode.</p>
          <div className="settings-controls">
            <ThemePicker sidecar={sidecar} />
          </div>
          <h3>Live Preview</h3>
          <div className="theme-preview">
            {PREVIEW_MATERIAL.map((item, i) => (
              <div key={i} className={`preview-line preview-${item.role}`}>
                <span className="preview-la">{item.la}</span>
                {item.en && <span className="preview-en">{item.en}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'missal' && (
        <section className="settings-section">
          <h3>Mass form</h3>
          <p className="settings-desc">
            Divinum Officium form (solemn flags, incense, Pax) — the same preference the presentation tray applies.
          </p>
          <div className="settings-radio-group">
            {MASS_FORMS.map((f) => (
              <label key={f.id} className={`settings-radio${massForm === f.id ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="mass-form"
                  checked={massForm === f.id}
                  disabled={!sidecar}
                  onChange={() => applyMassForm(f.id)}
                />
                {f.label}
              </label>
            ))}
          </div>
          <h3>Role lens</h3>
          <p className="settings-desc">Highlights the selected role's parts (never hides others).</p>
          <div className="settings-radio-group">
            {ROLE_LENSES.map((r) => (
              <label key={r.id} className={`settings-radio${roleLens === r.id ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="role-lens"
                  checked={roleLens === r.id}
                  disabled={!sidecar}
                  onChange={() => setSetting('mass.roleLens', r.id)}
                />
                {r.label}
              </label>
            ))}
          </div>
          {!sidecar && <p className="settings-desc">Sidecar unavailable — preferences cannot persist.</p>}
        </section>
      )}

      {tab === 'account' && (
        <section className="settings-section">
          <h3>Account / Billing</h3>
          <p className="settings-desc">
            RevenueCat-backed entitlements (anonymous appUserId). No operator-hosted login; content never uploads to the billing plane.
          </p>
          <div className="settings-state" data-gate-state={billingConfigured ? 'billing-active' : 'ungated'}>
            {billingConfigured
              ? 'Billing active on this build — entitlements resolve through RevenueCat.'
              : 'Billing not configured on this build — all features are ungated.'}
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className="settings-button"
              disabled={!billingConfigured}
              title={
                billingConfigured
                  ? 'Restore purchases on this device'
                  : 'Restore requires a billing-configured build (VITE_REVENUECAT_API_KEY)'
              }
            >
              Restore purchases
            </button>
          </div>
        </section>
      )}

      {tab === 'library' && (
        <section className="settings-section">
          <h3>Study library</h3>
          <p className="settings-desc">Commentary sources attached in this corpus right now.</p>
          {!corpus && <p className="settings-state">Corpus not loaded in this session.</p>}
          {corpus && sources.length === 0 && <p className="settings-state">No commentary sources attached.</p>}
          <ul className="settings-list" data-source-count={sources.length}>
            {sources.map((s) => (
              <li key={s.source}>
                <strong>{labelize(s.source)}</strong> — {s.blocks.toLocaleString()} verse-linked blocks (included)
              </li>
            ))}
          </ul>
          <p className="settings-desc">
            Additional public-domain modules (Catena Aurea, Guéranger, Roman Catechism, Summa, …) arrive with the
            Library &amp; Bookstore update — this list shows only what is actually attached.
          </p>
          <h3>Companion models</h3>
          <p className="settings-desc">
            On-device chat models from the Atomic Chat catalog, ranked for this device. Downloads are verified
            (SHA-256) and stored once in the shared mba.robin library.
          </p>
          <ModelPicker hook={useCompanionModels()} />
        </section>
      )}

      {tab === 'journal' && (
        <section className="settings-section">
          <h3>Journal &amp; Homily</h3>
          <p className="settings-desc">Exposure mode shapes Journal and Homily defaults (the preference JournalView reads).</p>
          <div className="settings-radio-group">
            {JOURNAL_MODES.map((m) => (
              <label key={m.id} className={`settings-radio${journalMode === m.id ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="journal-mode"
                  checked={journalMode === m.id}
                  disabled={!sidecar}
                  onChange={() => setSetting('mode', m.id)}
                />
                {m.label}
              </label>
            ))}
          </div>
          {onOpenJournal && (
            <div className="settings-actions">
              <button type="button" className="settings-button" onClick={onOpenJournal}>
                Open Journal
              </button>
            </div>
          )}
          {!sidecar && <p className="settings-desc">Sidecar unavailable — preference cannot persist.</p>}
        </section>
      )}

      {tab === 'sync' && (
        <section className="settings-section">
          <h3>Device sync</h3>
          <p className="settings-desc">
            Snapshot export/import of your journal, homilies, annotations and preferences (peer mesh ships later — see
            DOCS/PEER-SIDECAR-SYNC.md).
          </p>
          <div className="settings-actions">
            <button type="button" className="settings-button" onClick={exportSnapshot} disabled={!sidecar || syncBusy}>
              Export snapshot
            </button>
            <label className={`settings-button file${sidecar && !syncBusy ? '' : ' disabled'}`}>
              {sidecar && !syncBusy ? 'Import snapshot' : 'Import unavailable'}
              <input
                type="file"
                accept=".db,application/octet-stream"
                disabled={!sidecar || syncBusy}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importSnapshot(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          {syncMsg && (
            <p className="settings-state" role="status">
              {syncMsg}
            </p>
          )}
          {!sidecar && <p className="settings-desc">Sidecar unavailable — snapshots cannot be exported or restored.</p>}
        </section>
      )}
    </div>
  );
}
