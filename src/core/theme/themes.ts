/**
 * Theme registry (decision 13 + §7.7) — a theme is a (family, mode) pair
 * stamped on <html> as data-theme / data-mode; the token blocks in styles.css
 * do the rest. The seasonal liturgical accent (data-color) stays orthogonal.
 */

export type ThemeFamily =
  | 'glass-acrylic'
  | 'glass-clear'
  | 'skeuomorphic'
  | 'retro-futurist'
  | 'brutalist'
  | 'retro-terminal'
  | 'sanctissimissa'
  | 'hello-word-glow';
export type ThemeMode = 'light' | 'dark';

export const THEME_FAMILIES: { id: ThemeFamily; label: string }[] = [
  { id: 'skeuomorphic', label: 'Parchment (skeuomorphic)' },
  { id: 'sanctissimissa', label: 'Sanctissimissa' },
  { id: 'glass-acrylic', label: 'Glass — acrylic' },
  { id: 'glass-clear', label: 'Glass — clear' },
  { id: 'retro-futurist', label: 'Retro-futurist' },
  { id: 'brutalist', label: 'Brutalist' },
  { id: 'retro-terminal', label: 'Retro Terminal (CRT)' },
  { id: 'hello-word-glow', label: 'Hello Word Glow' },
];

/** Persisted ids that renamed — mapped onto the successor family on read. */
export const LEGACY_FAMILY_ALIASES: Record<string, ThemeFamily> = {
  'neo-brutalist': 'retro-terminal',
};

export function normalizeFamily(raw: string): ThemeFamily {
  if (THEME_FAMILIES.some((f) => f.id === raw)) return raw as ThemeFamily;
  return LEGACY_FAMILY_ALIASES[raw] ?? DEFAULT_FAMILY;
}

export const DEFAULT_FAMILY: ThemeFamily = 'skeuomorphic';

export function systemMode(): ThemeMode {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(family: ThemeFamily, mode: ThemeMode): void {
  document.documentElement.dataset.theme = family;
  document.documentElement.dataset.mode = mode;
}
