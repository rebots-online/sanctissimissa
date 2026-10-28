# SanctissiMissa — current-checkout static analysis

Date: 2026-10-28 (America/Toronto). Host: `msi4090`.
Scope: `/opt/devProjects/sanctissimissa` only.
Skill: `/home/robin/.agents/skills/source-command-sc-analyze/SKILL.md`.
Analyzed branch: `codex/android-16kb-rebuild`.
Analyzed HEAD: `b13aa59b6e307ab19eaad07f94d79b18e6e56196` (2026-10-24).

This is a static quality, security, performance and architecture review. No application source, architecture, checklist, release stamp or configuration was changed. No build, test suite, exploit, UI benchmark, device trial or deployment was executed. ESLint and read-only metadata/SQLite checks were executed. Findings describe current source paths; runtime consequences are identified as risks where they have not been reproduced.

## Current version and namespace

| Property | Observed value | Local evidence |
|---|---|---|
| Product | SanctissiMissa | `version.json:7`, `package.json:3`, `src-tauri/tauri.conf.json:3` |
| Version | **1.68.75828** | `version.txt:1`, `version.json:2`, `package.json:5`, `package-lock.json`, `src-tauri/tauri.conf.json:4`, `src-tauri/Cargo.toml:3` all agree |
| Android versionCode | **100068** | `version.json:5`, `src-tauri/tauri.conf.json:66`; equals `1 * 100000 + 68` |
| App identifier / namespace | **mba.robin.sanctissimissa** | `version.json:9`, `src-tauri/tauri.conf.json:5` |
| Android namespace | **mba.robin.sanctissimissa** | `src-tauri/gen/android/app/build.gradle.kts:31` |
| Android applicationId | **mba.robin.sanctissimissa** | `src-tauri/gen/android/app/build.gradle.kts:34` |
| npm package / Rust package | `sanctissimissa` | `package.json:2`, `src-tauri/Cargo.toml:2` |
| Rust library | `sanctissimissa_lib` | `src-tauri/Cargo.toml:9` |
| Recorded stamp date | `2026-10-21T02:28:16.637Z` | `version.json:6`; a stamp timestamp, not proof of a completed build |

The storage helper separately derives the organization root `mba.robin` when configured for common desktop storage (`src/core/storage/root.ts:23–44`). That storage root does not change the app's identity. Web sidecar storage uses IndexedDB database `sanctissimissa`, with read-only migration fallback from `standroidsmissal` (`src/core/accompaniment/store.ts:53–57`). These inherited names do not identify this folder as HelloWord or StAndroidsMissal.

Git remote names retain lineage separately: `origin` points to Forgejo `rcheung/StAndroidsMissal`, `github` to GitHub `rebots-online/StAndroidsMissal`, and `sanctissimissa` to GitHub `rebots-online/sanctissimissa`. These were read from local Git configuration, without contacting those services. No remote was changed; the manifests above establish this checkout's application identity.

Generated Android `tauri.properties` was absent at both checked locations (`gen/android/tauri.properties` and `gen/android/app/tauri.properties`). The version above is therefore the coherent source stamp; a packaged Android manifest was not verified.

## Findings in priority order

Priorities: P1/high = security, integrity or user-data risk to address before a release relying on that path; P2/medium = significant correctness, performance or verification debt. No critical/P0 severity is asserted by this static review.

### F1 — P1/high: desktop IPC accepts unchecked storage directories

**Evidence:** `src-tauri/src/lib.rs:22–36,42–66`; `src-tauri/src/model_store.rs:22–31`.

`sidecar_scope_dir` and `scope_root` accept a frontend-supplied `scope_dir` string and join it onto the parent of the app data directory on desktop. They do not restrict it to the two intended namespace values or reject absolute paths and parent-directory components. The registered `save_sidecar` command then creates that directory and writes `sidecar.db`; `load_sidecar` reads from it.

