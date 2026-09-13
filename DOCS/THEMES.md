# Theme matrix — 8 palettes × light/dark, optional frosted glass

The single source of truth for the theming system (extends ARCHITECTURE.md decision 13).
`tests/themes.test.ts` enforces everything on this page.

## How a theme works

A theme is a `(family, mode)` pair stamped on `<html>` as `data-theme` / `data-mode`
(`src/core/theme/themes.ts`, `applyTheme()`). An independent `data-glass` boolean adds
frosted surfaces to any palette. The seasonal liturgical accent remains an independent,
**orthogonal** attribute `data-color` — **no family may ever declare `--accent`**; hue follows
the day, structure follows the family.

### Token tiers

| Tier | Tokens | Where defined |
|---|---|---|
| Core palette (14) | `--surface --surface-2 --card --card-border --rail-bg --card-shadow --ink --ink-soft --ink-faint --pane-latin-bg --pane-english-bg --rubric --dialogue-p --dialogue-s` | **Every family defines all 14 in BOTH modes**: `html[data-theme='X']` (light) and `html[data-theme='X'][data-mode='dark']` (dark, compound selector so it wins the cascade) |
| Mode-level element tokens | `--scheme --scrim --shadow-color --shadow-strong --mark-ann --query-bg --dot-border --lens-a --lens-b --marker-yellow --marker-green --marker-pink --marker-blue` | `:root` carries the light values; one shared `html[data-mode='dark']` block at the foot of the theme section carries the dark values. **Family blocks never redeclare these** — that is what keeps the cascade un-breakable |
| Constants (never vary) | `--on-accent` `--rail-chip-bg --rail-overlay --rail-overlay-strong --rail-chip-border --rail-chip-ring --rail-chip-text --rail-chip-muted --menu-bg --menu-text --menu-divider --badge-play --badge-ms --ann-accent-gold/rose/sky/moss` | `:root` only. The rail, context menu and tooltips are dark in all 16 cells, so their overlay family is family-independent |
| Derived | `--hit-bg: var(--card)` | `:root`; follows each family automatically |

In dark mode `--accent-soft` is re-derived by the shared dark block as
`color-mix(in srgb, var(--accent) 17%, transparent)` — higher alpha than the light
`data-color` values, same seasonal hue.

### Regression guards (enforced by tests)

1. **light ≠ dark** — for every family, ≥4 core tokens must differ between its two cells
   (the original bug: one global `html[data-mode='dark']` block lost the cascade to every
   family's light block, so 7 of 8 families ignored dark mode entirely).
2. The shared dark block must **never** re-declare core tokens.
3. Shared component rules must contain **no raw colors** — tokens only.

## The matrix

Core-palette values per cell. Values not listed here are unchanged from the light cell.

### skeuomorphic — "Parchment" (default)

Fabric-textured parchment; weft/warp gradients, piped borders, tension shadows.
Dark cell = deep warm ink surfaces (from the journal sidecar prototype).

### sanctissimissa

Elevated white cards on the parchment framework (§7.7); gold-bordered propers.
The original light+dark reference pair.

### slate — "Slate" (formerly `glass-acrylic`)

Cool slate palette. Dark uses `#0b1220` page surfaces and `#0f172a` cards.
Glass is controlled by the independent checkbox; the base cards are opaque.

### minimal — "Minimal" (formerly `glass-clear`)

Neutral surfaces with crisp edges. Dark uses `#05070c` page surfaces and
`#14161b` cards. Glass is controlled by the independent checkbox.

### retro-futurist

Warm amber 1970s surfaces with soft glow. Dark = midnight-amber
(`#1f1207` surface, `#fde68a` ink, `#b45309` borders).

### brutalist

Stark monochrome, hard offset shadows. Dark = inverted mono
(black surfaces, white borders/ink, `4px 4px 0 #fff` shadow).

### retro-terminal — "Retro Terminal (CRT)" (was `neo-brutalist`)

Phosphor CRT. **Dark (primary)**: near-black green-tinted surfaces, phosphor-green ink
(`#7ee787`), amber rubric voices (`#ffb000`), glow shadow, **static scanline overlay**
(`body::after`, pointer-events none — no flicker, reduced-motion-safe), monospace chrome
(`--sans` → mono stack, buttons un-italicized).
**Light**: "green-bar printer paper" — pale green surface with repeating band stripes,
deep-green ink, amber-brown rubric.
Legacy persisted id `neo-brutalist` migrates via `LEGACY_FAMILY_ALIASES`
(`themes.ts`, applied by `ThemePicker` on read).

### hello-word-glow

Subway-line glow pulse (`glow-pulse` 4s, tokenized `--glow-*` colors so each mode pulses
its own hue) and Marian violet accents. **Dark**: the original Midnight Nave palette
(`#07111f` / `#0b1f3a` / `#63e6ff`). **Light**: day chapel — pale ice-blue
(`#eef6fb` surface, `#9bd7ea` borders, `#0b1f3a` ink).

## Optional material: Frosted glass

Settings → Appearance has a native **Frosted glass** checkbox below the family
and mode controls. It defaults off for new preferences. Enabling it adds
palette-tinted translucent panels, inactive Settings tabs, navigation and reader
cards with a 12px backdrop blur. Text stays sharp and the active tab retains its
seasonal accent. Changing palette or mode preserves the checkbox value.

The material uses current theme tokens and a subtle palette-derived backdrop;
it never replaces the seasonal accent or the family's typography. Supported
browsers use standard/prefixed backdrop-filter. Reduced-transparency preferences,
unsupported browsers and print use opaque surfaces without the optional blur.

Preferences stay in the existing stores: `theme.family`, `theme.mode`, and
`theme.glass` (`'1'`/`'0'`) in the sidecar; `sam.theme.v1` caches
`{ family, mode, glass }` locally for startup. App restores the settings before
the user visits Appearance. Valid sidecar fields take precedence on hydration.
Legacy `glass-acrylic` and `glass-clear` migrate to Slate and Minimal with glass
on unless an explicit saved glass value overrides it; both use the same frosted
material. `neo-brutalist` still migrates to Retro Terminal.

The complete contract and migration cases live in
[the optional-glass decision](ARCHITECTURE/sanctissimissa-v1.39.15371-optional-glass-20260913.md).

## Editor (CKEditor 5)

`src/ui/richtext/richtext-theme.css` maps CK's `--ck-*` variables onto this contract at
`:root` — imported immediately after `ckeditor5/ckeditor5.css` so the overrides win.
Stock hardcoded CK colors (green save, red cancel, blue links, yellow highlight) are
remapped to `--accent` / `--rubric` / `--marker-yellow`; content markers use the
mode-aware `--marker-*` tokens; on-accent text uses `--on-accent`. The editor therefore
follows all 16 cells with zero per-theme JS.
