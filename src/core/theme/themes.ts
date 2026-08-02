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
  | 'neo-brutalist'
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
  { id: 'neo-brutalist', label: 'Neo-brutalist maximalist' },
  { id: 'hello-word-glow', label: 'Hello Word Glow' },
];

export const DEFAULT_FAMILY: ThemeFamily = 'skeuomorphic';

export function systemMode(): ThemeMode {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(family: ThemeFamily, mode: ThemeMode): void {
  document.documentElement.dataset.theme = family;
  document.documentElement.dataset.mode = mode;
}
