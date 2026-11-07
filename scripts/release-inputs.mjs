#!/usr/bin/env node
// Release inputs: verify, stage and vendor the corpus, modules and runtime models
// (DOCS/ARCHITECTURE/L-release-20261106.md §2.6, §3 F1; BA.9 cross-partial resolutions 4 and 5).
//
//   node scripts/release-inputs.mjs --verify [--stage]   check VENDORED/ against CURRENT.json + PROVENANCE;
//                                                        --stage copies corpus/modules into dist/ (§2.4)
//   node scripts/release-inputs.mjs --vendor <dir>       vendor missal.<V>.db / sanctissimissa-<V>.db and
//                                                        <editionId>-r<N>.db from <dir> (exclusive create)
//   node scripts/release-inputs.mjs --vendor-model <f>   VENDORED/models/sha256/<sha256>/<basename>
//   node scripts/release-inputs.mjs --pipeline           F1: corpus:ingest → catena-graph → embed → modules,
//                                                        then --vendor assets/corpus and build/modules
//
// Exit 0 ok · 1 any failed check. Nothing in VENDORED/ is ever overwritten; assets/missal.db is
// never written (never mutate the corpus in place).

import {
  appendFileSync, constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync,
  renameSync, statSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { envOf } from './release-matrix.mjs';
import { ROOT, readJson, releaseInputs, runtimeAssetRows, sha256, stageOutputs, vendoredModule } from './release-stage-outputs.mjs';

const CORPUS_DIR = join(ROOT, 'VENDORED', 'corpus');
const MODULES_DIR = join(ROOT, 'VENDORED', 'modules');
const MODELS_DIR = join(ROOT, 'VENDORED', 'models');
const CURRENT = join(CORPUS_DIR, 'CURRENT.json');
const CORPUS_PROVENANCE = join(CORPUS_DIR, 'PROVENANCE.md');
const MODELS_PROVENANCE = join(MODELS_DIR, 'PROVENANCE.md');
const LEDGER = join(ROOT, 'DOCS', 'MISSAL-DB-VERSIONS.md');
const POINTER_SCHEMA = 'sanctissimissa-corpus-pointer.v1';
const POINTER_KEYS = ['schema', 'corpus_version', 'file', 'sha256', 'size_bytes', 'previous'];
// L-content §2.1 grammar with the optional -q3e256 suffix (author resolution 5).
const VERSION_RE = /^corpus-\d{4}\.\d{2}\.\d{2}-\d{4}(-q3e256)?$/;
const TOOLCHAIN = 'Ollama 0.34.2, qwen3-embedding:0.6b, Node 26.5.0';

const rel = (p) => relative(ROOT, p).split(sep).join('/') || p;
let failures = 0;
const ok = (line) => console.log(line);
const fail = (line) => {
  failures += 1;
  console.error(`✖ ${line}`);
};
const warn = (line) => console.warn(`⚠ ${line}`);

/** True for an un-smudged git-lfs pointer file (objects not checked out). */
function isLfsPointer(path) {
  if (statSync(path).size > 1024) return false;
  return readFileSync(path, 'utf8').startsWith('version https://git-lfs.github.com/spec/v1');
}

/** sha256 of a release input, failing on an LFS pointer instead of hashing the pointer. */
function inputSha(path) {
  if (isLfsPointer(path)) {
    fail(`${rel(path)} is an LFS pointer, not its bytes (git lfs checkout; or git -c lfs.url="file://<canonical root>" lfs pull)`);
    return null;
  }
  return sha256(path);
}

/** `## <name>` section bodies of a PROVENANCE file. */
function provenanceSections(path) {
  if (!existsSync(path)) return new Map();
  const sections = new Map();
  let name = null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      name = h[1];
      sections.set(name, '');
    } else if (name) sections.set(name, sections.get(name) + line + '\n');
  }
  return sections;
}

function checkPointer(current) {
  const keys = Object.keys(current).sort();
  if (keys.join() !== [...POINTER_KEYS].sort().join()) return fail(`CURRENT.json keys ${keys.join()} ≠ closed schema`);
  if (current.schema !== POINTER_SCHEMA) return fail(`CURRENT.json schema ${current.schema}`);
  if (!VERSION_RE.test(current.corpus_version)) return fail(`CURRENT.json corpus_version ${current.corpus_version}`);
  if (current.file !== `sanctissimissa-${current.corpus_version}.db`) return fail(`CURRENT.json file ${current.file}`);
  if (!/^[a-f0-9]{64}$/.test(current.sha256) || !Number.isSafeInteger(current.size_bytes) || current.size_bytes <= 0) {
    return fail('CURRENT.json sha256/size_bytes');
  }
  if (current.previous !== null && !VERSION_RE.test(current.previous)) return fail(`CURRENT.json previous ${current.previous}`);
  ok(`pointer ${current.corpus_version}`);
  return true;
}

