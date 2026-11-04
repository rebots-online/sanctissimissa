# Comprehensive code analysis — Sanctissimissa

*Sanctissimissa is a distinct fork of St Android's Missal — related lineage, separate project.
This analysis covers the Sanctissimissa checkout only, as found.*

## Context

`/sc:analyze` invoked with no target → whole-project, all four domains (quality, security,
performance, architecture), default depth, text output. Read-only: no source was modified, no
build or dynamic analysis was run.

**Analyzed checkout:** `/opt/devProjects/sanctissimissa`, branch `codex/android-16kb-rebuild`
@ `34d442d8` (`v1.66.30030: architect Android 16 KB enforcement and platform rebuild`), ahead 1
of `sanctissimissa/master`. A concurrent agent landed that architecture commit mid-scan; the
three domain scans anchored the preceding tree (`dcfca61b`), so documentation-drift findings
below predate `34d442d8` and any reconciliation effort must re-check against it.

## Method & provenance

- Three parallel read-only domain scans (architecture/quality, security, performance/hygiene);
  reports cross-validated against each other.
- CodeGraph map verified per I-1 (`ensure-codegraph.sh --check`: initialized, SQLite
  quick_check=ok, files=233, nodes=3067, edges=9041) and queried: all nine load-bearing symbols
  (`IInferenceEngine`, `ChatController`, `resolveKvFormat`, `CorpusDb`,
  `nucleatedSimilarToText`, `interpretiveNucleiForText`, `sanitizeHtml`, `resolveDay`,
  `conceptsForText`) resolve with the expected declaration kinds — grep-located evidence is
  map-corroborated.
- Two scans independently converged on the inference stack being contract-only/dormant
  (disjoint methods, same conclusion).

## Metrics

| Measure | Value |
|---|---|
| Tracked files (`git ls-files`) | 773 |
| src/ + scripts/ LOC | 17,988 (70 files) |
| Areas | core/data 1,380 · core/text 870 · core/ontology 696 · core/calendar 297 · core/vector 164 · core/annotations 103 · core/{office,liturgy,model,accompaniment,export,share,theme,ui} 3,127 · ui (incl. richtext) 7,202 · App.tsx 515 · reusable-chatbot/core 195 |
| Tests | 27 files, 190 tests (`node:test`, `--experimental-strip-types`) |
| `assets/missal.db` | 191,225,856 B (~182 MiB); duplicated in `public/` and stale in `dist-web/` |
| dist-web bundle | index 452 KB · ckeditor lazy chunk 1,027 KB · css 283 KB · sql-wasm 660 KB |
| 5 largest sources | SectionReader.tsx 1,078 · corpusDb.ts 975 · office/engine.ts 845 · ingest-corpus.mjs 812 · release-state.mjs 676 |
| CHECKLIST.md markers | 78 `[ ]` · 18 `[/]` · 77 `[X]` · 106 ✅ (279 items) |

## Findings — Architecture & documentation contracts

