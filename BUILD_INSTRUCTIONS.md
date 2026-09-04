# St. Android's Missal — Build and Release Instructions

This is the canonical project-root recipe for a coherent St. Android's Missal
release. Operator-specific credential locations and verifier commands are kept
in `~/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`.

## Identity and authority

- App ID: `mba.robin.standroidsmissal`
- Product title: `St. Android's Missal`
- Artifact slug: `standroidsmissal`
- Canonical version source: `version.txt`
- Runtime/build mirror: `version.json`
- Release driver: `npm run build:release`
- Artifact directory: tracked, Forgejo-LFS-backed `dist/`

Manual local builds are authoritative. The checked-in workflows remain dormant
until the operator explicitly activates CI.

## Prerequisites

### Common

- Node.js 22.6 or newer and npm
- Rust stable via rustup
- Git and Git LFS
- `zip`, `sha256sum`, and binutils (`readelf`)

### Linux desktop

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsoup-3.0-dev \
  build-essential \
  pkg-config \
  libssl-dev
```

### Android

- Android SDK platform 36
- Android build-tools 36.1.0 (`apksigner`, `aapt2`, `zipalign`)
- Android NDK 27.0.12077973
- A compatible JDK with `jarsigner`/`keytool`
- `cargo-ndk`
- Rust targets `aarch64-linux-android`, `armv7-linux-androideabi`,
  `i686-linux-android`, and `x86_64-linux-android`

The checked-in `src-tauri/tauri` symlink is intentional: the generated Android
Gradle Rust plugin resolves the Tauri CLI relative to `src-tauri/`.

Set:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
```

### Windows x64 cross-build (Linux-hosted)

Install `cargo-xwin`. The current Linux-hosted recipe emits a standalone PE
`.exe`; it does not emit NSIS, MSI, or MSIX packages.

### Windows x64 native MSI build (Windows-hosted)

On a Windows host with Node.js ≥ 22.6, Rust stable (target
`x86_64-pc-windows-msvc`), and the Tauri CLI (installed via `npm install`),
run:

```bash
npm run build:windows:msi
```

This builds the web frontend (`build:vite`) then invokes
`tauri build --target x86_64-pc-windows-msvc --bundles msi`. Tauri
auto-downloads WiX Toolset 3.14 on first run. The MSI is emitted at
`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/`.

**WSL filesystem caveat:** Tauri's MSI bundler (WiX `light.exe`) cannot
create CAB files on `\\wsl$\` network paths. If the repo lives in WSL,
copy the project to a local Windows drive (e.g. via `cp -a` from WSL to
`/mnt/c/...`) and build from there. The `tauri.conf.json` bundle targets
remain `["deb", "appimage", "nsis"]` so Linux builds are unaffected; MSI
is opt-in via the `--bundles msi` CLI flag only.

### Windows x64 MSIX build for Microsoft Store (Windows-hosted)

Tauri 2 does not natively produce MSIX packages. Instead, the MSIX is
built by Microsoft's `winapp` CLI wrapping the compiled Tauri exe. The
Microsoft Store re-signs MSIX packages on submission, so no purchased
code signing certificate is needed — a self-signed dev cert suffices.

**One-time setup:**

```powershell
# Install winapp CLI
winget install microsoft.winappcli --source winget

# Initialize manifest and assets (run once in the repo root)
winapp init . --setup-sdks none --use-defaults

