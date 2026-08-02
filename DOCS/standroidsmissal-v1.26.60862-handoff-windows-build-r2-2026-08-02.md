# Handoff r2 — build the v1.27 complement on the Windows side

**For:** a Claude Code session started by the operator on Windows.
**From:** the WSL session (source work only — WSL must not build).
**Written:** 2026-08-02. **Supersedes** `standroidsmissal-v1.26.60862-handoff-windows-build.md`.

Read this whole file before running anything.

---

## 0. What changed since r1 — read this or you will repeat v1.25

r1 told you to freeze the version at 1.26.60862 with a `release.lock` and run
the pipeline unmodified. **Both instructions are now wrong.**

The bug wave landed real source changes on top of 1.26.60862, so this is a new
release: **let the stamper bump to 1.27.x. Do not write `release.lock`.**

More importantly, r1 assumed `npm run build:release` produces an MSI and an
MSIX. It never did. The `windows` stage runs `tauri build --no-bundle`, which
emits the standalone PE and nothing else; `build:windows:msi` and
`build:windows:msix` existed but were never in `STAGE_ORDER`. Whatever shipped
as an installer at v1.25 was produced out of band and staged without ever being
installed. That is fixed — the pipeline now has `windows-msi` and
`windows-msix` stages — but it means **this is the first run that has ever
produced these artifacts through the driver.** Expect to debug, and report what
you find rather than working around it.

## 1. Which checkout you are in

`~/github/StAndroidsMissal` (WSL) is canonical — that is where the work below
was committed and where both remotes point. The runbook's "Build host and
checkouts" section is the SSOT; read it.

**First action:** bring the Windows build copy to the canonical commit by
`git fetch` + `git reset --hard` against `origin` (Forgejo) — *not* by copying
files. Confirm with `git rev-parse HEAD` and `type version.txt`
(expect `1.26.60862` before the stamp, `1.27.x` after).

Do not create another checkout.

## 2. Preconditions

- **Clean working tree** — `scripts/pre-build-gate.mjs` fails otherwise, by design.
- `dist/` must contain no `standroidsmissal-v1.27.*` files yet.
- `src-tauri/gen/android/keystore.properties` must exist and point at the
  production keystore under `~/Admin-Manual/CREDENTIALS/PlayStore/`. It is
  gitignored and **absent** from the canonical checkout. Do not print it.
- **`devcert.pfx` at the repo root** — gitignored, absent from the canonical
  checkout, and required by the MSIX stage. Generate once:
  `winapp cert generate --publisher "CN=Robin Cheung"`.
  The stage now fails fast with this message rather than producing a broken
  package.
- `winapp` CLI: `winget install microsoft.winappcli --source winget`.
- `src-tauri/tauri -> ../node_modules/.bin/tauri` symlink must survive the
  checkout — symlinks are the usual NTFS casualty. Check it explicitly.

## 3. Run it

```
npm ci
npm run build:release
```

Stages, in order — the two new ones are marked:

`test · web · linux · windows · windows-msi (NEW) · windows-msix (NEW) ·
android-debug · android-release · symbols · collect`

On a failure the driver leaves `standroidsmissal-release-state.json` and resumes
at the first incomplete stage. Do not restart from scratch.

Required artifacts in tracked `dist/`, all CC12 slug-first at the stamped
version `<V>`:

1. `standroidsmissal-v<V>-web-pwa.zip`
2. `standroidsmissal-v<V>-linux-amd64.deb`
3. `standroidsmissal-v<V>-linux-amd64.AppImage`
4. `standroidsmissal-v<V>-windows-x64.msi`
5. `standroidsmissal-v<V>-windows-x64.msix`
6. `standroidsmissal-v<V>-windows-x64-standalone.exe`
7. `standroidsmissal-v<V>-android-universal-debug.apk`
8. `standroidsmissal-v<V>-android-universal-release.apk`
9. `standroidsmissal-v<V>-android-universal-release.aab`
10. `standroidsmissal-v<V>-android-native-debug-symbols.zip`

## 4. Acceptance — building is not passing

**MSI:**

```powershell
msiexec /i "dist\standroidsmissal-v<V>-windows-x64.msi" /qn /l*v "%TEMP%\standroidsmissal-v<V>-msi-install.log"
```

Exit code 0 is necessary, not sufficient. Confirm the install directory and
`st-androids-missal.exe` exist, **launch the app**, confirm the splash reads
`v<V> · © 2026 Robin L. M. Cheung, MBA` and that the corpus actually loads (the
reader renders real Latin text), then `msiexec /x`. Keep the verbose log.