| # | Severity | Finding | Evidence |
|---|---|---|---|
| A1 | High | §9.4 inference rows name entities that exist nowhere: `InferenceBackend / InferenceSession / InferenceRouter / SelectionReport`. Actual shipped contract is `IInferenceEngine` (`reusable-chatbot/core/engine-types.ts:66`), `ChatController` (`reusable-chatbot/core/chat-controller.ts:12`), `KV_PREFERENCE`/`resolveKvFormat` (`reusable-chatbot/core/turboquant-policy.ts:8,16`). §9.4 has no file:line column at all; prose at ARCHITECTURE.md:208 was updated but the binding table was not | `DOCS/ARCHITECTURE.md:524` |
| A2 | High | No entity-table rows for the three new `reusable-chatbot/core/` files (195 LOC, 7 policy tests) — the newest shipped code is invisible to the doc that is the project's coding vocabulary, despite commit dcfca61b claiming "ARCH §7.6/§9.4 reconciled" | §8/§9.1/§9.4 tables |
| A3 | High | **CHECKLIST OB.1/OB.2 marked `[X]` cite nonexistent files** `src/core/office/types.ts`, `src/core/office/resolve.ts` (only `engine.ts` exists; `OfficeOpts` at engine.ts:46; `resolveDirectiveRuntime`/`MassForm`/`RoleLens` exist nowhere) — an I-5 defect: marked complete, files absent. Matching §8 rows (ARCHITECTURE.md:294-296) equally phantom | `CHECKLIST.md:448-449` |
| A4 | Med-High | Phantom entitlements module: three P-G rows target `src/core/entitlements/index.ts` (`FEATURE_GATES`, `initEntitlements`, `EntitlementGate`); no such file exists — gate layer unstarted while documented as located | ARCHITECTURE.md:307-309 |
| A5 | Medium | Systematic file:line drift across S-status rows: `CorpusDb` 34→56 · `MASS_SECTION_ORDER` 39→44 · `MASS_ORDO` 55→60 · `READER_ORDER` 121→216 · `stripStations` 171→272 · `resolveDay` liturgicalDay.ts 15→116 · `NAV` App.tsx 22→31 · `MeaningPanel` 26→465 (`humanRef` now :42) · `OfficeView` 22→34 · `SubwayMap` 28→123 · `SelectionEcho` BilingualText.tsx 79→51 · `ConcordanceHit.latin/.english` 754→778 (types.ts:48) | doc rows vs code |
| A6 | Medium | Entities moved files without table updates: `livePhraseEcho` documented at `ReaderView.tsx:75`, actually `SectionReader.tsx:316`; `SidecarDb` rows target nonexistent `src/core/data/sidecarDb.ts` — real v2 sidecar is `src/core/accompaniment/store.ts` (433 LOC); `PlannerView`/`HomilyEditor` → actual `HomilyPlanner.tsx`/`JournalView.tsx` | §9.1 rows |
| A7 | Medium | Tests row stale: doc lists 8 test files, "44 passing (2026-07-11)"; actual 26-27 files, 190 tests, none named `officeTexts`/`sidecarDb`/`shareLink` | ARCHITECTURE.md:336 |
| A8 | Low-Med | `turboquant-wasm@0.4.1` declared-but-unused: zero imports of `turboquant-wasm` or `reusable-chatbot` in src/src-tauri/scripts; no WebGPU worker file exists anywhere outside `VENDORED/turboquant-wasm/reference/`. Consistent with BI.1 being `[ ]`, but the dep ships in package.json now (install weight; drift risk vs the vendored reference lock @1301eca before first use) | package.json; grep |
| A9 | Low | Two functions >150 lines: `ConnectionsPanel` (`src/ui/JournalSidecar.tsx:82`, 194 lines) and the MapStrip map-`id` callback (`src/ui/MapStrip.tsx:49`, 207 lines) — the least-testable UI hotspots | — |
| A10 | Low | Nominal core cycle data↔text: `liturgicalDay.ts:15` imports `../text/scrubMacros` while `text/resultHierarchy.ts:14` imports `../data/types` (type-only → no runtime cycle). Rest of the module graph is a clean DAG | import scan |
| A11 | Low | Lazy-editor boilerplate duplicated ×3 (`SectionReader.tsx:41`, `AnnotationIndex.tsx:23`, `AccompanimentEditor.tsx:34`; deliberate per commit 52fd5db3 — a hook would dedupe); `stripHtml` and `anchorShort` each defined twice in src/ui | — |
| A12 | Info | Code hygiene excellent: zero `: any`/`as any` in non-test src, zero TODO/FIXME/HACK/XXX, zero `console.log`. tsconfig strict + noUnused*/noFallthrough/verbatimModuleSyntax (lacks `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`). eslint 10 covers src/tests/vite.config (and reusable-chatbot via `eslint .`) but **ignores `scripts/`** (~13k LOC unlinted, documented as future work) | configs |

Spot-checks of claimed-complete CHECKLIST items: ✅ T1.1 (EMBED_DIM=128, `embed.ts:13`) and
✅ T4.1 (`load_corpus` at `src-tauri/src/lib.rs:13`, sidecar commands :46) verify real; [X] T4.2
CI exists but is dispatch/tag/master-gated only (dormancy invisible from the row); [X] OB.1/OB.2
fail spot-check (A3). BI.1 correctly `[ ]`; its shipped sub-milestone (contract/policy/controller
+ 7 policy tests in `tests/turboquant-policy.test.ts`) is not separately recorded as done.

## Findings — Security

