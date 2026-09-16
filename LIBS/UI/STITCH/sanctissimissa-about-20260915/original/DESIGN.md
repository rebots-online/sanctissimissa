# St. Android's Missal — Baseline UI Design System

> Frozen Stitch complement per **TC12 / I-20**. This file plus `screens/` is the
> UI source-of-truth consumed by `DOCS/ARCHITECTURE.md`. Coders wire these
> artifacts in at CODE; they never re-invent UI from them.
>
> Stitch project: `projects/9785949261255837034` (PRIVATE)
> Frozen: 2026-07-27

## 1. What the product is

The Traditional Latin Mass and Divine Office rendered as a **navigable subway
map**. Latin is normative; English is a modular translation that may be absent.
Every surface renders real corpus rows from one committed SQLite file — content
that was gap-filled is explicitly flagged, never silently fabricated.

The visual register is **parchment and ink, illuminated by the liturgical colour
of the day**. Not a "reading app" chrome; a missal.

## 2. Token contract (authoritative — do not replace)

Components consume **only** semantic tokens. The raw palette supplies the
skeuomorphic-light values behind them. A theme is `data-theme` (family) ×
`data-mode` (light|dark) stamped on `<html>`; `data-color` (liturgical accent)
is **orthogonal** to both and changes independently, per day.

### 2.1 Raw palette (skeuomorphic light basis)

| Token | Value | Role |
|---|---|---|
| `--ink` | `#221c14` | Primary text |
| `--ink-soft` | `#4a4034` | Secondary text |
| `--ink-faint` | `#8a7d6a` | Tertiary / metadata |
| `--parchment` | `#f6f0e2` | Page ground |
| `--parchment-deep` | `#ece2cc` | Borders, wells |
| `--vellum` | `#fbf7ee` | Raised card ground |
| `--gold` | `#a97e13` | Rule / ornament |
| `--gold-bright` | `#d4a017` | Ornament highlight |
| `--rail` | `#2b241b` | Nav rail ground |
| `--rail-text` | `#d9cdb8` | Nav rail text |

### 2.2 Subway line colours (structural, never themed away)

| Token | Value | Line |
|---|---|---|
| `--line-catechumens` | `#a97e13` | Mass of the Catechumens |
| `--line-faithful` | `#7a1f2b` | Mass of the Faithful |
| `--line-office` | `#274b69` | Divine Office |

### 2.3 Semantic tokens — the ONLY tokens components may reference

| Token | Light default | Role |
|---|---|---|
| `--surface` | `var(--parchment)` | App ground |
| `--surface-2` | `var(--vellum)` | Recessed / alternate ground |
| `--card` | `var(--vellum)` | Raised container ground |
| `--card-border` | `var(--parchment-deep)` | Container edge |
| `--card-shadow` | `none` | Container elevation |
| `--rail-bg` | `var(--rail)` | Nav rail |
| `--pane-latin-bg` | `rgba(84,62,26,0.075)` | Latin column wash |
| `--pane-english-bg` | `rgba(84,62,26,0.035)` | English column wash |

### 2.4 Liturgical text-role tokens (every family must define)

| Token | Value | Role |
|---|---|---|
| `--rubric` | `#9c2733` | Rubrics — instruction, not spoken text |
| `--dialogue-p` | `#9c2733` | Priest's part (℣) |
| `--dialogue-s` | `#5d3a80` | Server/people's part (℟) |

### 2.5 Liturgical accent — `data-color`, orthogonal

| `data-color` | `--accent` | Season/feast |
|---|---|---|
| `green` | `#3f7a52` | Time after Pentecost / Epiphany |
| `purple` | `#5d3a80` | Advent, Lent |
| `red` | `#9c2733` | Martyrs, Pentecost |
| `white` | `#a97e13` | Feasts of Our Lord, Confessors |
| `black` | `#33302b` | Requiem |
| `rose` | `#b76a7d` | Gaudete, Laetare |

`--accent-soft` is always the accent at ~13% alpha.

### 2.6 Theme families (8, each × light/dark)

`skeuomorphic` (**default**, Parchment) · `sanctissimissa` · `glass-acrylic` ·
`glass-clear` · `retro-futurist` · `brutalist` · `neo-brutalist` ·
`hello-word-glow`

A family redefines **§2.3 and §2.4 only**. A family that restyles individual
components is an anti-pattern (see §6).

## 3. Typography

| Role | Family | Notes |
|---|---|---|
| Body / liturgical text | `--serif` — Iowan Old Style, Palatino Linotype, Palatino, Georgia, Times New Roman | The reading voice. Default for `body`. |
| UI chrome, metadata | `--sans` — system-ui, Segoe UI, Roboto, Helvetica, Arial | Nav, chips, badges, toolbars. |

Base 16px / line-height 1.55. Latin sets one step larger than its English
counterpart — Latin is normative and must read as primary.

## 4. Layout

- **Shell**: CSS grid `232px | 1fr` — persistent left rail + main column.
  Rail collapses to `64px` icon-only at ≤860px (labels and feast name hide).
