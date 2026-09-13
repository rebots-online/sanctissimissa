# SanctissiMissa shared release version and complete platform accounting

Approved direction: one explicit release builds web/PWA, Linux AppImage and
deb, Windows cross EXE/NSIS, native Windows EXE/MSI/MSIX, and Android debug
APK, production APK/AAB and matching native symbols under one version.
AppImage is the requested Linux format; AppArmor is not an artifact.

This contract supersedes the successful-skip description of Windows stages
in master architecture and BT.2. CC14 v1.1 in Admin-Manual is the global rule.
The initial mapping bypassed an uninitialized CodeGraph and used targeted reads
of release files. **Correction (2026-09-13): this was a workflow failure.** Run
`codegraph init -i` when missing or uninitialized, then use the graph for code
navigation. CodeGraph is now initialized; the documentation correction checked
its healthy 139-file / 1,701-node status and queried README.md, which is outside
its supported language coverage. That documented Markdown gap permits targeted
document reads; it is not permission to skip code indexing. These corrections
do not re-attest the original implementation checks. CI activation is unchanged.

## Entities and ownership

| Entity | Target | Contract |
|---|---|---|
| `ReleaseState` | `scripts/release-state.mjs:20`, declaration companion | Existing version/sourceHead/startedAt/completedStages plus optional `inputHashes: Record<string,string>` and `stampPending:boolean`; hash assets/missal.db and local .env (explicit absent sentinel), never disclose contents. Persist stampPending predecessor before stamping; interrupted stamp fails closed without automatic restamp. |
| `getSourceHead` | `scripts/release-state.mjs:60` | Resolve Git HEAD with git rev-parse in production, including packed refs/worktrees; retain fixture-only fake HEAD support. |
| `stageRunsOnHost` | `scripts/release-state.mjs:186` | Export `(stage, platform) => boolean`: test/web on either host; collect/linux/windows-cross/android/symbols on native Linux; windows-msi/windows-msix on native Windows. Unknown/unsupported hosts fail closed. Existing stage name `windows` means cross EXE + NSIS. |
| `PENDING_RELEASE_EXIT_CODE` | `scripts/release-state.mjs:186` | Export value 2. Unavailable stages stay absent from completedStages; collect cannot run until every preceding stage succeeded. |
| `main`, `runCommand`, `runReleaseStage` | `scripts/release-state.mjs:260` | Stamp only a new release; commit exact stamped version files and Cargo.lock before capturing sourceHead. Resume verifies version, commit and input hashes. `--resume-only` requires a matching existing state and never stamps. `--restart` copies previous state to stamped outbox, then starts one new stamp. Preserve fixture injection and interrupt receipts. |
| Release entry scripts | `package.json:8`, `build_all.sh:1`, `scripts/build-release.sh:1` | Both complete-release aliases call Node state manager. Leaf platform/web scripts consume current stamp. No per-platform automatic increments. Reject WSL for production builds. |
| Windows cross build | `scripts/build-windows.sh:1` | Native Linux cargo-xwin emits standalone EXE and NSIS; preserve existing narrowly scoped apostrophe NSISCOMCALL fix from build_all.sh, use copy rather than move. |
| Native Windows packaging | `scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1:1` | Parameter `Kind` MSI or MSIX. Enforce Windows, matching frozen release state/source/version. Build in separate `src-tauri/target/windows-native`; MSI phase emits native EXE + MSI using offline WebView2 and configured Authenticode certificate. MSIX phase packages that EXE, version.json and five declared logos via Windows SDK MakeAppx/SignTool. No independent stamp/rebuild in MSIX. |
| Windows package identity | `Package.appxmanifest:14` | x64 architecture. Preserve MSIX MAJOR.MINOR.0.0; MSI MAJOR.MINOR.0 with bounds MAJOR/MINOR <=255. Full release version stays in UI, filenames and version.json. Native Store identity/publisher must equal configured Partner Center values; never invent these. |
| `WindowsNativeMetadata` | `src-tauri/target/windows-native/sanctissimissa-v<version>-windows-native-metadata.json` | `{version,sourceHead,msiVersion,msixVersion,artifacts:{exe:{path,sha256},msi:{path,sha256},msix?:{path,sha256}},verification:{signatures:true,storeRuntime:false}}`; artifact paths relative to windows-native directory. MSI writes receipt only after verification; MSIX validates existing receipt before extending it. Collector requires version/source/hash match and paths contained within native directory. |
| Native script compatibility wrapper | `scripts/build-windows-msix.sh:1` | Delegate to native PowerShell implementation; no deletion or stamping. |
| Android release command | `scripts/release-state.mjs:416` | Set CARGO_PROFILE_RELEASE_DEBUG=2 and STRIP=false for Android release; embed remains the existing application behavior. |
| Android linker configuration | `src-tauri/.cargo/config.toml:1` | For each of four Android targets, preserve flags and append max-page-size=16384 plus common-page-size=16384; no desktop/global linker change. |
| Android native symbols | `scripts/package-android-symbols.sh:1` | Require all four app libraries, DWARF application compilation unit/source coverage, and 16 KB LOAD alignment; zip actual unstripped libraries, reject or preserve previous archive before replacement. |
| Required artifact matrix | `scripts/collect-artifacts.mjs:80` | NSIS/native EXE/MSI/MSIX required, using distinct native target paths. Missing item is failure in strict mode, explicit missing entry in partial mode. Manifest must describe Play delivery and Store runtime acceptance as unverified until direct evidence exists. |
| Release regressions | `tests/releaseState.test.ts:1` | Exercise production host selection, pending stage retention, one-stamp continuation, resume-only absence, restart preservation and existing two-process interruption contract. |

## Flow and completion

**Fork artifact requirement:** all durable release outputs belong in tracked
root `dist/`, with binaries stored through the SanctissiMissa Forgejo LFS endpoint
and readable metadata in Git. Partial collection preserves available outputs
there with an explicit missing-item record; it does not establish completion.

1. Commit approved source/tooling. A new explicit release provisions local tools
   and signing inputs using the existing documented setup, stamps once, records
   the stamp commit and input hashes, and builds host-supported pending stages.
2. Keep one state file through every host continuation. Use separate build
   worktrees at the exact recorded `sourceHead`, with matching ignored inputs,
   state and required outputs. Partial-artifact publication advances canonical
   HEAD without changing the frozen build source. `node scripts/release-state.mjs
   --resume-only` must refuse changed inputs or absent state. Keep cross/native
   EXEs distinct; final Linux collection also runs at that frozen source. Return
   collected `dist/` artifacts and receipts to the canonical checkout for publication.
3. Native Windows stages remain pending until a real Windows host and signing /
   Partner Center identity inputs are supplied. A Linux invocation still runs
   later Android stages; it then exits 2 with the pending matrix, preserving state.
4. Installer numeric versions are documented mappings, not independent releases.
   Common full version, source commit and input hashes are mandatory across hosts.
5. Producing an AAB does not implement BP.1. That existing task's fast-follow
   corpus_pack and runtime transport remain an explicit Play readiness dependency.
   Producing MSIX/MSI does not establish Store acceptance or successful installation.
   Artifact collection is a release candidate; CC14 full release completion still
   requires those platform verification obligations. Never publish a complete
   release claim or advance the public release pointer while they are outstanding.

## Verification

Run the release-state regression suite and strict declarations check, shell syntax,
TypeScript and full tests. Real Linux build verifies AppImage/deb and cross EXE/NSIS.
Android build verifies production signatures/embedded version and own-crate DWARF.
Native Windows execution is operator verification, pending a supplied host; Linux
syntax review is not a substitute. No checklist acceptance depends on host access.
