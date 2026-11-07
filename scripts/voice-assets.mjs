#!/usr/bin/env node
// Supertonic voice asset rows (§K.4 TT.2, amended 2026-11-06; DOCS/ARCHITECTURE/L-audiobook-20261106.md
// S8; runtime-asset manifest schema: DOCS/ARCHITECTURE/L-native-embed-engine-20261106.md §2.4).
//
//   node scripts/voice-assets.mjs --add <file> --upstream <url> --revision <rev> --license <spdx>
//       vendors <file> to VENDORED/models/sha256/<sha256>/<basename>, upserts its kind 'supertonic'
//       row in VENDORED/models/manifest.json and appends a line to VENDORED/models/PROVENANCE.md.
//   node scripts/voice-assets.mjs --sync
//       rewrites only the generated block of src/core/voice/assets.ts from the manifest rows.
//   node scripts/voice-assets.mjs --check
//       side-effect free; exit 1 when the block or a vendored file disagrees with the manifest.
//
// Rows of any other `kind` are never touched. Upstream URLs are provenance only — never fetched.

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODELS = join(ROOT, 'VENDORED', 'models');
const MANIFEST = join(MODELS, 'manifest.json');
const PROVENANCE = join(MODELS, 'PROVENANCE.md');
const ASSETS_TS = join(ROOT, 'src', 'core', 'voice', 'assets.ts');
const HOST = 'https://sanctissimissa.robin.mba';
const OPEN = '// <voice-assets:generated>';
const CLOSE = '// </voice-assets:generated>';
const KIND = 'supertonic';

function fail(message, code = 2) {
  console.error(`voice-assets: ${message}`);
  process.exit(code);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readManifest() {
  if (!existsSync(MANIFEST)) return { schema: 'sam.runtime-assets.v1', host: HOST, assets: [] };
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  if (manifest.schema !== 'sam.runtime-assets.v1' || !Array.isArray(manifest.assets)) fail(`${MANIFEST} is not a sam.runtime-assets.v1 manifest`);
  return manifest;
}

const voiceRows = (manifest) =>
  manifest.assets.filter((row) => row.kind === KIND).sort((a, b) => (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0));

const idFor = (fileName) => `supertonic-${fileName.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
const vendoredPath = (row) => join(MODELS, 'sha256', row.sha256, row.fileName);

/** The generated block, exactly as --sync writes it and --check compares it. */
function renderBlock(rows) {
  if (!rows.length) return `${OPEN}\nexport const VOICE_ASSETS: readonly VoiceAssetRow[] = [];\n${CLOSE}`;
  const lines = rows.map((row) => {
    const mirrorUrl = `${HOST}/runtime/models/sha256/${row.sha256}/${row.fileName}`;
    return `  { id: ${JSON.stringify(row.id)}, fileName: ${JSON.stringify(row.fileName)}, sha256: ${JSON.stringify(row.sha256)}, sizeBytes: ${row.size_bytes}, mirrorUrl: ${JSON.stringify(mirrorUrl)} },`;
  });
  return `${OPEN}\nexport const VOICE_ASSETS: readonly VoiceAssetRow[] = [\n${lines.join('\n')}\n];\n${CLOSE}`;
}

function currentBlock(source) {
  const start = source.indexOf(OPEN);
  const end = source.indexOf(CLOSE);
  if (start < 0 || end < start) fail(`${ASSETS_TS} lacks the ${OPEN} … ${CLOSE} markers`);
  return { start, end: end + CLOSE.length, block: source.slice(start, end + CLOSE.length) };
}

function argValue(args, name) {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith('--')) fail(`${name} <value> is required`);
  return value;
}

function add(args) {
  const file = resolve(argValue(args, '--add'));
  const upstream = argValue(args, '--upstream');
  const revision = argValue(args, '--revision');
  const license = argValue(args, '--license');
  if (!existsSync(file)) fail(`${file} does not exist`);
  const fileName = basename(file);
  const digest = sha256(file);
  const size = readFileSync(file).length;
  const target = join(MODELS, 'sha256', digest, fileName);
  if (existsSync(target) && sha256(target) === digest) console.log(`identical bytes already vendored: ${target}`);
  else {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file, target);
    console.log(`vendored ${target}`);
  }
  const manifest = readManifest();
  const row = {
    id: idFor(fileName), kind: KIND, fileName,
    mirror_url: `/runtime/models/sha256/${digest}/${fileName}`,
    sha256: digest, size_bytes: size,
    upstream_url_of_record: upstream, upstream_revision: revision, license,
    mirrored_at: null, android_pack: null, runtime_path: null,
  };
  const index = manifest.assets.findIndex((r) => r.kind === KIND && r.fileName === fileName);
  if (index >= 0) manifest.assets[index] = row;
  else manifest.assets.push(row);
  mkdirSync(MODELS, { recursive: true });
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  if (!existsSync(PROVENANCE)) writeFileSync(PROVENANCE, '# VENDORED/models — provenance\n\n');
  const date = new Date().toISOString().slice(0, 10);
  appendFileSync(PROVENANCE, `- ${digest} ${size} bytes \`${fileName}\` — ${upstream} @ ${revision} (${license}), vendored ${date} UTC\n`);
  console.log(`manifest row ${row.id} (${fileName}, ${size} bytes, ${digest})`);
}

function sync() {
  const source = readFileSync(ASSETS_TS, 'utf8');
  const { start, end, block } = currentBlock(source);
  const next = renderBlock(voiceRows(readManifest()));
  if (next === block) { console.log('assets.ts generated block unchanged'); return; }
  writeFileSync(ASSETS_TS, source.slice(0, start) + next + source.slice(end));
  console.log('assets.ts generated block rewritten');
}

function check() {
  const rows = voiceRows(readManifest());
  const problems = [];
  if (currentBlock(readFileSync(ASSETS_TS, 'utf8')).block !== renderBlock(rows)) problems.push('src/core/voice/assets.ts generated block differs from the manifest (run --sync)');
  for (const row of rows) {
    const path = vendoredPath(row);
    if (!existsSync(path)) { problems.push(`${row.fileName}: ${path} is missing`); continue; }
    const size = readFileSync(path).length;
    if (size !== row.size_bytes) problems.push(`${row.fileName}: size ${size} ≠ ${row.size_bytes}`);
    const digest = sha256(path);
    if (digest !== row.sha256) problems.push(`${row.fileName}: sha256 ${digest} ≠ ${row.sha256}`);
  }
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (problems.length) process.exit(1);
  console.log(`✓ ${rows.length} supertonic row(s) consistent`);
}

const args = process.argv.slice(2);
if (args.includes('--add')) add(args);
else if (args.includes('--sync')) sync();
else if (args.includes('--check')) check();
else fail('usage: voice-assets.mjs --add <file> --upstream <url> --revision <rev> --license <spdx> | --sync | --check');