| # | Severity | Finding | Evidence |
|---|---|---|---|
| S1 | **High** | **Fifth HTML sink outside the DOMPurify boundary (print path):** `w.document.write(`&lt;!doctype&gt;…&lt;title&gt;${a.title}&lt;/title&gt;&lt;body&gt;${a.bodyHtml}&lt;/body&gt;`)`. `a.title` unescaped; `a.bodyHtml` (stored CKEditor rich text from the sidecar DB) bypasses `sanitizeHtml` entirely. `window.open('', '_blank')` is an about:blank window **inheriting the app origin** → injected `<script>` runs with full access to localStorage annotations and the IndexedDB sidecar. The 4 `dangerouslySetInnerHTML` sites are sanitized; `exportFormats.ts` escapes properly — this is the one rich-text path that slipped past | `src/ui/JournalView.tsx:83` (window.open at :81) |
| S2 | Medium | Exported HTML file embeds raw stored rich text: `exportHtml` Blob ships `a.title` + `a.bodyHtml` unsanitized; renders script at `file://` origin when shared/opened. Severity rises once sidecar sync (decision 10) and downloadable modules (decision 19) make `bodyHtml` genuinely third-party | `src/ui/JournalView.tsx:52-59` |
| S3 | Medium | Web/PWA build ships with no CSP: no CSP meta in `index.html` (confirmed absent in built `dist-web/index.html`); `netlify.toml` sets only X-Frame-Options/nosniff. The web surface — which hosts the share-landing URL — is the unprotected one; the Tauri build has a CSP | `index.html`, `netlify.toml` |
| S4 | Low | localStorage annotation store: `writeAll`'s `setItem` has no try/catch (QuotaExceededError propagates into UI handlers); `readAll` silently returns `[]` on any JSON.parse failure → one corrupted read followed by any add/edit permanently overwrites the store. (Sidecar migration at `accompaniment/store.ts:410` does have the `Array.isArray` shape guard this path lacks.) | `src/core/annotations/store.ts:63-75` |
| S5 | Low | Sanitizer LRU correct (memo key IS the full raw input; DOMPurify deterministic → no stale/poisoned-cache risk) but caps entry count (500) not per-entry size — a multi-MB note pins ~500 multi-MB strings (memory only). No `sanitizeHtml` test exists | `src/core/ui/sanitizeHtml.ts:23-37` |
| S6 | Low | Tauri CSP nits: `style-src 'self' 'unsafe-inline'` (needed for React inline styles; weakens XSS containment to style-based exfil); no explicit `base-uri`/`form-action`/`frame-ancestors` (not inherited from default-src) | `src-tauri/tauri.conf.json:24` |
| S7 | Low | `turboquant-wasm: ^0.4.1` caret range (lockfile pins 0.4.1 + sha512 integrity — reproducible today; `npm update` could drift within 0.4.x) | package.json / package-lock.json:9247-9252 |

**Verified safe (informational):**
- Share deep links: regex-whitelisted route parsing, type-checked decode, `location.hash`-only
  consumption (no cross-origin/`javascript:` navigation), React text-node rendering — no sink.
- Inference stack dormant: `reusable-chatbot/` imported nowhere under `src/`; "no tensors across
  postMessage / KV owned by engine" exists only as the doc contract
  (`engine-types.ts:5-7`); no worker shipped. Only WebGPU/worker code is unbundled vendored
  reference (`VENDORED/turboquant-wasm/reference/`, MIT, commit-locked @1301eca); its
  `model-loader.ts:141` fetches an arbitrary URL to OPFS — reference-only today, but the
  `artifactUrl` allow-list question is live for BI.1.
- Tauri IPC: exactly 3 commands, all fixed-path bytes-only (`load_corpus` via `include_bytes!`;
  `load_sidecar`/`save_sidecar` on fixed `app_data_dir/sidecar.db`) — no traversal. Capabilities
  `core:default` only, window `main`; no shell/fs/http plugin permissions. Android manifest:
  `INTERNET` only, non-exported FileProvider.
- Secrets clean (`.env*` placeholders only; keystore/env gitignored at `.gitignore:20-23`; no
  tracked keys; no hardcoded tokens). All `target="_blank"` carry `rel="noreferrer"`. Single
  same-origin `fetch('/missal.db')`. No `eval`/`new Function`/`importScripts` in src.
- Dependencies: 8 runtime deps, all mainstream/current (react 18.3, dompurify ^3.4.14, sql.js
  ^1.12, ckeditor5 ^48.5, tauri-api ^2.4, turboquant-wasm ^0.4.1); lockfile integrity hashes
  throughout; nothing pipes remote text to DOM.

