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

if [ ! -f devcert.pfx ]; then
  echo "ERROR: devcert.pfx is missing (gitignored, provisioned per machine)." >&2
  echo "  Generate once:  winapp cert generate --publisher \"CN=Robin Cheung\"" >&2
  exit 1
fi

echo ""
echo "=== Staging for MSIX ==="
rm -rf msix-stage
mkdir -p msix-stage/Assets
cp "$EXE" msix-stage/
cp -r dist-web msix-stage/dist-web

# The manifest names Assets\*.png. Staging never copied them, so every package
# built to date referenced logos that were not inside it — which is a package
# Windows refuses to install, not a package that installs and looks wrong.
for logo in StoreLogo Square44x44Logo Square150x150Logo Square310x310Logo Square71x71Logo; do
  cp "src-tauri/icons/${logo}.png" "msix-stage/Assets/${logo}.png"
done

# Fail loudly here rather than at Add-AppxPackage time: every asset the
# manifest references must exist in the stage.
missing=0
while read -r asset; do
  [ -f "msix-stage/${asset}" ] || { echo "MISSING ASSET: ${asset}" >&2; missing=1; }
done < <(grep -o 'Assets\\[A-Za-z0-9]*\.png' Package.appxmanifest | tr '\\' '/' | sort -u)
[ "$missing" -eq 0 ] || { echo "ERROR: manifest references assets absent from the stage." >&2; exit 1; }

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
