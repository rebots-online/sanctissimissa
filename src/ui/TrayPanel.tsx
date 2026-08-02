/**
 * TrayPanel — slide-out presentation tray for Reader/Office views.
 * Y-3/Y-4/Y-6/Y-7: mass form, role lens, rubrics on/off, typeface + size.
 * Persists to sidecar settings (Y-8).
 */

import { useState, useEffect, useCallback } from 'react';

interface SettingsStore {
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  persist(): Promise<void>;
}

export type MassForm = 'lecta' | 'sollemnis' | 'cantata';
export type RoleLens = 'celebrans' | 'diaconus' | 'subdiaconus' | 'ministri' | 'laity' | 'off';

const MASS_FORMS: { id: MassForm; label: string }[] = [
  { id: 'lecta', label: 'Missa lecta (Private)' },
  { id: 'cantata', label: 'Cantata — derived' },
  { id: 'sollemnis', label: 'Missa sollemnis' },
];

const ROLE_LENSES: { id: RoleLens; label: string }[] = [
  { id: 'off', label: 'All parts' },
  { id: 'celebrans', label: 'Celebrans (Priest)' },
  { id: 'diaconus', label: 'Diaconus' },
  { id: 'subdiaconus', label: 'Subdiaconus' },
  { id: 'ministri', label: 'Ministri (Servers)' },
  { id: 'laity', label: 'Laity' },
];

const TYPEFACES: { id: string; label: string; stack: string }[] = [
  { id: 'serif', label: 'Liturgical serif', stack: 'var(--serif)' },
  { id: 'sans', label: 'Sans-serif', stack: 'var(--sans)' },
  { id: 'dyslexia', label: 'Dyslexia-friendly', stack: '"OpenDyslexic", "Lexend", sans-serif' },
];

const FONT_SIZES = ['small', 'medium', 'large', 'x-large'] as const;
type FontSize = (typeof FONT_SIZES)[number];

const SIZE_PX: Record<FontSize, number> = { small: 14, medium: 16, large: 18, 'x-large': 20 };

interface Props {
  sidecar: SettingsStore | null;
  open: boolean;
  onToggle: () => void;
}

export default function TrayPanel({ sidecar, open, onToggle }: Props) {
  const [, bump] = useState(0);
  const refresh = useCallback(() => bump((n) => n + 1), []);

  const massForm = (sidecar?.getSetting('mass.form') ?? 'lecta') as MassForm;
  const roleLens = (sidecar?.getSetting('mass.roleLens') ?? 'off') as RoleLens;
  const rubricsOn = (sidecar?.getSetting('mass.rubrics') ?? '1') === '1';
  const typeface = sidecar?.getSetting('mass.typeface') ?? 'serif';
  const fontSize = (sidecar?.getSetting('mass.fontSize') ?? 'medium') as FontSize;

  // Apply font-size CSS variable to root
  useEffect(() => {
    document.documentElement.style.setProperty('--reader-font-size', `${SIZE_PX[fontSize]}px`);
  }, [fontSize]);

  // Apply typeface CSS variable to root
  useEffect(() => {
    const tf = TYPEFACES.find((t) => t.id === typeface);
    if (tf) document.documentElement.style.setProperty('--reader-font-family', tf.stack);
  }, [typeface]);

  const setSetting = (key: string, value: string) => {
    sidecar?.setSetting(key, value);
    void sidecar?.persist();
    refresh();
  };

  // Map mass.form to mass.solemn for the specials engine
  useEffect(() => {
    const solemn = massForm === 'sollemnis' || massForm === 'cantata' ? '1' : '0';
    sidecar?.setSetting('mass.solemn', solemn);
  }, [massForm, sidecar]);

  return (
    <>
      <button
        className={`tray-handle${open ? ' open' : ''}`}
        onClick={onToggle}
        aria-label="Presentation tray"
        aria-expanded={open}
        title="Presentation settings"
      >
        <span className="tray-handle-icon">⚙</span>
      </button>
      {open && (
        <div className="tray-panel" role="complementary" aria-label="Presentation settings">
          <div className="tray-header">
            <h3>Presentation</h3>
            <button className="tray-close" onClick={onToggle} aria-label="Close tray">×</button>
          </div>

          <section className="tray-section">
            <h4>Mass form</h4>
            <div className="tray-radio-group">
              {MASS_FORMS.map((f) => (
                <label key={f.id} className={`tray-radio${massForm === f.id ? ' active' : ''}`}>
                  <input
                    type="radio"
                    name="mass-form"
                    checked={massForm === f.id}
                    onChange={() => setSetting('mass.form', f.id)}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </section>

          <section className="tray-section">
            <h4>Role lens</h4>
            <p className="tray-hint">Highlights the selected role's parts (never hides others).</p>
            <div className="tray-radio-group">
              {ROLE_LENSES.map((r) => (
                <label key={r.id} className={`tray-radio${roleLens === r.id ? ' active' : ''}`}>
                  <input
                    type="radio"
                    name="role-lens"
                    checked={roleLens === r.id}
                    onChange={() => setSetting('mass.roleLens', r.id)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </section>

          <section className="tray-section">
            <h4>Rubrics</h4>
            <label className="tray-toggle">
              <input
                type="checkbox"
                checked={rubricsOn}
                onChange={(e) => setSetting('mass.rubrics', e.target.checked ? '1' : '0')}
              />
              {' '}Show rubric layer
            </label>
          </section>

          <section className="tray-section">
            <h4>Typeface</h4>
            <div className="tray-radio-group">
              {TYPEFACES.map((t) => (
                <label key={t.id} className={`tray-radio${typeface === t.id ? ' active' : ''}`}>
                  <input
                    type="radio"
                    name="typeface"
                    checked={typeface === t.id}
                    onChange={() => setSetting('mass.typeface', t.id)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </section>

          <section className="tray-section">
            <h4>Font size</h4>
            <div className="tray-size-group">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  className={`tray-size-btn${fontSize === s ? ' active' : ''}`}
                  onClick={() => setSetting('mass.fontSize', s)}
                  style={{ fontSize: `${SIZE_PX[s]}px` }}
                >
                  A
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
