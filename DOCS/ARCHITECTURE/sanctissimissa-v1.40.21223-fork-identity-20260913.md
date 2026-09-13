# SanctissiMissa fork identity and durable release artifacts

Operator authority, 2026-09-13: SanctissiMissa is the only active fork; the
predecessor remains frozen without further investigation. Create
`rcheung/sanctissimissa` on authoritative Forgejo and retain rebots-online
GitHub as code-only mirror. HelloWord website and Play consolidation is explicitly
deferred to a separate project. Delete this session's wrongly named generated
artifacts rather than moving them to outbox. Every release output belongs in
tracked root `dist/`, including available artifacts from incomplete host builds.

The existing fork namespace is already specified by `.env.example`,
`DOCS/STORAGE-NAMESPACE.md`, and architecture decision 22. Correct packaging to
that identity; do not migrate storage, signing credentials, or other products.
Version 1.40.21223 was stamped before correcting identity; keep the committed
iteration history. The next complete invocation stamps once and every host
continues that same version/source/input identity.

## Map evidence and coverage

CodeGraph verified healthy (139 files, 1701 nodes). Frontend, stamper, collector,
and release-driver symbols are indexed. Android/Rust, git attributes/ignore,
workflow values, and Tauri config have missing parser/value coverage; targeted
reads of the exact files listed below are authorized. Independent path audits
identified all package and artifact references before these tasks were written.

## Entity table

