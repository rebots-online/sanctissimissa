#!/usr/bin/env node

/**
 * Release state management for autonomous stamped resume (lock v2, per-env pairs).
 *
 * The first invocation of `npm run build:release` stamps once, writes
 * `sanctissimissa-release-state.json`, and runs the stages of this build environment.
 * A later invocation with a matching lock resumes at the first incomplete `<stage>@<env>`
 * pair without stamping. Mismatched/corrupt locks fail closed with exact remediation.
 *
 * Normative: DOCS/ARCHITECTURE/L-release-20261106.md §2.1–§2.3 (envs, stages, lock v2).
 * The matrix lives in release-matrix.mjs, lock I/O in release-lock.mjs, stage commands in
 * release-stage-commands.mjs and stage-as-produced copies in release-stage-outputs.mjs.
 */

import fs from 'node:fs';

// rustc SIGSEGVs (stack overflow) compiling the app lib with llama-cpp-2 in
// release+LTO on linux and the android/windows cross targets — give rustc a
// deep stack for every stage's child cargo (upstream hint: 16777216; doubled
// twice for headroom).
process.env.RUST_MIN_STACK ||= '67108864';
// Cross-compile rustc SIGSEGVs under full 16-way parallelism (memory pressure
// during LTO codegen) — bound cargo jobs for stability over speed.
process.env.CARGO_BUILD_JOBS ||= '6';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';
import { REQUIRED_PAIRS, STAGE_ENVS, STAGE_ORDER, envOf, stageKey, stagePrereqs } from './release-matrix.mjs';
import {
  getInputHashes, getSourceHead, lockMatchesCurrent, markStageComplete, preserveState, readLock,
  readVersion, unionPairs, writeEnvLockCopy, writeLock,
} from './release-lock.mjs';
import { stageCommand } from './release-stage-commands.mjs';
import { stageOutputs } from './release-stage-outputs.mjs';

export { STAGE_ORDER } from './release-matrix.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Root directory from deps, env, or the checkout containing this script. */
function getRoot(deps) {
  if (deps?.fixtureDir) return deps.fixtureDir;
  const env = deps?.env || process.env;
  return env.RELEASE_STATE_FIXTURE || env.RELEASE_ROOT || path.resolve(__dirname, '..');
}

function getLockPath(root) {
  return path.join(root, 'sanctissimissa-release-state.json');
}

/**
 * Expand a tilde-prefixed path to the home directory.
 * @param {string} value - The path to expand (may start with ~ or ~/)
 * @param {string} [home=os.homedir()] - The home directory to use
 * @returns {string} The expanded absolute path
 * @throws {Error} If the path starts with ~user (user-specific expansion is not supported)
 */
export function expandHomePath(value, home = os.homedir()) {
  if (value === '~') return home;
  if (value.startsWith('~/')) return path.join(home, value.slice(2));
  if (value.startsWith('~')) throw new Error('User-specific path expansion (~user) is not supported');
  return value;
}

function isFixture(deps) {
  return Boolean(deps?.runCommand || deps?.fixtureDir || (deps?.env || process.env).RELEASE_STATE_FIXTURE);
}

function getOutboxDir(deps) {
  const env = deps?.env || process.env;
  const home = deps?.env?.HOME || deps?.fixtureDir || env.RELEASE_STATE_FIXTURE || env.HOME || os.homedir();
  return expandHomePath('~/outbox/sanctissimissa', home);
}

export const PENDING_RELEASE_EXIT_CODE = 2;

/** §2.2: a stage runs on a host when the host's env is in STAGE_ENVS[stage]. */
export function stageRunsOnHost(stage, platform) {
  let env;
  try {
    env = envOf(platform);
  } catch {
    return false;
  }
  return STAGE_ENVS[stage]?.includes(env) ?? false;
}

/** Interrupt receipt filename */
export const INTERRUPT_RECEIPT_FILENAME = 'sanctissimissa-release-interrupt-receipt.json';

/** Exit code when controlled interrupt occurs */
export const INTERRUPT_EXIT_CODE = 70;

/** Exit code when receipt validation fails */
export const RECEIPT_MISMATCH_EXIT_CODE = 71;

/**
 * Interrupt receipt structure
 * @typedef {Object} InterruptReceipt
 * @property {string} target - The stage name where interrupt occurred
 * @property {true} consumed - Receipt consumption flag (always true)
 * @property {string} writtenAt - ISO 8601 timestamp when receipt was written
 */

