#!/usr/bin/env node

/**
 * Release state management for autonomous stamped resume.
 *
 * The first invocation of `npm run build:release` stamps once, writes
 * `sanctissimissa-release-state.json`, and runs named stages. A later invocation with a matching
 * lock resumes automatically at the first incomplete stage without stamping.
 * Mismatched/corrupt locks fail closed with exact remediation.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, execSync, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get root directory from deps, env, or default
 */
function getRoot(deps) {
  if (deps?.fixtureDir) {
    return deps.fixtureDir;
  }
  const env = deps?.env || process.env;
  return env.RELEASE_STATE_FIXTURE || env.RELEASE_ROOT || path.resolve(__dirname, '..');
}

/**
 * Get lock path for current root
 */
function getLockPath(root) {
  return path.join(root, 'sanctissimissa-release-state.json');
}

/**
 * Get dist rubric runs path
 */
function getDistRubricRuns(root) {
  return path.join(root, 'dist', 'rubric-runs');
}

/**
 * Expand a tilde-prefixed path to the home directory.
 * @param {string} value - The path to expand (may start with ~ or ~/)
 * @param {string} [home=os.homedir()] - The home directory to use
 * @returns {string} The expanded absolute path
 * @throws {Error} If the path starts with ~user (user-specific expansion is not supported)
 */
export function expandHomePath(value, home = os.homedir()) {
  if (value === '~') {
    return home;
  }
  if (value.startsWith('~/')) {
    return path.join(home, value.slice(2));
  }
  if (value.startsWith('~')) {
    throw new Error('User-specific path expansion (~user) is not supported');
  }
  return value;
}

/**
 * Version source: version.txt (MAJOR.MINOR.BUILD)
 * @param {string} root - The root directory
 * @returns {string} The current version string
 */
function readVersion(root) {
  return fs.readFileSync(path.join(root, 'version.txt'), 'utf-8').trim();
}

/**
 * Get current git HEAD commit hash
 * @param {string} root - The root directory
 * @returns {string} The current git HEAD commit hash
 */
function getSourceHead(root, fixture = false) {
  try {
    const topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (fs.realpathSync(topLevel) !== fs.realpathSync(root)) throw new Error('Release root is not the Git checkout root');
    return execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (!fixture) throw error;
  }
  // Small hermetic fixtures intentionally have no real object database.
  const gitDir = path.join(root, '.git');
  const headPath = path.join(gitDir, 'HEAD');
  let headRef = fs.readFileSync(headPath, 'utf-8').trim();

  if (headRef.startsWith('ref: ')) {
    const refPath = path.join(gitDir, headRef.slice(5));
    return fs.readFileSync(refPath, 'utf-8').trim();
  }
  return headRef;
}

/**
 * Release state lock file structure
 * @typedef {Object} ReleaseState
 * @property {string} version - The version string (MAJOR.MINOR.BUILD)
 * @property {string} sourceHead - The git HEAD commit hash
 * @property {string} startedAt - ISO 8601 timestamp when release started
 * @property {string[]} completedStages - Array of completed stage names
 * @property {Record<string, string>} [inputHashes] - Frozen corpus/env hashes
 * @property {boolean} [stampPending] - Stamp/commit has not completed
 */

/**
 * Read and validate the release lock file, or return null only when absent.
 * @param {string} lockPath - The lock file path
 * @returns {ReleaseState|null} The parsed release state or null
 * @throws {Error} If the lock file contains corrupt JSON or invalid structure
 */
