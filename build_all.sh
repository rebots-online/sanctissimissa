#!/usr/bin/env bash
# All platform releases share the canonical host-aware state driver.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
exec node scripts/release-state.mjs "$@"
