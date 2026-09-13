# St. Android's Missal — Build and Release Instructions

Canonical project recipe. Operator access and credential custody remain in
`/home/robin/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`.
Release coordination follows Admin-Manual CC14 v1.1 and the
[RP contract](DOCS/ARCHITECTURE/standroidsmissal-v1.39.15371-release-parity-20260913.md).

## Checkout and identity

- Product: St. Android's Missal; package ID `mba.robin.standroidsmissal`.
- Slug: `standroidsmissal`; canonical version: `version.txt`; mirror: `version.json`.
- Verified native Linux checkout: `/home/robin/Desktop/devProjects/sanctissimissa`
  on `asrock`. Do not build on WSL or assume older checkout paths exist.
- This source-only checkpoint ignores provisioned corpus and `dist/`. Preserve
  release files locally and follow project AGENTS.md for storage/pushes; restoring
  the full Forgejo/LFS checkout is a separate migration. The configured source
  remote is currently `origin`; inspect `git remote -v` before publishing.
- CI remains dormant. These commands are local release commands.

## One complete release, one version

Every platform consumes the same `MAJOR.MINOR.BUILD`, source commit and release
inputs. A new complete release increments MINOR once even if it later fails.
Nested builds and host continuations never stamp independently. Platform leaf
commands consume the current stamp and are useful for validation; they do not
constitute a complete release by themselves.

| Package | Numeric version |
|---|---|
| App UI, filenames, runtime version.json | Full `MAJOR.MINOR.BUILD` |
| Android versionName / versionCode | Full version / `MAJOR * 100000 + MINOR` |
| MSI ProductVersion | `MAJOR.MINOR.0`, with MAJOR/MINOR <=255 |
| MSIX Identity Version | `MAJOR.MINOR.0.0`, each non-reserved component <=65535 |

Installer mappings preserve monotonic ordering without overflowing format fields.
They are recorded in release metadata alongside the full application version.

## Prerequisites

Common: Node >=22.6, npm, Rust stable, Git, provisioned `assets/missal.db`, local
`.env` if used. Commit source/tooling before starting; the driver separately
commits its own exact version stamp before any build gate runs.

Native Linux needs `build-essential`, `pkg-config`, `libssl-dev`,
`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`,
`librsvg2-dev`, and `libsoup-3.0-dev`. Windows cross-compilation also requires
cargo-xwin, target `x86_64-pc-windows-msvc`, LLVM cross tools and NSIS >=3.11.
The cross stage emits both the standalone EXE and the NSIS setup EXE.

Android needs SDK platform36, build-tools36.1.0, NDK27.0.12077973, a compatible
JDK, cargo-ndk, zip/readelf, and all four targets: aarch64-linux-android,
armv7-linux-androideabi, i686-linux-android, x86_64-linux-android. The generated
Gradle integration uses the existing `src-tauri/tauri` symlink. Provision the
production keystore through Admin-Manual; do not commit or print signing inputs.

Native Windows needs a local Windows filesystem checkout, Node/npm, Rust MSVC
and Visual Studio C++ build tools, Windows SDK MakeAppx/SignTool, and the
configured signing certificate. Set these host-local inputs without committing
credentials:

- `SAM_WINDOWS_CERTIFICATE_THUMBPRINT`
- `SAM_WINDOWS_TIMESTAMP_URL`
- `SAM_MS_STORE_IDENTITY_NAME`
- `SAM_MS_STORE_PUBLISHER`

The Store identity/publisher must be the actual Partner Center values. Missing
host or signing configuration leaves native packaging pending. Native Windows
execution has not yet been verified in this work; script presence is not proof.

## Start, resume and continue on another host

From the verified native Linux checkout:

```bash
npm ci
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npm run build:release
```

`build_all.sh` and `npm run build:all` delegate to the same Node driver. The
ignored `standroidsmissal-release-state.json` stores the common version, stamp
commit, source-input hashes and completed stages. A subsequent plain invocation
resumes that state. Completed state remains as an idempotent terminal record.
To deliberately begin a different release:

```bash
npm run build:release -- --restart
```

The predecessor state is copied to the stamped outbox before a fresh stamp.
Corrupt or mismatched state fails closed; never change its version by hand to
make a different source tree look like the original release.

