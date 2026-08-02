#!/usr/bin/env bash
# Pre-build gate: prevents duplicate version builds and non-repo builds.
# Run before ANY build command (web, linux, windows, android).
# Exits non-zero with a clear message if any check fails.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(cat version.txt 2>/dev/null || true)"
if [ -z "$VERSION" ]; then
  echo "GATE FAIL: no version.txt found — not a project root"
  exit 1
fi

# Check 1: must be a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "GATE FAIL: $ROOT is not a git repository."
  echo "Building from a non-git copy produces untraceable artifacts."
  echo "Clone the repo properly before building."
  exit 1
fi

# Check 2: working tree must be clean (no uncommitted source changes)
# Allow untracked files (checklists, etc.) but not modified tracked files
if [ -n "$(git diff --name-only)" ] || [ -n "$(git diff --cached --name-only)" ]; then
  echo "GATE FAIL: git working tree has uncommitted changes to tracked files."
  echo "Modified files:"
  git diff --name-only
  git diff --cached --name-only
  echo ""
  echo "Commit or stash changes before building, or the build will be from"
  echo "unrecorded source — the version string will claim a state that doesn't exist."
  exit 1
fi

# Check 3: dist/ must not already contain artifacts at this version
# (same version = duplicate build event, even from the same source)
if [ -d dist ]; then
  EXISTING=$(find dist -maxdepth 1 -name "standroidsmissal-v${VERSION}-*" 2>/dev/null | head -1)
  if [ -n "$EXISTING" ]; then
    echo "GATE FAIL: dist/ already contains artifacts at version ${VERSION}."
    echo "Existing artifacts:"
    find dist -maxdepth 1 -name "standroidsmissal-v${VERSION}-*" -exec ls -la {} \;
    echo ""
    echo "Rebuilding at the same version produces a duplicate build — different"
    echo "binaries with the same version string. Stamp to a new version first:"
    echo "  npm run stamp"
    exit 1
  fi
fi

# Check 4: version.txt must match version.json
VERSION_JSON=$(node -p "require('./version.json').version" 2>/dev/null || true)
if [ "$VERSION_JSON" != "$VERSION" ]; then
  echo "GATE FAIL: version.txt (${VERSION}) and version.json (${VERSION_JSON}) disagree."
  echo "Run npm run stamp to synchronize."
  exit 1
fi

echo "GATE PASS: version=${VERSION}, git clean, no duplicate in dist/"