/** Copy `src` to `dest` only when `dest` is absent (never overwrite differing bytes). */
function materialize(src, dest, expectedSha) {
  if (existsSync(dest)) {
    const sha = inputSha(dest);
    if (sha !== null && sha !== expectedSha) fail(`${rel(dest)} exists with bytes ≠ ${expectedSha.slice(0, 12)}`);
    return;
  }
  if (inputSha(src) !== expectedSha) return fail(`${rel(src)} sha256 ≠ ${expectedSha.slice(0, 12)}`);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest, constants.COPYFILE_EXCL);
  ok(`materialized ${rel(dest)} from ${rel(src)}`);
}

function checkVendoredCorpora(current) {
  const prov = provenanceSections(CORPUS_PROVENANCE);
  const files = existsSync(CORPUS_DIR) ? readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.db')).sort() : [];
  if (current && !files.includes(current.file)) fail(`VENDORED/corpus/${current.file} (CURRENT.json) is absent`);
  for (const f of files) {
    const path = join(CORPUS_DIR, f);
    const sha = inputSha(path);
    if (sha === null) continue;
    const recorded = prov.get(f)?.match(/^- sha256: ([a-f0-9]{64})$/m)?.[1];
    if (recorded !== sha) fail(`${rel(path)} sha256 ${sha.slice(0, 12)} ≠ PROVENANCE ${recorded?.slice(0, 12) ?? '(no entry)'}`);
    else if (current?.file === f && (sha !== current.sha256 || statSync(path).size !== current.size_bytes)) {
      fail(`${rel(path)} ≠ CURRENT.json sha256/size`);
    } else ok(`sha OK ${rel(path)}`);
  }
}

function checkVendoredModules(modules, staging) {
  const prov = provenanceSections(CORPUS_PROVENANCE);
  const files = existsSync(MODULES_DIR) ? readdirSync(MODULES_DIR).filter((f) => f.endsWith('.db')).sort() : [];
  for (const f of files) {
    const path = join(MODULES_DIR, f);
    const sha = inputSha(path);
    if (sha === null) continue;
    const recorded = prov.get(`module ${f}`)?.match(/^- sha256: ([a-f0-9]{64})$/m)?.[1];
    if (recorded !== sha) fail(`${rel(path)} sha256 ${sha.slice(0, 12)} ≠ PROVENANCE ${recorded?.slice(0, 12) ?? '(no entry)'}`);
    else ok(`sha OK ${rel(path)}`);
  }
  for (const m of modules) {
    const vendored = vendoredModule(ROOT, m);
    const local = join(ROOT, 'build', 'modules', m.file);
    if (!vendored) {
      // Modules are vendored in BA.9 Part B (BA.1/BA.10 outputs); staging a release requires them.
      (staging ? fail : warn)(`module ${m.file} (modules.json) is not vendored under VENDORED/modules/`);
      continue;
    }
    if (inputSha(vendored) !== m.sha256) {
      fail(`${rel(vendored)} ≠ modules.json sha256 ${m.sha256.slice(0, 12)}`);
      continue;
    }
    materialize(vendored, local, m.sha256);
  }
}

function checkModels() {
  const shaDir = join(MODELS_DIR, 'sha256');
  if (!existsSync(shaDir)) return;
  const provenance = existsSync(MODELS_PROVENANCE) ? readFileSync(MODELS_PROVENANCE, 'utf8') : '';
  for (const digest of readdirSync(shaDir).sort()) {
    for (const f of readdirSync(join(shaDir, digest)).sort()) {
      const path = join(shaDir, digest, f);
      const sha = inputSha(path);
      if (sha === null) continue;
      if (sha !== digest) fail(`${rel(path)} sha256 ${sha.slice(0, 12)} ≠ its directory`);
      else if (!provenance.includes(sha)) fail(`${rel(path)} has no VENDORED/models/PROVENANCE.md line`);
      else ok(`sha OK ${rel(path)}`);
    }
  }
}

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? walk(join(dir, e.name), base) : [relative(base, join(dir, e.name)).split(sep).join('/')]));
}

