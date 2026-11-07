#!/usr/bin/env node
// Runtime-asset mirror tool (L-native-embed-engine §2.4/§2.5, F2; host layout L-release §2.14; BA.12).
//
//   node --experimental-strip-types scripts/mirror-model-assets.mjs --check
//       side-effect free: VENDORED/models/manifest.json rows (embedder/reranker/wllama* kinds)
//       ↔ EMBED_MODEL_ASSETS (src/core/vector/assets.ts)
//       ↔ WLLAMA_ASSETS (src/core/vector/wllamaAssets.ts, when that BA.13 file exists)
//       ↔ VENDORED/models/sha256/<d>/<fileName> sha256 + size.
//       exit 0 ok · 2 mismatch · 3 a vendored file absent (prints its PROVENANCE fetch command)
//   node --experimental-strip-types scripts/mirror-model-assets.mjs --stage
//       writes dist-runtime-assets/models/sha256/<d>/<fileName> for every row whose kind ≠ module-db,
//       plus dist-runtime-assets/models/manifest.json; every byte verified; never overwrites.
//   node --experimental-strip-types scripts/mirror-model-assets.mjs --verify-remote
//       HEAD + full streamed GET of every non-module row's mirror_url (200, sha256 + size,
//       access-control-allow-origin: *); writes `mirrored_at` for matching rows into
//       VENDORED/models/manifest.json (its only write). exit 0 all match · 4 any row fails.
//
// Mirrored objects are never deleted or overwritten (I3). Upstream URLs are provenance only.

import { createHash } from 'node:crypto';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'VENDORED/models/manifest.json');
const PROVENANCE = join(ROOT, 'VENDORED/models/PROVENANCE.md');
const STAGE_DIR = join(ROOT, 'dist-runtime-assets/models');
const CHECKED_KINDS = new Set(['embedder-gguf', 'reranker-gguf', 'wllama-wasm', 'wllama-compat-wasm', 'wllama-compat-js']);
const KIND_ROLE = { 'embedder-gguf': 'embed', 'reranker-gguf': 'rerank' };
/** --stage fallback sources for wllama kinds (npm packages pinned by BA.13). */
const NODE_MODULES_FALLBACK = {
  'wllama-wasm': 'node_modules/@wllama/wllama/esm/wasm/wllama.wasm',
  'wllama-compat-wasm': 'node_modules/@wllama/wllama-compat/wasm/wllama.wasm',
  'wllama-compat-js': 'node_modules/@wllama/wllama-compat/wasm/wllama.js',
};

const rel = (path) => relative(ROOT, path);
const vendoredPath = (row) => join(ROOT, 'VENDORED/models/sha256', row.sha256, row.fileName);

function sha256File(path) {
  return new Promise((ok, fail) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', fail)
      .on('end', () => ok(hash.digest('hex')));
  });
}

/** 'absent' (missing or an un-pulled LFS pointer) | 'mismatch' | 'ok'. */
async function fileState(path, row) {
  if (!existsSync(path)) return 'absent';
  const size = statSync(path).size;
  if (size < 1024 && readFileSync(path, 'utf8').startsWith('version https://git-lfs')) return 'absent';
  if (size !== row.size_bytes) return 'mismatch';
  return (await sha256File(path)) === row.sha256 ? 'ok' : 'mismatch';
}

