# About Media Montage & Derivative-Corpus Attribution — Component Design (AM)

- **Date**: 2026-09-15 (operator request 2026-09-14)
- **Status**: design proposal (sc:design output) — to be promoted into `DOCS/ARCHITECTURE/about-media-20260915.md` + CHECKLIST Stanza AM after Stitch design clearance
- **Type**: component design (sc:design --type component --format spec)
- **Design authority once frozen**: `LIBS/UI/STITCH/sanctissimissa-about-20260915/` (Stitch export; see §8 brief)

## 1. Request

1. The About page's Origin Story must automatically mount any photos/videos the
   operator drops into the backstory folder (`content/`, alongside
   `origin-story.md`), regularly spaced through the prose, alternating
   right-hand side first, then left, with text reflowed around each. New files
   must display without code changes.
2. Media opens in a lightbox: expands/zooms on mouse-over (desktop) and on
   short-press/tap (mobile). The About screen is the web app, embedded in the
   Tauri desktop and Android builds.
3. The Corpus attribution must stop claiming a mere re-realization of the Kiss
   corpus: ingest-time gap-fill/cross-translation from the Clementine Vulgate
   and Douay–Rheims plus the graph+vector re-realization make the shipped
   corpus quantitatively a **derivative** of Divinum Officium, not a mirror.

## 2. Current-state analysis (evidence)

| Fact | Evidence |
|---|---|
| Attribution metadata line is hardcoded | `src/ui/AboutView.tsx:84` |
| Kiss acknowledgement bullet | `src/content/about.ts:36` |
| License paragraph claims plain "used under the MIT License" | `src/content/about.ts:60` |
| Origin story = tracked `content/origin-story.md`, imported verbatim `?raw`, no fallback (build fails loudly if missing) | `src/content/about.ts:7-14` |
| Origin story renders as blocks split on blank lines; bullet runs → `<ul>`; `**bold**` → `<strong>` | `src/ui/AboutView.tsx:30-51` (`AboutProse`) |
| Story is ~7 prose/bullet blocks | `content/origin-story.md` |
| No media enumeration, no lightbox, no `img`/`video` CSS exists | `src/styles.css` (about block 1589–1684 only), `src/` survey |
| Tauri CSP allows bundled media | `src-tauri/tauri.conf.json:24` (`default-src 'self'`; img-src explicitly; video falls back to default-src) |
| Desktop/Android embed the same Vite output | `src-tauri/tauri.conf.json` `frontendDist: "../dist-web"` |
| Gap-fill machinery the attribution must reflect | `DOCS/CORPUS-SCHEMA.md:54-72` (V0.7 chain), `DOCS/MISSING-REFERENCES.md` (routes S/A/C), `scripts/scripture.mjs`, `scripts/do-parse.mjs` (`filled-from-scripture`, `filled-from-commune`), `DOCS/CORPUS-FILL-LOG.md` |

## 3. Enumeration contract — `src/content/aboutMedia.ts`

- Media live directly in `content/` (the backstory folder, next to
  `origin-story.md`). No subfolder required; subfolders (e.g.
  `content/library/`) are ignored.
- Enumeration is **build-time** via Vite glob — the only offline-safe option
  for a Tauri-bundled PWA (no runtime directory index exists on `tauri://` or
  in the precache):

  ```ts
  import.meta.glob('../../content/*.{jpg,jpeg,png,gif,webp,avif,mp4,webm,mov,m4v}',
                    { query: '?url', import: 'default', eager: true })
  ```

- Exports:
  - `AboutMedium = { url: string; kind: 'photo' | 'video'; name: string }` —
    `name` is the filename stem (alt/caption source).
  - `ABOUT_MEDIA: AboutMedium[]` — natural-sorted by filename
    (`Intl.Collator(undefined, { numeric: true })`), so the operator controls
    order by naming files `01-…`, `02-…`, …
  - `planMediaMounts(blockCount: number, media: AboutMedium[]): Mount[]` where
    `Mount = { medium: AboutMedium; afterBlock: number; side: 'right' | 'left' }`.
