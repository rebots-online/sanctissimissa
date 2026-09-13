# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Doctrine

Cross-project doctrine is authoritative at `/home/robin/Admin-Manual/DOCS/`.
Read `/home/robin/Admin-Manual/DOCS/IDEOLOGIES.md` (I0–I3) before architecture
work. Convention indexes are `/home/robin/Admin-Manual/DOCS/SPEC_CONVENTIONS.md`
(SC-n), `/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS.md` (TC-n), and
`/home/robin/Admin-Manual/DOCS/CICD_CONVENTIONS.md` (CC-n); supporting incidents
live in `/home/robin/Admin-Manual/DOCS/INCIDENTS.md`.

Current operator instructions take precedence. Project-specific decisions in
this file and `CLAUDE.md` govern local details; Admin-Manual supplies the shared
doctrine. Runtime spines and donor files route to that authority. Where a stale
general summary conflicts with a specific current convention, use the specific
convention and report the discrepancy. In particular, Forgejo v15 uses HTTPS
under CC13; the old v13 SSH rule does not apply to it.

## ⛔ URGENT — Phase-specific rules check (every turn)

**CC12 covers EVERY file you author, not just build output** — slug-first
`standroidsmissal-v<version>-<qualifier>.<ext>`, handoff notes and checklists
and logs included. Rule lives in
`/home/robin/Admin-Manual/DOCS/CICD_CONVENTIONS/artifact-hygiene-stamped-or-cleaned.md`.

**DO NOT BUILD ON WSL.** Verify the host and checkout before a build. This
checkout is `/home/robin/Desktop/devProjects/sanctissimissa` on native Linux
`asrock` (verified 2026-09-13 UTC). Read
`/home/robin/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`,
including its additional SanctissiMissa mount and Surge sections. Its older
`/home/robin/github/StAndroidsMissal` build path is absent on this workstation;
do not assume another checkout exists or is current.

**I-22:** Long-running processes: poll status **once per minute**, no backoff, until exit.

Before taking any action each turn, check the appropriate phase-specific rules file:

- **Global doctrine:** `/home/robin/Admin-Manual/claude-code-customizations/global-config-recreation/CLAUDE.md`
  (shared floor where project details are silent; resolve stale summaries through the specific convention)
- **Session bootstrap and runtime parity:** `/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/agent-runtime-parity.md`
  and `/home/robin/.agents/skills/sesh/SKILL.md` (`/sesh resume`; local contract files are authoritative)
- **Naming and spec conventions:** `/home/robin/Admin-Manual/DOCS/SPEC_CONVENTIONS.md` (SC3)
- **Build conventions:** `/home/robin/Admin-Manual/DOCS/CICD_CONVENTIONS.md` (signing, versioning, CI shape)
- **Project build/deploy:** `/home/robin/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`
  (operator credentials, deployment targets, access paths, verification gates)
- **Project architecture:** `DOCS/ARCHITECTURE.md` (entity table, data flow)
- **Project execution contract:** `CHECKLIST.md` (state markers, task contract)
- **Server infrastructure:** `/home/robin/Admin-Manual/SERVERS/README.md` and
  `/home/robin/Admin-Manual/SERVERS/nginx-ui/README.md` (for any deployment or server interaction)

If a task involves building, deploying, pushing, or interacting with infrastructure,
read the relevant Admin-Manual section **before** acting — not after. The Admin-Manual
is the single source of truth for access paths, credential locations, and deployment
targets. For task scratch and handoffs, load
`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/agent-artifact-placement.md`
(I-8): use semantic project-owned paths, never `/tmp`. **Never delete anything**
(CC12/I-0): only `cp` into the common trash `/home/robin/outbox/`; the operator
alone empties it. Never cross-reference other projects' documentation.

## What this is

St. Android's Missal — the Traditional Latin Mass and Divine Office rendered as a navigable subway map. Tauri 2 multiplatform (web/PWA, Windows, Linux, Android), React 18 + Vite frontend, sql.js corpus. Rewrite of SanctissiMissa / "Hello, Word"; corpus is László Kiss' Divinum Officium flat-text tree re-realized as a graph + vector SQLite database.

## Commands

```bash
npm run dev            # web dev server (predev copies assets/missal.db → public/missal.db)
npm run tauri dev      # desktop shell
npm run build          # foreground web build (TypeScript + Vite)
npm run build:vite     # underlying foreground web build (tsc -b && vite build)
npm run build:release  # explicit full pipeline: test → web → linux → windows → android → collect
npm test               # all tests (node:test runner)
node --experimental-strip-types --test tests/computus.test.ts   # single test file
npm run ingest         # rebuild assets/missal.db from VENDORED/ (see below)
```