**Impact:** a caller with access to these desktop IPC commands can select locations outside the intended app/organization roots. The sidecar filename remains fixed; this is not a claim of an arbitrary-filename write or unauthenticated remote access. Mobile is explicitly capped to app-private storage by the existing conditional. A compromised frontend would have a wider filesystem boundary than the UI configuration suggests.

**Recommendation:** resolve storage scope from a closed native-side contract, allowing only the intended app and organization directories. Validate containment at the filesystem boundary and account for symlinks. Add native rejection cases for absolute/parent paths and retain legitimate shared-storage behavior.

### F2 — P1/high: journal print and HTML export bypass the rich-text sanitizer

**Evidence:** `src/ui/JournalView.tsx:55–65,80–86`; `src/core/ui/sanitizeHtml.ts:23–36`; `src/ui/SettingsView.tsx:108–115`; `src/core/accompaniment/store.ts:236–257`.

Both `exportHtml` and `printNote` interpolate `a.title` and `a.bodyHtml` directly into HTML. Neither invokes the existing DOMPurify-backed `sanitizeHtml` function. There is a real backup-import route: Settings accepts SQLite bytes and restores them through `SidecarDb.importBytes`, whose validation does not sanitize stored note content. Opening a note in CKEditor first is not required to print/export it.

**Impact:** a crafted imported note can carry active HTML into the print document or downloaded HTML. The print window is opened from the app without an explicit isolated rendering boundary. Script execution and access depend on the platform's effective CSP; no browser exploit was executed. Local web entry/deployment files inspected (`index.html`, `netlify.toml`) do not supply CSP, while Tauri does. Live HTTP response headers were not inspected.

**Recommendation:** construct titles as text, sanitize rich HTML at both output sinks, and use a constrained print/export document. Verify adversarial titles, event attributes and script URLs through the actual import-to-output path. Do not treat editor input filtering as output-sink protection.

### F3 — P1/high: backup import replaces live data after checking only table names

**Evidence:** `src/core/accompaniment/store.ts:236–257`; `src/ui/SettingsView.tsx:108–115`; existing database opening/migration at `src/core/accompaniment/store.ts:203–217`.

`SidecarDb.importBytes` accepts any readable SQLite database that has tables named `settings` and `accompaniments`. It does not verify their required columns, schema compatibility, row shapes or the complete opening/migration path before persisting those bytes over the live snapshot. Settings then reloads the app. The function does not retain the previous snapshot as a recovery copy.

**Impact:** an incompatible database with those two table names can replace a working snapshot and fail during the following startup. This is a static data-loss/recovery risk, not an observed loss of the user's data.

**Recommendation:** validate the full schema and supported migration path in isolation, preserve the previous valid snapshot, and promote the replacement only after validation. Failed import must leave the previous persisted state usable. Cover minimal impostor tables, unsupported schemas, malformed rows and persistence failure.

### F4 — P1/high: native sidecar persistence is non-atomic and read errors become absence

**Evidence:** `src-tauri/src/lib.rs:43–52,59–66`; `src/core/accompaniment/store.ts:203–205,221–225`.

`save_sidecar` writes directly over the live `sidecar.db` using `std::fs::write`. There is no durable replacement step or recovery generation in this path. `load_sidecar` catches every read error, attempts the legacy file, and converts another failure to `None`; the frontend opens a new SQLite database when no bytes are returned.

**Impact:** an interrupted/truncated write can damage the live snapshot. Permission or I/O failures can appear to the frontend as an empty store or cause legacy data to be selected. The code does not distinguish a genuinely absent file from an unreadable existing one.

**Recommendation:** adopt the architecture's durable storage contract: complete and verify a replacement before promotion, preserve recovery data, and propagate read failures separately from not-found. Verify interrupted writes and unreadable primary/legacy files on the actual native platform.

### F5 — P1/high: large native model files can return ready despite a digest mismatch

**Evidence:** `src-tauri/src/model_store.rs:57–95`.

`model_lookup` always computes `(actual, length)` using `file_sha256`. It rejects a mismatching digest only when `bytes <= REVERIFY_LIMIT` (64 MiB). For a larger model with matching metadata, an existing completion marker and the expected byte length, different file contents still return `kind: ready`.

