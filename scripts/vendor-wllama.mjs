#!/usr/bin/env node
// vendor-wllama.mjs — BA.13 copy script (L-native-embed-engine F6, architect reconciliation).
// Copies the three pinned wllama runtime files from node_modules into
// VENDORED/models/sha256/<sha256>/<fileName> (tracked LFS release inputs, mirrored under
// https://sanctissimissa.robin.mba/runtime/ by OP.3). NOT chained into predev/prebuild:
// the files are release inputs, not build outputs, and never ship in public/ or dist-web/.
//
//   node scripts/vendor-wllama.mjs           copy (skip identical, never overwrite) + PROVENANCE
//   node scripts/vendor-wllama.mjs --check   side-effect free: 0 all present/equal, 2 mismatch, 3 absent
//
// Exit 1 on a source mismatch or a differing destination in copy mode.
import { createHash } from 'node:crypto';
import { copyFileSync, constants, existsSync, mkdirSync, readFileSync, statSync, appendFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROVENANCE = join(ROOT, 'VENDORED/models/PROVENANCE.md');

// Pins equal src/core/vector/wllamaAssets.ts and VENDORED/models/manifest.json.
const FILES = [
  {
    id: 'wllama-3.8.1-wasm', pkg: '@wllama/wllama', pathInPackage: 'esm/wasm/wllama.wasm',
    tarball: 'https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz',
    integrity: 'sha512-Pl7BEJhPU8OHnV/yhn3DFZYhLLOdSHh+4TND79WCftHnlUAdQPAsyc/CfIOY+4mVxvf5VW3Xw3Uf7BBfotS1gw==',
    sha256: '551f13439366eff11e057b1b91fe46a7fdac29d56d67372d4c5f19a549dfe70c', bytes: 8763949, fileName: 'wllama.wasm',
  },
  {
    id: 'wllama-compat-3.8.1-wasm', pkg: '@wllama/wllama-compat', pathInPackage: 'wasm/wllama.wasm',
    tarball: 'https://registry.npmjs.org/@wllama/wllama-compat/-/wllama-compat-3.8.1.tgz',
    integrity: 'sha512-IvmjrJ+JzDbt3w1FQq1yAmnFEiLGCceowK2Q80zW+k9ChFkPBM1ByX/9xm2xVxyd8MHC50VpuDo6SDE83k9kIQ==',
    sha256: '2db3f67d0bcc19cdf8f14f129e46cab691bff898954808f8a2dc4c586eb5bb68', bytes: 16005007, fileName: 'wllama.wasm',
  },
  {
    id: 'wllama-compat-3.8.1-js', pkg: '@wllama/wllama-compat', pathInPackage: 'wasm/wllama.js',
    tarball: 'https://registry.npmjs.org/@wllama/wllama-compat/-/wllama-compat-3.8.1.tgz',
    integrity: 'sha512-IvmjrJ+JzDbt3w1FQq1yAmnFEiLGCceowK2Q80zW+k9ChFkPBM1ByX/9xm2xVxyd8MHC50VpuDo6SDE83k9kIQ==',
    sha256: '2649eeb408988841c372e54805adfa25aed5d02f850c09add78c2f3ac0f3fce1', bytes: 171615, fileName: 'wllama.js',
  },
];

const sha256Of = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const matches = (path, f) => existsSync(path) && statSync(path).size === f.bytes && sha256Of(path) === f.sha256;
const destOf = (f) => join(ROOT, 'VENDORED/models/sha256', f.sha256, f.fileName);
const sourceOf = (f) => join(ROOT, 'node_modules', f.pkg, f.pathInPackage);
const heading = (f) => `## ${f.id} — sha256/${f.sha256}/${f.fileName}`;

function check() {
  let code = 0;
  for (const f of FILES) {
    const dest = destOf(f);
    if (!existsSync(dest)) { console.log(`ABSENT   ${f.id} ${dest}`); code = Math.max(code, 3); continue; }
    if (!matches(dest, f)) { console.log(`MISMATCH ${f.id} ${dest}`); code = code === 3 ? 3 : 2; continue; }
    console.log(`ok       ${f.id} ${f.sha256} ${f.bytes}`);
  }
  return code;
}

function provenance(f) {
  const text = existsSync(PROVENANCE) ? readFileSync(PROVENANCE, 'utf8') : '';
  if (text.includes(heading(f))) return;
  if (!text) writeFileSync(PROVENANCE, '# VENDORED/models — provenance (append-only)\n');
  appendFileSync(PROVENANCE, [
    '',
    heading(f),
    '',
    `- npm tarball: ${f.tarball}`,
    `- path inside the package: package/${f.pathInPackage}`,
    `- integrity: ${f.integrity}`,
    '- licence: MIT',
    `- date vendored: ${new Date().toISOString().slice(0, 10)}`,
    `- verified sha256: ${f.sha256}`,
    `- verified size: ${f.bytes} bytes`,
    '- copied by: `node scripts/vendor-wllama.mjs` (from node_modules after `npm ci`)',
    '',
  ].join('\n'));
}

function vendor() {
  for (const f of FILES) {
    const src = sourceOf(f);
    if (!matches(src, f)) {
      console.error(`source mismatch or absent: ${src} (want sha256 ${f.sha256}, ${f.bytes} bytes)`);
      return 1;
    }
    const dest = destOf(f);
    if (existsSync(dest)) {
      if (!matches(dest, f)) { console.error(`destination differs, refusing to overwrite: ${dest}`); return 1; }
      console.log(`identical ${f.id}`);
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest, constants.COPYFILE_EXCL);
      if (!matches(dest, f)) { console.error(`copy verification failed: ${dest}`); return 1; }
      console.log(`copied    ${f.id} → ${dest}`);
    }
    provenance(f);
  }
  return 0;
}

process.exit(process.argv.includes('--check') ? check() : vendor());
