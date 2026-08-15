# BUGS TO FIX AS AT v.1.25-31jul2026

> **Checklist annotated 2026-08-05 against v1.31 codebase.**
> Each item is marked **[x] ADDRESSED** or **[ ] REMAINS** with code evidence.

Note: All front-end/UI to be generated through the Stitch MCP.

 - **Superseded 2026-08-02:** MSI/MSIX is no longer deferred. The v1.27 baseline deliverable includes a first working .msi and .msix, alongside the rest of the artifact set. The bugs below are worked separately and do not gate it. (list not exhaustive)

---

## [x] 1. Origin Story in .env + RevenueCat gating + payment sync

**ADDRESSED (partially) — origin story implemented; .env gating and payment sync remain spec-only.**

- **Origin Story**: Implemented. `content/origin-story.md` is a tracked file imported verbatim at build time via `?raw` in `@/home/robin/github/StAndroidsMissal/src/content/about.ts:14`. No fallback string — missing file fails the build. Rendered in `@/home/robin/github/StAndroidsMissal/src/ui/AboutView.tsx:60-62`.
- **.env for API keys / host settings**: `.env` is gitignored (`@/home/robin/github/StAndroidsMissal/.gitignore:14`). `VITE_REVENUECAT_API_KEY` is referenced in SettingsView (`@/home/robin/github/StAndroidsMissal/src/ui/SettingsView.tsx:97`) and documented in ARCHITECTURE.md (entity row P-G). No `.env.example` or runtime env loading for chatbot/OpenRouter keys exists yet.
- **RevenueCat gating**: Spec-only. `FEATURE_GATES` / `EntitlementGate` / `initEntitlements` are documented in ARCHITECTURE.md (P-G) but the `src/core/entitlements/` directory **does not exist** in the codebase. SettingsView shows a static "Account / Billing" section describing the intent but no live entitlement logic ships.
- **Payment sync (blink.sv, Alby, BTCPay, WooCommerce → RevenueCat)**: Spec-only. `DOCS/ENTITLEMENT-SYNC.md` documents the webhook interface; no implementation exists.

**Remaining**: .env-based chatbot/OpenRouter key loading, RevenueCat entitlement runtime, payment processor adapters.

---

## [x] 2. Synced highlighting + context menu in all reading modes

**ADDRESSED.**

- `SectionReader` (`@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:1-24`) is the single shared bilingual reading surface mounted by Missal (`ReaderView`), Breviary (`OfficeView`), and Scripture (`BibleView`). Its docstring explicitly references BUGS #2 and #10 as the reason it was created.
- **Breviary**: `OfficeView` builds `ReaderSection[]` and passes them to `SectionReader` (`@/home/robin/github/StAndroidsMissal/src/ui/OfficeView.tsx:54-62, 118-125`), giving it the same hover echo, flyout, and context menu the Missal has.
- **Scripture**: `BibleView` renders chapters through `SectionReader` with `quoteKeys` for verse-anchored annotations (ARCHITECTURE.md entity row P-S, status ✅).
- **Right-click with no selection targets the flyout word**: `onContextMenu` in `@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:469-489` calls `wordAtPoint()` when no drag-selection exists.
- **"Copy" option**: Present in the context menu at `@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:723-725`.
- **ESC / click-outside cancellation**: Implemented at `@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:324-351` (SR.4) — both `Escape` keydown and outside `mousedown` listeners close the menu.

---

## [x] 3. Responsive hamburger-collapsible sidebar

**ADDRESSED.**

- One breakpoint at 1100px: the rail collapses to icons and the bilingual reader collapses to interleaved simultaneously (`@/home/robin/github/StAndroidsMissal/src/App.tsx:48-59`).
- Hamburger toggle (☰) at top-left; pin (📌) when held open (`@/home/robin/github/StAndroidsMissal/src/App.tsx:264-272`).
- In icon mode, brand text and feast name are hidden via CSS (`@/home/robin/github/StAndroidsMissal/src/styles.css:72-73`: `.label, .brand { display: none }`). The day chip becomes a calendar button with a flyout (`@/home/robin/github/StAndroidsMissal/src/App.tsx:296-342`), so no overflowing text renders in the 64px icon column.