function readLock(lockPath) {
  if (!fs.existsSync(lockPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(lockPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate structure
    if (
      parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) ||
      typeof parsed.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(parsed.version) ||
      typeof parsed.sourceHead !== 'string' || !parsed.sourceHead ||
      typeof parsed.startedAt !== 'string' ||
      !Number.isFinite(Date.parse(parsed.startedAt)) ||
      !Array.isArray(parsed.completedStages) ||
      !parsed.completedStages.every(s => STAGE_ORDER.includes(s)) ||
      new Set(parsed.completedStages).size !== parsed.completedStages.length ||
      (parsed.stampPending !== undefined && typeof parsed.stampPending !== 'boolean') ||
      (parsed.stampPending === true && parsed.completedStages.length !== 0) ||
      (parsed.completedStages.includes('collect') && parsed.completedStages.length !== STAGE_ORDER.length) ||
      (parsed.inputHashes !== undefined && (
        parsed.inputHashes === null || typeof parsed.inputHashes !== 'object' || Array.isArray(parsed.inputHashes) ||
        !Object.values(parsed.inputHashes).every(value => typeof value === 'string' && /^(?:[a-f0-9]{64}|absent)$/.test(value))
      ))
    ) {
      throw new Error('Lock file has invalid structure');
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // JSON parse error - corrupt lock
      throw new Error('Lock file contains invalid JSON');
    }
    throw error;
  }
}

/**
 * Atomically write the release lock file
 * @param {ReleaseState} state - The release state to write
 * @param {string} lockPath - The lock file path
 */
function preserveState(lockPath, version, reason, outboxDir) {
  fs.mkdirSync(outboxDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivedPath = path.join(outboxDir,
    `sanctissimissa-v${version}-${reason}-${timestamp}-${randomUUID()}.json`);
  fs.copyFileSync(lockPath, archivedPath, fs.constants.COPYFILE_EXCL);
  return archivedPath;
}

function writeLock(state, lockPath, outboxDir) {
  if (fs.existsSync(lockPath)) preserveState(lockPath, state.version, 'release-state-before-update', outboxDir);
  const tempPath = `${lockPath}.${randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, lockPath);
}

/**
 * Atomically append a completed stage to the lock
 * @param {string} stage - The stage name to mark complete
 * @param {string} lockPath - The lock file path
 */
function markStageComplete(stage, lockPath, outboxDir) {
  const lock = readLock(lockPath);
  if (!lock) {
    throw new Error('Cannot mark stage complete: no valid lock file');
  }

  if (lock.completedStages.includes(stage)) {
    throw new Error(`Stage ${stage} already marked complete`);
  }

  const updated = {
    ...lock,
    completedStages: [...lock.completedStages, stage],
  };

  writeLock(updated, lockPath, outboxDir);
}

/**
 * Check if lock matches current state
 * @param {ReleaseState} lock - The lock to check
 * @param {string} root - The root directory
 * @returns {boolean} True if the lock matches current version and sourceHead
 */
function lockMatchesCurrent(lock, root, fixture) {
  const currentVersion = readVersion(root);
  const currentHead = getSourceHead(root, fixture);

  if (lock.version !== currentVersion || lock.sourceHead !== currentHead) return false;
  if (!fixture || lock.inputHashes) {
    const current = getInputHashes(root);
    return Object.entries(current).every(([name, hash]) => lock.inputHashes?.[name] === hash);
  }
  return true;
}

function getInputHashes(root) {
  return Object.fromEntries(['assets/missal.db', '.env'].map(name => {
    const filename = path.join(root, name);
    if (!fs.existsSync(filename)) {
      if (name === '.env') return [name, 'absent'];
      throw new Error('Release input assets/missal.db is missing');
    }
    return [name, createHash('sha256').update(fs.readFileSync(filename)).digest('hex')];
  }));
}

function isFixture(deps) {
  return Boolean(deps?.runCommand || deps?.fixtureDir || (deps?.env || process.env).RELEASE_STATE_FIXTURE);
}

function getOutboxDir(deps) {
  const env = deps?.env || process.env;
  const home = deps?.env?.HOME || deps?.fixtureDir || env.RELEASE_STATE_FIXTURE || env.HOME || os.homedir();
  return expandHomePath('~/outbox/sanctissimissa', home);
}

/**
 * Canonical stage order.
 * android-debug is REMOVED (operator rule 2026-09-16: no android-debug stage
 * ever — debug APKs are never shipped; android-release is the only Android
 * build stage).
 */
export const STAGE_ORDER = [
  'test', 'web', 'linux',
  'windows', 'windows-msi', 'windows-msix',
  'android-release', 'symbols', 'collect',
];

export const PENDING_RELEASE_EXIT_CODE = 2;

export function stageRunsOnHost(stage, platform) {
  if (!STAGE_ORDER.includes(stage)) return false;
  if (stage === 'collect') return platform === 'linux';
  if (['test', 'web'].includes(stage)) return ['linux', 'win32'].includes(platform);
  if (['windows-msi', 'windows-msix'].includes(stage)) return platform === 'win32';
  return platform === 'linux';
}

/**
 * Interrupt receipt filename
 */
export const INTERRUPT_RECEIPT_FILENAME = 'sanctissimissa-release-interrupt-receipt.json';

/**
 * Exit code when controlled interrupt occurs
 */
export const INTERRUPT_EXIT_CODE = 70;

/**
 * Exit code when receipt validation fails
 */
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

  if (!fs.existsSync(receiptPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(receiptPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate structure: { target: string, consumed: true, writtenAt: string }
    if (
      typeof parsed.target !== 'string' ||
      parsed.consumed !== true ||
      typeof parsed.writtenAt !== 'string'
    ) {
      throw new Error('Invalid interrupt receipt structure');
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Interrupt receipt contains invalid JSON');
    }
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

  const receipt = {
    target,
    consumed: true,
    writtenAt: new Date().toISOString(),
  };

  fs.writeFileSync(tempPath, JSON.stringify(receipt, null, 2), 'utf-8');
  fs.renameSync(tempPath, receiptPath);
}

/**
 * Unified command runner for stamp and stages.
 * Resolves from injected deps, environment, or runs real commands.
 * @param {string} name - Command name ('stamp' or stage name)
 * @param {Object} deps - Dependency injection object
 * @param {string} root - Root directory
 * @returns {Promise<number>} Exit code (0 for success)
 */
async function runCommand(name, deps, root) {
  // Injected stub runner
  if (deps?.runCommand) {
    const result = await deps.runCommand(name);
    return result ?? 0;
  }

  // Environment-selected hermetic stub mode
  const env = deps?.env || process.env;
  const isStub = env.RELEASE_STATE_RUNNER === 'stub';
  const fixtureDir = deps?.fixtureDir || env.RELEASE_STATE_FIXTURE;

  if (isStub && fixtureDir) {
    // Controlled interrupt protocol (stub mode only)
    const interruptTarget = env.RELEASE_STATE_INTERRUPT_AT;
    if (interruptTarget !== undefined) {
      // Validate interrupt target is a known stage
      if (!STAGE_ORDER.includes(interruptTarget)) {
        console.error(`❌ RELEASE_STATE_INTERRUPT_AT must be a canonical stage: ${STAGE_ORDER.join(', ')}`);
        return RECEIPT_MISMATCH_EXIT_CODE;
      }

      // Handle interrupt at target stage
      if (name === interruptTarget) {
        try {
          const receipt = readInterruptReceipt(fixtureDir);

          // First reach: write receipt and interrupt
          if (receipt === null) {
            const logPath = path.join(fixtureDir, 'sanctissimissa-release-stage-events.log');
            fs.appendFileSync(logPath, name + '\n', 'utf-8');
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

      // Non-target stages: log normally
      const logPath = path.join(fixtureDir, 'sanctissimissa-release-stage-events.log');
      const logLine = `${name}\n`;
      fs.appendFileSync(logPath, logLine, 'utf-8');
      console.log(`🔧 [STUB] ${name}`);
      return 0;
    }

    // Normal stub logging (no interrupt requested)
    const logPath = path.join(fixtureDir, 'sanctissimissa-release-stage-events.log');
    const logLine = `${name}\n`;
    fs.appendFileSync(logPath, logLine, 'utf-8');
    console.log(`🔧 [STUB] ${name}`);
    return 0;
  }

  // Real command execution. Child stdout/stderr stay attached to the invoking
  // terminal: never background a build and never redirect its only evidence
  // to a disposable log file.
  if (isFixture(deps)) throw new Error('Fixture execution requires an injected runner or RELEASE_STATE_RUNNER=stub');
  const childEnv = { ...process.env, ...env, FORCE_COLOR: env.FORCE_COLOR || '1' };
  childEnv.ANDROID_HOME ||= path.join(os.homedir(), 'Android', 'Sdk');
  childEnv.ANDROID_SDK_ROOT = childEnv.ANDROID_HOME;
  childEnv.NDK_HOME ||= path.join(childEnv.ANDROID_HOME, 'ndk', '27.0.12077973');
  if (!childEnv.JAVA_HOME && process.platform === 'linux') {
    const javaPath = execSync('command -v java', { encoding: 'utf8', env: childEnv }).trim();
    childEnv.JAVA_HOME = path.dirname(path.dirname(fs.realpathSync(javaPath)));
  }
  const inherited = {
    cwd: root,
    stdio: 'inherit',
    env: childEnv,
  };

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

  // Stage commands
  const stageCommands = {
    test: () => {
      console.log('🔧 Stage: test');
      // npm test runs at --test-concurrency=4 (195MB corpus DB children).
      // A corpus-loading child still dies file-level without diagnostics in
      // ~1 run in 10 under load (observed 2026-09-17, no kernel OOM/segv —
      // environmental). One deterministic retry with both outputs kept in
      // the train log; two consecutive failures fail the stage for real.
      const attempt = (args) => spawnSync('npm', args, { stdio: 'inherit', shell: false });
      const first = attempt(['test']);
      if (first.status === 0) return;
      console.warn('⚠ test stage failed once (corpus-load flake class) — deterministic retry with TAP evidence:');
      const second = attempt(['test', '--', '--test-reporter=tap']);
      if (second.status !== 0) {
        throw new Error(`test stage failed twice (first exit ${first.status}, retry exit ${second.status}) — see TAP output above`);
      }
      console.warn('⚠ test stage passed on retry; first-failure evidence retained above');
    },
    web: () => {
      console.log('🔧 Stage: web');
      execSync('npm run build:vite', inherited);
    },
    linux: () => {
      console.log('🔧 Stage: linux');
      execSync('npm exec -- tauri build --bundles deb,appimage --ci', inherited);
    },
    windows: () => {
      console.log('🔧 Stage: windows');
      execSync('npm run build:windows:unstamped', inherited);
    },
    'windows-msi': () => {
      console.log('🔧 Stage: windows-msi');
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File',
        'scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1', '-Kind', 'MSI'], inherited);
    },
    'windows-msix': () => {
      console.log('🔧 Stage: windows-msix');
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File',
        'scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1', '-Kind', 'MSIX'], inherited);
    },
    'android-debug': () => {
      console.log('🔧 Stage: android-debug');
      execFileSync(process.execPath, ['scripts/provision-secrets.mjs'], inherited);
      execSync('npm exec -- tauri android build --debug --apk --ci', inherited);
    },
    'android-release': () => {
      console.log('🔧 Stage: android-release');
      execFileSync(process.execPath, ['scripts/provision-secrets.mjs'], inherited);
      execSync('npm exec -- tauri android build --apk --aab --ci', {
        ...inherited,
        env: { ...inherited.env, CARGO_PROFILE_RELEASE_DEBUG: '2', CARGO_PROFILE_RELEASE_STRIP: 'false' },
      });
    },
    symbols: () => {
      console.log('🔧 Stage: symbols');
      execSync('npm run package:android-symbols', inherited);
    },
    collect: () => {
      console.log('🔧 Stage: collect');
      execSync('npm run collect-artifacts', inherited);
    },
  };

  const command = stageCommands[name];
  if (!command) {
    throw new Error(`Unknown command: ${name}`);
  }

  await command();
  return 0;
}

/**
 * Run a single stage and mark it complete
 * @param {string} stage - The stage name to run
 * @param {Object} [deps] - Optional dependency overrides
 * @param {string} [root] - Root directory
 * @param {string} [lockPath] - Lock file path
 * @returns {Promise<number>} Exit code
 */
export async function runReleaseStage(stage, deps, root, lockPath) {
  if (!STAGE_ORDER.includes(stage)) {
    throw new Error(`Unknown stage: ${stage}`);
  }

  root ||= getRoot(deps);
  lockPath ||= getLockPath(root);
  const platform = deps?.platform ?? (isFixture(deps) ? undefined : process.platform);
  if (platform && !stageRunsOnHost(stage, platform)) return PENDING_RELEASE_EXIT_CODE;
  const lock = readLock(lockPath);
  if (lock?.stampPending) throw new Error('Cannot run a release stage while stamp/commit is pending');
  if (stage === 'collect' && STAGE_ORDER.some(s => s !== 'collect' && !lock?.completedStages.includes(s))) {
    return PENDING_RELEASE_EXIT_CODE;
  }
  const exitCode = await runCommand(stage, deps, root);
  if (exitCode !== 0) {
    throw new Error(`Stage ${stage} failed with exit code ${exitCode}`);
  }

  markStageComplete(stage, lockPath, getOutboxDir(deps));
  return 0;
}

/**
 * Print usage information
 */
export function printUsage() {
  console.log(`Usage: node release-state.mjs [options]

Options:
  --help, -h         Show this help message and exit
  --restart          Copy existing state to outbox and start a fresh stamped release
  --resume-only      Continue matching existing state; never stamp
  --clean-only       Copy matching state to outbox; retain the active state

Release stages (run automatically):
  test               Run the test suite
  web                Build web/PWA
  linux              Build Linux deb and AppImage
  windows            Build Windows x64 standalone PE and NSIS installer
  windows-msi        Build the MSI installer (Windows host only)
  windows-msix       Build the MSIX package (Windows host only)
  android-debug      Build Android debug APK
  android-release    Build Android release APK and AAB
  symbols            Package Android native debug symbols
  collect            Collect and validate all release artifacts

The state file (sanctissimissa-release-state.json) enables resume after interruption:
- First run: stamps version and writes lock with empty completedStages
- Subsequent runs: resume at first incomplete stage (no stamp)
- Mismatched/corrupt locks: fail closed with remediation instructions`);
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
    console.log(`🔄 Resuming release v${lock.version}`);
    console.log(`Completed stages: ${lock.completedStages.join(', ') || 'none'}`);
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
    const exitCode = await runCommand('stamp', deps, root);
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

  for (const stage of STAGE_ORDER) {
    if (lock.completedStages.includes(stage)) continue;
    const result = await runReleaseStage(stage, deps, root, lockPath);
    if (result === PENDING_RELEASE_EXIT_CODE) {
      console.log(`⏳ Pending ${stage}: requires another host or earlier required stages.`);
    }
    lock = readLock(lockPath);
  }

  const pendingStages = STAGE_ORDER.filter(stage => !lock.completedStages.includes(stage));
  if (pendingStages.length) {
    console.log(`⏳ Release v${lock.version} incomplete: ${pendingStages.join(', ')}`);
    console.log('Continue the same source, version, inputs and state on the required host: npm run build:release -- --resume-only');
    return PENDING_RELEASE_EXIT_CODE;
  }

  // Keep the terminal state so another invocation cannot accidentally stamp again.
  const distRubricRuns = getDistRubricRuns(root);
  fs.mkdirSync(distRubricRuns, { recursive: true });
  const archivePath = path.join(distRubricRuns, `sanctissimissa-v${lock.version}-release-state.json`);
  const lockBytes = fs.readFileSync(lockPath);
  if (!fs.existsSync(archivePath) || !fs.readFileSync(archivePath).equals(lockBytes)) {
    if (fs.existsSync(archivePath)) preserveState(archivePath, lock.version, 'release-state-before-archive', outboxDir);
    fs.copyFileSync(lockPath, archivePath);
  }
  console.log(`📦 Archived release state to ${archivePath}; terminal state retained.`);
  console.log('✅ All artifact build stages complete; release acceptance remains subject to the recorded platform/Store verification gates.');
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
