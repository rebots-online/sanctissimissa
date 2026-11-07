#!/usr/bin/env node
/**
 * modules-stage — stage content modules (and the vendored base corpus) as
 * stamped release inputs, or into the Play on-demand asset pack (BA.1).
 *
 *   node scripts/modules-stage.mjs                 → dist/ stamped copies + content manifest
 *   node scripts/modules-stage.mjs --android-pack  → src-tauri/gen/android/<androidPack>/src/main/assets/modules/
 *
 * Normative source: DOCS/ARCHITECTURE/L-content-modules-search-20261106.md
 * §2.1 (stamped dist names), §2.4 (modules.json), §2.5 (asset pack path),
 * §3.2 modules-stage. Asset-pack layout: DOCS/sdk/play-asset-delivery/overview-summary.md
 * (on-demand pack assets live under the pack module's src/main/assets/).
 *
 * Exit 0 ok (absent inputs are skipped and said so) · exit 3 differing bytes
 * or a source whose sha256 disagrees with modules.json. Never overwrites a
 * dist/ file with different bytes; never deletes (stale pack files are moved
 * to ~/outbox/sanctissimissa/android-pack-stale/).
 */
import { createHash } from 'node:crypto';
import {
  constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync,
  unlinkSync, writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES_JSON = join(ROOT, 'content', 'library', 'modules.json');
const CURRENT_JSON = join(ROOT, 'VENDORED', 'corpus', 'CURRENT.json');
const STALE_DIR = join(homedir(), 'outbox', 'sanctissimissa', 'android-pack-stale');

const rel = (p) => relative(ROOT, p) || p;
const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function fail(msg) {
  console.error(`✖ modules-stage: ${msg}`);
  process.exit(3);
}

/** First existing source among the three accepted names (author resolution 6). */
function moduleSource(m) {
  const candidates = [
    join(ROOT, 'VENDORED', 'modules', m.file),
    join(ROOT, 'VENDORED', 'modules', `sanctissimissa-module-${m.editionId}-r${m.revision}.db`),
    join(ROOT, 'build', 'modules', m.file),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Copy src → dest exclusively; equal existing bytes are reused, differing bytes exit 3. */
function stageExclusive(src, dest, sha) {
  if (existsSync(dest)) {
    if (sha256File(dest) !== sha) fail(`${rel(dest)} exists with different bytes`);
    console.log(`= ${rel(dest)} (identical, reused)`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest, constants.COPYFILE_EXCL);
  console.log(`✓ ${rel(dest)}`);
}

function writeExclusive(dest, text) {
  if (existsSync(dest)) {
    if (readFileSync(dest, 'utf8') !== text) fail(`${rel(dest)} exists with different bytes`);
    console.log(`= ${rel(dest)} (identical, reused)`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, text, { flag: 'wx' });
  console.log(`✓ ${rel(dest)}`);
}

/** Move (never delete) a file into the outbox, keeping an unused name. */
function moveToOutbox(p) {
  mkdirSync(STALE_DIR, { recursive: true });
  let dest = join(STALE_DIR, basename(p));
  if (existsSync(dest)) dest = join(STALE_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${basename(p)}`);
  try {
    renameSync(p, dest);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    copyFileSync(p, dest, constants.COPYFILE_EXCL);
    unlinkSync(p);
  }
  console.log(`↪ moved stale ${rel(p)} → ${dest}`);
}

/** Resolve each modules.json entry to a sha-verified source, or skip it. */
function verifiedSources(modules) {
  const out = [];
  for (const m of modules) {
    const src = moduleSource(m);
    if (!src) {
      console.log(`module ${m.file} not present — skipped`);
      continue;
    }
    const sha = sha256File(src);
    if (sha !== m.sha256) fail(`${rel(src)} sha256 ${sha} ≠ modules.json ${m.sha256}`);
    out.push({ m, src, sha, size: statSync(src).size });
  }
  return out;
}

function stageAndroidPack(sources) {
  for (const { m, src, sha } of sources) {
    const dir = join(ROOT, 'src-tauri', 'gen', 'android', m.androidPack, 'src', 'main', 'assets', 'modules');
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.db') && f !== m.file) moveToOutbox(join(dir, f));
    }
    const dest = join(dir, m.file);
    if (existsSync(dest)) {
      if (sha256File(dest) === sha) {
        console.log(`= ${rel(dest)} (identical, skipped)`);
        continue;
      }
      moveToOutbox(dest);
    }
    copyFileSync(src, dest, constants.COPYFILE_EXCL);
    console.log(`✓ ${rel(dest)}`);
  }
}

function stageDist(sources, app) {
  const dist = join(ROOT, 'dist');
  const manifest = { corpus: null, modules: [] };
  if (existsSync(CURRENT_JSON)) {
    const cur = JSON.parse(readFileSync(CURRENT_JSON, 'utf8'));
    const src = join(ROOT, 'VENDORED', 'corpus', cur.file);
    if (!existsSync(src)) {
      console.log(`corpus ${rel(src)} not present — skipped`);
    } else {
      const sha = sha256File(src);
      if (sha !== cur.sha256) fail(`${rel(src)} sha256 ${sha} ≠ CURRENT.json ${cur.sha256}`);
      const name = `sanctissimissa-v${app}-corpus-${cur.corpus_version}.db`;
      stageExclusive(src, join(dist, name), sha);
      manifest.corpus = { file: name, corpusVersion: cur.corpus_version, sha256: sha, sizeBytes: statSync(src).size };
    }
  } else {
    console.log('no VENDORED/corpus/CURRENT.json — corpus not staged');
  }
  for (const { m, src, sha, size } of sources) {
    const name = `sanctissimissa-v${app}-module-${m.editionId}-r${m.revision}.db`;
    stageExclusive(src, join(dist, name), sha);
    manifest.modules.push({ editionId: m.editionId, revision: m.revision, file: name, sha256: sha, sizeBytes: size });
  }
  if (!manifest.corpus && !manifest.modules.length) {
    console.log('nothing staged — content manifest not written');
    return;
  }
  writeExclusive(join(dist, `sanctissimissa-v${app}-content-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
}

function main() {
  const args = process.argv.slice(2);
  const androidPack = args.includes('--android-pack');
  if (!existsSync(MODULES_JSON)) {
    console.log('no modules.json — nothing to stage');
    process.exit(0);
  }
  const index = JSON.parse(readFileSync(MODULES_JSON, 'utf8'));
  const sources = verifiedSources(Array.isArray(index.modules) ? index.modules : []);
  if (androidPack) {
    stageAndroidPack(sources);
    return;
  }
  const app = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf8')).version;
  stageDist(sources, app);
}

main();
