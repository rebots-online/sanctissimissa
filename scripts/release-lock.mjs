// Release lock I/O, extracted from release-state.mjs (BA.9) so the driver stays < 500 lines.
// Lock v2 — DOCS/ARCHITECTURE/L-release-20261106.md §2.3; inputHashes per BA.9 cross-partial
// resolution 5 (L-content-modules-search-20261106.md §2.1 pointer keys when the pointer exists).

import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PAIR_RE, REQUIRED_PAIRS, STAGE_ENVS, stageKey } from './release-matrix.mjs';

export const LOCK_SCHEMA = 'sanctissimissa-release-state.v2';
const UBUNTU_PAIRS = REQUIRED_PAIRS.filter((p) => p.endsWith('@ubuntu'));

/** Version source: version.txt (MAJOR.MINOR.BUILD). */
export function readVersion(root) {
  return fs.readFileSync(path.join(root, 'version.txt'), 'utf-8').trim();
}

/** Current git HEAD; hermetic fixtures without an object database read .git/HEAD directly. */
export function getSourceHead(root, fixture = false) {
  try {
    const opts = { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
    const topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], opts).trim();
    if (fs.realpathSync(topLevel) !== fs.realpathSync(root)) throw new Error('Release root is not the Git checkout root');
    return execFileSync('git', ['rev-parse', '--verify', 'HEAD'], opts).trim();
  } catch (error) {
    if (!fixture) throw error;
  }
  const gitDir = path.join(root, '.git');
  const headRef = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim();
  if (headRef.startsWith('ref: ')) return fs.readFileSync(path.join(gitDir, headRef.slice(5)), 'utf-8').trim();
  return headRef;
}

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/**
 * Frozen release inputs (resolution 5). With `assets/corpus.current.json` present the keys are
 * `{assets/corpus.current.json, assets/<pointer.file>, .env}`; otherwise the legacy
 * `{assets/missal.db, .env}` (the derived db stays hashed: `include_bytes!`, src-tauri/src/lib.rs).
 */
export function getInputHashes(root) {
  const pointerPath = path.join(root, 'assets', 'corpus.current.json');
  let names = ['assets/missal.db', '.env'];
  if (fs.existsSync(pointerPath)) {
    const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf-8'));
    if (typeof pointer.file !== 'string' || !pointer.file || pointer.file.includes('..')) {
      throw new Error('assets/corpus.current.json has no valid file');
    }
    names = ['assets/corpus.current.json', `assets/${pointer.file}`, '.env'];
  }
  return Object.fromEntries(names.map((name) => {
    const filename = path.join(root, name);
    if (fs.existsSync(filename)) return [name, sha256File(filename)];
    if (name === '.env') return [name, 'absent'];
    throw new Error(`Release input ${name} is missing (run npm run release:inputs to materialize it from VENDORED/)`);
  }));
}

function invalid(reason) {
  return new Error(`Lock file has invalid structure: ${reason}`);
}

/** Read and validate a v2 release lock, or return null only when absent. */
export function readLock(lockPath) {
  if (!fs.existsSync(lockPath)) return null;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Lock file contains invalid JSON');
    throw error;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw invalid('not an object');
  // A lock without `schema` (the 1.69 lock) is invalid; `--restart` retires it.
  if (parsed.schema !== LOCK_SCHEMA) throw invalid(`schema is not ${LOCK_SCHEMA}`);
  if (typeof parsed.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(parsed.version)) throw invalid('version');
  if (typeof parsed.sourceHead !== 'string' || !parsed.sourceHead) throw invalid('sourceHead');
  if (typeof parsed.startedAt !== 'string' || !Number.isFinite(Date.parse(parsed.startedAt))) throw invalid('startedAt');
  const done = parsed.completedStages;
  if (!Array.isArray(done) || !done.every((s) => typeof s === 'string' && PAIR_RE.test(s))) {
    throw invalid('completedStages entries must match <stage>@<env>');
  }
  if (new Set(done).size !== done.length) throw invalid('duplicate completedStages entry');
  if (parsed.stampPending !== undefined && typeof parsed.stampPending !== 'boolean') throw invalid('stampPending');
  if (parsed.stampPending === true && done.length !== 0) throw invalid('stampPending with completed pairs');
  if (done.includes('collect@ubuntu') && !UBUNTU_PAIRS.every((p) => done.includes(p))) {
    throw invalid('collect@ubuntu without every @ubuntu pair');
  }
  const hashes = parsed.inputHashes;
  if (hashes !== undefined && (hashes === null || typeof hashes !== 'object' || Array.isArray(hashes) ||
      !Object.values(hashes).every((v) => typeof v === 'string' && /^(?:[a-f0-9]{64}|absent)$/.test(v)))) {
    throw invalid('inputHashes');
  }
  return parsed;
}