**Done well (don't re-litigate):** render-boundary sanitization is real and correctly memoized
at all 4 React sinks; minimal Tauri attack surface with `connect-src 'self' ipc:` blocking
engine-weight exfil today; layered link/HTML discipline (LinkPolicy allow-list at authoring +
legacy plaintext escape-and-wrap + fully-escaped corpus export pipeline). S1/S2 are the single
exceptions to an otherwise consistent design.

## Findings — Performance, pipeline & repo hygiene

| # | Severity | Finding | Evidence |
|---|---|---|---|
| P1 | **Critical** | `nucleatedSimilarToText` runs **unmemoized in render body**, 2–3× per MeaningPanel render (:531 canonical view; again inside `NucleatedResults` :199; plus :575) — each call = full-corpus vector scan + full commentary pull + ~130 follow-up queries; re-runs on every state tick (e.g. groupingMode toggle) | `src/ui/MeaningPanel.tsx:199,531,575` |
| P2 | High | `interpretiveNucleiForText` pulls the **entire commentary table — full English text + embedding blob per row — on every call**, uncached (contrast the `vectors` cache at :737); source filter applied in JS after materializing all rows | `src/core/data/corpusDb.ts:466-490` |
| P3 | High | Vector search = whole-`embeddings`-table int8 scan per query (vectors cached; O(N×128) cosine not) **plus N+1 `text_blocks` fetch per hit** (k=64 → 64 queries); same N+1 in `concordance` (:795), `sectionsByConcept` (:864), `getVerseRange` (:332, per-verse) | `src/core/data/corpusDb.ts:754-775` |
| P4 | High | `conceptsForText` N+1 squared: loads all concept nodes, then 2 queries per concept (embedding + INSTANCE_OF COUNT) | `src/core/data/corpusDb.ts:815-848` |
| P5 | Medium | No `manualChunks`; **all 10 views eagerly imported** → one 452 KB app chunk loads before the splash resolves; `chunkSizeWarningLimit: 1600` masks bloat | `vite.config.ts:77`, `src/App.tsx:4-25` |
| P6 | Medium | `missal.db` exists 3× on disk (assets/, public/ via `copyFileSync`, dist-web/); `dist-web/` holds a stale build vs scan-time HEAD. Note: root `dist/` is empty and gitignored — under the BUILD-phase tracked-`dist/` rule the remediation direction is un-ignoring it as the canonical release store, not deletion | `scripts/sync-db.mjs:16` |
| P7 | Medium | DB not byte-reproducible: `corpus_meta.built_at`/`corpus_version` embed wall-clock `new Date()` at ingest (embeddings themselves are byte-stable; whole-DB bytes churn) | `scripts/ingest-corpus.mjs:761-769` |
| P8 | Medium | Test gaps: no tests for `annotations/store.ts`, `share/shareLink.ts`, `ui/sanitizeHtml.ts` (the DOMPurify config itself), `liturgy/conditionals.ts`, `text/scrubMacros.ts`, `model/{appLinks,officeCursus,stationLore}`, `data/stationIncipits`; zero UI-component tests; turboquant-policy test covers `reusable-chatbot/`, not `src/` | tests/ import scan |
| P9 | Low | 4 untracked agent tool-cache dirs, none gitignored: `.mimosa/` (zcode/Mimosa hook session state, mode 0600) · `.zcode/plans/` (agent plan .md) · `.v2c/` + `.video_agent/` (plugin_root pointers into `~/.zcode/cli/plugins/cache` — video2code 0.6.0 / video-agent-kit 0.4.3). None are project config; none should be committed | `.gitignore` |
| P10 | Low | Stray tracked root files: 130 KB Figma JSON, `editor-preview.html`, `session-mgmt-context.md`, four `checklist-*.md`. (`version.json`+`version.txt` duality is by design — canonical source + runtime mirror — not a defect.) | `git ls-files` root |
| P11 | Low | `dayCache` unbounded (grows per visited ISO date; entries small but perpetual-calendar browsing accumulates) | `src/core/data/liturgicalDay.ts:23` |
| P12 | Low | `Scripture.loadVul/loadDr` `readFileSync` with no existence guard — missing `vul.tsv`/DR JSON crashes ingest mid-run (only the DO `www/` dir is pre-checked) | `scripts/scripture.mjs:86,97` |

**Test-coverage map.** Covered: corpusDb (conceptSearch, interpretiveNuclei, bibleEchoContract),
embed, clause, align, massOrdo, massSpecials, computus, precedence, liturgicalDay, office/engine,
accompaniment store+resolve, concepts, parallels, normalize, bilingualResult, resultHierarchy,
calloutPlacement, inspectorLayout, themes, mapStrip, bible, exportFormats, workspaceNavigation;
scripts do-parse/scripture/ingest-bible/db-adapter/releaseState;
`reusable-chatbot/core/turboquant-policy` (+engine-types). Uncovered: the P8 list plus
`data/loadCorpus.ts` (thin/platform-bound) and all of `src/ui/*` (no component-test infra in deps).

**Cross-cutting composite (P1–P4):** one MeaningPanel render ≈ 2 full-corpus scans + 2 full
commentary-table pulls + ~150 N+1 queries, all synchronous on the UI thread.

## Verified healthy (baseline strengths)

- **Collinear rule holds**: `loadCorpus.ts` is the only platform branch (`isTauri()` →
  `invoke('load_corpus')`; web = `fetch('/missal.db')`); no dev-only server; no other
  fetch/`__TAURI__` branches in src.
- All SQL parameterized (`?` binds); FTS5 MATCH word-quoted + try/catch-guarded. Embeddings
  deterministic and offline (FNV-1a trigram, byte-stable).
- CKEditor genuinely lazy at all 3 mount sites — confirmed by the split 1,027 KB chunk.
- Calendar math clean: no unbounded loops (`dateForWeekKey` capped ±450 days); `resolveDay`
  double-cached; SubwayMap/BibleView lookups `useMemo`'d.
- Ingest never throws on broken directives (fallback chain + deterministic fill-log regen).
- Zero `any`/TODO/console.log in src; strict tsconfig; DOMPurify correctly keyed at all 4 React
  sinks; minimal Tauri attack surface; secrets clean (details under Security).

## Notes & adjudications

- The perf scan's "drop dead `dist/`" suggestion is **rejected by analysis**: the BUILD-phase
  convention makes tracked root `dist/` the canonical release store; the observed state (empty +
  gitignored) is a convention gap in the opposite direction.
- CI-dormancy `[X]` (T4.2) is accurate; only its invisibility from the row is noted.
- The security posture is "one edge, not a pattern": S1/S2 are the sole unsanitized paths in an
  otherwise consistently layered design.
- Doc-drift findings (A1–A7) predate the concurrent `34d442d8` architecture commit and must be
  re-verified against it before any reconciliation work; the checkout is the Sanctissimissa
  fork, not St Android's Missal canonical.

## Release-readiness assessment — Play Console, 48-hour window (operator question, 2026-10-19)

**Question:** "Is it ready to be released? I have 48 hours to upload to Play Console — inclusive of
Firebase login and sync, and adding a billing gating."

**Verdict (as amended by operator directive 2026-10-19): the 48-hour release scope is the core
app PLUS Firebase login+sync and live billing gating. The operator's explicit request changes
the constraints to include what is necessary — it supersedes, for this release, decision 15's
no-login doctrine and the null-gates default. The core is release-ready; Firebase requires one
architecture amendment (now directed) plus implementation; billing is already fully signed
architecture awaiting implementation.**

### What is ready (verified)

- **Android 16 KB page-size compliance: implemented.** `src-tauri/.cargo/config.toml` sets
  `-Wl,-z,max-page-size=16384` + `common-page-size=16384` for all four Android ABIs
  (aarch64/armv7/i686/x86_64); the corresponding checklist tasks carry ✅ markers (symbol
  packaging with DWARF coverage, per-LOAD-segment alignment verification, unstripped .so
  archival via `scripts/package-android-symbols.sh`). Commit `34d442d8` (+125 ARCHITECTURE.md
  lines only) is the *closing documentation* commit for already-executed work — not, as its
  docs-only diff might suggest, unimplemented planning. This satisfies the Play requirement in
  force since 2025-11-01 for apps targeting Android 15+.
- **Fork release identity: set.** `identifier: mba.robin.sanctissimissa`, `versionCode 100066`,
  `version.txt 1.66.30030` — stamp complete (`dbd808ab "v1.66.30030: stamp complete release"`).
- **Pipeline: proven.** 56 tracked `dist/` artifacts through v1.64.29684 (slug-first CC12
  naming confirmed on disk), release-state machine with `stampPending` fail-closed guard,
  collect-artifacts validation gates, `DOCS/ARCHITECTURE-SIGNOFF.md` ledger entry authorizing
  CL.1–CL.7/OG.9–OG.11 delivery via the sanctioned release train.
- **What remains for a core release** (the in-flight `[/] FI.5 Coordinated build and artifact
  handback`): run the sanctioned release train on the proper hosts (never WSL), collect the
  complete v1.66 set into tracked `dist/`, commit with `v{VERSION}: ` prefix, upload the AAB.
  Zero v1.66 artifacts exist in `dist/` yet. Feasible inside 48 hours *if* the train runs now.

### Directed scope — current state and critical path (constraints as amended)

**Firebase login + sync — architecture amendment directed by the operator.**
- Facts unchanged: zero Firebase presence today (no SDK, no `google-services.json`, no auth
  surface, no sync engine; user data is local: localStorage annotations + IndexedDB sidecar;
  the only network call is the same-origin corpus fetch).
- Decision 15 ("No operator-hosted login; content never uploads") is superseded for this
  release by the operator's explicit directive — the amendment text itself (auth provider,
  sync scope for annotations/journal/homily sidecar, Firestore rules, offline-first conflict
  policy) is drafted next and presented for signoff per the gate; the directive authorizes
  the amendment, and the ledger entry records it. Fastest technical path for Tauri: Firebase
  JS SDK in the webview (web config — no native google-services.json needed) + a Firestore
  sync layer over the existing sidecar schema.