The driver detects the actual host. On Linux it runs tests, web, deb/AppImage,
Windows cross EXE/NSIS, Android debug/release APK/AAB and symbols. Windows native
MSI/MSIX remain pending and do not stop subsequent Android work. Exit2 means
incomplete release; it preserves state and does not perform final collection.

For native Windows continuation, copy the checkout at the state's source commit,
matching ignored corpus/.env inputs and the state file to a local Windows drive.
Do not run the stamp command. Install dependencies, then run from that checkout:

```powershell
node scripts/release-state.mjs --resume-only
```

Native builds use `src-tauri/target/windows-native`, preserving the Linux-cross
EXE separately. The MSI stage creates the native EXE/MSI with offline WebView2
and configured Authenticode signing. The MSIX stage packages that same native
EXE, version.json and required logos through Windows SDK tools. Its receipt
records full version/source commit, installer mappings, paths and hashes.

Copy the entire native target directory and updated release state back to the
canonical Linux checkout; preserve predecessor files before replacement. Resume
there with `--resume-only`. Final collection requires every platform stage and
all required files. A native host's completed-stage record alone does not supply
its artifacts. Source/input changes require a new full release, not continued
reuse of the old stamp.

## Required artifact set

All filenames begin `standroidsmissal-v<full-version>-`:

| Platform | Required suffixes |
|---|---|
| Web/PWA | `web-pwa.zip` |
| Linux | `linux-amd64.deb`, `linux-amd64.AppImage` |
| Windows cross | `windows-x64-standalone.exe`, `windows-x64-setup.exe` |
| Windows native | Native standalone EXE, MSI, MSIX (distinct native EXE filename in collector) |
| Android | `android-universal-debug.apk`, `android-universal-release.apk`, `android-universal-release.aab`, `android-native-debug-symbols.zip` |

The collector requires NSIS and native Windows packages; they are not optional
extras. Explicit partial collection is diagnostic and identifies missing items.
It does not complete a release. Preserve existing same-version output before
rebuilding. Vite owns disposable `dist-web/` and may empty that directory; it
never owns the durable native artifact directory `dist/`.

Android release compilation uses `CARGO_PROFILE_RELEASE_DEBUG=2` and
`CARGO_PROFILE_RELEASE_STRIP=false`. Symbol packaging verifies application DWARF
and four ABI libraries, rather than accepting dependency-only `.debug_info`.
Android-specific linker flags align native LOAD segments to16KB; final artifact
validation must also inspect RELRO and ZIP alignment.

## Verification and remaining Store obligations

Run implementation checks without stamping:

```bash
node --check scripts/release-state.mjs
node --experimental-strip-types --test tests/releaseState.test.ts
npx tsc --noEmit --strict --module nodenext --moduleResolution nodenext scripts/release-state.d.mts tests/releaseState.test.ts
npx tsc -b --pretty false
npm test
```

Release acceptance uses `DOCS/TEST_RUBRIC.md`, including RP-V1…RP-V5, on actual
artifacts. Recalculate hashes, embedded versions, certificate identity and ABI /
symbol matching. Exercise installed apps and retain the required screencast and
timecodes. The fresh verifier and transcript-retention recipe are in Admin-Manual.

Two current obligations must remain visible:

1. **Google Play:** BP.1 fast-follow `corpus_pack` and its runtime delivery bridge
   are still unimplemented. The current AAB embeds the corpus. Generating or
   validating this AAB is not proof that the documented Play delivery contract is
   implemented; RP-V5 cannot pass yet.
2. **Microsoft Store:** the native host, actual identity/signing configuration,
   installation/runtime verification and Store-specific gates must be exercised.
   MSI/MSIX generation is distinct from Store acceptance.

A collected artifact set is a release candidate. Do not call it a complete,
ship-ready release or advance the public release pointer while required platform
or Store/runtime verification is outstanding.

## Deployment and publishing

Use the current Admin-Manual project runbook for deployment targets, credential
locations, atomic release staging and rollback. Keep previous deployed releases;
never clear a shared staging directory. This task does not activate CI or alter
other live mounts.

Commit scoped source/tooling with `v<version>:`; use the exact stamp commit in
release metadata. Follow the checkout's current AGENTS.md storage policy and
configured remotes, preserving remote work through additive integration. A
future CI design must retain one shared stamp across Linux/native Windows jobs,
use self-hosted labels per CICD_CONVENTIONS, and require all artifacts before
publication. Do not copy historical single-Linux-job examples into active CI.
