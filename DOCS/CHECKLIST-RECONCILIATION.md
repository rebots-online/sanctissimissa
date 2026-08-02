# CHECKLIST-RECONCILIATION — Stanza R register (prose companion)

_Architect: GLM-5.2 via opencode · 2026-07-18 · branch
`agent/v122-build-observability-and-artifact-safety`_

This document is the prose companion to the `## Stanza R — Reconciliation
register` section of `CHECKLIST.md`. It exists only to keep `CHECKLIST.md`
terse; the register there is the authoritative table, and per-row evidence
lives here. The reconciliation is **additive only**: no task line was deleted,
no marker was flipped to ✅ (✅ remains the verifier's alone per the
three-role-chain discipline), and no `[ ]`/`[/]` marker was altered except the
single explicit BS.1 `[ ]`→`[X]` marker repair instructed by the dispatch.

## Why this reconciliation

`CHECKLIST.md` carries two eras:

1. An **early wave** — Phase 0 / A–G / Integration — drafted as a parallel
   one-shot dispatch with `[ ]` tasks for everything from the office-hour
   assembly to the theme system. Most of those tasks were never executed as
   written because the project pivoted to the stanza model before the wave
   ran.
2. A **stanza wave** — M / O-A–O-D / B-A–B-I / B-J–B-O / B-S–B-T / B-X — which
   shipped v1.24.37311 on 2026-07-16 by a different path. The stanza entries
   carry dated evidence notes (most under `_2026-07-11` through
   `_2026-07-15_`) and many are ✅ verified by running code.

The early-wave `[ ]` tasks were never reconciled against the stanza wave that
re-implemented their functionality. Stanza R closes that gap as an audit
trail: every retired early-wave task is pointed at the stanza task(s) that
actually shipped its functionality, or is flagged as still genuinely open.

## Method

For each `[ ]` task in the early wave, the codebase was inspected for the
file(s) the task would have produced and for the stanza task(s) that
re-implemented the role. Three outcomes:

- **Annotate + register row "shipped as <successor>"** — a concrete stanza
  task (with dated evidence note) shipped the functionality; the original
  line keeps its marker and gains an italic `Superseded 2026-07-18:` note.
- **Register row "still genuinely open"** — no shipping successor identified
  and the original marker stays `[ ]` unannotated. These are A4, D2, G1, G2,
  and W3.
- **Marker repair (BS.1 only)** — implementation verifiably exists with
  mandatory corrections (BS.1R, BS.1R2) both `[X]` and the notes record
  automated gates passing on 2026-07-14; flipped `[ ]`→`[X]` per dispatch
  with the chain-rule caveat that ✅ still needs a fresh independent verifier.

Two further notes were added per the dispatch:

- The Phase-5 `[/]` breviary line is annotated as superseded by
  Stanza O-A/O-B/O-C (the office plane ships full breviary generation).
- W1/W2/W4 (post-wave verification) are `[ ]` but de-facto ran — every
  stanza evidence note records suite-green `npm test`, multiple Accept
  notes record `npm run build` exit 0, and every ✅ flip carries an
  entity-vs-`ARCHITECTURE.md §8` evidence line. The annotations point to
  that evidence. W3 (Playwright browser pass) is left `[ ]` unannotated
  and flagged still-open; it pairs with A4.

## Per-row evidence

Each row below expands the register's `basis` column with the file/check
observation that grounded the call.