Node ≥ 22.6 required (`--experimental-strip-types` runs the TS test files and the ingest, which imports `src/core/vector/embed.ts` directly). Tests use the built-in `node:test` runner — no test framework dependency.

The dev port is fixed at 5173 (`strictPort`) because Tauri's `devUrl` expects it.

## The corpus pipeline (the thing to understand first)

Everything the app displays comes from one SQLite file, built by the local corpus
pipeline. This source-only checkpoint excludes `assets/missal.db`,
`VENDORED/divinum-officium`, and `dist/` from Git (migration commit `009aedd8`).
They exist in this checkout; a fresh source clone must provision the corpus
inputs and database before building. Their presence here does not mean they
are committed or recoverable from this GitHub remote.

```
VENDORED/divinum-officium/web/www/  (flat-text corpus snapshot, ours to edit)
  → scripts/ingest-corpus.mjs  (+ do-parse.mjs parser, scripture.mjs fallback)
  → assets/missal.db           (local, gitignored; graph + vector + FTS5)
  → scripts/sync-db.mjs        (copies to public/ for web; Tauri embeds the bytes natively)
```

- **Corpus input paths:** the ingest reads `VENDORED/`. The source-only migration permits locally provisioned inputs; verify their availability before ingesting. Scripture gap-fills come from `VENDORED/vulgate-clementina/` (Latin) and `VENDORED/douay-rheims/` (English).
- **Schema** (`nodes` / `edges` / `text_blocks` / `embeddings` / FTS5 `search`) and the Divinum Officium flat-text format (`[Section]` headers, `@include`, `$`/`&` macros, `vide` cross-refs) are documented in `DOCS/CORPUS-SCHEMA.md`. Directives become graph edges (`HAS_SECTION`, `CROSS_REF`, `INCLUDES`, `EXPANDS`).
- **Generation never breaks.** Broken directives are gap-filled via a fallback chain (same section elsewhere → vide Commune → vendored scripture by citation → marked placeholder). Every fill is logged to `DOCS/CORPUS-FILL-LOG.md`, regenerated on each ingest, and flagged `meta.filled` on the node so the UI can mark supplied text.
- **Modifying corpus text:** edit the `.txt` under `VENDORED/divinum-officium/` directly (it's a snapshot, no upstream tracking), record the change in the modification log of `VENDORED/divinum-officium/PROVENANCE.md`, re-run `npm run ingest`, review the fill log (a good fix removes fill rows), then `npm test`.

## Runtime architecture

- **One query layer everywhere (the "collinear rule"):** `src/core/data/corpusDb.ts` (`CorpusDb` over sql.js WASM) is identical on web and native; the platforms differ only in how `loadCorpus.ts` obtains the bytes (web `fetch('/missal.db')`, Tauri `invoke('load_corpus')`). Never add a platform-divergent data adapter or dev-only server.
- **Perpetual calendar, computed on demand — never pre-generated.** `src/core/calendar/computus.ts` (Butcher's Easter, DO week keys, season/color) + `precedence.ts` (`resolveWinner`, 1962 rules incl. privileged Lenten ferias) resolve any date at runtime: computus → `Tempora/<weekKey>` + `Sancti/MM-DD*` candidates → `resolveWinner`.
- **Commune gap-filling is non-inverted:** sections present in the feast file always win; only *missing* sections come from the `CROSS_REF`'d Commune. (Fixes HelloWord's C2a inversion bug by construction — don't reintroduce it.)
- **Latin is normative.** `text_blocks.latin` is the reference column; English is a modular translation and may be NULL. The reader renders Latin first.
- **Embeddings are deterministic and offline** (`src/core/vector/embed.ts`, 128-d hashed trigrams, int8) — byte-stable across platforms; the `embeddings` table is model-agnostic so a real sentence-transformer can replace it without schema change.
- **No placeholder data.** Every UI surface renders real corpus rows; content marked as filled/missing is explicitly flagged, never fabricated.
- **Text normalization** (`src/core/text/normalize.ts`): every search path (FTS5, vector, concept graph) normalizes via `normalizeText()` — lowercase, strip diacritics, map ligatures (æ→ae, œ→oe), collapse non-letters. Original text is preserved for rendering; only indexed/query forms are normalized.
- **Concept taxonomy** (`src/core/ontology/concepts.ts`): ~30 curated liturgical concepts (Doxology, Collect, Canon, etc.) + auto-derived clusters from embedding similarity. Concepts are ingested as `kind='concept'` nodes with `INSTANCE_OF` edges to sections and `BROADER_THAN` hierarchy edges. `CorpusDb` exposes `conceptsForText()`, `sectionsByConcept()`, `groupedConcordance()`, `groupedSimilarToText()` for concept-grouped search results. `MeaningPanel` renders expandable concept groups instead of flat lists.
- **UI:** `src/App.tsx` shell + rail nav routes between `src/ui/` surfaces — `SubwayMap` (SVG Mass map, stations click through to the reader), `ReaderView` (bilingual reader, selection → context menu), `MeaningPanel` (concept-grouped concordance + vector neighbours for a selection), `CalendarView`, `OfficeView`. Annotations live in `src/core/annotations/store.ts` (localStorage v1, schema mirrors a future sync table).

## Contracts

- `DOCS/ARCHITECTURE.md` — authoritative current entity table (names, signatures, file:line), data flow, and decisions. `DOCS/ARCHITECTURE/StAndroidsMissal-v1.md` is the v0.1 historical baseline and points forward for later waves. New entities get a current-master row before they're coded.
- `CHECKLIST.md` — execution contract with state markers: `[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code. Only flip to ✅ after actually running the verification. For contract authoring, load `/home/robin/Admin-Manual/DOCS/SPEC_CONVENTIONS/idempotent-accept-clauses.md` (SC2): Accept clauses assert repeatable end states.
- One version string (`MAJOR.MINOR.BUILD`) across `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` — canonical source is `version.txt`; `version.json` is the runtime mirror (splash/About/footer read it). `npm run stamp` **bumps MINOR unconditionally** then stamps everything, including Tauri's authoritative `bundle.android.versionCode`; MAJOR is hand-edited in `version.txt` per milestone. **The stamp runs once, first, per explicit complete release invocation** through `npm run build:release` — never inside `prebuild`. App identifier: `mba.robin.standroidsmissal`. `versionCode` = `MAJOR * 100000 + MINOR` (CC7: never user-facing).
- **Artifact hygiene (CC12):** load `/home/robin/Admin-Manual/DOCS/CICD_CONVENTIONS/artifact-hygiene-stamped-or-cleaned.md` when generating or collecting artifacts. Gradle emits stamped APK/AAB names via `base.archivesName`; `scripts/collect-artifacts.mjs` stages the strict complete set to `dist/`, reads `version.json` verbatim, validates Android embedded versions/signatures, and hashes the actual copied files into JSON/XML manifests. Vite owns and wipes only `dist-web/`; durable versioned artifacts in `dist/` are never Vite output. In this source-only checkpoint `dist/` is gitignored, not LFS-backed. Copy stale managed bundles to `/home/robin/outbox/` with their source preserved, per CC12/I-0.
- **Remotes and pushes (CC13/TC10):** use this checkout's configured remote URLs. As verified 2026-09-13 UTC, its sole remote is `origin = https://github.com/rebots-online/sanctissimissa.git`; `github` and `sanctissimissa` are not remote names here. The source-only checkpoint is recorded by commit `009aedd8`; restoring a complete Forgejo/LFS checkout is a separate migration, not an automatic consequence of service recovery. For Forgejo pushes, HTTPS is the primary transport: follow `/home/robin/Admin-Manual/DOCS/CICD_CONVENTIONS/forgejo-authoritative-lfs-github-mirror.md` (CC13); v15 uses `https://forgejo.robin.mba/<owner>/<repo>.git`, never SSH, and GitHub never stores LFS objects. Commit and push scoped task changes at handback per `/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/commit-and-push-every-task-and-handback.md` (TC10), using CC13 for transport. Verify the push result; do not re-point remotes from a generic example.
- **CI:** `.github/workflows/build-all-platforms.yml` is checked in but **dormant** — all builds are local until public release (TC14). See `DOCS/BUILD.md` for local build instructions.

## Gotchas

- `public/missal.db` is gitignored and overwritten by the pre-dev/pre-build sync; `assets/missal.db` is the single source — edit nothing in `public/`.
- `npm run ingest` takes only an optional output-path argument and reads `VENDORED/` unconditionally. The old `-- /path/to/liturgical.db` argument from ingest v1 is gone.
- `scripts/legacy-file-meta.json` preserves rank/color metadata extracted from the legacy HelloWord db and is consumed by the ingest — don't delete it.
