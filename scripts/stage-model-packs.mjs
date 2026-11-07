#!/usr/bin/env node
// Stage the vendored GGUFs into the Play on-demand asset packs (L-native-embed-engine F3; BA.12).
//
//   node scripts/stage-model-packs.mjs            # missing source → WARN, exit 0 (devices fetch from mirror_url)
//   node scripts/stage-model-packs.mjs --require  # missing source → exit 3 (release: android-release stage)
//
// For every manifest row with an `android_pack`, copies
//   VENDORED/models/sha256/<sha256>/<fileName> → src-tauri/gen/android/<pack>/src/main/assets/models/<fileName>
// verifying sha256 + size of source and destination; an identical destination is skipped.
// The destination tree is gitignored (`src-tauri/gen/android/*_model_pack/src/main/assets/`).
// see DOCS/sdk/play-asset-delivery/integrate-java.md §Build for Kotlin and Java (step 6: src/main/assets)

import { createHash } from 'node:crypto';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'VENDORED/models/manifest.json');
const REQUIRE = process.argv.includes('--require');

/** Streamed sha256 (lowercase hex). */
function sha256File(path) {
  return new Promise((ok, fail) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', fail)
      .on('end', () => ok(hash.digest('hex')));
  });
}

async function matches(path, row) {
  if (!existsSync(path)) return false;
  if (statSync(path).size !== row.size_bytes) return false;
  return (await sha256File(path)) === row.sha256;
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const rows = manifest.assets.filter((row) => typeof row.android_pack === 'string');
  let missing = 0;
  for (const row of rows) {
    const pack = row.android_pack;
    const src = join(ROOT, 'VENDORED/models/sha256', row.sha256, row.fileName);
    const dst = join(ROOT, 'src-tauri/gen/android', pack, 'src/main/assets/models', row.fileName);
    if (!(await matches(src, row))) {
      // Absent or an LFS pointer (git lfs not pulled) — the device falls back to mirror_url.
      console.warn(`WARN unstaged ${pack} — devices fetch from mirror_url`);
      missing += 1;
      continue;
    }
    if (await matches(dst, row)) {
      console.log(`ok ${pack}: ${row.fileName} already staged`);
      continue;
    }
    mkdirSync(dirname(dst), { recursive: true });
    const tmp = `${dst}.partial`;
    copyFileSync(src, tmp);
    if (!(await matches(tmp, row))) {
      console.error(`FAIL ${pack}: staged copy of ${row.fileName} does not match sha256/size`);
      process.exit(2);
    }
    renameSync(tmp, dst);
    console.log(`staged ${pack}: ${row.fileName} (${row.size_bytes} bytes, sha256 ${row.sha256})`);
  }
  if (missing > 0 && REQUIRE) process.exit(3);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