function readManifest() {
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

/** The PROVENANCE fetch command for a row (or the canonical fallback). */
function fetchCommand(row) {
  const target = `VENDORED/models/sha256/${row.sha256}/${row.fileName}`;
  if (existsSync(PROVENANCE)) {
    const line = readFileSync(PROVENANCE, 'utf8').split('\n').find((l) => l.includes(target) && /\b(curl|npm|node)\b/.test(l));
    if (line) return line.trim();
  }
  if (row.kind.startsWith('wllama')) return 'npm run vendor:wllama';
  return `curl -L -o ${target} ${row.upstream_url_of_record}`;
}

async function loadTs(path, name) {
  if (!existsSync(path)) return null;
  const mod = await import(pathToFileURL(path).href);
  return mod[name] ?? null;
}

async function check() {
  const manifest = readManifest();
  const rows = manifest.assets.filter((row) => CHECKED_KINDS.has(row.kind));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const problems = [];
  const absent = [];

  const embedPins = await loadTs(join(ROOT, 'src/core/vector/assets.ts'), 'EMBED_MODEL_ASSETS');
  if (!embedPins) problems.push('src/core/vector/assets.ts: EMBED_MODEL_ASSETS missing');
  for (const [id, pin] of Object.entries(embedPins ?? {})) {
    const row = byId.get(id);
    if (!row) { problems.push(`EMBED_MODEL_ASSETS.${id}: no manifest row`); continue; }
    const pairs = [
      ['sha256', pin.asset.sha256, row.sha256], ['bytes', pin.asset.bytes, row.size_bytes],
      ['fileName', pin.asset.fileName, row.fileName], ['mirrorUrl', pin.mirrorUrl, row.mirror_url],
      ['androidPack', pin.androidPack, row.android_pack], ['role', pin.role, KIND_ROLE[row.kind]],
    ];
    for (const [field, a, b] of pairs) if (a !== b) problems.push(`EMBED_MODEL_ASSETS.${id}.${field}: ${a} ≠ manifest ${b}`);
  }
  for (const row of rows) {
    if (KIND_ROLE[row.kind] && !embedPins?.[row.id]) problems.push(`manifest ${row.id}: no EMBED_MODEL_ASSETS pin`);
  }

  const wllamaPins = await loadTs(join(ROOT, 'src/core/vector/wllamaAssets.ts'), 'WLLAMA_ASSETS');
  if (wllamaPins) {
    for (const [id, pin] of Object.entries(wllamaPins)) {
      const row = byId.get(id);
      if (!row) { problems.push(`WLLAMA_ASSETS.${id}: no manifest row`); continue; }
      const pairs = [
        ['sha256', pin.asset.sha256, row.sha256], ['bytes', pin.asset.bytes, row.size_bytes],
        ['fileName', pin.asset.fileName, row.fileName], ['mirrorUrl', pin.mirrorUrl, row.mirror_url],
      ];
      for (const [field, a, b] of pairs) if (a !== b) problems.push(`WLLAMA_ASSETS.${id}.${field}: ${a} ≠ manifest ${b}`);
    }
  }

  for (const row of rows) {
    if (row.mirror_url !== `${manifest.host}/models/sha256/${row.sha256}/${row.fileName}`) {
      problems.push(`manifest ${row.id}: mirror_url not under ${manifest.host}/models/sha256/<sha256>/<fileName>`);
    }
    const state = await fileState(vendoredPath(row), row);
    if (state === 'mismatch') problems.push(`${rel(vendoredPath(row))}: sha256/size ≠ manifest ${row.id}`);
    if (state === 'absent') absent.push(row);
  }

  for (const p of problems) console.error(`MISMATCH ${p}`);
  for (const row of absent) console.error(`ABSENT ${rel(vendoredPath(row))} (${row.id}) — fetch: ${fetchCommand(row)}`);
  if (problems.length > 0) return 2;
  if (absent.length > 0) return 3;
  console.log(`ok: ${rows.length} manifest rows ↔ pins ↔ vendored files`);
  return 0;
}

async function stage() {
  const manifest = readManifest();
  let missing = 0;
  for (const row of manifest.assets.filter((r) => r.kind !== 'module-db')) {
    const dst = join(STAGE_DIR, 'sha256', row.sha256, row.fileName);
    const dstState = await fileState(dst, row);
    if (dstState === 'ok') { console.log(`ok ${row.id}: already staged`); continue; }
    if (dstState === 'mismatch') { console.error(`FAIL ${rel(dst)} exists and differs — never overwritten`); return 2; }
    const candidates = [vendoredPath(row)];
    if (NODE_MODULES_FALLBACK[row.kind]) candidates.push(join(ROOT, NODE_MODULES_FALLBACK[row.kind]));
    let src = null;
    for (const c of candidates) if ((await fileState(c, row)) === 'ok') { src = c; break; }
    if (!src) { console.error(`ABSENT ${row.id} — fetch: ${fetchCommand(row)}`); missing += 1; continue; }
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, `${dst}.partial`);
    if ((await fileState(`${dst}.partial`, row)) !== 'ok') { console.error(`FAIL staged copy of ${row.id} does not verify`); return 2; }
    renameSync(`${dst}.partial`, dst);
    console.log(`staged ${row.id} ← ${rel(src)}`);
  }
  mkdirSync(STAGE_DIR, { recursive: true });
  writeFileSync(join(STAGE_DIR, 'manifest.json'), readFileSync(MANIFEST));
  console.log(`staged ${rel(join(STAGE_DIR, 'manifest.json'))}`);
  return missing > 0 ? 3 : 0;
}

async function verifyRow(row) {
  const headers = { Origin: 'https://sanctissimissa.surge.sh' };
  const head = await fetch(row.mirror_url, { method: 'HEAD', headers });
  if (head.status !== 200) return `HEAD ${head.status}`;
  if (head.headers.get('access-control-allow-origin') !== '*') return 'access-control-allow-origin ≠ *';
  const res = await fetch(row.mirror_url, { headers });
  if (res.status !== 200 || !res.body) return `GET ${res.status}`;
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of res.body) { hash.update(chunk); size += chunk.length; }
  if (size !== row.size_bytes) return `size ${size} ≠ ${row.size_bytes}`;
  const digest = hash.digest('hex');
  return digest === row.sha256 ? null : `sha256 ${digest} ≠ ${row.sha256}`;
}

async function verifyRemote() {
  const manifest = readManifest();
  const today = new Date().toISOString().slice(0, 10);
  let failed = 0;
  for (const row of manifest.assets.filter((r) => r.kind !== 'module-db')) {
    let error;
    try { error = await verifyRow(row); } catch (e) { error = e instanceof Error ? e.message : String(e); }
    if (error) { failed += 1; console.error(`FAIL ${row.id} ${row.mirror_url}: ${error}`); continue; }
    row.mirrored_at = today;
    console.log(`ok ${row.id}`);
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  return failed > 0 ? 4 : 0;
}

const MODES = { '--check': check, '--stage': stage, '--verify-remote': verifyRemote };
const mode = process.argv.slice(2).find((a) => a in MODES);
if (!mode) {
  console.error('usage: mirror-model-assets.mjs --check | --stage | --verify-remote');
  process.exit(64);
}
MODES[mode]().then((code) => process.exit(code), (error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