- Operator-parallel workstreams (only the operator can run these — start immediately, they
  serialize): Firebase project + Auth provider enablement, OAuth consent screen, SHA-1/SHA-256
  fingerprints (after first signed build), Firestore security rules, Play data-safety +
  privacy-policy updates for account + cloud-synced data.

**Billing gating — already signed architecture; implementation-only, no amendment needed.**
- Decisions 15/19 + entitlement vocabulary (`companion_ondevice` / `companion_hosted` /
  `institutional`) + `FEATURE_GATES` are signed; the gate module
  (`src/core/entitlements/index.ts`, P-G rows ARCHITECTURE.md:307-309) is
  architected-but-unimplemented (finding A4), `SettingsView.tsx:75-219` already carries the
  shell, and G3's null-gates default is flipped by editing the one map — exactly the "decide
  tiers later by editing one map" design. Execute P-G as written: entitlements module +
  RevenueCat integration + product configuration.
- Operator-parallel: RevenueCat dashboard project + products, Play Console in-app products,
  license-tester accounts.

### 48-hour execution order

1. **Now, in parallel:** (a) complete the core v1.66 release train (`[/] FI.5`) so the
   pipeline is hot and fingerprints exist; (b) draft the decision-15 supersession amendment
   with entity rows and present it for signoff; (c) operator starts Firebase / RevenueCat /
   Play Console setup.
