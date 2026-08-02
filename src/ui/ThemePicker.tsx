/**
 * ThemePicker — compact rail widget (BJ.1): theme-family select + a
 * light/dark/system mode toggle. Persists to sidecar settings
 * (`theme.family` / `theme.mode`) when a sidecar is provided, else to
 * localStorage `sam.theme.v1` until BC.1 merges. Not mounted here — BO.3
 * wires it into the rail.
 */

import { useEffect, useState } from 'react';
import {
  THEME_FAMILIES,
  DEFAULT_FAMILY,
  applyTheme,
  systemMode,
  type ThemeFamily,
} from '../core/theme/themes.ts';

/** Structural slice of SidecarDb — no import from accompaniment code (I-10(b)). */
interface SettingsStore {
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  persist(): Promise<void>;
}

interface Props {
  sidecar: SettingsStore | null;
}

type ModePref = 'light' | 'dark' | 'system';

const LS_KEY = 'sam.theme.v1';
const FAMILY_IDS: string[] = THEME_FAMILIES.map((f) => f.id);

function readPersisted(sidecar: SettingsStore | null): { family: ThemeFamily; mode: ModePref } {
  let family: string | null = null;
  let mode: string | null = null;
  if (sidecar) {
    family = sidecar.getSetting('theme.family');
    mode = sidecar.getSetting('theme.mode');
  } else {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { family?: unknown; mode?: unknown };
        if (typeof parsed.family === 'string') family = parsed.family;
        if (typeof parsed.mode === 'string') mode = parsed.mode;
      }
    } catch {
      /* absent or corrupt → defaults */
    }
  }
  return {
    family: family !== null && FAMILY_IDS.includes(family) ? (family as ThemeFamily) : DEFAULT_FAMILY,
    mode: mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system',
  };
}

export default function ThemePicker({ sidecar }: Props) {
  const [init] = useState(() => readPersisted(sidecar));
  const [family, setFamily] = useState<ThemeFamily>(init.family);
  const [mode, setMode] = useState<ModePref>(init.mode);
  const [hydratedSidecar, setHydratedSidecar] = useState<SettingsStore | null>(null);

  useEffect(() => {
    if (!sidecar) {
      setHydratedSidecar(null);
      return;
    }

    const storedFamily = sidecar.getSetting('theme.family');
    const storedMode = sidecar.getSetting('theme.mode');
    if (storedFamily !== null && FAMILY_IDS.includes(storedFamily)) {
      setFamily(storedFamily as ThemeFamily);
    }
    if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
      setMode(storedMode);
    }
    setHydratedSidecar(sidecar);
  }, [sidecar]);

  useEffect(() => {
    applyTheme(family, mode === 'system' ? systemMode() : mode);
    if (sidecar) {
      if (hydratedSidecar !== sidecar) return;
      sidecar.setSetting('theme.family', family);
      sidecar.setSetting('theme.mode', mode);
      void sidecar.persist();
    } else {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ family, mode }));
      } catch {
        /* storage unavailable (private mode) — theme still applies */
      }
    }
  }, [family, mode, sidecar, hydratedSidecar]);

  const cycleMode = () =>
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'));
  const glyph = mode === 'light' ? '☀︎' : mode === 'dark' ? '☾' : '◐';

  return (
    <div className="theme-picker">
      <select
        aria-label="Theme family"
        value={family}
        onChange={(e) => setFamily(e.target.value as ThemeFamily)}
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
    </div>
  );
}