/** §2.6 public/ closed set + resolution 4 (the three manifest-pinned wllama files). */
function checkPublic() {
  const pub = join(ROOT, 'public');
  const wllama = { 'vendor/wllama/3.8.1/wllama.wasm': 'wllama-wasm', 'vendor/wllama/3.8.1/compat/wllama.wasm': 'wllama-compat-wasm',
    'vendor/wllama/3.8.1/compat/wllama.js': 'wllama-compat-js' };
  const pins = Object.fromEntries(runtimeAssetRows(ROOT).map((r) => [r.kind, r.sha256]));
  const bad = [];
  for (const f of existsSync(pub) ? walk(pub) : []) {
    if (['icon.png', 'icon-192.png', 'missal.db'].includes(f)) continue;
    if (wllama[f] && (!pins[wllama[f]] || sha256(join(pub, f)) === pins[wllama[f]])) continue;
    bad.push(f);
  }
  if (bad.length) fail(`public/ holds files outside the closed set: ${bad.join(', ')}`);
  else ok('public/ closed set OK');
}

function verify(staging) {
  const { current, modules } = releaseInputs(ROOT);
  if (!current) fail('VENDORED/corpus/CURRENT.json is absent (vendor the corpus: --vendor <dir>)');
  else checkPointer(current);
  checkVendoredCorpora(current);
  if (current) {
    const ledger = existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8') : '';
    const heading = new RegExp(`^### ${current.corpus_version.replace(/\./g, '\\.')}(\\s|$)`, 'm');
    if (heading.test(ledger)) ok(`ledger entry found ${current.corpus_version}`);
    else fail(`DOCS/MISSAL-DB-VERSIONS.md has no "### ${current.corpus_version}" entry (R5)`);
  }
  // Resolution 5: the build pointer (BA.1) and the vendored record agree; materialize its file.
  const buildPointer = join(ROOT, 'assets', 'corpus.current.json');
  if (current && existsSync(buildPointer)) {
    const bp = readJson(buildPointer);
    if (bp.sha256 !== current.sha256) fail(`assets/corpus.current.json sha256 ≠ VENDORED/corpus/CURRENT.json (${bp.corpus_version})`);
    else {
      ok(`pointer equality OK ${bp.corpus_version}`);
      materialize(join(CORPUS_DIR, current.file), join(ROOT, 'assets', bp.file), current.sha256);
    }
  }
  checkVendoredModules(modules, staging);
  checkModels();
  checkPublic();
  if (failures) return 1;
  if (staging) {
    const env = process.env.SAM_RELEASE_ENV || envOf(process.platform);
    for (const s of stageOutputs('inputs', env, ROOT)) ok(`staged ${s.id} → dist/${s.filename}`);
  }
  return 0;
}

const CORPUS_FILE = /^(?:missal\.|sanctissimissa-)(corpus-\d{4}\.\d{2}\.\d{2}-\d{4}(?:-q3e256)?)\.db$/;
const MODULE_FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)-r(\d+)\.db$/;

/** Exclusive create; identical existing bytes are reused, differing bytes fail. Returns sha256. */
function vendorFile(src, dest) {
  const sha = sha256(src);
  if (existsSync(dest)) {
    if (sha256(dest) !== sha) {
      fail(`${rel(dest)} exists with different bytes (VENDORED is immutable)`);
      return null;
    }
    ok(`= ${rel(dest)} (identical, reused)`);
    return sha;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest, constants.COPYFILE_EXCL);
  if (sha256(dest) !== sha) throw new Error(`${rel(dest)}: bytes changed during copy`);
  ok(`✓ vendored ${rel(dest)}`);
  return sha;
}

function appendProvenance(path, heading, lines) {
  const sections = provenanceSections(path);
  if (sections.has(heading)) return;
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '# VENDORED/corpus — provenance of corpus and module release inputs (append-only)\n');
  }
  appendFileSync(path, `\n## ${heading}\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`);
}