# Generate a dev cert (publisher must match Package.appxmanifest)
winapp cert generate --publisher "CN=Robin Cheung"
```

This creates `Package.appxmanifest` (committed to the repo) and
`devcert.pfx` (gitignored). The manifest's `Identity` uses
`mba.robin.standroidsmissal` / `CN=Robin Cheung` / version
`<MAJOR.MINOR.BUILD>.0`.

**Build:**

```bash
npm run build:windows:msix
```

This runs `scripts/build-windows-msix.sh`, which builds the web frontend,
compiles the Rust exe (`tauri build --no-bundle`), stages the exe +
`dist-web/` into `msix-stage/`, and packages it via `winapp package`.
The MSIX is emitted at the repo root as
`standroidsmissal-v<version>-windows-x64.msix`.

**Store submission:** Upload the `.msix` directly via Partner Center
under an MSIX/PWA product. Microsoft re-signs it during certification —
no certificate purchase required.

## Production signing

The production keystore remains under Admin-Manual credential custody. The
repo consumes an ignored `src-tauri/gen/android/keystore.properties` pointing
to it. Never copy a password, alias secret, private key, or keystore into this
repository or a transcript.

The release produces both a retained debug APK and production-signed APK/AAB.
The debug APK is diagnostic inventory only: release acceptance always installs
and exercises the production APK, and validates the production APK/AAB upload
certificate. Native debug symbols are preserved separately while user-facing
release binaries remain production builds.

## Version contract

Versions are `MAJOR.MINOR.BUILD`, not SemVer PATCH numbering.

- MAJOR is edited manually only when the operator declares a milestone.
- `npm run build:release` calls the stamper exactly once.
- The stamper increments MINOR unconditionally and stamps BUILD.
- Android `versionCode = MAJOR * 100000 + MINOR`; it is never user-facing.
- Do not chain the stamping `build:web`, `build:desktop`, `build:android`, or
  `build:all` entry points for one release.

### Autonomous stamped resume

The release driver automatically manages stamped resume via `release.lock`:

- **First invocation**: stamps once, writes ignored `release.lock` JSON
  `{version, sourceHead, startedAt, completedStages:[]}`, and runs all stages.
- **Stage completion**: after each successful stage, its name is atomically
  appended to `completedStages`.
- **Interrupted release**: a later plain `npm run build:release` with a matching
  lock resumes automatically at the first incomplete stage without stamping.
- **Restart**: `npm run build:release --restart` explicitly moves the old lock to
  `~/outbox/standroidsmissal/` and starts a new stamp.
- **Mismatched/corrupt locks**: fail closed with exact remediation instructions.
  Version or sourceHead mismatches, corrupted JSON, or missing required fields
  trigger explicit error messages and the `--restart` path.
- **Completion**: successful collection moves the completed lock into versioned
  `dist/rubric-runs/release-state-v<version>.json`.
- **No manual steps**: normal resume is fully automatic; `--restart` is only
  for intentional restarts or after manual remediation.

The lock file is gitignored and never committed. It lives only in the worktree.

### BT.2R3 controlled interrupt/resume

The release state management includes a production-owned one-shot controlled
interrupt protocol for testing:

- **Interrupt constants**: `INTERRUPT_RECEIPT_FILENAME='interrupt-receipt.json'`,
  `INTERRUPT_EXIT_CODE=70`, `RECEIPT_MISMATCH_EXIT_CODE=71`.
- **Receipt helpers**: `getReceiptPath(fixtureDir)`, `readInterruptReceipt(fixtureDir)`,
  `writeInterruptReceipt(target, fixtureDir)` (atomic via `.tmp` + `renameSync`).
- **Interrupt protocol**: In stub mode only (`RELEASE_STATE_RUNNER=stub` +
  `RELEASE_STATE_FIXTURE` set), the environment variable
  `RELEASE_STATE_INTERRUPT_AT=<canonical-stage>` triggers a controlled interrupt:
  - First reach of target stage: write receipt `{target, consumed:true, writtenAt}`,
    log the stage to `run-command.log`, and exit with `INTERRUPT_EXIT_CODE`.
  - Second reach with matching receipt: skip logging, exit 0 (resume without
    re-stamping).
  - Invalid receipt target or corrupt JSON: fail closed with `RECEIPT_MISMATCH_EXIT_CODE`.
  - Non-target stages: log normally and continue.
- **Two-spawn invariant**: Two real CLI spawns prove one stamp (first spawn only),
  each stage exactly once (resume completes remaining stages without re-stamping),
  and receipt byte-identical after resume.
- **Fail-closed nonmutation**: Corrupt or mismatched receipts fail closed without
  mutating `release.lock` byte-identically.
- **Production-only**: `RELEASE_STATE_INTERRUPT_AT` has no effect unless in stub
  mode; normal production release is unchanged.

### Strict real-CLI acceptance gate

The release state management is validated by a strict, automated acceptance gate
that requires no manual steps or platform builds:

- **Declaration-typed exports**: `scripts/release-state.d.mts` provides exact
  TypeScript declarations for all production exports. The `.mjs` module remains
  plain Node ESM with no TypeScript-only syntax.
- **Unified hermetic runner**: All external commands (stamp and stages) flow
  through a single `runCommand(name)` function. When injected via `deps.runCommand`
  or selected via `RELEASE_STATE_RUNNER=stub`, no real `npm run stamp` or platform
  builds execute. The stub runner logs each command to `run-command.log`.
- **Dual test coverage**: `tests/releaseState.test.ts` exercises production code
  two ways: (1) importing and calling `main()` with injected stub `runCommand`,
  and (2) spawning the real CLI with `RELEASE_STATE_RUNNER=stub`. No literal
  stand-ins or duplicated implementations exist.
- **BT.2R3 controlled interrupt/resume**: Tests prove two real CLI invocations
  against a shared fixture with `RELEASE_STATE_INTERRUPT_AT=<stage>` (stub mode
  only) execute a one-shot controlled interrupt followed by resume, with one
  stamp total, each stage exactly once, and receipt byte-identical after resume.
  Corrupt or mismatched receipts fail closed without mutating the lock.
- **Byte-identical nonmutation**: Corrupt and mismatched lock files remain
  byte-identical after failure (fail-closed; never overwritten).
- **Strict TypeScript compilation**: A forced strict compilation over the test
  and declaration files (`npx tsc --noEmit --strict --module nodenext
  --moduleResolution nodenext scripts/release-state.d.mts tests/releaseState.test.ts`)
  must exit with zero errors.

Run the full acceptance gate:
```bash
node --check scripts/release-state.mjs
node scripts/release-state.mjs --help  # exits 0
git diff --exit-code -- version.txt version.json package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git check-ignore release.lock  # exits 0
grep -c 'RELEASE_STATE_INTERRUPT_AT' scripts/release-state.mjs  # ≥ 1
grep -c 'INTERRUPT_EXIT_CODE' scripts/release-state.mjs  # ≥ 2
grep -c 'RECEIPT_MISMATCH_EXIT_CODE' scripts/release-state.mjs  # ≥ 4
grep -c 'interrupt-receipt.json' scripts/release-state.mjs  # ≥ 1
grep -c 'RELEASE_STATE_INTERRUPT_AT' tests/releaseState.test.ts  # ≥ 3
grep -c "simulate this by" tests/releaseState.test.ts  # → 0
grep -c "doesn't actually interrupt" tests/releaseState.test.ts  # → 0
npx tsc --noEmit --strict --module nodenext --moduleResolution nodenext scripts/release-state.d.mts tests/releaseState.test.ts  # zero errors
node --experimental-strip-types --test tests/releaseState.test.ts
npx tsc -b --pretty false
npm test
npm run build:vite
```

All commands must exit 0 with no real platform build or stamp run. The test
suite imports production declarations and spawns the real CLI for every path
(help, fresh, interrupted, resumed, mismatched, corrupt, restart, completed).

## Coherent release

```bash
npm ci
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npm run build:release
```

The driver executes this order:

1. Stamp once (fresh release only).
2. Run the complete test suite.
3. Build web/PWA first.
4. Build Linux deb and AppImage.
5. Cross-build the Windows x64 standalone PE.
6. Build and retain the Android debug APK.
7. Build the production release APK and AAB with Rust debug information
   available for symbol packaging.
8. Package native symbols for all four Android ABIs.
9. Collect and validate the complete set into `dist/`.

After each successful stage, its name is atomically recorded in `release.lock`.
If the driver is interrupted, re-running `npm run build:release` resumes at the
first incomplete stage without stamping. Use `--restart` to begin a fresh stamp.

Vite is configured with `emptyOutDir: false` so it never wipes `dist/`. Native
release artifacts in `dist/` survive web rebuilds. The web stage still runs
first in the pipeline for logical ordering, but artifact safety no longer
depends on stage sequencing.

The Admin-Manual kickstart script can provision toolchains and build individual
targets. It does not replace the coherent release driver: it does not own the
single stamp, Windows artifact, production signing, symbol archive, or final
manifest-governed collection.

## Canonical artifact set

Every successful release contains:

1. `standroidsmissal-v<version>-web-pwa.zip`
2. `standroidsmissal-v<version>-linux-amd64.deb`
3. `standroidsmissal-v<version>-linux-amd64.AppImage`
4. `standroidsmissal-v<version>-windows-x64-standalone.exe`
5. `standroidsmissal-v<version>-android-universal-debug.apk`
6. `standroidsmissal-v<version>-android-universal-release.apk`
7. `standroidsmissal-v<version>-android-universal-release.aab`
8. `standroidsmissal-v<version>-android-native-debug-symbols.zip`

When built on a Windows host (see "Windows x64 native MSI build" and
"Windows x64 MSIX build for Microsoft Store" above), the release also contains:

9. `standroidsmissal-v<version>-windows-x64.msi`
10. `standroidsmissal-v<version>-windows-x64.msix`

JSON/XML manifests, release notes, and runtime-verification evidence accompany
the set. Snap packages are currently absent and must not be claimed as release
outputs.

## Verification gates

A release is accepted only after direct checks establish:

- tests and all build stages succeeded;
- manifest byte sizes and SHA-256 values match every artifact;
- all filenames and embedded package versions match the stamped version;
- package ID is `mba.robin.standroidsmissal`;
- the production APK and AAB share the expected upload certificate;
- the production APK, not the debug APK, passes the runtime/browser rubric;
- the Linux AppImage launches; and
- the Windows PE is structurally valid until Windows-host runtime testing is
  available.

The operator's acceptance seat is a fresh GLM-5.2 verifier. Its verbatim CLI
transcript is written contemporaneously to the PostgreSQL session archive.

## Artifact hygiene and handback

- All persisted artifacts use slug-first, fully stamped names.
- Wrong-version or stale bundles move to `~/outbox/standroidsmissal/`; never
  delete them.
- `dist/` is tracked. Large artifacts use Forgejo LFS only; never GitHub LFS.
- Commit stamped source/tooling first with a `v<version>:` prefix.
- Make manifest `source.commit` point to that exact source commit, then obtain
  independent manifest verification.
- Commit `dist/` separately with a `v<version>:` prefix.
- Push Forgejo first, then the GitHub code mirror:

```bash
git push origin master
git push github master
```

Before a large push, confirm `.lfsconfig` and `remote.github.lfsurl` both route
LFS objects to Forgejo. GitHub receives commits and LFS pointers only.

## Store packaging gaps

- Google Play: production AAB is available.
- Microsoft Store: tile/listing assets exist. MSIX packaging is available via
  `npm run build:windows:msix` on a Windows host (winapp CLI); the Store
  re-signs on submission so no certificate purchase is required. MSI packaging
  is also available via `npm run build:windows:msi` for non-Store distribution.
- Ubuntu/Snap Store: listing assets exist, but a `.snap` does not yet exist.

## Web deployment

The web/PWA build is deployed to `https://standroid.robin.mba` on a self-hosted
nginx-ui LXC container (Proxmox CT `$CT_ID`, IP `$PVE_HOST` — see `~/Admin-Manual`).

