# Checklist — Build v1.25.59353 (stabilize versioning after INC-17)

States: `[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code

## Applicable conventions (adapted to this undertaking)

- **CC17 §1 — Stamp on modification**: The version was already stamped to 1.25.59353 after codebase modifications. Do not build at any other version. If the codebase is modified again during this build, stop and re-stamp before proceeding.
- **CC17 §3 — Hard gate**: dist/ must not contain artifacts at 1.25.59353 before we build. If it does, stop — go back to the earliest point of contamination and re-execute.
- **CC17 §4a — Build on the platform you're on**: Windows artifacts are built natively on Windows (PowerShell), not cross-compiled from WSL. Linux artifacts are built in WSL. Do not mix.
- **CC17 — Evidentiary support**: Every assertion ("version is X", "tests pass", "build succeeded") must be backed by a command output. No claims without evidence.
- **CC12 — Slug-first names**: Every artifact staged to dist/ is `standroidsmissal-v1.25.59353-<qualifier>.<ext>`. No toolchain-default names.
- **CC12 — dist/ is a monotonic floor**: After staging, verify v1.18.35665 < v1.24.37311 < v1.25.59353. No duplicates.
- **CC13 — Push to both remotes**: Forgejo (origin, LFS store) then GitHub (code-only mirror). Never enable GitHub LFS.
- **CLAUDE.md — Vite empties dist/**: Build web first, collect after. (Already done — web built before staging.)
- **CLAUDE.md — One version string**: version.txt, version.json, package.json, tauri.conf.json, Cargo.toml must all read 1.25.59353. Verify on both WSL and Windows sides.

## Pre-flight
- ✅ **P.1** Version stamped at 1.25.59353 — verify monotonically greater than dist/ floor (CC17 §3, CC12)
  Evidence: `cat version.txt` → `1.25.59353`; dist/ floor = v1.24.37311; 1.25 > 1.24 ✓
- ✅ **P.2** Tests pass — 283/283 (verify before building, not after)
  Evidence: `node --experimental-strip-types --test tests/*.test.ts` → 283 pass, 0 fail ✓
- ✅ **P.3** OS check — build on the platform you're on (CC17 §4a)
  - Web/Linux: WSL (Ubuntu) — correct, Linux builds on Linux
  - Windows MSI/MSIX/PE: Windows native (PowerShell) — NOT cross-compile from WSL
- ✅ **P.4** One version string across all files (CLAUDE.md)
  Evidence: version.txt, version.json, package.json, tauri.conf.json, Cargo.toml all read 1.25.59353 on WSL side ✓

## Build — Linux (WSL)
- ✅ **L.1** Build web PWA at 1.25.59353 (CC17 — version reflects current code state)
  Evidence: `dist-web/` contains index-eFzqxSLG.js, sw.js, manifest.webmanifest ✓
- ✅ **L.2** Build Linux deb + AppImage at 1.25.59353 (CC17 §4a — build on the platform you're on)
  Evidence: `St. Android's Missal_1.25.59353_amd64.deb` and `.AppImage` in src-tauri/target/release/bundle/ ✓
- ✅ **L.3** Stage Linux artifacts to dist/ with slug-first names (CC12)
  Evidence: `dist/standroidsmissal-v1.25.59353-linux-amd64.deb`, `.AppImage`, `-web-pwa.zip` exist ✓

## Build — Windows (native, NOT cross-compile) (CC17 §4a)
- ✅ **W.1** Sync version files + assets from WSL to Windows-side copy (C:\Users\Admin\CascadeProjects\StAndroidsMissal-msi)
  Evidence: version.txt, version.json, package.json, tauri.conf.json, Cargo.toml, assets/missal.db copied ✓
- ✅ **W.2** Verify Windows-side version is 1.25.59353 with evidence (CC17 — evidentiary support)
  Evidence: `type version.txt` → `1.25.59353`; `node -p "require('./version.json').version"` → `1.25.59353` ✓
- ✅ **W.3** Build Windows MSI natively: `npm run build:windows:msi` from Windows PowerShell (CC17 §4a)
  Evidence: `St. Android's Missal_1.25.59353_x64_en-US.msi` (67,289,088 bytes) in src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/ ✓
- ✅ **W.4** Build Windows MSIX natively: `winapp package` from Windows PowerShell (CC17 §4a)
  Evidence: `standroidsmissal-v1.25.59353-windows-x64.msix` (71,877,370 bytes) signed with devcert.pfx ✓
- ✅ **W.5** Build Windows standalone PE natively (built as part of W.3/W.4 tauri build)
  Evidence: `st-androids-missal.exe` (200,967,168 bytes) in src-tauri/target/x86_64-pc-windows-msvc/release/ ✓
- ✅ **W.6** Stage Windows artifacts to dist/ with slug-first names (CC12)
  Evidence: `dist/standroidsmissal-v1.25.59353-windows-x64.msi` (67MB), `.msix` (69MB), `-standalone.exe` (191MB) ✓

## Build — Android (WSL, requires Java) — BLOCKED
- [/] **A.1** Verify Java is available in WSL — BLOCKED with evidence (CC17 — evidentiary support)
  Evidence: `which java` → `command not found`; `java -version` → not found; `/usr/lib/jvm/` → empty; `/home/robin/Android/Sdk` → does not exist
  Status: Java and Android SDK not installed in WSL. Android build cannot proceed in this environment.
- [/] **A.2** Build Android debug APK at 1.25.59353 — BLOCKED (depends on A.1)
- [/] **A.3** Build Android release APK + AAB at 1.25.59353 — BLOCKED (depends on A.1)
- [/] **A.4** Build native debug symbols at 1.25.59353 — BLOCKED (depends on A.1)
- [/] **A.5** Stage Android artifacts to dist/ with slug-first names (CC12) — BLOCKED (depends on A.1)

## Verify
- ✅ **V.1** dist/ floor is monotonic: v1.18.35665 < v1.24.37311 < v1.25.59353 (CC12)
  Evidence: `ls dist/ | grep -oE 'v...' | sort -V | uniq -c` → 1×v1.18.35665, 2×v1.24.37311 (archived + changelog), 6×v1.25.59353 ✓
- ✅ **V.2** All v1.25.59353 artifacts have slug-first names (CC12)
  Evidence: 6 files matching `standroidsmissal-v1.25.59353-*` — deb, AppImage, web-pwa.zip, windows-x64.msi, .msix, -standalone.exe ✓
- ✅ **V.3** No duplicate version.build from separate build events (CC17 §3 — hard gate)
  Evidence: all 6 v1.25.59353 artifacts built today in this session; v1.24.37311 artifacts are in archived subfolder; no second build event at v1.25.59353 ✓

## Commit and push
- [ ] **C.1** Commit stamped source to StAndroidsMissal repo
- [ ] **C.2** Commit dist/ artifacts to StAndroidsMissal repo (LFS)
- [ ] **C.3** Push to Forgejo then GitHub (CC13 — origin is Forgejo with LFS, github is code-only mirror)
  Commands: `git push origin master && git push github master`