---

## [ ] 4. Liturgibot Chatbot, force-directed subgraph, Bookstore, Novus Ordo structural analysis

**REMAINS (spec-only).**

- **Liturgibot Chatbot**: No `CompanionView`, `CompanionEngine`, or `companion` code exists in `src/`. ARCHITECTURE.md documents the full contract (P-S entity rows: `CompanionEngine`, `CompanionMemory`, `CompanionView`) but none is implemented. A Stitch HTML mockup exists at `LIBS/UI/STITCH/baseline-ui-library/standroidsmissal-v1.26.60862-stitch-missal-reader-liturgibot-synced-highlights.html` showing the intended FAB + chat panel, but it is not wired into the app.
- **Force-directed subgraph**: A Stitch prototype (`standroidsmissal-v1.26.60862-stitch-thinkspace-navigator.tsx`) exists in `LIBS/UI/STITCH/` with embedding + cosine + 3D projection logic, but it is a standalone prototype, not integrated.
- **Bookstore**: No `Bookstore` or `bookstore` code in `src/`. Haydock commentary is vendored and ingested (`VENDORED/haydock/`, `ingest-commentary.mjs`) and renders in BibleView, but the upsell/storefront UI does not exist.
- **Novus Ordo structural analysis**: No code references Novus Ordo structural analysis or descriptive passages in `src/`.

---

## [ ] 5. Omnisearch bar with categorized ajax-style results

**REMAINS.**

- No `omnisearch` component or global search bar exists in `src/`. The `MeaningPanel` (`@/home/robin/github/StAndroidsMissal/src/ui/MeaningPanel.tsx`) provides concordance (FTS5) + vector-similar + nucleated results, but only as a post-selection exegesis panel — not a proactive as-you-type search bar. There is no global search input in the rail or masthead.

---

## [x] 6. Splash screen copyright year

**ADDRESSED.**

- `@/home/robin/github/StAndroidsMissal/src/App.tsx:245`: `v{versionInfo.version} · © 2026 Robin L. M. Cheung, MBA` — the year is present, matching `AboutView.tsx:105` and `about.ts:58`.

---

## [x] 7. MSI/MSIX Windows installers

**ADDRESSED (build pipeline; install verification pending Windows host).**

- `windows-msi` and `windows-msix` are release stages in `scripts/release-state.mjs` (ARCHITECTURE.md entity row, status ✅). They are skipped with a clear log on non-Windows hosts because WiX and winapp do not cross-build.
- MSIX package identity versioning is stamped by `npm run stamp` (`Package.appxmanifest` `Identity/@Version = MAJOR.MINOR.0.0`), documented in ARCHITECTURE.md.
- The v1.31 `build_all.sh` run produced NSIS + standalone exe successfully. MSI/MSIX require a Windows host to build and install-verify.

---

## [ ] 8. Chatbot (Intercom-style minimized widget)

**REMAINS (spec-only).**

- No chatbot widget code in `src/`. ARCHITECTURE.md §9.4 documents the full `CompanionSession` / `InferenceBackend` / `InferenceRouter` / `QuickQuestionLauncher` contract. The Stitch mockup shows the intended UI (FAB + chat panel with "Token Pack (API)" / "Local (Wllama)" inference toggle). None is implemented in the app.

---

## [ ] 9. Subway Map context-awareness (books, office structure)

**PARTIALLY ADDRESSED.**