/** Copy a state file into the outbox under a unique name (never overwrite). */
export function preserveState(lockPath, version, reason, outboxDir) {
  fs.mkdirSync(outboxDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivedPath = path.join(outboxDir, `sanctissimissa-v${version}-${reason}-${timestamp}-${randomUUID()}.json`);
  fs.copyFileSync(lockPath, archivedPath, fs.constants.COPYFILE_EXCL);
  return archivedPath;
}

/** Atomically write the lock, preserving the predecessor in the outbox first. */
export function writeLock(state, lockPath, outboxDir) {
  if (fs.existsSync(lockPath)) preserveState(lockPath, state.version, 'release-state-before-update', outboxDir);
  const tempPath = `${lockPath}.${randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ schema: LOCK_SCHEMA, ...state }, null, 2), 'utf-8');
  fs.renameSync(tempPath, lockPath);
}

/** Atomically append a completed `<stage>@<env>` pair. */
export function markStageComplete(pair, lockPath, outboxDir) {
  if (!PAIR_RE.test(pair)) throw new Error(`Not a release pair: ${pair}`);
  const lock = readLock(lockPath);
  if (!lock) throw new Error('Cannot mark stage complete: no valid lock file');
  if (lock.completedStages.includes(pair)) throw new Error(`Stage ${pair} already marked complete`);
  writeLock({ ...lock, completedStages: [...lock.completedStages, pair] }, lockPath, outboxDir);
}

/** True when the lock's version, sourceHead and input hashes equal the checkout's. */
export function lockMatchesCurrent(lock, root, fixture) {
  if (lock.version !== readVersion(root) || lock.sourceHead !== getSourceHead(root, fixture)) return false;
  if (!fixture || lock.inputHashes) {
    const current = getInputHashes(root);
    const keys = Object.keys(lock.inputHashes ?? {});
    if (keys.length !== Object.keys(current).length) return false;
    return Object.entries(current).every(([name, hash]) => lock.inputHashes?.[name] === hash);
  }
  return true;
}

/** dist/rubric-runs/sanctissimissa-v<ver>-release-state-buildenv-<env>.json (§2.3 environment copies). */
export function envLockCopyPath(root, version, env) {
  return path.join(root, 'dist', 'rubric-runs', `sanctissimissa-v${version}-release-state-buildenv-${env}.json`);
}

const sameHashes = (a = {}, b = {}) => {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
};

/**
 * §2.3 union: this lock's pairs ∪ the windows environment copy's pairs. Fails closed unless
 * `version`, `sourceHead` and `inputHashes` are equal. Returned in REQUIRED_PAIRS order.
 */
export function unionPairs(lock, root) {
  const pairs = new Set(lock.completedStages);
  const windowsCopy = envLockCopyPath(root, lock.version, 'windows');
  if (fs.existsSync(windowsCopy)) {
    const other = readLock(windowsCopy);
    for (const field of ['version', 'sourceHead']) {
      if (other[field] !== lock[field]) throw new Error(`release-state union mismatch: ${field}`);
    }
    if (!sameHashes(other.inputHashes, lock.inputHashes)) throw new Error('release-state union mismatch: inputHashes');
    for (const p of other.completedStages) pairs.add(p);
  }
  return REQUIRED_PAIRS.filter((p) => pairs.has(p));
}

/** Pairs of `env` present in `pairs` (for the manifest's `build_envs`). */
export const pairsOfEnv = (pairs, env) =>
  pairs.filter((p) => Object.keys(STAGE_ENVS).some((s) => p === stageKey(s, env)));

/** Copy the lock to its environment copy with archive-before-replace (was release-state.mjs:761-768). */
export function writeEnvLockCopy(root, lockPath, version, env, outboxDir) {
  const archivePath = envLockCopyPath(root, version, env);
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  const lockBytes = fs.readFileSync(lockPath);
  if (!fs.existsSync(archivePath) || !fs.readFileSync(archivePath).equals(lockBytes)) {
    if (fs.existsSync(archivePath)) preserveState(archivePath, version, 'release-state-before-archive', outboxDir);
    fs.copyFileSync(lockPath, archivePath);
  }
  return archivePath;
}
