// Stage-as-produced (CC14): copy one stage's outputs into dist/ under their §2.4 names before the
// pair is marked complete — DOCS/ARCHITECTURE/L-release-20261106.md §2.2 (behaviour), §2.4 (table),
// §2.7 (web output closed set), §2.8 (RPM identity). Shared helpers are reused by collect-artifacts.mjs.
// RPM identity reads the package header with `rpm -qp --queryformat`; Tauri CLI 2.11.4 writes the RPM
// in-process (bundle.linux.rpm, see DOCS/sdk/tauri-cli-2.11.4/RpmConfig.md).

import {
  closeSync, constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync,
  readFileSync, readSync, statSync,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACTS, distName } from './release-matrix.mjs';
import { ensureLinuxImage } from './release-stage-commands.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Parse a JSON object file (BOM tolerated); INVALID_RELEASE_JSON on anything else. */
export function readJson(path) {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
    return value;
  } catch {
    const error = new Error(`Invalid JSON object: ${path}`);
    error.code = 'INVALID_RELEASE_JSON';
    throw error;
  }
}

/** Streamed in-process sha256 (portable: no sha256sum on stock Windows). */
export function sha256(path) {
  const hash = createHash('sha256');
  const buf = Buffer.allocUnsafe(1 << 20);
  const fd = openSync(path, 'r');
  try {
    let bytes;
    while ((bytes = readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.subarray(0, bytes));
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

export function exactOne(dir, predicate, label) {
  if (!existsSync(dir)) throw new Error(`${label}: missing directory ${dir}`);
  const matches = readdirSync(dir).filter(predicate).sort();
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one current artifact in ${dir}, found ${matches.join(', ') || 'none'}`);
  }
  return join(dir, matches[0]);
}

/** Copy into dist/ exclusively; equal bytes are reused, differing bytes fail closed (CC12). */
export function copyStaged(source, filename, root = ROOT) {
  const destination = join(root, 'dist', filename);
  if (!statSync(source).isFile()) throw new Error(`${source}: source is not a file`);
  const expected = sha256(source);
  if (existsSync(destination)) {
    if (!statSync(destination).isFile() || sha256(destination) !== expected) {
      throw new Error(`Conflicting bytes at existing release artifact: ${destination}`);
    }
    console.log(`  = dist/${filename} (matching bytes reused)`);
    return expected;
  }
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination, constants.COPYFILE_EXCL);
  if (sha256(destination) !== expected) throw new Error(`${filename}: staged bytes changed during copy`);
  console.log(`  ✓ dist/${filename}`);
  return expected;
}

/** §2.8: `rpm -qp --queryformat '%{NAME} %{VERSION} %{ARCH}'`; container fallback while OP.12 is open. */
export function rpmIdentity(file, root = ROOT) {
  const query = ['-qp', '--queryformat', '%{NAME} %{VERSION} %{ARCH}'];
  const native = spawnSync('rpm', ['--version'], { stdio: 'ignore' });
  if (!native.error && native.status === 0) return execFileSync('rpm', [...query, file], { encoding: 'utf8' }).trim();
  const image = ensureLinuxImage(root, ['ignore', 'ignore', 'inherit']);
  return execFileSync('docker', ['run', '--rm', '-v', `${dirname(resolve(file))}:/x:ro`, image, 'rpm', ...query,
    `/x/${basename(file)}`], { encoding: 'utf8' }).trim();
}

export function assertRpmIdentity(file, version, root = ROOT) {
  const identity = rpmIdentity(file, root);
  if (identity !== `SanctissiMissa ${version} x86_64`) {
    throw new Error(`RPM identity mismatch for ${basename(file)}: "${identity}" (expected "SanctissiMissa ${version} x86_64")`);
  }
}

/** Runtime-asset manifest rows (L-native-embed §2.4), or [] when the manifest is absent. */
export function runtimeAssetRows(root = ROOT) {
  const path = join(root, 'VENDORED', 'models', 'manifest.json');
  return existsSync(path) ? readJson(path).assets ?? [] : [];
}

const WLLAMA_VENDOR = ['vendor/wllama/3.8.1/wllama.wasm', 'vendor/wllama/3.8.1/compat/wllama.wasm',
  'vendor/wllama/3.8.1/compat/wllama.js'];
const WLLAMA_KIND = { [WLLAMA_VENDOR[0]]: 'wllama-wasm', [WLLAMA_VENDOR[1]]: 'wllama-compat-wasm',
  [WLLAMA_VENDOR[2]]: 'wllama-compat-js' };
const WEB_TOP = /^(index\.html|200\.html|assets|icon\.png|icon-192\.png|manifest\.webmanifest|sw\.js|workbox-[\w-]+\.js|missal\.db|vendor)$/;

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? walk(join(dir, e.name), base) : [relative(base, join(dir, e.name)).split(sep).join('/')]));
}

/**
 * §2.7 web output closed set + BA.9 resolution 4: only the three manifest-pinned wllama runtime
 * files under vendor/wllama/3.8.1/; no *.gguf, *.onnx, module *.db or other wllama binary anywhere.
 */
export function checkWebTree(webDist, root = ROOT) {
  for (const required of ['index.html', 'assets', 'icon.png', 'icon-192.png', 'manifest.webmanifest', 'sw.js', 'missal.db']) {
    if (!existsSync(join(webDist, required))) throw new Error(`Web build missing dist-web/${required}`);
  }
  const top = readdirSync(webDist);
  if (!top.some((e) => /^workbox-[\w-]+\.js$/.test(e))) throw new Error('Web build missing generated Workbox runtime');
  const extra = top.filter((e) => !WEB_TOP.test(e));
  if (extra.length) throw new Error(`dist-web/ holds entries outside the closed set: ${extra.join(', ')}`);
  const pins = Object.fromEntries(runtimeAssetRows(root).map((r) => [r.kind, r.sha256]));
  for (const file of walk(webDist)) {
    const name = file.split('/').pop();
    if (/\.(gguf|onnx)$/i.test(name)) throw new Error(`runtime model bytes in web output: ${file}`);
    if (/\.db$/i.test(name) && file !== 'missal.db') throw new Error(`database file in web output: ${file}`);
    if (WLLAMA_KIND[file]) {
      const pin = pins[WLLAMA_KIND[file]];
      if (pin && sha256(join(webDist, file)) !== pin) throw new Error(`${file} does not equal its manifest pin`);
    } else if (file.startsWith('vendor/') || /^wllama.*\.wasm$|^wllama\.js$/i.test(name)) {
      throw new Error(`unexpected vendored/wllama file in web output: ${file}`);
    }
  }
}

/** Zip dist-web/ into a fresh candidate directory (never updates an archive in place). */
function archiveWeb(root, name) {
  const webDist = join(root, 'dist-web');
  checkWebTree(webDist, root);
  const collector = join(root, 'src-tauri', 'target', 'collector');
  mkdirSync(collector, { recursive: true });
  const webPath = join(mkdtempSync(join(collector, `${name}-${randomUUID().slice(0, 8)}-`)), name);
  const entries = readdirSync(webDist).sort();
  try {
    // -X drops extra time fields so equal inputs give equal bytes (equal-bytes reuse).
    execFileSync('zip', ['-X', '-r', webPath, ...entries], { cwd: webDist, stdio: 'inherit' });
    return webPath;
  } catch (err) {
    if (err.code !== 'ENOENT' || process.platform !== 'win32') throw err;
  }
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Compress-Archive -Path ${entries.map((e) => `'${e.replace(/'/g, "''")}'`).join(',')} ` +
    `-DestinationPath '${webPath.replace(/'/g, "''")}' -CompressionLevel Optimal`], { cwd: webDist, stdio: 'inherit' });
  return webPath;
}

