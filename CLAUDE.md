# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⛔ URGENT — Phase-specific rules check (every turn)

**I-22:** Long-running processes: poll status **once per minute**, no backoff, until exit.

Before taking any action each turn, check the appropriate phase-specific rules file:

- **Global rules:** `~/.claude/CLAUDE.md` (loaded automatically — never override)
- **Global conventions:** `~/.claude/CONVENTIONS.md` (nomenclature, naming)
- **Global build conventions:** `~/.claude/BUILD_CONVENTIONS.md` (signing, versioning, CI shape)
- **Project build/deploy:** `~/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`
  (operator credentials, deployment targets, access paths, verification gates)
- **Project architecture:** `DOCS/ARCHITECTURE.md` (entity table, data flow)
- **Project execution contract:** `CHECKLIST.md` (state markers, task contract)
- **Server infrastructure:** `~/Admin-Manual/SERVERS/README.md` and
  `~/Admin-Manual/SERVERS/nginx-ui/README.md` (for any deployment or server interaction)

If a task involves building, deploying, pushing, or interacting with infrastructure,
read the relevant Admin-Manual section **before** acting — not after. The Admin-Manual
is the single source of truth for access paths, credential locations, and deployment
targets. Never scatter temp files in `/tmp` (I-8). **Never delete anything** (I-0): only `cp` into the common trash `~/outbox/` (all projects; operator-emptied only). Never cross-reference other projects' documentation.

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

Everything the app displays comes from one committed SQLite file, built by a fully in-repo pipeline:

```
VENDORED/divinum-officium/web/www/  (flat-text corpus snapshot, ours to edit)
  → scripts/ingest-corpus.mjs  (+ do-parse.mjs parser, scripture.mjs fallback)
  → assets/missal.db           (committed; graph + vector + FTS5)
  → scripts/sync-db.mjs        (copies to public/ for web; Tauri embeds the bytes natively)
```

- **Nothing references outside the repo.** The ingest reads only `VENDORED/`. Scripture gap-fills come from `VENDORED/vulgate-clementina/` (Latin) and `VENDORED/douay-rheims/` (English).
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
- `CHECKLIST.md` — execution contract with state markers: `[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code. Only flip to ✅ after actually running the verification.
- One version string (`MAJOR.MINOR.BUILD`) across `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` — canonical source is `version.txt`; `version.json` is the runtime mirror (splash/About/footer read it). `npm run stamp` **bumps MINOR unconditionally** then stamps everything, including Tauri's authoritative `bundle.android.versionCode`; MAJOR is hand-edited in `version.txt` per milestone. **The stamp runs once, first, per explicit complete release invocation** through `npm run build:release` — never inside `prebuild`. App identifier: `mba.robin.standroidsmissal`. `versionCode` = `MAJOR * 100000 + MINOR` (CC7: never user-facing).
- **Artifact hygiene (CC12): stamped-or-cleaned.** Every managed artifact is slug-first: `standroidsmissal-v<version>-<qualifier>.<ext>`. Gradle emits stamped APK/AAB names via `base.archivesName`; toolchain intermediates remain only inside gitignored disposable `build/`/`target/`. `scripts/collect-artifacts.mjs` stages the strict complete set to tracked/LFS-backed `dist/`, reads `version.json` verbatim, validates Android embedded versions/signatures, and hashes the actual copied files into JSON/XML manifests. Vite owns and wipes only `dist-web/`; durable versioned artifacts in `dist/` are never Vite output. Stale wrong-version bundles are moved on sight to `~/outbox/standroidsmissal/` (never auto-emptied, nothing deleted).
- **Remotes (CC13):** `origin` = `https://forgejo.robin.mba/rcheung/StAndroidsMissal.git` — authoritative, and the ONLY LFS store (`assets/missal.db` is an LFS object; instance is HTTPS-only, no SSH). `github` = code-only mirror; its LFS is redirected to Forgejo (`remote.github.lfsurl`), so it holds pointers, never objects. Push both: `git push origin master && git push github master`. Never enable GitHub LFS.
- **CI:** `.github/workflows/build-all-platforms.yml` is checked in but **dormant** — all builds are local until public release (TC14). See `DOCS/BUILD.md` for local build instructions.

## Gotchas

- `public/missal.db` is gitignored and overwritten by the pre-dev/pre-build sync; `assets/missal.db` is the single source — edit nothing in `public/`.
- `npm run ingest` takes only an optional output-path argument and reads `VENDORED/` unconditionally. The old `-- /path/to/liturgical.db` argument from ingest v1 is gone.
- `scripts/legacy-file-meta.json` preserves rank/color metadata extracted from the legacy HelloWord db and is consumed by the ingest — don't delete it.
