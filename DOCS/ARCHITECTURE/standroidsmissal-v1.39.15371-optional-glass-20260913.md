# Optional frosted glass — 2026-09-13

Operator request: replace the separate glass themes with a checkbox that applies
the material to any theme. This extends decision 13 and supersedes the glass
family/material portions of BJ.1/BJ.2 and BX.3.

## Mapping evidence and scope

PROJECT_INDEX.md/json are absent and .codegraph is empty; the codegraph query
reported no index. Targeted reads of the existing theme registry, ThemePicker,
App startup, theme CSS and theme tests established the integration points below.
No index was regenerated. The existing Settings Appearance surface supplies the
design: add a native labelled checkbox below its family and mode controls, with
helper text below it. No new screen or interaction pattern is introduced.

## Decisions

- Family, mode, and glass are independent. The default remains Parchment with
  system mode and glass OFF. Changing family or mode preserves the glass choice.
- Keep all eight palettes: rename glass-acrylic to slate (label Slate), and
  glass-clear to minimal (label Minimal). Their light/dark palette colors remain;
  their base card fills become opaque. Their glass material is now optional.
- Legacy glass family IDs migrate to their corresponding palette and glass ON
  when no explicit glass value exists. Explicit false wins. Both legacy styles
  now use the same frosted effect; there is no separate clear-glass strength.
- Store the boolean as theme.glass = '1'/'0' in the existing sidecar settings,
  and as glass: boolean in the existing sam.theme.v1 localStorage object. Keep
  family and mode in those same existing stores. LocalStorage is also an early
  startup cache; valid sidecar fields win once it is ready. Missing sidecar
  fields fall back to cached fields, except a stored legacy family with no
  glass field implies glass ON. Invalid/unavailable storage degrades to defaults.
- App restores the preference on startup and when the sidecar becomes ready,
  so reopening the app restores glass without first visiting Settings. System
  color-scheme changes reapply the current stored preference; explicit light or
  dark is unaffected. ThemePicker remains the single editing surface.
- The checkbox label is **Frosted glass**. Helper: **Adds translucent, softly
  blurred backgrounds to this theme. Text and controls stay clear.** Use native
  keyboard behavior, associated helper text, visible focus and no opacity on
  labels. Active tabs keep their accent fill; inactive tabs receive the material.
- CSS applies blur to backdrops only, never to text or whole controls. The
  material uses the current theme tokens, preserves seasonal --accent and
  family typography, and adds a subtle palette-derived gradient behind surfaces
  so frosting has something visible to sample. Scope transparency to supported
  backdrop-filter browsers and normal transparency preference; unsupported,
  prefers-reduced-transparency: reduce, and print retain opaque base surfaces.

## Entity table

Line anchors name the pre-edit region; signatures and file paths are binding.

