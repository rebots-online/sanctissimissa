# SanctissiMissa v1.41.21298 — available artifacts, incomplete release

Built on native Linux `asrock` on 2026-09-13 from frozen source
`de26d665db1f0e327e47996fafe6bd2ebc8dfad0`. Android versionCode is `100041`.
The coordinated build exited `2` with native Windows and strict collection
pending. All nine available artifacts (4,700,421,118 bytes) are retained here.

| Platform | Retained outputs |
|---|---|
| Web/PWA | `sanctissimissa-v1.41.21298-web-pwa.zip` |
| Linux | `sanctissimissa-v1.41.21298-linux-amd64.AppImage`, `sanctissimissa-v1.41.21298-linux-amd64.deb` |
| Windows cross-build | `sanctissimissa-v1.41.21298-windows-x64-standalone.exe`, `sanctissimissa-v1.41.21298-windows-x64-setup.exe` |
| Android | `sanctissimissa-v1.41.21298-android-universal-debug.apk`, `sanctissimissa-v1.41.21298-android-universal-release.apk`, `sanctissimissa-v1.41.21298-android-universal-release.aab`, `sanctissimissa-v1.41.21298-android-native-debug-symbols.zip` |

The stamped JSON/XML release manifests contain the actual file sizes and SHA-256
hashes. Their `partial` status is intentional. Native Windows standalone EXE,
MSI (`1.41.0`) and MSIX (`1.41.0.0`) remain missing. Cross-built Windows files
are unsigned. No complete-release manifest or public-release pointer was advanced.

## Changes included

- Frosted glass is an optional, initially unchecked setting across all eight
  themes. Inactive tabs use blurred backgrounds while labels stay sharp;
  the active tab retains its opaque accent.
- Active application, PWA, native package, executable, library and artifact
  producers use SanctissiMissa and `mba.robin.sanctissimissa`.
- Browser data migrates from legacy stores without modifying them; current
  SanctissiMissa data, including an explicitly empty annotation list, takes
  precedence over legacy data.
- Root `dist/` is durable and tracked; binary contents use this project's
  authoritative Forgejo LFS endpoint. Partial collection retains available
  artifacts and supports identical-byte retries.

The frozen source lacks a `v1.41.21298` section in `DOCS/CHANGELOG.md`; generated
change-note metadata reports that absence. This status document records the
actual changes and handback evidence without altering the frozen build source.

## Observed verification

- All 349 automated tests passed. Web/PWA, Linux, cross-Windows and both Android
  build stages completed through the sanctioned release entry point.
- Canonical partial collection, its identical repeat and collection in the
  frozen checkout all produced the same nine hashes and exact three-file
  missing matrix.
- Debian metadata/launcher and Windows EXE resources contain the current product
  and version. Both APK signatures and embedded package/version checks passed.
  The AAB signature passed; Google bundletool confirmed package
  `mba.robin.sanctissimissa`, version `1.41.21298`, versionCode `100041` and
  activity `mba.robin.sanctissimissa.MainActivity`.
- Four Android ABIs passed application DWARF and 16 KB LOAD-alignment checks.
  Every allocated ELF section matches across APK, AAB and symbols ZIP for each
  ABI. GNU build IDs are absent; this correspondence was verified through
  section metadata and content hashes instead.
- Targeted production-browser observation passed on Parchment and Slate:
  Frosted glass toggles the inactive-tab backdrop, labels remain unfiltered,
  the active tab stays opaque, and no browser errors were reported.

Evidence is retained under `rubric-runs/` with this version prefix, including
raw/readable build logs, collector logs, frozen release state, manifest dump,
symbol correspondence and browser observation. These checks do not attest the
full TEST_RUBRIC, native runtime, Microsoft Store acceptance or Play readiness.
Play delivery BP.1 remains incomplete. No application deployment or deferred
HelloWord website/Play migration occurred in this release run.

## Continue the same release

Prepared Linux collection checkout:

```text
/home/robin/Admin-Manual/.staging/sanctissimissa-v1.41.21298-frozen-release-20260913
```

It retains the exact source commit, hash-matched corpus/configuration inputs,
completed-stage state, timestamp-preserved web tree and required producer files.
Collection was actually run there and reused all nine hashes. Private inputs
remain local and are not in `dist/` or Git.

On an actual native Windows host, use a clean checkout at the frozen commit,
provision the same recorded input bytes and release state, then use the runbook's
native toolchain/signing configuration and `npm run build:release -- --resume-only`.
Do not stamp again, substitute the later artifact commit for `sourceHead`, or
copy the Linux worktree's machine-local `.git` pointer onto Windows.

Return the updated state, native verification receipt and every receipt-relative
file under `src-tauri/target/windows-native/` to the prepared Linux checkout.
Resume there for strict collection when the full required matrix is ready, then
return the resulting `dist/` artifacts/evidence to the canonical checkout for
publication. The authoritative repository is
<https://forgejo.robin.mba/rcheung/sanctissimissa>; GitHub receives source and LFS
pointers through the configured mirror.