### Architecture

- **Vhost:** `/etc/nginx/sites-available/standroid.robin.mba.conf`
- **Static root:** `/var/www/standroid/current` → symlink to
  `/var/www/standroid/releases/<version>/`
- **TLS:** `*.robin.mba` wildcard ECC P-256 cert (acme.sh-managed, auto-renewed)
- **SPA fallback:** `try_files $uri $uri/ /index.html`
- **Asset caching:** hashed filenames get `expires 1y` + `immutable`;
  `.wasm` same
- **Corpus DB:** `/missal.db` uses `etag on` + `Cache-Control: public, no-cache`
  (URL is stable across releases — clients revalidate via ETag)
- **No backend:** pure static SPA; sql.js loads the corpus client-side

### Deploy procedure

After `npm run build:release` has produced
`dist/standroidsmissal-v<version>-web-pwa.zip`:

```bash
# 1. Extract the web PWA zip to the project outbox staging area
mkdir -p ~/outbox/standroidsmissal/web-deploy
cd ~/outbox/standroidsmissal/web-deploy
rm -rf *
unzip ~/CascadeProjects/StAndroidsMissal/dist/standroidsmissal-v<version>-web-pwa.zip

# 2. Create the new release directory on CT $CT_ID
ssh root@$PVE_HOST "pct exec $CT_ID -- mkdir -p /var/www/standroid/releases/<version>"

# 3. Push files into the LXC via tar pipe
tar czf - -C ~/outbox/standroidsmissal/web-deploy . | 
  ssh root@$PVE_HOST "pct exec $CT_ID -- tar xzf - -C /var/www/standroid/releases/<version>/"
ssh root@$PVE_HOST "pct exec $CT_ID -- chown -R 1000:1000 /var/www/standroid/releases/<version>"

# 4. Atomic symlink swap
ssh root@$PVE_HOST "pct exec $CT_ID -- ln -sfn /var/www/standroid/releases/<version> /var/www/standroid/current"

# 5. Verify
curl -sI https://standroid.robin.mba            # expect: 200 OK
curl -s https://standroid.robin.mba | grep index-  # confirm new asset hash
```