| Entity | Target file:line | Role and signature/fields |
|---|---|---|
| ThemeFamily / THEME_FAMILIES | src/core/theme/themes.ts:7 | Existing eight-family registry; glass-acrylic → slate, glass-clear → minimal; labels Slate and Minimal |
| LEGACY_FAMILY_ALIASES / normalizeFamily | src/core/theme/themes.ts:32 | Retain neo-brutalist migration and add both old glass IDs |
| ThemeModePreference / ThemePreference | src/core/theme/themes.ts:17 | Export 'light' \| 'dark' \| 'system'; object { family: ThemeFamily; mode: ThemeModePreference; glass: boolean } |
| ThemeSettingsStore | src/core/theme/themes.ts:17 | Export structural store { getSetting(key: string): string \| null; setSetting(key: string, value: string): void; persist(): Promise<void> } |
| normalizeThemePreference | src/core/theme/themes.ts:38 | Export (raw: unknown): ThemePreference; pure validation and legacy migration; accepts glass boolean or sidecar '1'/'0'; malformed object/default guard |
| sessionThemePreference / sessionThemePreferenceUnsaved | src/core/theme/themes.ts:38 | Module-local ThemePreference or null; live fallback when browser storage throws or the last cache write failed; unsaved boolean clears on successful cache write so OS scheme changes cannot restore stale preferences |
| readThemePreference | src/core/theme/themes.ts:38 | Export (sidecar: ThemeSettingsStore \| null): ThemePreference; guarded JSON read and fieldwise sidecar precedence as above |
| writeThemePreference | src/core/theme/themes.ts:38 | Export (sidecar: ThemeSettingsStore \| null, preference: ThemePreference): Promise<void>; cache + existing sidecar keys, awaits persist |
| applyTheme | src/core/theme/themes.ts:49 | (family: ThemeFamily, mode: ThemeMode, glass?: boolean): void; default false; stamps data-theme, data-mode, data-glass='true'/'false'; never changes data-color |
| ThemePicker | src/ui/ThemePicker.tsx:68 | Existing sidecar prop now uses ThemeSettingsStore; single ThemePreference state; read shared helper on mount/sidecar hydration; write after hydration; show native checkbox and linked help |
| App theme restoration | src/App.tsx:85 | Effect restores with readThemePreference/applyTheme at mount and sidecar change; subscribe to system scheme with cleanup and reread current preference when it fires |
| Optional glass CSS | src/styles.css:953 | Rename family selectors, make base cards opaque, remove family-specific blur; shared html[data-glass='true'] material after existing component rules, scoped to @supports and screen, with explicit reduced-transparency reset |
| Glass surface set | src/styles.css:1524 | .rail, .masthead, .bilingual .latin/.english, .reader-section, .exegesis, .exegesis .hit, .cal-cell, .hour-card, .ctx-menu, .lore-callout, .settings-workspace .settings-section/.theme-picker/.theme-preview and .settings-tabs button:not(.active); tokens match existing surface roles |
| Checkbox CSS | src/styles.css:1541 | .theme-glass-toggle, .theme-glass-help; wrapped label and width-limited helper, accent-color, visible focus |
| Theme regression suite | tests/themes.test.ts:1 | Existing node:test suite retains palette/mode/accent checks; adds normalization, migration, store precedence/roundtrip, DOM-attribute independence and glass CSS fallbacks |

## Verification

Permanent automated gates: node --experimental-strip-types --test tests/themes.test.ts;
npx tsc -b --pretty false; npm test. Build through npm run build after recording
the complete source commit, respecting pre-build-gate and native Linux host.
These are end-state assertions; no CHECKLIST acceptance depends on dirty state,
external services, or a human click.

Operator verification protocol: in the local app, toggle glass in Appearance;
switch between Parchment, Slate, Minimal, Brutalist and Retro Terminal in both
modes. Labels and focus remain sharp, selected tab remains obvious, inactive
tabs/panels visibly frost. Uncheck restores base surfaces. Reload on Holy Mass
and reopen Settings to observe persisted choice; also check narrow layout.
Record browser observations separately from automated acceptance.


## Browser observations — 2026-09-13, native Linux asrock

The real app and corpus ran locally through npm run dev. All eight palette
choices were exercised in both light and dark mode: inactive Settings tabs
computed a 12px backdrop blur, their foreground filter remained none, and the
active tab retained its seasonal accent fill. Slate was visually inspected.

The checkbox started unchecked with fresh preferences. Space toggled it with a
visible focus outline. Both on and off persisted after a reload on Holy Mass,
before reopening Settings. Explicit light mode survived an emulated OS dark-mode
change. At a 390px viewport, the checkbox and wrapped help stayed within the
viewport (control right edge 332px).

Reduced-transparency emulation removed blur and produced a fully opaque tab
background after the normal color transition settled; print emulation also
removed blur. All emulation/viewport overrides were reset. Browser console
reported no errors during these checks. These observations supplement the
permanent automated gates; they are not CHECKLIST acceptance predicates.


## Automated and production-build observations

On source commit `26f08d23`, the focused theme suite passed 46/46 tests, the
complete suite passed 321/321 tests (37 suites), TypeScript exited 0, and
`npm run build` passed its clean-source/duplicate/version gates and built the
web/PWA in 5.57 seconds. The existing sql.js static/dynamic import warnings
were non-fatal. A production preview showed all eight palette choices and the
checkbox; an inactive tab computed 12px backdrop blur and foreground filter none.
The final preference implementation passed an independent read-only review,
including blocked reads, quota-failed cache writes and successful-write recovery.
No public deployment or native release was performed.
