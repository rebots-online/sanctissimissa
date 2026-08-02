#!/usr/bin/env node
/**
 * Pre-build gate — the single positive prescription for building.
 *
 * Every `npm run build:*` script calls this FIRST. If it exits non-zero,
 * the build does not proceed. This makes the correct path the only path:
 *
 *   1. Must be inside a git repo (no loose copies)
 *   2. Git working tree must be clean (no uncommitted source changes)
 *   3. dist/ must not already contain artifacts at the current version
 *      (prevents duplicate builds at the same version.build)
 *   4. version.txt and version.json must agree
 *
 * If the gate fails, it tells you exactly what to do next.
 * There is no --force flag. The fix is always: commit, or stamp.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
process.chdir(ROOT);

function fail(msg) {
  console.error(`\nGATE FAIL: ${msg}\n`);
  process.exit(1);
}

// 1. version.txt must exist
let version;
try {
  version = readFileSync(join(ROOT, 'version.txt'), 'utf8').trim();
} catch {
  fail('no version.txt found — not a project root. Run builds from the repo root.');
}
if (!version) fail('version.txt is empty.');

// 2. Must be a git repo
try {
  execSync('git rev-parse --git-dir', { stdio: 'pipe' });
} catch {
  fail(`${ROOT} is not a git repository.\n` +
       `Building from a non-git copy produces untraceable artifacts.\n` +
       `Clone the repo properly before building.`);
}

// 3. Working tree must be clean (modified tracked files = unrecorded source)
let dirty;
try {
  dirty = execSync('git diff --name-only && git diff --cached --name-only', { encoding: 'utf8' }).trim();
} catch {
  dirty = '';
}
if (dirty) {
  fail('git working tree has uncommitted changes to tracked files.\n' +
       'Modified:\n' + dirty.split('\n').map(l => '  ' + l).join('\n') + '\n\n' +
       'Commit or stash before building. The version string must describe\n' +
       'the recorded source, not a local modification.');
}

// 4. dist/ must not already have artifacts at this version
const distDir = join(ROOT, 'dist');
if (existsSync(distDir)) {
  const prefix = `standroidsmissal-v${version}-`;
  const existing = readdirSync(distDir).filter(f => f.startsWith(prefix));
  if (existing.length > 0) {
    fail(`dist/ already contains ${existing.length} artifact(s) at version ${version}.\n` +
         existing.map(f => '  ' + f).join('\n') + '\n\n' +
         'Rebuilding at the same version produces different binaries with the\n' +
         'same version string — a duplicate build event. Stamp to a new version:\n' +
         '  npm run stamp');
  }
}

// 5. version.txt and version.json must agree
let versionJson;
try {
  versionJson = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf8')).version;
} catch {
  fail('version.json is missing or invalid. Run npm run stamp.');
}
if (versionJson !== version) {
  fail(`version.txt (${version}) and version.json (${versionJson}) disagree.\n` +
       'Run npm run stamp to synchronize.');
}

console.log(`GATE PASS: version=${version}, git clean, no duplicate in dist/`);
