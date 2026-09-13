#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ "$(uname -s)" != Linux ] || grep -qi microsoft /proc/sys/kernel/osrelease; then
  echo 'Windows cross-build requires native Linux; use the native release driver on Windows.' >&2
  exit 1
fi
VERSION="$(node -e "try { console.log(JSON.parse(require('fs').readFileSync('version.json','utf8')).version) } catch { process.exit(1) }")"
test "$(tr -d '\r\n' < version.txt)" = "$VERSION"

# Keep diagnostics and generated NSIS input within the disposable target tree.
PREFIX="sanctissimissa-v${VERSION}"
RELEASE=src-tauri/target/x86_64-pc-windows-msvc/release
NSIS_PROJ="$RELEASE/nsis/x64"
mkdir -p "$RELEASE"
ATTEMPT="$(date -u +%Y%m%dT%H%M%SZ)-$$"
BUILD_LOG="$RELEASE/${PREFIX}-windows-cross-${ATTEMPT}.log"
BUILD_STARTED="$RELEASE/${PREFIX}-windows-cross-${ATTEMPT}.marker"
touch "$BUILD_STARTED"
set +e
./node_modules/.bin/tauri build --runner cargo-xwin \
  --target x86_64-pc-windows-msvc --bundles nsis --ci 2>&1 | tee "$BUILD_LOG"
BUILD_STATUS=${PIPESTATUS[0]}
set -e
if [ "$BUILD_STATUS" -ne 0 ]; then
  # Recover only the known apostrophe/COM quoting failure from this invocation.
  # An unrelated compiler failure must never repackage a stale executable.
  if ! grep -Eq 'NSISCOMCALL.*requires 4 parameter\(s\), passed' "$BUILD_LOG" ||
     [ ! "$NSIS_PROJ/utils.nsh" -nt "$BUILD_STARTED" ] ||
     [ ! "$NSIS_PROJ/installer.nsi" -nt "$BUILD_STARTED" ]; then
    exit "$BUILD_STATUS"
  fi
  cp -p "$NSIS_PROJ/utils.nsh" "$NSIS_PROJ/${PREFIX}-utils-before-${ATTEMPT}.nsh"
  sed -i '/${I[A-Za-z]*::/ s/'"'"'/`/g' "$NSIS_PROJ/utils.nsh"
  (cd "$NSIS_PROJ" && makensis -INPUTCHARSET UTF8 installer.nsi)
  mkdir -p "$RELEASE/bundle/nsis"
  cp "$NSIS_PROJ/nsis-output.exe" \
    "$RELEASE/bundle/nsis/SanctissiMissa_${VERSION}_x64-setup.exe"
fi

test -s "$RELEASE/sanctissimissa.exe"
test -s "$RELEASE/bundle/nsis/SanctissiMissa_${VERSION}_x64-setup.exe"
