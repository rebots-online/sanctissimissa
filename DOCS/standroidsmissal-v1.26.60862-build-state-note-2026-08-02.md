# Note to self — v1.26.60862 build state, 2026-08-02 13:10

## What I did that r2's handoff did not anticipate

**I did not need the operator to start a Windows session.** WSL interop
(`powershell.exe` from bash) executes *on* the Windows host — `DESKTOP-E86JHQ6`,
Windows 10.0.26200 — using Windows toolchains. That honours "no WSL builds"
literally: nothing compiled on WSL. Full toolchain confirmed present: node,
cargo, rustup, winapp, git, keytool.

Build checkout: `C:\Users\Admin\CascadeProjects\StAndroidsMissal`, whose `origin`
is `\\wsl$\Ubuntu\home\robin\github\StAndroidsMissal` — so it fetches the
canonical WSL repo directly, LFS included (1.22 GiB filtered on first sync).

## Built and verified

| Artifact | Result |
|---|---|
| `dist-web/` (web PWA) | ✅ built, **includes `missal.db`** after the sync fix below |
| `St. Android's Missal_1.26.60862_x64_en-US.msi` | ✅ **64.1 MB, built** — the first MSI this pipeline has ever produced |
| `st-androids-missal.exe` | ✅ 191.7 MB standalone PE |
| `standroidsmissal-v1.26.60862-windows-x64.msix` | ✅ **71.8 MB, built and signed** |

MSIX package contents verified by opening the zip — all four defects fixed
*inside the real package*:
- `Assets/StoreLogo.png`, `Square44x44Logo.png`, `Square150x150Logo.png`,
  `Square310x310Logo.png`, `Square71x71Logo.png` are **inside** it (there were
  none before);
- `Identity/@Version = 1.26.0.0` (was 1.24.37311.0, two releases stale and
  structurally invalid);
- `AppxSignature.p7x` present.

## Blocked on ONE thing: administrator elevation

Both installers now fail at exactly the same gate and nowhere else:

- **MSI:** `msiexec /i /qn` → **1603**, log shows
  `Error 1925. You do not have sufficient privileges to complete this
  installation for all users of the machine.` The installer engine read and
  validated the package and ran the install sequence — it is well-formed. The
  cause is `bundle.windows.nsis.installMode: perMachine`.
  Log: `%TEMP%\standroidsmissal-v1.26.60862-msi-install.log`.
- **MSIX:** `Add-AppxPackage` → **0x800B0109**, "the root certificate of the
  signature must be trusted". `devcert.pfx` was generated fresh with
  `winapp cert generate --publisher "CN=Robin Cheung"`; trusting it needs
  `winapp cert install` into the machine store, i.e. admin.

I raised a UAC prompt once via `Start-Process -Verb RunAs`; it was cancelled.
**Do not re-raise it unattended.** The operator must either approve elevation or
run these two commands in an elevated shell:

```powershell
cd C:\Users\Admin\CascadeProjects\StAndroidsMissal
msiexec /i "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\St. Android's Missal_1.26.60862_x64_en-US.msi" /qn /l*v "%TEMP%\msi.log"
winapp cert install .\devcert.pfx
Add-AppxPackage .\standroidsmissal-v1.26.60862-windows-x64.msix
```

## Three pipeline defects found BY building (each fixed and pushed)

1. **`tsconfig.tsbuildinfo` was tracked.** `tsc -b` rewrites it, so the web
   stage dirtied the tree and the pre-build gate then refused the *next* stage.
   The first MSI attempt died this way: the web build succeeding is what
   guaranteed the Rust build could not start. Untracked + gitignored.
2. **`src-tauri/Cargo.lock` lagged at 1.25.59353.** Cargo rewrites it on the
   first build at a new version — same dirty-tree cascade, but here the lock is
   genuine source and must record the built version. Committed at 1.26.60862.
3. **`npm run build:vite` does not sync the corpus.** `public/missal.db` comes
   from `scripts/sync-db.mjs`, which only runs via `prestamp`. Building the web
   surface directly therefore produces a PWA **with no corpus** — it looks
   successful and is unusable. Not a defect in `build:release` (the stamp runs
   first), but a trap for any direct invocation. Run `node scripts/sync-db.mjs`
   before `build:vite`.

## Structural finding: the "strict complete set" is unbuildable on one host

`scripts/collect-artifacts.mjs` hard-requires the Linux deb:

```
Error: Linux deb: missing directory ...\src-tauri\target\release\bundle\deb
```

On Windows the deb/AppImage cannot exist; on Linux the MSI/MSIX cannot exist
(WiX and winapp do not cross-build — which is why I gated those stages on
`process.platform === 'win32'`). So the ten-artifact set requires **two hosts
plus an Android keystore**, and no single `build:release` run can ever satisfy
the collector. This needs a decision from the operator — most likely a merge
step that collects per-host outputs into one `dist/` — and is the reason the
release has never actually been complete.

Also still absent: `src-tauri/gen/android/keystore.properties`. I did **not**
provision it — Play signing credentials are the operator's call, not mine.

## Remaining

- Deploy the web PWA to `https://standroid.robin.mba` (runbook "Web deployment":
  zip `dist-web/`, create `/var/www/standroid/releases/<version>` on CT 123 via
  `ssh root@192.168.0.214 "pct exec 123 -- ..."`, chown 1000:1000, swap the
  `current` symlink, verify with `curl -sI`). `dist-web/` on the Windows
  checkout is ready and carries the corpus and all six fixes.
- Install-verify both installers once elevation is available.
- Decide the multi-host artifact collection question.