/** Native Windows receipt path (scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1). */
export const receiptPath = (root, version) =>
  join(root, 'src-tauri', 'target', 'windows-native', `sanctissimissa-v${version}-windows-native-metadata.json`);

/** A receipt ties installer versions and binary hashes to the frozen release (was collector :155-177). */
export function verifyReceipt(receipt, kind, target, version, sourceHead) {
  const [major, minor] = version.split('.');
  if (receipt.version !== version || receipt.sourceHead !== sourceHead ||
      receipt.msiVersion !== `${major}.${minor}.0` || receipt.msixVersion !== `${major}.${minor}.0.0` ||
      receipt.verification?.signatures !== true) {
    throw new Error('Native Windows receipt does not match the frozen release or package verification');
  }
  const artifact = receipt.artifacts?.[kind];
  if (!artifact || typeof artifact.path !== 'string' || isAbsolute(artifact.path) ||
      /^[A-Za-z]:|^\\\\/.test(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
    throw new Error(`Native Windows receipt has no valid ${kind} artifact`);
  }
  const path = resolve(target, artifact.path.replaceAll('\\', '/'));
  const inside = relative(target, path);
  if (!inside || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
    throw new Error('Native Windows receipt path escapes its target directory');
  }
  return { path, sha256: artifact.sha256 };
}

/** VENDORED/corpus/CURRENT.json and content/library/modules.json rows (absent ⇒ none). */
export function releaseInputs(root = ROOT) {
  const currentPath = join(root, 'VENDORED', 'corpus', 'CURRENT.json');
  const modulesPath = join(root, 'content', 'library', 'modules.json');
  return {
    current: existsSync(currentPath) ? readJson(currentPath) : null,
    modules: existsSync(modulesPath) ? readJson(modulesPath).modules ?? [] : [],
  };
}

/** The vendored module file (§2.6 name, or the modules.json `file` name; author resolution 6). */
export function vendoredModule(root, m) {
  return [join(root, 'VENDORED', 'modules', `sanctissimissa-module-${m.editionId}-r${m.revision}.db`),
    join(root, 'VENDORED', 'modules', m.file)].find((p) => existsSync(p)) ?? null;
}

function preserveToOutbox(file) {
  const outbox = join(homedir(), 'outbox', 'sanctissimissa');
  mkdirSync(outbox, { recursive: true });
  copyFileSync(file, join(outbox, `${new Date().toISOString().replace(/[:.]/g, '-')}-${basename(file)}`),
    constants.COPYFILE_EXCL);
}

/** Resolve every source of one ARTIFACTS row in `env` to `[{id, source, meta}]`. */
function resolveRow(row, env, root, version, sourceHead) {
  const spec = row.source(env, version);
  if (spec.webZip) return [{ id: row.id, source: archiveWeb(root, `${row.id}-${env}.zip`) }];
  if (spec.dir) return [{ id: row.id, source: exactOne(join(root, spec.dir), spec.match, row.id) }];
  if (spec.file) {
    const source = join(root, spec.file);
    if (!existsSync(source)) throw new Error(`${row.id}: missing ${spec.file}`);
    return [{ id: row.id, source }];
  }
  if (spec.receipt) {
    const rp = receiptPath(root, version);
    const { path, sha256: pin } = verifyReceipt(readJson(rp), spec.receipt, dirname(rp), version, sourceHead);
    if (!existsSync(path) || sha256(path) !== pin) throw new Error(`Native Windows ${spec.receipt} does not match its release receipt hash`);
    // Keep the receipt beside the staged set so collect re-verifies it on ubuntu.
    const copy = join(root, 'dist', 'rubric-runs', `sanctissimissa-v${version}-windows-native-metadata-buildenv-windows.json`);
    mkdirSync(dirname(copy), { recursive: true });
    if (existsSync(copy) && sha256(copy) !== sha256(rp)) preserveToOutbox(copy);
    if (!existsSync(copy) || sha256(copy) !== sha256(rp)) copyFileSync(rp, copy);
    return [{ id: row.id, source: path }];
  }
  const { current, modules } = releaseInputs(root);
  if (spec.vendored === 'corpus') {
    if (!current) throw new Error('VENDORED/corpus/CURRENT.json is absent');
    const source = join(root, 'VENDORED', 'corpus', current.file);
    if (!existsSync(source) || sha256(source) !== current.sha256) throw new Error(`corpus ${current.file} does not equal CURRENT.json`);
    return [{ id: 'corpus', source, meta: { corpus_version: current.corpus_version } }];
  }
  return modules.map((m) => {
    const source = vendoredModule(root, m);
    if (!source || sha256(source) !== m.sha256) throw new Error(`module ${m.file} is not vendored with its modules.json sha256`);
    return { id: `module-${m.editionId}`, source, meta: { revision: m.revision } };
  });
}

/**
 * Copy the outputs of `stage` built in `env` into dist/ under `distName` (§2.4) and return
 * `[{id, filename, sha256}]`. RPMs are rejected unless their header identity is the release (§2.8).
 */
export function stageOutputs(stage, env, root = ROOT) {
  const version = readFileSync(join(root, 'version.txt'), 'utf8').trim();
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const staged = [];
  for (const row of ARTIFACTS.filter((a) => a.stage === stage && a.envs.includes(env))) {
    for (const { id, source, meta } of resolveRow(row, env, root, version, sourceHead)) {
      if (id === 'linux-rpm') assertRpmIdentity(source, version, root);
      const filename = distName(id, version, env, meta);
      staged.push({ id, filename, sha256: copyStaged(source, filename, root) });
    }
  }
  return staged;
}