2. **On signoff:** derive CHECKLIST tasks; parallel-agent execution — Firebase auth+sync
   layer, entitlements module + RevenueCat wiring — with the S1 sanitizer fix and the P1
   MeaningPanel memoization folded into the same train.
3. **Late in the window:** restamp/collect/upload the feature-complete AAB, early enough for
   the first-listing review queue.

Honesty note: the code work parallelizes well under the checklist discipline; the hard
serializations are the operator-console setups and Play's review queue — both must start now.

### Caveats to verify during the upload window

- New-listing review time: `mba.robin.sanctissimissa` is its own app identity — first
  submissions' review queues are outside the repo's control; upload early in the window.
- App size: **not an obstacle — operator ruling 2026-10-19**: Play fast-follow asset delivery
  permits several GB. The ~182 MiB corpus fits comfortably whether embedded in the base or
  staged as the architected fast-follow asset pack (decision 18); only the BP.1 PAD runtime's
  implementation timing remains a checklist fact — a scheduling item, never a size constraint.
- The S1 print-path sanitization defect (High) remains open — Play will not reject it, but it
  is a known same-origin injection edge shipping in a public build; the fix is small enough to
  include in the release train if time permits.
- The `Stanza CL/OG2-3` checklist phases are PENDING SIGNOFF — they must not be pulled into
  this release to "fill it out"; the signoff ledger gates them explicitly.

*Deliverable is this report only — no remediation plan included. Findings are available for a
follow-up improvement pass (e.g. /sc:improve) at the operator's discretion.*

---
*Provenance: `/sc:analyze` (plan-mode session, 2026-10-19). Operator rulings recorded in the
session and binding on this report: (1) fast-follow permits several GB — size is not an
obstacle; (2) an explicit operator request changes the constraints to include what is
necessary — never cite a standing rule as a contradiction against it.*
