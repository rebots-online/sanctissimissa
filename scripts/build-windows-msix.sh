#!/usr/bin/env bash
# Build MSIX package for Microsoft Store submission.
# Must run on Windows (cmd or PowerShell) with winapp CLI installed.
# The Store re-signs the package, so a dev cert is fine for submission.
#
# Prerequisites:
#   - winapp CLI:  winget install microsoft.winappcli --source winget
#   - Package.appxmanifest.xml at repo root (run `winapp init . --setup-sdks none` once)
#   - devcert.pfx at repo root (run `winapp cert generate --publisher "CN=Robin Cheung"` once)
#
# Usage from Windows:
#   npm run build:windows:msix
set -euo pipefail

VERSION=$(node -p "JSON.parse(require('fs').readFileSync('version.json','utf8')).version")
EXE="src-tauri/target/x86_64-pc-windows-msvc/release/st-androids-missal.exe"

echo "=== Building web frontend ==="
npm run build:vite

echo ""
echo "=== Building Rust (no bundle, exe only) ==="
npx tauri build --target x86_64-pc-windows-msvc --no-bundle

echo ""
echo "=== Staging for MSIX ==="
rm -rf msix-stage
mkdir -p msix-stage
cp "$EXE" msix-stage/
cp -r dist-web msix-stage/dist-web

echo ""
echo "=== Packaging MSIX ==="
winapp package ./msix-stage \
  --manifest ./Package.appxmanifest \
  --cert ./devcert.pfx \
  --output "standroidsmissal-v${VERSION}-windows-x64.msix"

echo ""
echo "=== Done ==="
ls -la "standroidsmissal-v${VERSION}-windows-x64.msix"
echo ""
echo "For Microsoft Store submission: upload this .msix via Partner Center."
echo "The Store will re-sign it — the dev cert is sufficient for submission."