- Kind map: photo `jpg jpeg png gif webp avif`; video `mp4 webm mov m4v`.
  `mov`/`m4v` depend on WebView codecs (Safari/AppleOK, Linux WebKit varies) —
  MP4(H.264)/WebM are the recommended capture formats; documented in the
  module header, not enforced.
- Drop-in rule (module header comment): *add files to `content/` and rebuild —
  no code changes. `origin-story.md` and non-media files are never matched.*
- Zero media ⇒ `ABOUT_MEDIA = []` ⇒ page renders exactly as today (no
  placeholder surfaces — house decision 6).

## 4. Placement algorithm — `planMediaMounts`

For `B` prose blocks and `M` media (`M > 0`):

1. `afterBlock(i) = round((i + 1) · B / (M + 1)) - 1`, clamped to `[0, B-1]`,
   then made strictly increasing (collisions shift right). This spaces mounts
   evenly through the prose: `B=7, M=2 → after blocks 1 and 4`;
   `B=7, M=4 → after blocks 0, 2, 4, 5` (approx.; regular intervals, never
   before the first block).
2. Overflow (`M > B`): extra media mount sequentially after the final block.
3. `side(i) = i % 2 === 0 ? 'right' : 'left'` — **right first**, then
   alternating; overflow continues the alternation.
4. Figures mount **between** blocks (after block `i`, before `i+1`) — never
   inside a `<p>`, so reflow wraps cleanly around the float.

## 5. Component contracts

### 5.1 `AboutMediaFigure` (in `src/ui/AboutView.tsx`)

- DOM: `figure.about-media.about-media-right|-left` wrapping:
  - photo → `img` (`loading="lazy"`, `alt` = humanized filename stem)
  - video → `video` (`preload="metadata"`, `muted`, `loop`, `playsinline`,
    no controls) + `span.about-media-play` affordance
- `figcaption` (optional, muted, small): humanized stem — gives the montage
  caption rhythm without requiring sidecar files.
- Pointer: click/tap → opens `AboutLightbox` with this medium. Keyboard: figure
  is a `button`-like focusable (`tabindex=0`, Enter/Space) for a11y.

### 5.2 `AboutLightbox` (in `src/ui/AboutView.tsx`)

- Fixed overlay `div.about-lightbox[role=dialog][aria-modal=true]`, scrim =
  `--scrim` token; content centered; opens with zoom-in transition
  (`scale(0.92) → 1`), `prefers-reduced-motion` disables it.
- Media: photo `img` / video with `controls autoplay loop muted`.
- Zoom/pan: double-click (desktop) / double-tap (mobile) toggles 1× ⇄ 2× with
  drag-pan while zoomed.
- Navigation: ← / → move to previous/next medium (wraps); × button, scrim
  click, and Esc close.
- Hover behaviour (inline, not lightbox): `@media (pointer: fine)` — figure
  scales `1.03` with shadow + `cursor: zoom-in`; the lightbox itself opens on
  click/short-press (default chosen 2026-09-15; literal hover-open rejected as
  intrusive while scrolling prose).

### 5.3 Attribution rewording (exact strings)

| Site | Old | New |
|---|---|---|
| `AboutView.tsx` metadata `dd` | `Divinum Officium (László Kiss, MIT) — vendored, re-realized as graph + vector SQLite` | `Derivative of Divinum Officium (László Kiss, MIT): gap-filled and cross-translated from the Clementine Vulgate and Douay–Rheims, then re-realized as a graph + vector SQLite corpus` |
| `about.ts` acknowledgements bullet | `**László Kiss** — The Divinum Officium corpus, MIT-licensed and vendored in VENDORED/divinum-officium/` | `**László Kiss** — Divinum Officium (MIT), vendored in VENDORED/divinum-officium/ as the base corpus. Ingest-time gap-fill and cross-translation mean the shipped corpus is a derivative of Kiss's work, not a mirror of it.` |
| `about.ts` license paragraph | `The liturgical corpus (Divinum Officium) is used under the MIT License.` | `The liturgical corpus is a derivative work built on Divinum Officium (László Kiss, MIT-licensed): extended at ingest from the Clementine Vulgate and Douay–Rheims and re-realized as a graph + vector SQLite database.` |