**Impact:** same-length corruption or modification after a successful download is not rejected for the large models this store is intended to serve. The code also pays the full-file hashing cost and then discards its integrity result for these files. A real corrupted model was not loaded in this review.

**Recommendation:** enforce the already-computed digest comparison for every size. Any optimized verification cache must have an explicit invalidation/integrity contract. Add a native regression for a completed object larger than 64 MiB whose bytes change without changing its length.

### F6 — P2/medium: meaning-panel rendering repeats full-corpus synchronous work

**Evidence:** `src/ui/MeaningPanel.tsx:302–314,629–644,680–710,725–752`; `src/core/data/corpusDb.ts:471–541,549–556,751–787,829–861`.

The panel computes `nucleatedSimilarToText` in its render body. In the default Themes view, `NucleatedResults` computes the same search again. Switching grouping mode reruns the parent computation. Meaning mode also evaluates concepts and concordance in render.

Each nucleated search scans/sorts the cached corpus vectors, issues text lookups for selected hits, and queries all eligible commentary text/embeddings before filtering/ranking them. `conceptsForText` executes embedding/count lookups per concept. The actual local corpus contains **83,608 embeddings**, **21,064 commentary nodes** and **249 concepts**. The two alternative meaning/similar branches do not execute simultaneously; the confirmed duplication is parent plus Themes child.

**Impact:** repeated main-thread work can stall selection and panel interactions. No device latency or frame-time measurements were made, so the older report's Critical rating and timing estimates are not carried forward.

**Recommendation:** compute one result per query and pass it to both presentations; use bounded caching/query scheduling and asynchronous execution as specified by active tasks SM07–SM09. Batch text/metadata queries and cache immutable commentary/concept inputs while preserving exact ranking/results. Measure on the real corpus and target devices.

### F7 — P2/medium: the repository's lint command currently fails

**Executed:** local `./node_modules/.bin/eslint . --format json` without `--fix`.
**Observed:** exit **1**, **169 files**, **2 errors**, **9 warnings**.

Errors:

- `src/ui/ChatView.tsx:255` — `prefer-const` for `slowTimer`.
- `.remember/tmp/last-ndc.ts:1` — `@typescript-eslint/no-unused-expressions`; an unrelated local scratch artifact is included by `eslint .`.

Warnings:

- `src/App.tsx:328` — missing `onOpenKey` effect dependency.
- `src/ui/OrientationGuide.tsx:109` — missing `endPath` effect dependency.
- `src/ui/ReaderView.tsx:118` — missing `day` memo dependency.
- `src/ui/SectionReader.tsx:428,476,522,690` — six dependency/complex-expression warnings.

**Recommendation:** resolve the source error, scope lint to intended project inputs, and assess each hook dependency against intended state transitions rather than mechanically changing dependency arrays. Hook warnings are not individually proven runtime bugs by this scan. `scripts/` and `src-tauri/` are excluded from this ESLint configuration, so this check makes no claim about those surfaces.

## Architecture and release state

- The effective target is `DOCS/ARCHITECTURE.md` section L, revision **SM-2026-10-24**. Its SHA-256 is `4d8358b919e6121640a7b1fc3df144050aecfe473976a22d431781505d31b479`, which **matches** the binding recorded at the top of `CHECKLIST.md`.
- The active checklist inventory is **SM01–SM74: 74 unstarted tasks**. Both documents explicitly hold implementation for operator review. The latest inspected signoff entry is the older Android section K authorization dated 2026-10-20; it is not approval of the new target. The planning pair explicitly records its sequence exception. This analysis changes neither the target nor its approval status.
- The inherited 2026-10-19 report is not current implementation evidence. In particular, current `src/core/chat/resolve.ts:10–14,145–169` imports actual native, WebLLM and hosted providers; `src-tauri/src/lib.rs:75–92` registers model-store and inference IPC as well as the three original corpus/sidecar commands. Calling the Companion dormant or the native surface only three fixed-path commands is incorrect for this checkout. Provider source/wiring does not prove successful inference on a device.
- `sanctissimissa-release-state.json` records version **1.68.75828**, source **b24e2957ad2aea6006db953af3f053545e463561**, and **completedStages: []**. Current HEAD is the later documentation commit `b13aa59b`. No `dist/` entry matching `*1.68.75828*` was present. The source stamp must not be reported as a verified complete release.
- Android linker flags for 16 KiB pages exist for all four targets in `src-tauri/.cargo/config.toml`. However, `scripts/verify-android-page-sizes.py` and `tests/android_page_sizes_test.py` are absent; `src-tauri/build.rs` only calls `tauri_build::build`; the inspected app Gradle file lacks the section-K explicit NDK pin/uncompressed-JNI bindings. These are implementation/evidence gaps. Linker configuration alone is not proof that packaged APK/AAB libraries meet the Android compatibility target.

