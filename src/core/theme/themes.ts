/**
 * Palette, mode and optional glass material are independent preferences,
 * stamped on <html>. The seasonal liturgical accent (data-color) stays orthogonal.
 */

export type ThemeFamily =
  | 'slate'
  | 'minimal'
  | 'skeuomorphic'
  | 'retro-futurist'
  | 'brutalist'
  | 'retro-terminal'
  | 'sanctissimissa'
  | 'hello-word-glow';
export type ThemeMode = 'light' | 'dark';
export type ThemeModePreference = ThemeMode | 'system';
export type ThemePreference = { family: ThemeFamily; mode: ThemeModePreference; glass: boolean };

/** Structural slice of SidecarDb; the theme layer does not depend on its implementation. */
export interface ThemeSettingsStore {
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  persist(): Promise<void>;
}

export const THEME_FAMILIES: { id: ThemeFamily; label: string }[] = [
  { id: 'skeuomorphic', label: 'Parchment (skeuomorphic)' },
  { id: 'sanctissimissa', label: 'Sanctissimissa' },
  { id: 'slate', label: 'Slate' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'retro-futurist', label: 'Retro-futurist' },
  { id: 'brutalist', label: 'Brutalist' },
  { id: 'retro-terminal', label: 'Retro Terminal (CRT)' },
  { id: 'hello-word-glow', label: 'Hello Word Glow' },
];

/** Persisted ids that renamed — mapped onto the successor family on read. */
export const LEGACY_FAMILY_ALIASES: Record<string, ThemeFamily> = {
  'neo-brutalist': 'retro-terminal',
  'glass-acrylic': 'slate',
  'glass-clear': 'minimal',
};

export function normalizeFamily(raw: string): ThemeFamily {
  if (THEME_FAMILIES.some((f) => f.id === raw)) return raw as ThemeFamily;
  return Object.hasOwn(LEGACY_FAMILY_ALIASES, raw) ? LEGACY_FAMILY_ALIASES[raw] : DEFAULT_FAMILY;
}

export const DEFAULT_FAMILY: ThemeFamily = 'skeuomorphic';
const LS_KEY = 'sam.theme.v1';
let sessionThemePreference: ThemePreference | null = null;
let sessionThemePreferenceUnsaved = false;

export function normalizeThemePreference(raw: unknown): ThemePreference {
  const value = raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const legacyGlass = value.family === 'glass-acrylic' || value.family === 'glass-clear';
  return {
    family: typeof value.family === 'string' ? normalizeFamily(value.family) : DEFAULT_FAMILY,
    mode: value.mode === 'light' || value.mode === 'dark' ? value.mode : 'system',
    glass: typeof value.glass === 'boolean' ? value.glass
      : value.glass === '1' ? true : value.glass === '0' ? false : legacyGlass,
  };
}

export function readThemePreference(sidecar: ThemeSettingsStore | null): ThemePreference {
  let cached: ThemePreference = normalizeThemePreference(null);
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw !== null) {
      try {
        cached = normalizeThemePreference(JSON.parse(raw));
      } catch {
        // An accessible but corrupt cache is discarded in favor of valid defaults.
      }
    }
  } catch {
    // A blocked cache must not replace a live user choice on a system-mode change.
    cached = sessionThemePreference ?? cached;
  }
  if (sessionThemePreferenceUnsaved) cached = sessionThemePreference ?? cached;
  if (!sidecar) {
    sessionThemePreference = cached;
    return cached;
  }

  const family = sidecar.getSetting('theme.family');
  const mode = sidecar.getSetting('theme.mode');
  const glass = sidecar.getSetting('theme.glass');
  const validFamily = typeof family === 'string'
    && (THEME_FAMILIES.some((entry) => entry.id === family) || Object.hasOwn(LEGACY_FAMILY_ALIASES, family));
  const preference = normalizeThemePreference({
    family: validFamily ? family : cached.family,
    mode: mode === 'light' || mode === 'dark' || mode === 'system' ? mode : cached.mode,
    glass: glass === '1' || glass === '0' ? glass
      : validFamily && (family === 'glass-acrylic' || family === 'glass-clear') ? true : cached.glass,
  });
  sessionThemePreference = preference;
  return preference;
}

export async function writeThemePreference(
  sidecar: ThemeSettingsStore | null,
  preference: ThemePreference,
): Promise<void> {
  const normalized = normalizeThemePreference(preference);
  sessionThemePreference = normalized;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(normalized));
    sessionThemePreferenceUnsaved = false;
  } catch {
    // Readable old bytes must not override a newer choice that could not be saved.
    sessionThemePreferenceUnsaved = true;
  }
  if (sidecar) {
    sidecar.setSetting('theme.family', normalized.family);
    sidecar.setSetting('theme.mode', normalized.mode);
    sidecar.setSetting('theme.glass', normalized.glass ? '1' : '0');
    await sidecar.persist();
  }
}

export function systemMode(): ThemeMode {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(family: ThemeFamily, mode: ThemeMode, glass = false): void {
  document.documentElement.dataset.theme = family;
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.glass = String(glass);
}