function vendorDir(dir) {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) {
    fail(`--vendor: ${dir} does not exist`);
    return 1;
  }
  const now = new Date().toISOString();
  const corpora = [];
  for (const f of readdirSync(abs).sort()) {
    const src = join(abs, f);
    const c = f.match(CORPUS_FILE);
    if (c) {
      const name = `sanctissimissa-${c[1]}.db`;
      const sha = vendorFile(src, join(CORPUS_DIR, name));
      if (!sha) continue;
      const size = statSync(src).size;
      appendProvenance(CORPUS_PROVENANCE, name, [`corpus_version: ${c[1]}`, `sha256: ${sha}`, `size_bytes: ${size}`,
        `source: ${src}`, `vendored_at: ${now}`, `pipeline toolchain of record: ${TOOLCHAIN}`]);
      corpora.push({ corpus_version: c[1], file: name, sha256: sha, size_bytes: size });
      continue;
    }
    const m = f.match(MODULE_FILE);
    if (!m) continue;
    const name = `sanctissimissa-module-${m[1]}-r${m[2]}.db`;
    const sha = vendorFile(src, join(MODULES_DIR, name));
    if (!sha) continue;
    appendProvenance(CORPUS_PROVENANCE, `module ${name}`, [`editionId: ${m[1]}`, `revision: ${m[2]}`, `sha256: ${sha}`,
      `size_bytes: ${statSync(src).size}`, `source: ${src}`, `vendored_at: ${now}`, `pipeline toolchain of record: ${TOOLCHAIN}`]);
  }
  for (const c of corpora.sort((a, b) => a.corpus_version.localeCompare(b.corpus_version))) {
    const prior = existsSync(CURRENT) ? readJson(CURRENT) : null;
    if (prior?.corpus_version === c.corpus_version) continue;
    const next = { schema: POINTER_SCHEMA, ...c, previous: prior?.corpus_version ?? null };
    const tmp = `${CURRENT}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n');
    renameSync(tmp, CURRENT);
    ok(`CURRENT.json → ${c.corpus_version} (previous ${next.previous})`);
  }
  return failures ? 1 : 0;
}

function vendorModel(file) {
  const src = resolve(ROOT, file);
  if (!existsSync(src)) {
    fail(`--vendor-model: ${file} does not exist`);
    return 1;
  }
  const sha = sha256(src);
  const name = basename(src);
  if (!vendorFile(src, join(MODELS_DIR, 'sha256', sha, name))) return 1;
  const provenance = existsSync(MODELS_PROVENANCE) ? readFileSync(MODELS_PROVENANCE, 'utf8') : '# VENDORED/models — provenance (append-only)\n';
  if (!provenance.includes(sha)) {
    mkdirSync(MODELS_DIR, { recursive: true });
    if (!existsSync(MODELS_PROVENANCE)) writeFileSync(MODELS_PROVENANCE, provenance);
    appendFileSync(MODELS_PROVENANCE, `\n## ${name} — sha256/${sha}/${name}\n\n- source: ${src}\n` +
      `- date vendored: ${new Date().toISOString()}\n- verified sha256: ${sha}\n- verified size: ${statSync(src).size} bytes\n` +
      '- copied by: `node scripts/release-inputs.mjs --vendor-model`\n');
  }
  return 0;
}

function npmRun(script, args = []) {
  const pkg = readJson(join(ROOT, 'package.json'));
  if (!pkg.scripts?.[script]) {
    console.error(`✖ --pipeline: npm script ${script} is absent (L-content §3.1)`);
    return 1;
  }
  console.log(`  $ npm run ${script}${args.length ? ` -- ${args.join(' ')}` : ''}`);
  const r = spawnSync('npm', ['run', script, ...(args.length ? ['--', ...args] : [])], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  return r.error ? 1 : r.status ?? 1;
}

/** F1 (L-content §3.1 scripts owned by BA.10/BA.11/BA.1), then vendor their outputs. */
function pipeline() {
  for (const [script, args] of [['corpus:ingest'], ['corpus:catena-graph'], ['corpus:embed', ['build/corpus/stage2-graph.db']]]) {
    const code = npmRun(script, args);
    if (code !== 0) return code;
  }
  const full = existsSync(join(ROOT, 'build', 'corpus'))
    ? readdirSync(join(ROOT, 'build', 'corpus')).filter((f) => /^missal\.corpus-.+\.full\.db$/.test(f)).sort().at(-1) : null;
  if (!full) {
    console.error('✖ --pipeline: corpus:embed produced no build/corpus/missal.<V>.full.db');
    return 1;
  }
  const code = npmRun('corpus:modules', [`build/corpus/${full}`]);
  if (code !== 0) return code;
  return vendorDir('assets/corpus') || vendorDir('build/modules');
}

function main(argv) {
  const at = (flag) => argv[argv.indexOf(flag) + 1];
  if (argv.includes('--verify')) return verify(argv.includes('--stage'));
  if (argv.includes('--vendor')) return vendorDir(at('--vendor'));
  if (argv.includes('--vendor-model')) return vendorModel(at('--vendor-model'));
  if (argv.includes('--pipeline')) return pipeline();
  console.error('Usage: release-inputs.mjs --verify [--stage] | --vendor <dir> | --vendor-model <file> | --pipeline');
  return 1;
}

process.exit(main(process.argv.slice(2)));
