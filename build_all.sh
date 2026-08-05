#!/usr/bin/env bash
# build_all.sh — every dist/ artifact buildable on a Linux host, in one run.
# Skips MSI/MSIX (Windows host only). dist/ is append-only: nothing existing
# is deleted, moved, or overwritten (the collector refuses to overwrite).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NDK_HOME="${NDK_HOME:-$ANDROID_HOME/ndk/27.0.12077973}"
if [ -z "${JAVA_HOME:-}" ]; then
  JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
  export JAVA_HOME
fi

TAURI=./node_modules/.bin/tauri

test -d node_modules || npm ci

# Automatic version bump — the stamper owns the version; never set it manually.
# The pre-build gate requires the stamp to be recorded source, so commit it.
npm run stamp
(cd src-tauri && cargo update --workspace)
VERSION="$(tr -d '\r\n' < version.txt)"
git add Package.appxmanifest version.txt version.json package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "v${VERSION}: stamp (build_all)"

# Web/PWA surface (also the frontend embedded in every native shell)
npm run build:vite

# Linux: deb + AppImage
"$TAURI" build --bundles deb,appimage --ci

# Windows cross-compile: standalone PE + NSIS installer (MSI/MSIX deferred to a Windows host)
"$TAURI" build --runner cargo-xwin --target x86_64-pc-windows-msvc --bundles nsis --ci
test -f src-tauri/target/x86_64-pc-windows-msvc/release/st-androids-missal.exe

# Android: debug APK, then release APK + AAB with native symbols preserved
"$TAURI" android build --debug --apk --ci
CARGO_PROFILE_RELEASE_STRIP=false "$TAURI" android build --apk --aab --ci

# Android native debug symbols zip
bash scripts/package-android-symbols.sh

# Collect the stamped set into dist/ (append-only, hashed, manifested)
npm run collect-artifacts

echo "✅ build_all complete — artifacts in dist/ (MSI/MSIX pending Windows host)"