### Rollback

Old releases remain in `/var/www/standroid/releases/`. To roll back:

```bash
ssh root@$PVE_HOST "pct exec $CT_ID -- ln -sfn /var/www/standroid/releases/<old-version> /var/www/standroid/current"
```

Operator-specific access paths and credential locations are documented in
`~/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`.

## CI/CD — proposed recipe (not yet implemented)

CI/CD is **not yet active**. The forgejo/github hosting architecture is
changing and self-hosted runners have not yet been built. The checked-in
`.github/workflows/build-all-platforms.yml` remains dormant. This section
documents the proposed recipe and requirements so runners can be provisioned
when the operator is ready.

### Why self-hosted runners

This project requires a single Linux host with the full cross-compilation
toolchain (Linux native + Windows cross via `cargo-xwin` + Android NDK for
4 ABIs). GitHub-hosted runners cannot satisfy the Android production signing
requirement (keystore must not enter the repository), and the Forgejo LFS
architecture means GitHub-hosted runners would need LFS credentials for
Forgejo anyway. A self-hosted runner on the operator's build host — which
already has every toolchain provisioned — is the natural fit for both
GitHub Actions and Forgejo Actions.

### Runner host requirements

The runner host must have the complete manual-build toolchain installed:

- **Node.js ≥ 22.6** (with `--experimental-strip-types` support)
- **Rust stable** via rustup, with targets:
  `x86_64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`,
  `aarch64-linux-android`, `armv7-linux-androideabi`,
  `i686-linux-android`, `x86_64-linux-android`
