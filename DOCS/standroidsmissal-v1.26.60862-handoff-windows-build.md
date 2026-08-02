# Handoff — build v1.26.60862 on the Windows side

**For:** a Claude Code session started by the operator on Windows.
**From:** the WSL session (source work only — WSL must not build).
**Written:** 2026-08-02.

Read this whole file before running anything. It is self-contained; you should
not need to go spelunking.

---

## 1. Which checkout you are in

Three checkouts of this repo exist. **`~/github/StAndroidsMissal` (WSL) is
canonical** — that is where the source below was committed and where both
remotes point.

| Path | State | Use |
|---|---|---|
| `~/github/StAndroidsMissal` (WSL) | canonical, v1.26.60862 | source of truth |
| `~/CascadeProjects/StAndroidsMissal` (WSL) | stale, v1.24.37311 | do not use |
| `C:\Users\Admin\CascadeProjects\StAndroidsMissal` | v1.25.59353 | the Windows build copy |
| `C:\Users\Admin\CascadeProjects\StAndroidsMissal-msi-old-copy` | stale | do not use |

**First action:** bring the Windows build copy to the canonical commit by
`git fetch` + `git reset --hard` against `origin` (Forgejo) — *not* by copying
files from WSL. If the Windows copy has no remotes configured, fix that before
building. Confirm with `git rev-parse HEAD` and `type version.txt`.

Do not create a fourth checkout.

## 2. Target version — do NOT let the stamper bump

The release is **v1.26.60862**, already committed and pushed. `version.txt`,
`version.json`, `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`,
and `src-tauri/Cargo.toml` all read `1.26.60862`. `versionCode` is `100026`.

`npm run build:release` currently **stamps first**, which would bump this to
1.27.x. That is the wrong number for this release, and reordering the pipeline
to bump-at-end is authored but **not yet implemented** (see §6).

Before running the release driver, freeze the version using the sanctioned
mechanism — write `release.lock` at the repo root (gitignored):

```json
{ "major": 1, "minor": 26, "build": 60862 }
```

With that present the stamp step re-stamps the identical string instead of
bumping. Verify after the stamp stage that `version.txt` still reads
`1.26.60862`. If it reads anything else, stop — do not continue building.

`src-tauri/Cargo.lock` still reads `1.25.59353`; cargo rewrites it on the first
Rust build. Do not hand-edit it.

## 3. Preconditions

- The working tree must be **clean** — `scripts/pre-build-gate.mjs` fails
  otherwise, by design. The WSL session may have left uncommitted edits to
  `CLAUDE.md`, `DOCS/ARCHITECTURE.md`, and this file; make sure they are
  committed and pushed before you reset the Windows copy onto them.
- `dist/` must contain **no** `standroidsmissal-v1.26.60862-*` files yet
  (gate rejects duplicate build events at one version).
- `src-tauri/gen/android/keystore.properties` must exist and point at the
  production keystore under `~/Admin-Manual/CREDENTIALS/PlayStore/`. It is
  gitignored and is **absent** from the canonical WSL checkout — provision it
  on the Windows side. Do not print its contents.
- `src-tauri/tauri -> ../node_modules/.bin/tauri` symlink must survive the
  checkout (the Android Gradle integration needs it; symlinks are the usual
  NTFS casualty — check it explicitly).

## 4. What to build — the complete set at one version

Run the single entry point (`npm ci` first):

```
npm run build:release
```

Required artifacts, all CC12 slug-first in tracked `dist/`:

1. `standroidsmissal-v1.26.60862-web-pwa.zip`
2. `standroidsmissal-v1.26.60862-linux-amd64.deb`
3. `standroidsmissal-v1.26.60862-linux-amd64.AppImage`
4. `standroidsmissal-v1.26.60862-windows-x64.msi`
5. `standroidsmissal-v1.26.60862-windows-x64.msix`
6. `standroidsmissal-v1.26.60862-windows-x64-standalone.exe`
7. `standroidsmissal-v1.26.60862-android-universal-debug.apk`
8. `standroidsmissal-v1.26.60862-android-universal-release.apk`
9. `standroidsmissal-v1.26.60862-android-universal-release.aab`
10. `standroidsmissal-v1.26.60862-android-native-debug-symbols.zip`