| retired task | evidence for the call |
|---|---|
| **A4** | Playwright evidence never produced; `.tmp/a4-*.png` not on disk; pairs with W3 |
| **B2.0** | `grep -c getFileSections src/core/data/corpusDb.ts` → 1; `grep -c hasFile …` → 1. Office engine (OB.2/OB.3) is the consumer that established these helpers |
| **B2.1** | `src/core/data/officeTexts.ts` does not exist; `OfficeEngine.buildHour` (OB.3) replaced pattern-based assembly per OC.3 |
| **B2.2** | `tests/officeTexts.test.ts` does not exist; `tests/office.test.ts` ships the golden battery (OB.4) |
| **B3.0** | `Homily`/`JournalEntry`/`ThemeSpan` interfaces absent from `src/core/data/types.ts`; replaced by `Accompaniment`/`OccurrenceSelector`/`Exposure` in `src/core/accompaniment/types.ts` (BC.1/BC.2) |
| **B3.1** | `src/ui/SectionReader.tsx` does not exist; BK.1 extracted `src/ui/BilingualText.tsx` from ReaderView instead (different split) |
| **B2.3** | OC.3 marker note: "OfficeView switches from `HOUR_SECTION_PATTERNS` assembly to `OfficeEngine.buildHour`" |
| **C1** | `src/core/model/stationLore.ts` exists; M5 file list names it (new) |
| **C3** | `src/ui/LoreCallout.tsx` does not exist; M5 ships `src/ui/MapFlyout.tsx` (same role) |
| **C2** | M5 marker note documents SubwayMap + strip hover/focus wiring via MapFlyout |
| **D1** | `src/core/data/sidecarDb.ts` does not exist; BC.1 ships SidecarDb v2 in `src/core/accompaniment/store.ts` (`SIDECAR_SCHEMA_SQL_V2`) |
| **D1.T** | `grep` confirms `load_sidecar`/`save_sidecar` present in `src-tauri/src/lib.rs`; BC.1 note: "platform byte-persistence web OPFS/IndexedDB + Tauri `load_sidecar`/`save_sidecar`" |
| **D1.U** | `tests/sidecarDb.test.ts` does not exist; BC.4 ships `tests/accompaniment.test.ts` (10 tests incl. recurrence + migration) |
| **D2** | `src/ui/CalendarView.tsx` grep for `sidecar`/`cal-dot`/`cal-themespan`/`cal-status`/`listAnnotations`/`listHomilies`/`listThemeSpans`/`onOpenPlanner` → no matches; no successor identified |
| **D3** | `src/ui/PlannerView.tsx` does not exist; BD.2 note: "HomilyPlanner (selector-projected planning calendar; supersedes PlannerView/HomilyEditor rows)" |
| **D6** | `src/ui/HomilyEditor.tsx` does not exist; BC.3 ships `AccompanimentEditor.tsx` (TipTap-based) |
| **E1** | `src/core/theme/themes.ts` exists; BJ.1 marker note: "`src/core/theme/themes.ts` per E1 spec with `ThemeFamily` incl. `'sanctissimissa'`" |
| **E2** | BJ.2 marker note: "`src/styles.css` (single owner this wave): refactor onto semantic tokens …" (486→680 lines) |
| **E3** | `src/ui/ThemePicker.tsx` exists; BJ.1 + BX.3 + BX.5 progressively own it (BX.5 relocates into SettingsView) |
| **F2** | `src/core/export/exporters.ts` does not exist; `src/core/export/exportFormats.ts` ships `exportMarkdown` (+ HTML/JSON switch); `src/ui/JournalView.tsx` wires an Export button (BD.1) |
| **F3** | `src/core/share/shareLink.ts` exists; `grep` finds `parseHashRoute` (not the spec's `parseDeepLink`); BB.3 + BO.3 collectively rewrote it; `tests/shareLink.test.ts` not on disk (superseded by `tests/conceptSearch.test.ts` and the BB.3 hash-route cases) |
| **G1** | no `src/core/entitlements/` directory; grep for `FeatureId`/`EntitlementGate`/`FEATURE_GATES` across `src` → no matches; no successor identified |
| **G2** | `DOCS/ENTITLEMENT-SYNC.md` absent; no successor identified |
| **APP.1** | BO.3 marker note (✅) and full Do-block own App.tsx shell integration; BX.5 further splits the workspaces and replaces `journalTab`/modal About |
| **APP.2** | `src/ui/SectionReader.tsx` does not exist (target file absent — BK.1 took a different split); export via BD.1 (`exportFormats.ts` + JournalView Export) and share deep links via BO.3; the unified reader toolbar as literally specified did not ship — partial successor only |
| **Phase-5 breviary `[/]`** | office plane (OA.1–OA.3 ingest + OB.1–OB.3 engine + OC.3 presentation) ships full eight-hour generation; `tests/office.test.ts` golden battery green |
| **BS.1** | `src/core/text/align.ts`, `src/ui/BilingualText.tsx`, `src/ui/ReaderView.tsx`, `src/styles.css`, `tests/align.test.ts` all present; BS.1R `[X]` and BS.1R2 `[X]` are its mandatory corrections and both record "BS.1 automated gates passed on 2026-07-14"; marker repair `[ ]`→`[X]`; ✅ deferred to a fresh independent verifier per the chain rule |
| **W1** | every stanza evidence note from OA through BX records `npm test` suite-green (e.g. BM.3 "suite 79/79", BC.4 "suite 73/73", BS.2 "129/129", BX-class 250/250) |
| **W2** | BN.1/BS.2/BS.3/BX.2/BX.3/BX.4/BX.5 Accept clauses all require `npm run build` exit 0 and are ✅/`[X]` |
| **W3** | no stanza produced Playwright evidence for the office/lore/planner/themes/print/export/share matrix; pairs with A4 |
| **W4** | the project's ✅ flips (M1–M8, BA.1/BA.4, BB.1/BB.2, BC.1–BC.4, BD.1/BD.2, BJ.1–BJ.3, BK.1/BK.2, BL.1–BL.3, BM.1–BM.5, BN.1, BO.1–BO.3, BT.1, BX.2–BX.5) each carry GLM-5.2 entity-vs-`ARCHITECTURE.md §8` evidence lines |
| **T4.2** | `.github/workflows/build-all-platforms.yml` exists; `CLAUDE.md` "CI … dormant — all builds are local until public release (TC14)"; verification is a policy decision for the operator, not a code gap |

## What did NOT change

- No `[X]`→✅ flip was performed (✅ is the verifier's alone).
- No `[ ]` or `[/]` marker was altered except the instructed BS.1 `[ ]`→`[X]`.
- No task line was deleted or renumbered.
- The `## Staged post-v2.17 contracts` section was not edited.
- No source code, build, or test was touched; this is documentation only.