## 6. Styling contract (styles.css, extends `.about-workspace` block)

- `.about-media`: `float: right` / `.about-media-left: float: left`; mirrored
  margins (`margin: 6px 0 14px 18px` and mirror); `width:
  clamp(220px, 34%, 380px)`; 1px `--card-border`, radius per app tokens,
  background `--card`. `overflow: hidden` keeps zoom inside bounds.
- Photos/videos fill the figure (`width: 100%; height: auto;
  display: block; object-fit: cover; aspect-ratio: 4 / 3` for photos, `16 / 9`
  for videos) — uniform rhythm regardless of source aspect.
- `< 720px`: width ≈ 44% — floats persist so text still reflows (operator
  requirement) while remaining readable.
- Lightbox: `position: fixed; inset: 0; z-index` above app; backdrop-filter
  blur if token-compatible.
- `figure`/`figcaption` rules live under `.about-workspace` scope only.

## 7. PWA & security

- `vite-plugin-pwa`: extend precache `globPatterns` to include images already
  covered; add `mp4|webm|mov|m4v` to **runtime** caching (workbox
  `CacheFirst` for media routes) so large videos don't bloat the precache
  manifest — offline-after-first-view, matching MEDIA-PLAN's offline-first
  rule without punishing first load.
- Tauri CSP: no change required (`default-src 'self'` covers bundled video);
  desktop smoke test AM.07 verifies playback in the Linux WebKit view.
- `vite.config.ts`: `assetsInclude: ['**/*.mov', '**/*.m4v']` only if the
  default asset list doesn't already emit them (check at implementation).

## 8. Stitch design brief (for `generate_screen_from_text`)

> Design a desktop help/about screen for "SanctissiMissa", a Traditional Latin
> Mass app with a parchment-and-ink aesthetic (serif body, muted gold/ink
> palette). Layout: long-form about page. Section 1 "Origin Story": 7
> paragraphs of first-person prose about discovering the Latin Mass, with FOUR
> photo/video figures interleaved at regular intervals — the first floated
> RIGHT with text wrapping around it, the second floated LEFT with text
> wrapping, alternating right/left; each figure has a small muted caption;
> uniform 4:3 media crops. Include one state showing a media lightbox: a
> dimmed scrim overlay, the photo centered and enlarged with a zoom-in
> animation, close × at top-right, arrow navigation. Section "Version & Build":
> a definition list with Version / Built / Corpus / Identifier rows; the Corpus
> value reads "Derivative of Divinum Officium (László Kiss, MIT): gap-filled
> and cross-translated from the Clementine Vulgate and Douay–Rheims, then
> re-realized as a graph + vector SQLite corpus". Also show mobile-width
> stacking behavior where floats persist at ~44% width.

The frozen LS design system (`LIBS/UI/STITCH/sanctissimissa-library-20260913/original/DESIGN.md`)
is uploaded via `upload_design_md` + `create_design_system_from_design_md` and
applied to the screen so the specimen uses the app's real design language.

## 9. Validation preview (rubric row AM, production gate)

1. Drop 2 sample files (photo+video) into `content/` → rebuild → both mount,
   right-first alternation, regular spacing, reflow both sides.
2. Remove samples → page identical to pre-AM (no placeholders).
3. Lightbox: click/tap opens, Esc/scrim/× close, ←/→ navigate, 2× zoom + pan,
   video plays.
4. Attribution strings render on the About page; no occurrence of the old
   "vendored, re-realized" line anywhere in `src/`.
5. Mobile viewport (<720px): floats persist ~44%, reflow intact.
6. Desktop WebKit (AppImage) and Android emulator: media renders, lightbox
   tap works, CSP clean.

## 10. Non-goals

- No runtime directory fetch; no station-media (`stationLore`/MEDIA-PLAN)
  work; no changes to Stanza LS; no sidecar caption files (filename captions
  only); no upload/management UI (operator drops files in the repo folder).