**MSIX:** `Add-AppxPackage` the signed package. The dev cert must be trusted in
the local machine store or it fails with a signature error — that is itself a
finding worth reporting, not something to work around. Launch from the Start
menu, confirm the same splash version and corpus load, then `Remove-AppxPackage`.

If MSIX fails, check these first — they were the defects fixed on 2026-08-02 and
are the likely places for a residual problem:

- Every asset the manifest references must be inside the package. The staging
  step now copies `src-tauri/icons/*Logo.png` into `msix-stage/Assets/` and
  asserts each referenced file exists; if that assertion fires, the manifest and
  the icon set have drifted apart again.
- `Package.appxmanifest` `Identity/@Version` must be `MAJOR.MINOR.0.0`. Appx
  parts must be ≤ 65535 and the Store requires revision 0; our display BUILD is
  `epoch-minutes % 100000`, so putting BUILD in the package version would make
  roughly a third of all builds invalid. `npm run stamp` now writes this; verify
  it reads `1.27.0.0`.

**Android:** install the **release** APK on a real device or emulator, launch
it, confirm splash version and corpus load. Confirm the upload certificate:
`keytool -printcert -jarfile <apk>` must show SHA-256
`56c13674ef22df95deb1e5c468820e8cfa3ea2f522511749ab7b6e5bde3bd943`.

**Linux deb/AppImage:** cannot be exercised from Windows. Record as
built-but-not-runtime-verified. Do not claim a pass.

Report every result with the actual command output. A stage with no evidence is
a stage that did not pass.

## 5. Bugs to spot-check in the running app

These were fixed in source this session and verified in the dev server; confirm
they survive into the packaged build:

- **Divine Office and Sacred Scripture** now have the synchronized Latin/English
  line highlight on hover, the word flyout, and the selection context menu —
  previously Mass-only (#2, #10).
- **Right-click with no selection** targets the word under the cursor; **ESC**
  and an outside click both dismiss the menu, which previously could not be
  cancelled at all.
- **Highlight** in the context menu marks the passage in *both* languages and
  persists across navigation (#11).
- **The English Ordinary is no longer blank** — Ordo sections with missing
  English went from 14/21 to 0/21 (#13).
- **The rail** has a hamburger, collapses to icons with no overflowing text, and
  its day chip becomes a calendar button with a flyout (#3).
- **About → Origin Story** shows the operator's real account, not the fabricated
  "St. Android of the Circuits" text (#1a).

Known **not** fixed: bug #9 (the subway map still shows Mass stations in every
view). It is blocked on design — all three frozen Stitch map screens are
Mass-only. Do not improvise it.

## 6. After a green run

1. Commit the stamped source, then commit `dist/` (LFS) — message prefix `v<V>: `.
2. Push Forgejo first, then GitHub:
   `git push origin master && git push github master`.
   Apply the LFS timeout recipe first; large objects otherwise time out against
   self-hosted Forgejo.
3. Deploy the web PWA to `https://standroid.robin.mba` per the runbook's
   "Web deployment" section (extract the zip, create
   `/var/www/standroid/releases/<V>`, push, chown 1000:1000, swap the `current`
   symlink, verify with `curl -sI`).
4. Update "Last verified release" in
   `~/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md` — recording
   the **install** verification, not just the build.

## 7. Still pending, do not silently absorb

- **Bump-at-end.** `version.txt`/`version.json` should name the last
  *successfully built* version, not one minted before the build. Agreed design:
  the driver computes a candidate into `release.lock`, stamps only the build
  manifests, and promotes `version.txt`/`version.json` after all stages pass,
  gaining `builtFromCommit`/`builtAt`/`state` so anything unprovable reads as
  `+changed`. Not implemented.
- **The stamper is a re-invention.** `scripts/stamp-version.mjs` is a Node port
  of `~/Admin-Manual/scripts/versioning/update-version.sh`. The port drops
  `src-tauri/gen/android/tauri.properties` (`versionCode`/`versionName`) —
  check that file before trusting the Android version stamp.
- **Fork points.** `DOCS/NEW-PROPOSED-BUILD-PROCESS-1aug2026.md` §2 calls for
  deleting `build:web`/`build:desktop`/`build:android`/`build:windows:*` so
  `build:release` is the only entry point. Not done. Use `build:release`.
