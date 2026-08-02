#!/usr/bin/env node
// stamp-version.mjs — canonical version stamper for St. Android's Missal.
//
// Node port of the WORKING pattern (Kintsugi-Unbroken tauri2/scripts/
// update-version.sh): the bump lives INSIDE the stamper. A stamper that only
// reads produces the impossible 1.0.x-forever pattern this replaced.
//
//   MAJOR = manual milestone (edit version.txt by hand, once per milestone)
//   MINOR = auto-bumped UNCONDITIONALLY on every invocation (the heartbeat;
//           resets to 0 when MAJOR changes)
//   BUILD = epoch-minutes % 100000, 5-digit zero-padded (display only)
//
//   versionName = MAJOR.MINOR.BUILD     e.g. 1.1.30295
//   versionCode = MAJOR*100000 + MINOR  (BUILD excluded — Play needs monotonic)
//
// Canonical source: version.txt (single line MAJOR.MINOR.BUILD).
// Mirror: version.json (runtime metadata). Stamped: package.json,
// src-tauri/tauri.conf.json, src-tauri/Cargo.toml, and package-lock.json.
//
// release.lock (JSON {"major":N,"minor":N,"build":N}) freezes values so
// multi-artifact releases stamp identical strings; delete it to resume bumping.
// Invoked exactly once by the release driver, never from `prebuild`. SOP:
// ~/Admin-Manual/versioning/ and ~/.claude/CLAUDE.md § Build & Version Numbering.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (rel) => resolve(ROOT, rel);

const PRODUCT = "St. Android's Missal";
const INTERNAL = 'st-androids-missal';
const PACKAGE = 'mba.robin.standroidsmissal'; // must match tauri.conf.json identifier — no underscores, no hyphens

let MAJOR, MINOR, BUILD;
const lockPath = p('release.lock');
if (existsSync(lockPath)) {
  console.log('[stamp-version] Using frozen release.lock values');
  ({ major: MAJOR, minor: MINOR, build: BUILD } = JSON.parse(readFileSync(lockPath, 'utf8')));
} else {
  // Read canonical version.txt (seeded from the last stamped manifest on
  // first run), then bump MINOR unconditionally.
  const current = existsSync(p('version.txt'))
    ? readFileSync(p('version.txt'), 'utf8').trim()
    : JSON.parse(readFileSync(p('package.json'), 'utf8')).version ?? '1.0.0';
  if (!/^\d+\.\d+\.\d+$/.test(current)) {
    throw new Error(`Invalid version.txt value: ${JSON.stringify(current)}`);
  }
  const [curMajor, curMinor] = current.split('.').map(Number);
  MAJOR = curMajor;
  MINOR = curMinor + 1; // THE heartbeat — never remove this line
  if (MINOR >= 100000) throw new Error('MINOR must remain below 100000 (Play versionCode lane exhausted)');
  BUILD = Math.floor(Date.now() / 60000) % 100000;
}

const BUILD_PADDED = String(BUILD).padStart(5, '0');
const VERSION = `${MAJOR}.${MINOR}.${BUILD_PADDED}`;
const VERSION_CODE = MAJOR * 100000 + MINOR;
console.log(`Stamping version: ${VERSION} (versionCode: ${VERSION_CODE})`);

// ── canonical + runtime mirror ───────────────────────────────────────────────
writeFileSync(p('version.txt'), `${VERSION}\n`);
writeFileSync(
  p('version.json'),
  JSON.stringify(
    {
      version: VERSION,
      versionBase: `${MAJOR}.${MINOR}`,
      buildNumber: BUILD_PADDED,
      versionCode: VERSION_CODE,
      buildDate: new Date().toISOString(),
      productName: PRODUCT,
      internalName: INTERNAL,
      packageName: PACKAGE,
    },
    null,
    2,
  ) + '\n',
);

// ── stamp platform manifests ─────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(p('package.json'), 'utf8'));
pkg.version = VERSION;
writeFileSync(p('package.json'), JSON.stringify(pkg, null, 2) + '\n');

const pkgLock = JSON.parse(readFileSync(p('package-lock.json'), 'utf8'));
pkgLock.version = VERSION;
if (pkgLock.packages?.['']) pkgLock.packages[''].version = VERSION;
writeFileSync(p('package-lock.json'), JSON.stringify(pkgLock, null, 2) + '\n');

const conf = JSON.parse(readFileSync(p('src-tauri/tauri.conf.json'), 'utf8'));
conf.version = VERSION;
conf.bundle ??= {};
conf.bundle.android ??= {};
conf.bundle.android.versionCode = VERSION_CODE;
conf.bundle.android.autoIncrementVersionCode = false;
writeFileSync(p('src-tauri/tauri.conf.json'), JSON.stringify(conf, null, 2) + '\n');

const cargo = readFileSync(p('src-tauri/Cargo.toml'), 'utf8')
  .replace(/^version\s*=\s*"[^"]*"/m, `version = "${VERSION}"`);
writeFileSync(p('src-tauri/Cargo.toml'), cargo);

for (const f of [
  'version.txt',
  'version.json',
  'package.json',
  'package-lock.json',
  'src-tauri/tauri.conf.json',
  'src-tauri/Cargo.toml',
])
  console.log(`  ✓ ${f} → ${VERSION}`);
