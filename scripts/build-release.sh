#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# The release state manager handles stamping, lock file, and resume/restart
node scripts/release-state.mjs "$@"