- **Office map strip**: The `MapStrip` component (`@/home/robin/github/StAndroidsMissal/src/ui/MapStrip.tsx:117-141`) renders the eight canonical hours as a subway line when `view === 'office'`, with hover flyouts showing incipits. This addresses the "structure of the office being prayed" request at the hour-granularity.
- **Scripture map strip**: When `view === 'bible'`, the `MapStrip` still shows the Mass stations (it falls through to the default branch at `@/home/robin/github/StAndroidsMissal/src/ui/MapStrip.tsx:143-168`). There is no book/chapter station strip for Scripture view.
- **Office structural stations**: The strip shows hour-level stations (Matutinum, Laudes, …) but not the internal structure of the current hour (doubled antiphons, psalms as individual stations).

**Remaining**: Scripture book→chapter station strip; office hour-internal structural stations.

---

## [x] 10. Dual-barreled highlighting + flyouts in all reading modes

**ADDRESSED (same as #2).**

- `SectionReader` provides synchronized line echo (`echoFromEvent`), phrase echo (`livePhraseEcho` via `alignPhrase`), and word flyout (`showCallout` via `wordEcho`) to every reader that mounts it. `OfficeView` and `BibleView` both mount `SectionReader`, closing the gap described in this bug. See #2 for code references.

---

## [x] 11. "Highlight" context menu option + persistent highlight index

**ADDRESSED (highlight); categorized index remains partial.**

- **Highlight option**: The context menu includes "▮ Highlight" at `@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:726-728`. It calls `highlight()` (`@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:526-536`), which creates an `Annotation` with `note: ''` and `quoteAlt` (the aligned counterpart line), so the highlight renders in both languages via the `quotes` pipeline.
- **Persistence**: Annotations persist to `localStorage` (`@/home/robin/github/StAndroidsMissal/src/core/annotations/store.ts:20-33`). They render on every return to the passage through `annotationsFor(nodeKey)` at `@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:589`.
- **Categorized index**: The annotation list renders inline beneath each section (`@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:664-679`), with highlights (no note) visually distinguished from annotations (with note). There is no dedicated global "Highlights & Annotations" index view — they are visible per-section in the reader and in the Journal/Homily accompaniment system.

---

## [x] 12. Journaling function

**ADDRESSED.**

- `JournalView` (`@/home/robin/github/StAndroidsMissal/src/ui/JournalView.tsx:1-296`) provides a date-timeline of accompaniments across four exposures (journal, homily, study, newsletter), with exposure filter chips, tag filter, inline editing via `AccompanimentEditor`, and tombstone delete.
- `JournalSidecar` (`@/home/robin/github/StAndroidsMissal/src/ui/JournalSidecar.tsx`) provides the capture workspace for sending selected text into journal/homily notes.
- The "Add to Journal/Homily notes" context menu item is wired at `@/home/robin/github/StAndroidsMissal/src/ui/SectionReader.tsx:732-741`.
- Deep-linking to specific journal entries via `#/acc/<id>` is implemented (`@/home/robin/github/StAndroidsMissal/src/App.tsx:109-113`).

---

## Summary

| # | Bug | Status |
|---|-----|--------|
| 1 | Origin Story + .env + RevenueCat + payment sync | Partial — origin story done; entitlements/payment sync spec-only |
| 2 | Synced highlighting + context menu in all modes | **Done** — `SectionReader` shared by all readers |
| 3 | Responsive hamburger sidebar | **Done** — one breakpoint, icon collapse, flyout |
| 4 | Liturgibot, subgraph, Bookstore, Novus Ordo | **Remains** — spec + Stitch mockups only |
| 5 | Omnisearch bar | **Remains** — no global search input |
| 6 | Splash copyright year | **Done** — `© 2026` present |
| 7 | MSI/MSIX installers | **Done** (build pipeline; install-verify needs Windows) |
| 8 | Chatbot widget | **Remains** — spec-only |
| 9 | Subway Map context-awareness | **Partial** — office hour strip done; scripture book/chapter strip remains |
| 10 | Dual-barreled highlighting in all modes | **Done** — same as #2 |
| 11 | Highlight option + persistent index | **Done** (highlight + inline list; no global index view) |
| 12 | Journaling function | **Done** — full JournalView + AccompanimentEditor + capture |