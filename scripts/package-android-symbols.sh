#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 - "$ROOT" <<'RELEASE_GUARD'
import json
from pathlib import Path
import re
import subprocess
import sys

root = Path(sys.argv[1])

def refuse(message):
    raise SystemExit(f'Native symbols release guard: {message}')

try:
    version = (root / 'version.txt').read_text().strip()
    metadata = json.loads((root / 'version.json').read_text())
    state = json.loads((root / 'standroidsmissal-release-state.json').read_text())
except (OSError, UnicodeError, json.JSONDecodeError):
    refuse('cannot read valid version metadata and frozen release state')

if not isinstance(metadata, dict) or not isinstance(state, dict):
    refuse('version metadata and release state must be objects')
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    refuse('version.txt must contain MAJOR.MINOR.BUILD')
if metadata.get('version') != version or state.get('version') != version:
    refuse('version.txt, version.json and release state versions do not match')
try:
    head = subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=root, text=True, stderr=subprocess.PIPE,
    ).strip()
except (OSError, subprocess.CalledProcessError):
    refuse('cannot resolve the current source commit')
if state.get('sourceHead') != head:
    refuse('current HEAD does not match the frozen release source commit')
if state.get('stampPending', False) is not False:
    refuse('release stamping is pending or its state is invalid')
completed = state.get('completedStages')
if (not isinstance(completed, list) or not all(isinstance(stage, str) for stage in completed)
        or 'android-release' not in completed):
    refuse('the frozen release has no completed android-release stage')
print(version)
RELEASE_GUARD
)"
SOURCE="src-tauri/gen/android/app/build/intermediates/merged_native_libs/universalRelease/mergeUniversalReleaseNativeLibs/out/lib"
OUTPUT_DIR="src-tauri/gen/android/app/build/outputs/native-debug-symbols/universalRelease"
OUTPUT="$ROOT/$OUTPUT_DIR/standroidsmissal-v${VERSION}-android-native-debug-symbols.zip"

abis=(arm64-v8a armeabi-v7a x86 x86_64)
libraries=()
for abi in "${abis[@]}"; do
  lib="$SOURCE/$abi/libst_androids_missal_lib.so"
  if [ ! -f "$lib" ]; then
    echo "Missing native symbols input: $lib" >&2
    exit 1
  fi
  # Standard-library DWARF can survive even when this application's debug
  # information was never generated. Inspect compilation units, not sections.
  python3 - "$lib" "$ROOT" <<'PY'
import os
from pathlib import Path
import re
import subprocess
import sys

library = Path(sys.argv[1])
app_source = Path(sys.argv[2]) / 'src-tauri/src/lib.rs'

def fail(message):
    raise SystemExit(f'{library.parent.name}: {message}')

def readelf(*arguments):
    try:
        return subprocess.run(
            ['readelf', *arguments, str(library)],
            check=True, capture_output=True, text=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError) as error:
        fail(f'cannot inspect native library: {error}')

units = []
unit = None
for line in readelf('--debug-dump=info', '--dwarf-depth=1').splitlines():
    if 'DW_TAG_compile_unit' in line:
        unit = {}
        units.append(unit)
    elif unit is not None:
        attribute = re.search(r'DW_AT_(name|comp_dir)\s*:\s*(.*)', line)
        if attribute:
            value = re.sub(r'^\([^)]*\):\s*', '', attribute.group(2)).strip()
            unit.setdefault(attribute.group(1), value)

def is_application_unit(unit):
    name = unit.get('name', '')
    if re.search(r'(?<![A-Za-z0-9_])st_androids_missal_lib(?![A-Za-z0-9_])', name):
        return True
    # Also accept the exact app source under its compilation directory, so
    # a generic dependency src/lib.rs cannot satisfy application coverage.
    source = Path(name.split('/@/', 1)[0])
    if not source.is_absolute():
        directory = unit.get('comp_dir')
        if not directory:
            return False
        source = Path(directory) / source
    return os.path.normpath(source) == os.path.normpath(app_source)

if not any(is_application_unit(unit) for unit in units):
    fail('application DWARF is missing; rebuild Android release with '
         'CARGO_PROFILE_RELEASE_DEBUG=2 and CARGO_PROFILE_RELEASE_STRIP=false')

segments = [line.split() for line in readelf('-lW').splitlines()
            if line.lstrip().startswith('LOAD ')]
if not segments:
    fail('native library has no LOAD segments')
for segment in segments:
    try:
        offset, address, alignment = (int(segment[index], 16) for index in (1, 2, -1))
    except (IndexError, ValueError):
        fail('cannot parse native LOAD segment')
    if alignment < 0x4000 or alignment & (alignment - 1):
        fail(f'LOAD alignment {alignment:#x} does not support 16 KB pages')
    if offset % alignment != address % alignment:
        fail('LOAD file offset and virtual address are not congruent')

print(f'{library.parent.name}: application DWARF and 16 KB LOAD alignment verified')
PY
  libraries+=("$abi/libst_androids_missal_lib.so")
done

mkdir -p "$OUTPUT_DIR"
ARCHIVE_STAMP="$(date -u +%Y%m%dT%H%M%S%NZ)"
STAGED_OUTPUT="$ROOT/$OUTPUT_DIR/standroidsmissal-v${VERSION}-android-native-debug-symbols-${ARCHIVE_STAMP}.zip"
test ! -e "$STAGED_OUTPUT"
# Create a fresh archive containing exactly the four validated ABI libraries.
(cd "$SOURCE" && zip -q "$STAGED_OUTPUT" "${libraries[@]}")
test -s "$STAGED_OUTPUT"
if [ -e "$OUTPUT" ]; then
  PREVIOUS_DIR="$HOME/outbox/standroidsmissal"
  PREVIOUS_OUTPUT="$PREVIOUS_DIR/standroidsmissal-v${VERSION}-android-native-debug-symbols-previous-${ARCHIVE_STAMP}.zip"
  mkdir -p "$PREVIOUS_DIR"
  test ! -e "$PREVIOUS_OUTPUT"
  cp -p -- "$OUTPUT" "$PREVIOUS_OUTPUT"
  cmp -- "$OUTPUT" "$PREVIOUS_OUTPUT"
fi
mv -T -- "$STAGED_OUTPUT" "$OUTPUT"
test -s "$OUTPUT"
echo "Native debug symbols → $OUTPUT_DIR/$(basename "$OUTPUT")"
