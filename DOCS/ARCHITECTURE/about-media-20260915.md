# About Media Montage & Derivative-Corpus Attribution — AM contract (2026-09-15)

**Status:** adopted operator contract for Stanza AM; governs the About-workspace
media montage, the About lightbox, and the derivative-corpus attribution
rewording. Co-active with [LS-1](../../DOCS/ARCHITECTURE.md) — AM touches only
the About surface and `content/` enumeration; it does not modify LS scope.
Design source frozen under `LIBS/UI/STITCH/sanctissimissa-about-20260915/`
(Stitch project `14487439725465174200`, screen `dd4c40efd3ee4d2ab5079ceea8fbdc09`,
design system `a5b8c45f4d454c7f9a8fc5e3d3e6fde4` built from the frozen LS
`DESIGN.md`). Component design basis:
[PROPOSALS/about-media-montage-2026-09-15.md](../PROPOSALS/about-media-montage-2026-09-15.md).

## 1. Frozen design source → component wiring

Root: `LIBS/UI/STITCH/sanctissimissa-about-20260915/` (**UI_ROOT** below).

| Export | Screen ID | Addressable elements (from the export) | Target component |
|---|---|---|---|
| `about.html` | `dd4c40efd3ee4d2ab5079ceea8fbdc09` | `figure.figure-float-right`, `figure.figure-float-left`, `.figure-card` (hover lift, `cursor: zoom-in`), `figcaption` (accent dot + caption), `.aspect-[4/3]` media well, `.dropcap`, `.ornament-rule`, `.def-grid` Version & Build card, lightbox stage (scrim, `2 of 4` counter, ‹ › buttons, ✕ close, caption line, filmstrip dots) | `AboutMediaFigure`, `AboutLightbox`, `AboutView` (Version & Build `dd`), `styles.css` `.about-workspace` extensions |

Wiring rule (TC12): preserve the export's markup semantics, layout and
selector vocabulary mapped onto the app's design tokens; omit the specimen's
top nav rail (the app owns navigation) and its Tailwind/CDN fonts (the app's
`--serif`/`--sans` stacks stand in). Specimen prose and photographs are
placeholders: the shipped page renders `content/origin-story.md` and real
operator media only.

## 2. Entities

| Entity | Type | File:line | St | Role |
|---|---|---|---|---|
| `ABOUT_MEDIA` / `AboutMedium` | module/type | `src/content/aboutMedia.ts` | P-AM | Build-time enumeration of backstory media in `content/` |
| `planMediaMounts(blockCount, media)` | function | `src/content/aboutMedia.ts` | P-AM | Even-spacing placement; right-first alternation; overflow tail |
| `AboutMediaFigure` | component | `src/ui/AboutView.tsx` | P-AM | Float figure (`photo`/`video`), caption, open-lightbox affordance |
| `AboutLightbox` | component | `src/ui/AboutView.tsx` | P-AM | Overlay dialog: zoom-in entrance, ‹ › nav, ✕/Esc/scrim close, 1×/2× zoom + pan, video controls |
| `AboutView` (amended) | component | `src/ui/AboutView.tsx` | S→P-AM | Origin Story interleaves figures between prose blocks; Corpus `dd` reworded |
| `ABOUT_CONTENT` (amended) | content | `src/content/about.ts` | S→P-AM | Kiss acknowledgement bullet + license paragraph reworded to derivative framing |
| `.about-media` / `.about-lightbox` styles | CSS | `src/styles.css` | P-AM | Floats + reflow + hover + overlay, token-mapped from UI_ROOT |

Independent agents must produce these identifiers byte-identically.

## 3. Enumeration contract

- Media live **directly in `content/`** (the backstory folder, beside
  `origin-story.md`); subfolders are ignored; non-media files never match.
- Enumeration is build-time only (offline-safe under Tauri assets and the PWA
  precache; no runtime directory index exists):

  `import.meta.glob('../../content/*.{jpg,jpeg,png,gif,webp,avif,mp4,webm,mov,m4v}', { query: '?url', import: 'default', eager: true })`

- `ABOUT_MEDIA: AboutMedium[]` where `AboutMedium = { url, kind: 'photo' | 'video', name }`;
  natural filename order (`Intl.Collator`, `numeric: true`) — the operator
  sequences the montage by filename (`01-…`, `02-…`). `name` = filename stem.
- **Drop-in rule:** add files to `content/`, rebuild — no code changes; the
  next release re-bundles them into web, desktop and Android identically.
- Zero media ⇒ empty montage; the page renders exactly as before (no
  placeholder surfaces — decision 6). MP4(H.264)/WebM recommended; MOV/M4V
  depend on WebView codecs.

## 4. Placement contract

For `B` prose blocks, `M` media: `afterBlock(i) = clamp(round((i+1)·B/(M+1)) − 1, 0, B−1)`,
made strictly increasing; figures mount **between** blocks; `side(i) = i even → right, odd → left`
(**right first**); media beyond `B` mounts sequentially after the final block,
continuing the alternation. Pure and unit-tested.

## 5. Lightbox interaction contract

- Inline figures: `@media (pointer: fine)` hover lift + zoom cursor (from
  `.figure-card`); click / short-tap opens the lightbox.
- Lightbox: fixed overlay, `role=dialog aria-modal`, `--scrim` backdrop,
  zoom-in entrance (disabled under `prefers-reduced-motion`), ‹ → previous /
  › → next (wrap), ✕ / Esc / scrim click closes, double-click / double-tap
  toggles 1× ⇄ 2× with drag pan; video variant plays with `controls`, loop.
  Counter and caption line follow the export's lightbox stage.

## 6. Attribution contract (derivative corpus)

| Site | Wording |
|---|---|
| `AboutView` Corpus `dd` | `Derivative of Divinum Officium (László Kiss, MIT): gap-filled and cross-translated from the Clementine Vulgate and Douay–Rheims, then re-realized as a graph + vector SQLite corpus` |
| `about.ts` acknowledgements | `**László Kiss** — Divinum Officium (MIT), vendored in VENDORED/divinum-officium/ as the base corpus. Ingest-time gap-fill and cross-translation mean the shipped corpus is a derivative of Kiss's work, not a mirror of it.` |
| `about.ts` license | `The liturgical corpus is a derivative work built on Divinum Officium (László Kiss, MIT-licensed): extended at ingest from the Clementine Vulgate and Douay–Rheims and re-realized as a graph + vector SQLite database.` |

Basis: V0.7 gap-fill chain (`DOCS/CORPUS-SCHEMA.md`), routes S/A/C
(`DOCS/MISSING-REFERENCES.md`), fill log (`DOCS/CORPUS-FILL-LOG.md`).

## 7. Platform notes

- Tauri CSP unchanged (`default-src 'self'` covers bundled video); AM.07
  verifies playback in the Linux WebKit build.
- PWA: images enter the existing precache; `mp4|webm|mov|m4v` get a runtime
  `CacheFirst` media route (offline after first view, precache unbloat ed).
- `vite.config.ts` `assetsInclude` for `mov`/`m4v` only if not emitted by default.