- **Tauri CLI 2.x** (`npm ci` installs it locally, but the runner needs
  the system libraries)
- **Linux native libs**: `libwebkit2gtk-4.1-dev libgtk-3-dev
  libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev build-essential
  pkg-config libssl-dev`
- **Android SDK** platform 36, build-tools 36.1.0, NDK 27.0.12077973
- **`cargo-ndk`** and **`cargo-xwin`** installed via cargo
- **JDK 17** with `jarsigner`/`keytool`
- **Release utilities**: `zip`, `sha256sum`, `readelf` (binutils),
  `apksigner`, `aapt2`
- **Git LFS** configured to resolve against Forgejo (see `.lfsconfig`)
- **Android keystore**: provisioned at the same path as the manual build
  (`src-tauri/gen/android/keystore.properties` pointing to the
  Admin-Manual-custodied keystore). Never store secrets in the repo or
  CI variables that could leak into transcripts.

Environment variables the runner must export:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NDK_HOME="$ANDROID_HOME/ndk/27.0.12077973"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
```

### Proposed GitHub Actions recipe

Use a single self-hosted runner job (not a matrix) because the release
driver stamps once and must run all stages sequentially against the same
worktree:

```yaml
# .github/workflows/release.yml (proposed — do not activate yet)
name: release
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build-release:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Coherent release
        run: npm run build:release
        env:
          ANDROID_HOME: ${{ secrets.ANDROID_HOME }}
          ANDROID_SDK_ROOT: ${{ secrets.ANDROID_SDK_ROOT }}
          NDK_HOME: ${{ secrets.NDK_HOME }}
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-v${{ env.VERSION }}
          path: dist/standroidsmissal-v*
      - name: Commit dist
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "actions@github.com"
          git add dist/ version.txt version.json package.json package-lock.json
          git commit -m "v$(cat version.txt): CI release artifacts"
          git push