| Entity | Target file:line | Role and exact fields |
|---|---|---|
| ForkFrontendIdentity | `package.json:2`, `package-lock.json:2`, `.env.example:1`, `vite.config.ts:25`, `index.html:7`, `editor-preview.html:1`, `src/App.tsx:291`, `src/ui/AboutView.tsx:56`, `src/content/about.ts:20` | Display `SanctissiMissa`; npm name `sanctissimissa`; existing storage namespace `mba.robin.sanctissimissa` and common policy preserved; PWA cache `sanctissimissa-corpus`. |
| ForkShareIdentity | `src/ui/ShareLanding.tsx:47`, `src/core/model/appLinks.ts:5` | Share lead/CTA/footer display SanctissiMissa; footer domain sanctissimissa.robin.mba. APP_LINKS existing appSite values preserved; stale predecessor deploy-mirror comment removed. Store URLs stay null; no HelloWord migration. |
| ForkBrowserStores | `src/core/annotations/store.ts:41`, `src/core/accompaniment/store.ts:53`, `src/core/accompaniment/store.ts:398` | Annotation KEY sanctissimissa.annotations.v1, read-only LEGACY_KEY standroidsmissal.annotations.v1. IndexedDB IDB_NAME sanctissimissa, read-only LEGACY_IDB_NAME standroidsmissal. Existing blobs/sidecar.db fields unchanged. Named helpers idbRead(name:string,create:boolean):Promise<Uint8Array|null>, idbGet():Promise<{bytes:Uint8Array|null;legacy:boolean}>, idbPut(bytes:Uint8Array):Promise<void>. New stores take precedence; only new names receive writes. |
| ForkStorageRegressions | `tests/forkStorage.test.ts:1`, `package.json:1`, `package-lock.json:1` | Real sql.js bytes and fake-indexeddb dev dependency exercise migration, new-store precedence, legacy byte preservation, blocked writes, missing legacy databases, annotation fallback/empty-new precedence. No production dependency. |
| ForkCssHeader | `src/styles.css:1` | Current stylesheet product header SanctissiMissa; historical prototype path remains provenance. |
| ForkNativeIdentity | `src-tauri/Cargo.toml:2`, `src-tauri/Cargo.lock:2773`, `src-tauri/src/main.rs:5`, `src-tauri/src/lib.rs:1`, `src-tauri/tauri.conf.json:3`, `version.json:7`, `scripts/stamp-version.mjs:32` | Cargo/binary/internal name `sanctissimissa`; library `sanctissimissa_lib`; display `SanctissiMissa`; identifier `mba.robin.sanctissimissa`. No version bump during correction. |
| ForkAndroidIdentity | `src-tauri/gen/android/app/build.gradle.kts:26`, `src-tauri/gen/android/app/src/main/AndroidManifest.xml:11`, `src-tauri/gen/android/app/src/main/res/values/strings.xml:1`, `src-tauri/gen/android/app/src/main/res/values/themes.xml:1`, `src-tauri/gen/android/app/src/main/res/values-night/themes.xml:1`, `src-tauri/gen/android/app/src/main/java/mba/robin/sanctissimissa/MainActivity.kt:1`, `src-tauri/gen/android/buildSrc/src/main/java/mba/robin/sanctissimissa/kotlin/BuildTask.kt:1`, `src-tauri/gen/android/buildSrc/src/main/java/mba/robin/sanctissimissa/kotlin/RustPlugin.kt:1` | Application/namespace/Kotlin package `mba.robin.sanctissimissa`; theme `Theme.sanctissimissa`; archives `sanctissimissa-v<version>`; SO `libsanctissimissa_lib.so`. Plugin classes remain without package, implementationClass stays RustPlugin. |
| ForkWindowsIdentity | `Package.appxmanifest:15`, `scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1:1`, `scripts/build-windows.sh:1`, `scripts/build-windows-msix.sh:1` | Manifest Name `mba.robin.sanctissimissa`; Application Id/binary `sanctissimissa` / `sanctissimissa.exe`; keep configured Publisher and exact Partner Center validation. Replace old authored PS1 filename and its callers. |
| ForkReleaseIdentity | `scripts/release-state.mjs:1`, `scripts/release-state.d.mts:1`, `tests/releaseState.test.ts:1`, `scripts/package-android-symbols.sh:1`, `scripts/pre-build-gate.mjs:1`, `scripts/pre-build-gate.sh:1`, `build_all.sh:1`, `scripts/build-release.sh:1`, `.github/workflows/build-all-platforms.yml:1` | All active product/slug/library defaults use new vocabulary. State `sanctissimissa-release-state.json`, receipts/events/archive prefixes `sanctissimissa-`. CI stays dormant. |
| DurableDistPolicy | `.gitignore:6`, `.gitattributes:1`, `.lfsconfig:1`, `dist/sanctissimissa-v1.40.21223-artifact-status.md:1` | Track root dist and portable Forgejo LFS config. Binary extension rules scoped to dist. Initial honest status file; no placeholder binary files. |
| AuthoritativeForkRemote | `.git/config:1` | origin `https://forgejo.robin.mba/rcheung/sanctissimissa.git`; github `https://github.com/rebots-online/sanctissimissa.git`; github.lfsurl and .lfsconfig URL `https://forgejo.robin.mba/rcheung/sanctissimissa.git/info/lfs`. No server-side push mirror, no force pushes. |
| DurableArtifactCollector | `scripts/collect-artifacts.mjs:27` | Product/slug/binary/SO/state names corrected. Existing --partial stages available outputs and exact missing rows to dist; strict remains full-matrix gate. Repeated same-source collection accepts identical existing artifact bytes, refuses conflicts, and refreshes correctly stamped manifests as more host artifacts arrive. |

## Flows and invariants

Correct identity -> commit source -> one release stamp -> available host stages
-> collect available artifacts to root dist with explicit partial status -> native
host continuation using frozen source/version/inputs -> strict final collection.
An absent host never removes already produced outputs or converts pending to
complete. Binary artifacts are uploaded to Forgejo LFS before source/pointers
are mirrored to GitHub. No HelloWord or frozen predecessor mutation is involved.

The collector creates a web ZIP candidate in disposable
`src-tauri/target/collector/`, compares actual hashes when a destination exists,
and only copies absent files. A mismatch fails closed; no relabeling or silent
overwrite. Existing same-version manifests may be replaced after all artifact
checks pass, preserving their previous bytes under a stamped metadata history
path when changed. Available-host staging does not mark the strict collect
stage complete. Newly missing native targets stay explicitly pending.

## Verification

Existing theme and release-state suites, TypeScript, Node/shell syntax, JSON/TOML
parsing and lock metadata validate identity changes without new cosmetic tests.
Collector retry/conflict coverage is behavior-level testing where practical.
The actual sanctioned release verifies package production and embedded identity.
Store execution and Play delivery readiness require their separate existing
protocols; artifact presence is not evidence of Store acceptance.
