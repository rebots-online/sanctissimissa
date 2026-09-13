#!/usr/bin/env bash
# Compatibility entry point; packaging consumes the frozen native release.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if command -v powershell.exe >/dev/null 2>&1; then
  POWERSHELL=powershell.exe
elif command -v pwsh >/dev/null 2>&1; then
  POWERSHELL=pwsh
else
  echo 'Native Windows PowerShell is required for MSIX packaging.' >&2
  exit 1
fi
exec "$POWERSHELL" -NoProfile -NonInteractive -File \
  scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1 -Kind MSIX