/**
 * Get interrupt receipt path for fixture directory
 * @param {string} fixtureDir - The fixture directory path
 * @returns {string} The interrupt receipt file path
 */
export function getReceiptPath(fixtureDir) {
  return path.join(fixtureDir, INTERRUPT_RECEIPT_FILENAME);
}

/**
 * Read and validate interrupt receipt from fixture directory
 * @param {string} fixtureDir - The fixture directory path
 * @returns {InterruptReceipt|null} The parsed receipt, or null if file doesn't exist
 * @throws {Error} If the file exists but is invalid JSON or structurally malformed
 */
export function readInterruptReceipt(fixtureDir) {
  const receiptPath = getReceiptPath(fixtureDir);
  if (!fs.existsSync(receiptPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
    // Validate structure: { target: string, consumed: true, writtenAt: string }
    if (typeof parsed.target !== 'string' || parsed.consumed !== true || typeof parsed.writtenAt !== 'string') {
      throw new Error('Invalid interrupt receipt structure');
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Interrupt receipt contains invalid JSON');
    throw error;
  }
}

/**
 * Atomically write interrupt receipt for a target stage
 * @param {string} target - The stage name being interrupted
 * @param {string} fixtureDir - The fixture directory path
 */
export function writeInterruptReceipt(target, fixtureDir) {
  const receiptPath = getReceiptPath(fixtureDir);
  const tempPath = `${receiptPath}.tmp`;
  const receipt = { target, consumed: true, writtenAt: new Date().toISOString() };
  fs.writeFileSync(tempPath, JSON.stringify(receipt, null, 2), 'utf-8');
  fs.renameSync(tempPath, receiptPath);
}

/** Append one stub event line (hermetic stub mode). */
function logStub(fixtureDir, name) {
  fs.appendFileSync(path.join(fixtureDir, 'sanctissimissa-release-stage-events.log'), `${name}\n`, 'utf-8');
}

/**
 * Unified command runner for stamp and stages.
 * Resolves from injected deps, environment, or runs real commands.
 * @param {string} name - Command name ('stamp' or stage name)
 * @param {Object} deps - Dependency injection object
 * @param {string} root - Root directory
 * @param {string} releaseEnv - Build environment ('ubuntu' | 'windows'), exported as SAM_RELEASE_ENV
 * @returns {Promise<number>} Exit code (0 for success)
 */
async function runCommand(name, deps, root, releaseEnv) {
  // Injected stub runner
  if (deps?.runCommand) {
    const result = await deps.runCommand(name);
    return result ?? 0;
  }

  // Environment-selected hermetic stub mode
  const env = deps?.env || process.env;
  const fixtureDir = deps?.fixtureDir || env.RELEASE_STATE_FIXTURE;
  if (env.RELEASE_STATE_RUNNER === 'stub' && fixtureDir) {
    // Controlled interrupt protocol (stub mode only)
    const interruptTarget = env.RELEASE_STATE_INTERRUPT_AT;
    if (interruptTarget !== undefined) {
      if (!STAGE_ORDER.includes(interruptTarget)) {
        console.error(`❌ RELEASE_STATE_INTERRUPT_AT must be a canonical stage: ${STAGE_ORDER.join(', ')}`);
        return RECEIPT_MISMATCH_EXIT_CODE;
      }
      if (name === interruptTarget) {
        try {
          const receipt = readInterruptReceipt(fixtureDir);
          // First reach: write receipt and interrupt
          if (receipt === null) {
            logStub(fixtureDir, name);
            writeInterruptReceipt(name, fixtureDir);
            console.log(`⏸️  Controlled interrupt at ${name} (receipt written)`);
            return INTERRUPT_EXIT_CODE;
          }
          // Receipt mismatch: fail closed
          if (receipt.target !== interruptTarget) {
            console.error(`❌ Interrupt receipt mismatch: receipt.target=${receipt.target}, RELEASE_STATE_INTERRUPT_AT=${interruptTarget}`);
            return RECEIPT_MISMATCH_EXIT_CODE;
          }
          // Resume: receipt matches, continue without re-stamping
          console.log(`▶️  Resuming from ${name} (receipt matched)`);
          return 0;
        } catch (err) {
          console.error(`❌ Interrupt receipt error: ${err.message}`);
          return RECEIPT_MISMATCH_EXIT_CODE;
        }
      }
    }
    logStub(fixtureDir, name);
    console.log(`🔧 [STUB] ${name}`);
    return 0;
  }

  // Real command execution. Child stdout/stderr stay attached to the invoking
  // terminal: never background a build and never redirect its only evidence
  // to a disposable log file.
  if (isFixture(deps)) throw new Error('Fixture execution requires an injected runner or RELEASE_STATE_RUNNER=stub');
  const childEnv = { ...process.env, ...env, FORCE_COLOR: env.FORCE_COLOR || '1', SAM_RELEASE_ENV: releaseEnv };
  childEnv.ANDROID_HOME ||= path.join(os.homedir(), 'Android', 'Sdk');
  childEnv.ANDROID_SDK_ROOT = childEnv.ANDROID_HOME;
  childEnv.NDK_HOME ||= path.join(childEnv.ANDROID_HOME, 'ndk', '27.0.12077973');
  if (!childEnv.JAVA_HOME && process.platform === 'linux') {
    const javaPath = execSync('command -v java', { encoding: 'utf8', env: childEnv }).trim();
    childEnv.JAVA_HOME = path.dirname(path.dirname(fs.realpathSync(javaPath)));
  }
  const inherited = { cwd: root, stdio: 'inherit', env: childEnv };

  // npm's Windows shim is absent in node_modules copied from Linux. Each host
  // must install its own CLI before running a production stage or the stamp.
  const tauriShim = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tauri.cmd' : 'tauri');
  if (!fs.existsSync(tauriShim)) {
    execSync('npm ci', inherited);
    if (!fs.existsSync(tauriShim)) throw new Error('npm ci did not install the host-local Tauri CLI shim');
  }

  if (name === 'stamp') {
    execFileSync(process.execPath, ['scripts/provision-secrets.mjs'], inherited);
    console.log('🔧 Stamp: npm run stamp');
    execSync('npm run stamp', inherited);
    execFileSync('cargo', ['update', '--workspace', '--offline'], { ...inherited, cwd: path.join(root, 'src-tauri') });
    const versionFiles = [
      'Package.appxmanifest', 'version.txt', 'version.json', 'package.json', 'package-lock.json',
      'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json',
    ];
    execFileSync('git', ['add', '--', ...versionFiles], inherited);
    execFileSync('git', ['commit', '--only', '-m',
      `v${readVersion(root)}: stamp complete release [skip ci]`, '--', ...versionFiles], inherited);
    return 0;
  }

  // Stage commands: the L-release §2.2 STAGE_ENVS table (release-stage-commands.mjs).
  if (!STAGE_ORDER.includes(name)) throw new Error(`Unknown command: ${name}`);
  return stageCommand(name, releaseEnv, inherited);
}

/**
 * Run one stage for this host's env and mark its `<stage>@<env>` pair complete.
 * Outputs are staged into dist/ (stageOutputs) before the pair is marked (CC14 stage-as-produced).
 * @param {string} stage - The stage name to run
 * @param {Object} [deps] - Optional dependency overrides
 * @param {string} [root] - Root directory
 * @param {string} [lockPath] - Lock file path
 * @returns {Promise<number>} Exit code (0 complete, PENDING_RELEASE_EXIT_CODE pending)
 */
export async function runReleaseStage(stage, deps, root, lockPath) {
  if (!STAGE_ORDER.includes(stage)) throw new Error(`Unknown stage: ${stage}`);
  root ||= getRoot(deps);
  lockPath ||= getLockPath(root);
  const platform = deps?.platform ?? process.platform;
  if (!stageRunsOnHost(stage, platform)) return PENDING_RELEASE_EXIT_CODE;
  const env = envOf(platform);
  const pair = stageKey(stage, env);
  const lock = readLock(lockPath);
  if (lock?.stampPending) throw new Error('Cannot run a release stage while stamp/commit is pending');
  const missingPrereqs = stagePrereqs(stage, env).filter((p) => !lock?.completedStages.includes(p));
  if (missingPrereqs.length) {
    console.log(`⏳ ${pair} pending: needs ${missingPrereqs.join(', ')}`);
    return PENDING_RELEASE_EXIT_CODE;
  }
  const exitCode = await runCommand(stage, deps, root, env);
  if (exitCode === PENDING_RELEASE_EXIT_CODE) {
    console.log(`⏳ ${pair} pending`);
    return PENDING_RELEASE_EXIT_CODE;
  }
  if (exitCode !== 0) throw new Error(`Stage ${pair} failed with exit code ${exitCode}`);
  if (deps?.stageOutputs) deps.stageOutputs(stage, env);
  else if (!isFixture(deps)) stageOutputs(stage, env, root);
  markStageComplete(pair, lockPath, getOutboxDir(deps));
  return 0;
}

/** Print usage information (L-release §2.2 stages; no `test`, no android-debug). */
export function printUsage() {
  console.log(`Usage: node release-state.mjs [options]

Options:
  --help, -h         Show this help message and exit
  --restart          Copy existing state to outbox and start a fresh stamped release
  --resume-only      Continue matching existing state; never stamp
  --clean-only       Copy matching state to outbox; retain the active state

Release stages (run automatically; each completes as <stage>@<env>, env ubuntu|windows):
  inputs             Verify vendored release inputs, stage corpus/modules into dist/ (both)
  web                Build web/PWA and stage its zip (both)
  modules-deploy     Upload modules and runtime assets to sanctissimissa.robin.mba/runtime (ubuntu)
  web-deploy         Publish the completed web output to sanctissimissa.surge.sh (ubuntu)
  linux              Build Linux deb, AppImage and rpm (both; container on windows)
  windows            Build Windows x64 standalone PE and NSIS installer (both)
  windows-msi        Build the MSI installer (windows)
  windows-msix       Build the MSIX package (windows)
  android-release    Build Android release APK and AAB (both)
  symbols            Package Android native debug symbols (both; container on windows)
  collect            Collect the union of both envs and write the release manifest (ubuntu)

The state file (sanctissimissa-release-state.json) enables resume after interruption:
- First run: stamps version and writes lock with empty completedStages
- Subsequent runs: resume at first incomplete stage (no stamp)
- Mismatched/corrupt locks: fail closed with remediation instructions
- Every run copies the lock to dist/rubric-runs/sanctissimissa-v<ver>-release-state-buildenv-<env>.json`);
}

/**
 * Main release orchestration
 * @param {string[]} argv - Command line arguments
 * @param {Object} [deps] - Optional dependency overrides for testing
 * @returns {Promise<number>} Exit code (0 for success, non-zero for failure)
 */
export async function main(argv, deps = {}) {
  const env = deps.env || process.env;
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }
  const restartFlag = args.includes('--restart');
  const cleanOnlyFlag = args.includes('--clean-only');
  const resumeOnlyFlag = args.includes('--resume-only');
  if (args.some(arg => !['--restart', '--clean-only', '--resume-only'].includes(arg)) ||
      [restartFlag, cleanOnlyFlag, resumeOnlyFlag].filter(Boolean).length > 1) {
    console.error('❌ Choose at most one of --restart, --clean-only, --resume-only');
    return 1;
  }

  const root = getRoot(deps);
  const lockPath = getLockPath(root);
  const outboxDir = getOutboxDir(deps);
  const fixture = isFixture(deps);
  if (env.WSL_INTEROP || env.WSL_DISTRO_NAME || (!fixture && /microsoft/i.test(os.release()))) {
    console.error('❌ Release builds are forbidden on WSL; use native Linux or Windows.');
    return 1;
  }
  if (!fixture && !['linux', 'win32'].includes(deps.platform ?? process.platform)) {
    console.error('❌ This release driver requires native Linux or Windows; no stamp was run.');
    return 1;
  }
  const releaseEnv = envOf(deps.platform ?? process.platform);

  let lock;
  try {
    lock = readLock(lockPath);
  } catch (error) {
    if (!restartFlag) {
      console.error('❌ Lock mismatch or corruption detected:', error.message);
      console.error('Remediation: npm run build:release -- --restart preserves this state and starts fresh.');
      return 1;
    }
  }

  if (resumeOnlyFlag && !lock) {
    console.error('❌ --resume-only requires an existing matching release state; no stamp was run.');
    return 1;
  }
  if (lock?.stampPending && !restartFlag) {
    console.error('❌ Previous stamp/commit was interrupted. No second stamp was run; resolve tracked changes, then use --restart to preserve it and start a new invocation.');
    return 1;
  }

  if (!fixture) {
    getSourceHead(root);
    const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (dirty) {
      console.error('❌ Commit tracked changes before building a recorded release source snapshot.');
      return 1;
    }
  }

  if (restartFlag && fs.existsSync(lockPath)) {
    const archivedPath = preserveState(lockPath, lock?.version || readVersion(root), 'release-state-restarted', outboxDir);
    console.log(`🔄 Copied old lock to ${archivedPath}`);
    lock = null;
  }

  if (cleanOnlyFlag && !lock) {
    console.log('ℹ️  No lock file found');
    return 0;
  }

  if (lock) {
    try {
      if (!lockMatchesCurrent(lock, root, fixture)) throw new Error('Version, source HEAD, or input hashes differ');
    } catch (error) {
      console.error('❌ Lock mismatch or corruption detected:', error.message);
      console.error('Remediation: npm run build:release -- --restart preserves this state and starts fresh.');
      return 1;
    }
    if (cleanOnlyFlag) {
      const archivedPath = preserveState(lockPath, lock.version, 'release-state-cleaned', outboxDir);
      console.log(`📦 Copied lock to ${archivedPath}; active state retained. Use --restart for a fresh release.`);
      return 0;
    }
    console.log(`🔄 Resuming release v${lock.version} on ${releaseEnv}`);
    console.log(`Completed pairs: ${lock.completedStages.join(', ') || 'none'}`);
  } else {
    // Validate non-Git inputs before burning a version or altering old state.
    if (!fixture) {
      if (fs.existsSync(path.join(root, 'release.lock'))) {
        console.error('❌ Legacy release.lock freezes the version. Preserve and resolve it before starting a new stamped release.');
        return 1;
      }
      getInputHashes(root);
    }
    console.log('🚀 Starting fresh release');
    const predecessor = {
      version: readVersion(root),
      sourceHead: getSourceHead(root, fixture),
      startedAt: new Date().toISOString(),
      completedStages: [],
      stampPending: true,
      ...(!fixture ? { inputHashes: getInputHashes(root) } : {}),
    };
    writeLock(predecessor, lockPath, outboxDir);
    const exitCode = await runCommand('stamp', deps, root, releaseEnv);
    if (exitCode !== 0) throw new Error(`Stamp failed with exit code ${exitCode}`);
    lock = {
      version: readVersion(root),
      sourceHead: getSourceHead(root, fixture),
      startedAt: predecessor.startedAt,
      completedStages: [],
      ...(!fixture ? { inputHashes: getInputHashes(root) } : {}),
    };
    writeLock(lock, lockPath, outboxDir);
    console.log(`🔒 Wrote sanctissimissa-release-state.json v${lock.version}`);
  }

  try {
    for (const stage of STAGE_ORDER) {
      if (!STAGE_ENVS[stage].includes(releaseEnv)) {
        console.log(`⏭ ${stage}: runs in ${STAGE_ENVS[stage].join(', ')} only`);
        continue;
      }
      if (lock.completedStages.includes(stageKey(stage, releaseEnv))) continue;
      await runReleaseStage(stage, deps, root, lockPath);
      lock = readLock(lockPath);
    }
  } finally {
    // §2.3 environment copy at the end of every invocation, complete or pending.
    if (fs.existsSync(lockPath)) {
      const copy = writeEnvLockCopy(root, lockPath, readLock(lockPath).version, releaseEnv, outboxDir);
      console.log(`📦 Copied release state to ${copy}`);
    }
  }

  const union = unionPairs(lock, root);
  const missing = REQUIRED_PAIRS.filter((pair) => !union.includes(pair));
  if (missing.length) {
    console.log(`⏳ Release v${lock.version} incomplete: ${missing.join(', ')}`);
    console.log('Continue the same source, version, inputs and state in the required env: npm run build:release -- --resume-only');
    return PENDING_RELEASE_EXIT_CODE;
  }
  console.log(`✅ All ${REQUIRED_PAIRS.length} release pairs complete; release acceptance remains subject to the recorded platform/Store verification gates.`);
  console.log('Use --restart to start a new stamped release.');
  return 0;
}

// Only run main when executed directly (isMain guard)
const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main(process.argv)
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Release failed:', error);
      process.exit(1);
    });
}
