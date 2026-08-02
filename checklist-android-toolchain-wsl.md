# Checklist — Install Android toolchain in WSL and build v1.25.59353 Android artifacts

States: `[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code

## Applicable conventions (adapted from ~/Admin-Manual/)

- **BUILD-INSTRUCTIONS-StAndroidsMissal.md — Verified workstation toolchain**: Node 22.6+, Rust stable + four Android Rust targets, Android SDK (~/Android/Sdk), SDK platform/target 36, build-tools 36.1.0, NDK 27.0.12077973, JDK with keytool and jarsigner, cargo-ndk, cargo-xwin, Git LFS.
- **CC17 §4a — Build on the platform you're on**: Android builds run in WSL (Linux). The release driver runs in WSL. Credentials are at ~/Admin-Manual/CREDENTIALS/PlayStore/.
- **CC12 — Slug-first names**: Android artifacts staged as `standroidsmissal-v1.25.59353-android-universal-debug.apk`, `-android-universal-release.apk`, `-android-universal-release.aab`, `-android-native-debug-symbols.zip`.
- **CC17 — Evidentiary support**: Verify each install with command output before proceeding.
- **CC18 — Follow the checklist**: Step by step, no ad-hoc.

## Install
- [ ] **I.1** Install JDK (OpenJDK 17) in WSL
  Command: `sudo apt-get update && sudo apt-get install -y openjdk-17-jdk`
  Verify: `java -version` and `which keytool`
- [ ] **I.2** Install Android command-line tools
  Command: download cmdline-tools from developer.android.com, install to ~/Android/Sdk
  Verify: `~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --version`
- [ ] **I.3** Install SDK platform 36, build-tools 36.1.0, NDK 27.0.12077973
  Command: `sdkmanager "platforms;android-36" "build-tools;36.1.0" "ndk;27.0.12077973"`
  Verify: `ls ~/Android/Sdk/platforms/android-36/ && ls ~/Android/Sdk/build-tools/36.1.0/ && ls ~/Android/Sdk/ndk/27.0.12077973/`
- [ ] **I.4** Install four Android Rust targets
  Command: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
  Verify: `rustup target list --installed | grep android`
- [ ] **I.5** Install cargo-ndk
  Command: `cargo install cargo-ndk`
  Verify: `cargo ndk --version`
- [ ] **I.6** Set ANDROID_HOME and ANDROID_SDK_ROOT
  Command: export ANDROID_HOME="$HOME/Android/Sdk" && export ANDROID_SDK_ROOT="$ANDROID_HOME"
  Verify: `echo $ANDROID_HOME`

## Build — Android (WSL)
- [ ] **B.1** Build Android debug APK at 1.25.59353
  Command: `npm run build:android -- --debug` (or tauri android build --debug)
  Verify: APK exists in src-tauri/gen/android/app/build/outputs/apk/
- [ ] **B.2** Build Android release APK + AAB at 1.25.59353
  Command: `npm run build:android` (or tauri android build --apk --aab)
  Verify: APK and AAB exist, signed with production keystore
- [ ] **B.3** Build native debug symbols at 1.25.59353
  Verify: symbols zip exists

## Stage
- [ ] **S.1** Stage Android artifacts to dist/ with slug-first names (CC12)
  Verify: `ls dist/standroidsmissal-v1.25.59353-android*`

## Verify
- [ ] **V.1** All 10 required artifacts present in dist/ at v1.25.59353
  Verify: `ls dist/standroidsmissal-v1.25.59353*` — should show 10 files
- [ ] **V.2** Release APK/AAB signed with expected upload certificate
  Verify: `keytool -printcert -jarfile <apk>` — SHA-256 should match `56c13674ef22df95deb1e5c468820e8cfa3ea2f522511749ab7b6e5bde3bd943`