- **Main column**: masthead (feast name, rank badge, season/date subline) →
  optional map strip (all views except the map itself) → content.
- **Inspector**: right-hand resizable pane, drag divider; becomes a full
  overlay on narrow viewports. Holds either the meaning panel or the journal
  sidecar, never both.
- **Tray**: bottom drawer, reader/office only.
- **Bilingual reader**: two columns with distinct washes; collapses to one
  column at ≤1100px.

### 4.1 Breakpoint scale — normative

`640` (compact) · `860` (rail collapse) · `1100` (bilingual collapse)

Exactly three. Any other breakpoint is a defect (the current CSS also carries
`980` and `981`, which must converge onto this scale).

## 5. Component primitives — the shared vocabulary

Every surface composes from these. A view that invents its own equivalent is a
defect.

| Primitive | Role |
|---|---|
| `Rail` | Persistent nav: brand, primary nav, utility nav, day chip |
| `Masthead` | Feast name + rank badge + season/date subline |
| `MapStrip` | Horizontal you-are-here progress across Mass/Office stations |
| `Card` | Raised container: `--card` on `--card-border`, one radius, one shadow |
| `Toolbar` | Horizontal control bar inside a surface — **one implementation** |
| `Chip` | Compact key/value or filter token |
| `Badge` | Status/rank marker (e.g. rank class) |
| `Button` | Text / icon / segmented variants only |
| `Panel` | Inspector-hosted surface with title bar and close affordance |
| `SectionHead` | Collapsible liturgical section header with chevron |
| `BilingualPair` | Latin/English row honouring the two pane washes |
| `ResultRow` | Search/concordance hit with citation + snippet |
| `EmptyState` | Absent-content message — distinct from *filled* content |
| `FilledFlag` | Marks corpus text supplied by the gap-fill chain |

## 6. Anti-patterns (binding)

1. **Per-view component vocabularies.** Five toolbars currently exist
   (`.jsc-toolbar`, `.atlas-toolbar`, `.vmap-toolbar`,
   `.result-grouping-toolbar`, `.export-bar`) and three cards (`.about-card`,
   `.hour-card`, `.jsc-card`). There must be one of each.
2. **Theme families overriding components.** Only 4 of 8 families currently
   restyle component internals (`.reader-section`, `.hour-card`, heads,
   chevrons), so the other 4 drift. Families redefine tokens, never components.
3. **Breakpoints outside §4.1.**
4. **English rendered as primary**, or Latin absent where the corpus has it.
5. **Fabricated content.** Gap-filled text must carry `FilledFlag`; missing
   content uses `EmptyState`. Never invent liturgical text to fill a layout.
6. **Hardcoded colour.** Every colour resolves through §2.3–§2.5 tokens, so
   all 8 families × 2 modes × 6 accents stay valid.
7. **Losing the version tag.** Every surface renders the build version
   bottom-right, sourced from `version.json` (mandatory app chrome).

## 7. Screens

The complete routed surface set. Each has a folder under `screens/`.

| # | Screen | Route | Intent |
|---|---|---|---|
| 1 | Subway Map | `map` | SVG map of the Mass; stations click through to the reader |
| 2 | Missal Reader | `reader` | Bilingual reader; selection opens meaning or capture |
| 3 | Perpetual Calendar | `calendar` | Any date resolved at runtime; pick a day → reader |
| 4 | Divine Office | `office` | The eight hours for the day |
| 5 | Sacred Scripture | `bible` | Vulgate/Douay-Rheims browser, deep-linkable to verse |
| 6 | Journal | `journal` | Personal accompaniments anchored to corpus text |
| 7 | Homily Writer | `homily` | Compose against the day's propers |
| 8 | Settings | `settings` | Theme family/mode, preferences |
| 9 | Help · About | `about` | Version, versionCode, build date, provenance, licence |

Chrome surfaces, designed as states rather than routes:

| Surface | Host | Intent |
|---|---|---|
| Meaning Panel | inspector | Concept-grouped concordance + vector neighbours |
| Journal Sidecar | inspector | Capture a selection into an accompaniment |
| Tray Panel | reader/office | Quick settings drawer |
| Map Flyout | map | Station detail popover |

## 8. Journeys

1. **Daily Mass** — launch → today resolved → masthead names the feast → map →
   tap Introit → reader at that section → strip tracks scroll position.
2. **Understand a phrase** — reader → select Latin → meaning panel → concept
   groups + neighbours → tap a hit → reader opens *that source day*.
3. **Pray an hour** — office → hour → bilingual text → tray adjusts size.
4. **Look up scripture** — bible → book → chapter → verse; or arrive by
   deep-link `#/verse/Gen/1/5`.
5. **Keep a journal** — select text → capture → sidecar → anchored, searchable.
6. **Prepare a homily** — homily → day's propers → compose → export.
7. **Change the vesture** — settings → family + light/dark; accent keeps
   following the calendar independently.

## 9. Back-navigation contract

Every layer is a history entry. System/browser back unwinds
**panel → view → map**, exiting only from the root. A back press must never
terminate the app from a nested layer.