```

**Key considerations for GitHub Actions:**

- **Self-hosted runner registration**: register the runner via
  `actions/runner` on the build host. Ensure the runner user has access
  to the Android SDK, keystore, and Rust toolchain.
- **LFS**: `actions/checkout` with `lfs: true` fetches LFS objects from
  Forgejo (per `.lfsconfig`). GitHub LFS must not be used — the
  `remote.github.lfsurl` override routes GitHub LFS pointers to Forgejo.
- **Secrets**: store `ANDROID_HOME`, `NDK_HOME` as repository secrets.
  The keystore path is filesystem-local on the runner; do not store the
  keystore itself as a secret.
- **Cache**: use `swatinem/rust-cache@v2` with `workspaces: src-tauri`
  for Cargo build cache. `npm` cache is handled by `setup-node`.
- **Trigger**: tag-based (`v*`) for releases; `workflow_dispatch` for
  manual triggers. Do not trigger on every push to `master` — the
  release driver stamps a new version each run.
- **Artifact retention**: GitHub Actions artifacts expire (default 90
  days). The canonical artifacts are committed to `dist/` and pushed to
  Forgejo LFS; GitHub artifact upload is supplementary only.

### Proposed Forgejo Actions recipe

Forgejo Actions uses a compatible workflow syntax. The same self-hosted
runner can serve both:

```yaml
# .forgejo/workflows/release.yml (proposed — do not activate yet)
name: release
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build-release:
    runs-on: docker  # or 'self-hosted' if runner is configured
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - run: npm ci
      - name: Coherent release
        run: npm run build:release
        env:
          ANDROID_HOME: /home/runner/Android/Sdk
          NDK_HOME: /home/runner/Android/Sdk/ndk/27.0.12077973
      - name: Commit and push dist
        run: |
          git config user.name "forgejo-actions"
          git config user.email "actions@${CI_HOST}"
          git add dist/ version.txt version.json package.json package-lock.json
          git commit -m "v$(cat version.txt): CI release artifacts"
          git push origin master
```

**Key considerations for Forgejo Actions:**

- **Runner registration**: Forgejo supports self-hosted runners via
  `forgejo-runner` (container-based or bare-metal). A bare-metal runner
  on the build host is preferred because the toolchain is already
  provisioned and the Android keystore is filesystem-local.
- **LFS advantage**: Forgejo is the LFS origin, so `checkout` with
  `lfs: true` resolves natively without cross-remote configuration.
- **Secrets**: Forgejo supports repository and organization secrets.
  Store `ANDROID_HOME` and `NDK_HOME` as secrets. Keystore handling is
  identical to GitHub Actions — filesystem-local on the runner.
- **Push-back**: Forgejo Actions can push directly to the same Forgejo
  instance. No cross-remote LFS routing is needed. After Forgejo push,
  a separate step can mirror to GitHub (`git push github master`) with
  LFS pointers routing to Forgejo per `.lfsconfig`.
- **Container vs bare-metal**: if using `runs-on: docker`, the container
  must have the full toolchain pre-baked or mount the host's SDK/Rust
  directories. A bare-metal runner (`runs-on: self-hosted`) avoids this
  complexity entirely.

### Shared requirements (both platforms)

1. **Single-stamp invariant**: the release driver stamps exactly once.
   Never run parallel jobs that each stamp — this produces conflicting
   version numbers. The entire release must be one sequential job.
2. **Keystore security**: the production keystore lives on the runner
   host filesystem, never in CI secrets or environment variables. The
   ignored `keystore.properties` file points to it.
3. **LFS routing**: all LFS objects resolve to Forgejo. GitHub receives
   LFS pointers only (see `.lfsconfig` and `remote.github.lfsurl`).
4. **Resume on failure**: if a CI release fails mid-build, re-running
   the workflow resumes at the failed stage via `release.lock` (no
   re-stamp). For a clean restart, use `npm run build:release --restart`.
5. **Artifact commitment**: CI should commit `dist/` artifacts to the
   repository (Forgejo LFS-backed) rather than relying solely on
   CI-provider artifact storage, which is ephemeral.
6. **No simultaneous CI + manual builds**: the release driver writes
   `release.lock` to the worktree. If CI and a manual build run
   concurrently in the same checkout, they will conflict. Use separate
   checkouts or ensure CI and manual builds are serialized.