If a stage fails the driver leaves `standroidsmissal-release-state.json` and
resumes at the first incomplete stage on re-run. Do not restart from scratch
unless the lock is genuinely mismatched.

## 5. Acceptance — building is not passing

This is the point of the whole handoff. v1.25.59353's MSI and MSIX **built**
and were staged without anyone confirming they install. Do not repeat that.

**MSI** — install it, don't just inspect it:

```powershell
msiexec /i "dist\standroidsmissal-v1.26.60862-windows-x64.msi" /qn /l*v "%TEMP%\standroidsmissal-v1.26.60862-msi-install.log"
```

Exit code 0 is necessary, not sufficient. Then: confirm the install directory
and `st-androids-missal.exe` exist, **launch the app**, confirm the splash
reads `v1.26.60862 · © 2026 Robin L. M. Cheung, MBA` and that the corpus
actually loads (the reader renders real Latin text, not an error), then
uninstall via `msiexec /x`. Keep the verbose log as evidence.

**MSIX** — `Add-AppxPackage` the signed package (the dev cert must be trusted
in the local machine store or it will fail with a signature error, which is
itself a finding worth reporting rather than working around), launch it from
the Start menu, confirm the same splash version and corpus load, then
`Remove-AppxPackage`.

**Android** — a built APK is not a working APK. Install the **release** APK on
a real device or emulator over adb, launch it, confirm the splash version and
that the corpus loads. Confirm the release APK/AAB carry the expected upload
certificate: `keytool -printcert -jarfile <apk>` must show SHA-256
`56c13674ef22df95deb1e5c468820e8cfa3ea2f522511749ab7b6e5bde3bd943`.

**Linux deb/AppImage** — cannot be exercised from Windows. Record them as
built-but-not-runtime-verified rather than claiming a pass.

Report every result with the actual command output. A stage with no evidence is
a stage that did not pass.

## 6. Known-pending work — do not silently absorb it

Authored but **not implemented**, so do not assume the pipeline behaves this
way yet:

- **Bump-at-end.** `version.txt`/`version.json` should name the last
  *successfully built* version, not a number minted before the build. The
  agreed design: the driver computes a candidate into `release.lock` and stamps
  only the build manifests; `version.txt`/`version.json` are promoted **after**
  all stages pass, gaining `builtFromCommit` / `builtAt` / `state`, so anything
  that cannot be proven to match the last good build reads as `+changed`
  ("unknown" defaults to "changed"). Until this lands, §2's manual
  `release.lock` freeze is the workaround.
- **The stamper is a re-invention.** `scripts/stamp-version.mjs` is a Node port;
  the canonical stamper is `~/Admin-Manual/scripts/versioning/update-version.sh`,
  which every other project uses. The port also drops something real: the
  canonical script writes `src-tauri/gen/android/tauri.properties`
  (`versionCode`/`versionName`) and the port does not — check that file's
  contents before trusting the Android version stamp.
- **Fork points still exist.** `DOCS/NEW-PROPOSED-BUILD-PROCESS-1aug2026.md` §2
  calls for deleting `build:web`, `build:desktop`, `build:android`,
  `build:windows:*` so `build:release` is the only entry point. Not done. Use
  `build:release` regardless.

## 7. After a green run

1. Commit the stamped source, then commit `dist/` (LFS) — message prefix
   `v1.26.60862: `.
2. Push Forgejo first, then GitHub: `git push origin master && git push github master`.
   Apply the LFS timeout recipe before pushing (large objects otherwise time
   out against self-hosted Forgejo).
3. Deploy the web PWA to `https://standroid.robin.mba` per the runbook.
4. Update "Last verified release" in
   `~/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md` — and this
   time record the install verification, not just the build.