## Current inventory and strengths

Counts below were taken before adding this report. Line counts include blank lines and comments; they measure size, not correctness or test coverage.

| Scope | Files | Lines |
|---|---:|---:|
| `src/` TypeScript/TSX | 98 | 19,212 |
| `src-tauri/src/` Rust | 4 | 728 |
| `scripts/` source/scripts | 21 | 4,664 |
| `reusable-chatbot/` TypeScript | 9 | 1,093 |
| `tests/` TypeScript | 54 | 9,170 |
| Total counted source and tests | 186 | 34,867 |

- **964 tracked files** at the analyzed HEAD; CodeGraph reported **233 indexed files, 3,067 nodes and 9,041 edges**, with SQLite `quick_check=ok` and current index status.
- **15 counted files exceed 500 lines**. Largest include `tests/releaseState.test.ts` (1,204), `SectionReader.tsx` (1,150), `corpusDb.ts` (989), `office/engine.ts` (845), `ingest-corpus.mjs` (812), `release-state.mjs` (787) and `MeaningPanel.tsx` (781). These are maintainability concentrations, not defects solely because of their size.
- `assets/missal.db` and `public/missal.db` each exist at **191,225,856 bytes** (about 182.37 MiB). The read-only corpus query found **93,444 nodes**: 73 books, 1,291 chapters, 21,064 commentary nodes, 249 concepts, 2,451 files, 32,126 sections and 36,190 verses. Equal file sizes are not a byte-identity assertion.
- The code has useful boundaries: corpus/user data separation, tombstones and update/device fields, a reusable sanitizer, provider resolution, and content-addressed model storage. IndexedDB read/write helpers resolve on transaction completion and report transaction errors. TypeScript has strict and unused-symbol checks configured. These strengths do not cancel the specific boundary failures above.
- The existence of 54 test files is an inventory fact. No tests ran during this static review; no passing-test count or coverage percentage is asserted.

## Recommended order after review

1. Reconcile and sign the effective architecture/checklist before implementation, as their current hold requires.
2. Address F1–F5 at the storage, import, output and model-integrity boundaries; retain intended namespace sharing and user-data recovery.
3. Address F6 through the existing query scheduling/optimization/UI task contracts, preserving results and measuring actual responsiveness.
4. Resolve F7 and run the task-specific semantic checks, followed by platform verification and packaged Android checks through the sanctioned release process.

These are recommendations for the existing review process, not new implementation authorization. No delivery-time estimate or commercial-readiness verdict follows from this static scan.

## Verification and publication limits

The initial `/sesh resume` shell lookup was an invocation error and was corrected by executing the deployed skill procedure. Canonical, deployed and recovery skill copies had matching SHA-256 values; the graph helper then passed. Local Admin-Manual revision used: `e582cff`; Forgejo was not contacted under the active outage directive.

The tracked working tree was clean at review start, with unrelated untracked tool directories and the older analysis report preserved. Only this new report is authored by this task. No source fixes, builds, runtime checks or publication are implied. The report is anchored to the analyzed HEAD above even if a subsequent documentation-only commit records this report.
