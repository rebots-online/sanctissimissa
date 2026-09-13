/**
 * Appearance controls: palette, light/dark/system mode, and optional glass.
 * Shared persistence keeps Settings and the app's startup restoration aligned.
 */

import { useEffect, useId, useState } from 'react';
import {
  THEME_FAMILIES,
  applyTheme,
  readThemePreference,
  writeThemePreference,
  systemMode,
  type ThemeFamily,
  type ThemePreference,
  type ThemeSettingsStore,
} from '../core/theme/themes.ts';

interface Props {
  sidecar: ThemeSettingsStore | null;
}

export default function ThemePicker({ sidecar }: Props) {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference(sidecar));
  const [hydratedSidecar, setHydratedSidecar] = useState<ThemeSettingsStore | null | undefined>(undefined);
  const glassHelpId = useId();
  const { family, mode, glass } = preference;

  useEffect(() => {
    setPreference(readThemePreference(sidecar));
    setHydratedSidecar(sidecar);
  }, [sidecar]);

  useEffect(() => {
    // A newly available sidecar must hydrate before old state can overwrite it.
    if (hydratedSidecar !== sidecar) return;
    applyTheme(preference.family, preference.mode === 'system' ? systemMode() : preference.mode, preference.glass);
    void writeThemePreference(sidecar, preference).catch(() => {
      // The local cache and live appearance remain usable if sidecar persistence fails.
    });
  }, [preference, sidecar, hydratedSidecar]);

  const cycleMode = () =>
    setPreference((current) => ({
      ...current,
      mode: current.mode === 'light' ? 'dark' : current.mode === 'dark' ? 'system' : 'light',
    }));
  const glyph = mode === 'light' ? '☀︎' : mode === 'dark' ? '☾' : '◐';

  return (
    <div className="theme-picker">
      <select
        aria-label="Theme family"
        value={family}
        onChange={(e) => {
          const nextFamily = e.target.value as ThemeFamily;
          setPreference((current) => ({ ...current, family: nextFamily }));
        }}
      >
        {THEME_FAMILIES.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <button type="button" onClick={cycleMode} title={`Mode: ${mode} — click to change`}>
        {glyph} {mode}
      </button>
      <label className="theme-glass-toggle">
        <input
          type="checkbox"
          checked={glass}
          aria-describedby={glassHelpId}
          onChange={(e) => {
            const nextGlass = e.target.checked;
            setPreference((current) => ({ ...current, glass: nextGlass }));
          }}
        />
        Frosted glass
      </label>
      <p className="theme-glass-help" id={glassHelpId}>
        Adds translucent, softly blurred backgrounds to this theme. Text and controls stay clear.
      </p>
    </div>
  );
}
