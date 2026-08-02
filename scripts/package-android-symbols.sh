#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "JSON.parse(require('fs').readFileSync('version.json','utf8')).version")"
SOURCE="src-tauri/gen/android/app/build/intermediates/merged_native_libs/universalRelease/mergeUniversalReleaseNativeLibs/out/lib"
OUTPUT_DIR="src-tauri/gen/android/app/build/outputs/native-debug-symbols/universalRelease"
OUTPUT="$ROOT/$OUTPUT_DIR/standroidsmissal-v${VERSION}-android-native-debug-symbols.zip"

abis=(arm64-v8a armeabi-v7a x86 x86_64)
for abi in "${abis[@]}"; do
  lib="$SOURCE/$abi/libst_androids_missal_lib.so"
  test -f "$lib"
  readelf -S "$lib" | grep '\.debug_info' >/dev/null
done

mkdir -p "$OUTPUT_DIR"
(cd "$SOURCE" && zip -q -FS -r "$OUTPUT" "${abis[@]}")
test -s "$OUTPUT"
echo "Native debug symbols → $OUTPUT_DIR/$(basename "$OUTPUT")"
