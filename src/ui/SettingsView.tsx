/**
 * Settings workspace — Appearance, Missal (solemn), Account, Library, Journal, Sync shells.
 */

import { useState } from 'react';
import ThemePicker from './ThemePicker.tsx';
import type { SidecarDb } from '../core/accompaniment/store.ts';

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

export default function SettingsView({ sidecar = null }: { sidecar?: SidecarDb | null }) {
  const [tab, setTab] = useState<Tab>('appearance');
  const [, bump] = useState(0);
  const solemn = (sidecar?.getSetting('mass.solemn') ?? '0') === '1';

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
            Divinum Officium solemn flags (!*S / !*R, incense, Pax). Default is Low Mass.
          </p>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={solemn}
              disabled={!sidecar}
              onChange={(e) => {
                sidecar?.setSetting('mass.solemn', e.target.checked ? '1' : '0');
                bump((n) => n + 1);
              }}
            />
            {' '}Solemn Mass
          </label>
          {!sidecar && (
            <p className="settings-desc">Sidecar unavailable — solemn preference cannot persist.</p>
          )}
        </section>
      )}

      {tab === 'account' && (
        <section className="settings-section">
          <h3>Account / Billing</h3>
          <p className="settings-desc">
            RevenueCat-backed entitlements (anonymous appUserId). Restore purchases on this device.
            No operator-hosted login. Content never uploads to the billing plane.
          </p>
          <ul className="settings-list">
            <li>Status: core features available offline</li>
            <li>Restore purchases: configure VITE_REVENUECAT_API_KEY for live RC</li>
          </ul>
        </section>
      )}

      {tab === 'library' && (
        <section className="settings-section">
          <h3>Study library</h3>
          <p className="settings-desc">
            Public-domain modules and packs (reference_*, study_library_all). Haydock is permanently free.
          </p>
          <ul className="settings-list">
            <li>Haydock Bible commentary — included</li>
            <li>Catena Aurea, Guéranger, Roman Catechism, Summa, … — catalog via entitlements</li>
          </ul>
        </section>
      )}

      {tab === 'journal' && (
        <section className="settings-section">
          <h3>Journal &amp; Homily</h3>
          <p className="settings-desc">Default exposure and editor preferences (expand with mode priest/laity).</p>
        </section>
      )}

      {tab === 'sync' && (
        <section className="settings-section">
          <h3>Device sync</h3>
          <p className="settings-desc">
            DHT-primary peer sync of journal/homily/user data — no operator content cloud.
            See DOCS/PEER-SIDECAR-SYNC.md. Encrypted snapshot export/import ships before full mesh.
          </p>
        </section>
      )}
    </div>
  );
}
