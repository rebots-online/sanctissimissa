#!/usr/bin/env node

/**
 * Release state management for autonomous stamped resume.
 *
 * The first invocation of `npm run build:release` stamps once, writes
 * `standroidsmissal-release-state.json`, and runs named stages. A later invocation with a matching
 * lock resumes automatically at the first incomplete stage without stamping.
 * Mismatched/corrupt locks fail closed with exact remediation.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

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
  return path.join(root, 'standroidsmissal-release-state.json');
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
function getSourceHead(root) {
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
 */

/**
 * Read and parse the release lock file, or return null if not present/invalid
 * @param {string} lockPath - The lock file path
 * @returns {ReleaseState|null} The parsed release state or null
 * @throws {Error} If the lock file exists but contains corrupt JSON
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
      typeof parsed.version !== 'string' ||
      typeof parsed.sourceHead !== 'string' ||
      typeof parsed.startedAt !== 'string' ||
      !Array.isArray(parsed.completedStages) ||
      !parsed.completedStages.every(s => typeof s === 'string')
    ) {
      return null;
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
function writeLock(state, lockPath) {
  const tempPath = `${lockPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, lockPath);
}

/**
 * Atomically append a completed stage to the lock
 * @param {string} stage - The stage name to mark complete
 * @param {string} lockPath - The lock file path
 */
function markStageComplete(stage, lockPath) {
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

  writeLock(updated, lockPath);
}

/**
 * Check if lock matches current state
 * @param {ReleaseState} lock - The lock to check
 * @param {string} root - The root directory
 * @returns {boolean} True if the lock matches current version and sourceHead
 */
function lockMatchesCurrent(lock, root) {
  const currentVersion = readVersion(root);
  const currentHead = getSourceHead(root);

  return lock.version === currentVersion && lock.sourceHead === currentHead;
}

/**
 * Canonical stage order
 */
export const STAGE_ORDER = ['test', 'web', 'linux', 'windows', 'android-debug', 'android-release', 'symbols', 'collect'];

/**
 * Interrupt receipt filename
 */
export const INTERRUPT_RECEIPT_FILENAME = 'standroidsmissal-release-interrupt-receipt.json';

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
            const logPath = path.join(fixtureDir, 'standroidsmissal-release-stage-events.log');
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
      const logPath = path.join(fixtureDir, 'standroidsmissal-release-stage-events.log');
      const logLine = `${name}\n`;
      fs.appendFileSync(logPath, logLine, 'utf-8');
      console.log(`🔧 [STUB] ${name}`);
      return 0;
    }

    // Normal stub logging (no interrupt requested)
    const logPath = path.join(fixtureDir, 'standroidsmissal-release-stage-events.log');
    const logLine = `${name}\n`;
    fs.appendFileSync(logPath, logLine, 'utf-8');
    console.log(`🔧 [STUB] ${name}`);
    return 0;
  }

  // Real command execution. Child stdout/stderr stay attached to the invoking
  // terminal: never background a build and never redirect its only evidence
  // to a disposable log file.
  const { execSync } = await import('node:child_process');
  const inherited = {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR || '1' },
  };

  if (name === 'stamp') {
    console.log('🔧 Stamp: npm run stamp');
    execSync('npm run stamp', inherited);
    return 0;
  }

  // Stage commands
  const stageCommands = {
    test: () => {
      console.log('🔧 Stage: test');
      execSync('npm test', inherited);
    },
    web: () => {
      console.log('🔧 Stage: web');
      execSync('npm run build:vite', inherited);
    },
    linux: () => {
      console.log('🔧 Stage: linux');
      execSync('./node_modules/.bin/tauri build --bundles deb,appimage --ci', inherited);
    },
    windows: () => {
      console.log('🔧 Stage: windows');
      execSync('npm run build:windows:unstamped', inherited);
    },
    'android-debug': () => {
      console.log('🔧 Stage: android-debug');
      execSync('./node_modules/.bin/tauri android build --debug --apk --ci', inherited);
    },
    'android-release': () => {
      console.log('🔧 Stage: android-release');
      execSync('./node_modules/.bin/tauri android build --apk --aab --ci', {
        ...inherited,
        env: { ...inherited.env, CARGO_PROFILE_RELEASE_STRIP: 'false' },
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

  const exitCode = await runCommand(stage, deps, root);
  if (exitCode !== 0) {
    throw new Error(`Stage ${stage} failed with exit code ${exitCode}`);
  }

  markStageComplete(stage, lockPath);
  return 0;
}

/**
 * Print usage information
 */
export function printUsage() {
  console.log(`Usage: node release-state.mjs [options]

Options:
  --help, -h         Show this help message and exit
  --restart          Move existing lock to ~/outbox/standroidsmissal/ and start fresh
  --clean-only       Move existing lock to outbox if it matches current state

Release stages (run automatically):
  test               Run the test suite
  web                Build web/PWA
  linux              Build Linux deb and AppImage
  windows            Build Windows x64 standalone PE
  android-debug      Build Android debug APK
  android-release    Build Android release APK and AAB
  symbols            Package Android native debug symbols
  collect            Collect and validate all release artifacts

The state file (standroidsmissal-release-state.json) enables resume after interruption:
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
  const processObj = deps?.process || process;
  const fsObj = deps?.fs || fs;
  const pathObj = deps?.path || path;
  const env = deps?.env || process.env;

  const args = argv.slice(2);
  const restartFlag = args.includes('--restart');
  const cleanOnlyFlag = args.includes('--clean-only');
  const helpFlag = args.includes('--help') || args.includes('-h');

  const root = getRoot(deps);
  const lockPath = getLockPath(root);
  const distRubricRuns = getDistRubricRuns(root);

  if (helpFlag) {
    printUsage();
    return 0;
  }

  if (restartFlag && cleanOnlyFlag) {
    console.error('❌ Cannot specify both --restart and --clean-only');
    return 1;
  }

  const outboxDir = expandHomePath('~/outbox/standroidsmissal', env.HOME);

  // Handle --restart: move old lock to outbox and exit
  if (restartFlag) {
    const lock = readLock(lockPath);
    if (lock) {
      fsObj.mkdirSync(outboxDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivedPath = pathObj.join(
        outboxDir,
        `standroidsmissal-release-state-v${lock.version}-restarted-${timestamp}.json`,
      );
      fsObj.renameSync(lockPath, archivedPath);
      console.log(`🔄 Moved old lock to ${archivedPath}`);
    } else {
      console.log('ℹ️  No lock file found');
    }
    return 0;
  }

  // Handle --clean-only: just move old lock to outbox (for manual intervention)
  if (cleanOnlyFlag) {
    const lock = readLock(lockPath);
    if (!lock) {
      console.log('ℹ️  No lock file found');
      return 0;
    }

    fsObj.mkdirSync(outboxDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivedPath = pathObj.join(
      outboxDir,
      `standroidsmissal-release-state-v${lock.version}-cleaned-${timestamp}.json`,
    );

    if (!lockMatchesCurrent(lock, root)) {
      console.error('❌ Lock mismatch or corruption detected');
      console.error(`Lock version: ${lock.version}`);
      console.error(`Lock sourceHead: ${lock.sourceHead}`);
      console.error(`Current version: ${readVersion(root)}`);
      console.error(`Current sourceHead: ${getSourceHead(root)}`);
      console.error('');
      console.error('Remediation: run `npm run build:release --restart` to move this lock');
      console.error('to the outbox and start a fresh stamp, or manually inspect and resolve.');
      return 1;
    }

    fsObj.renameSync(lockPath, archivedPath);
    console.log(`🧹 Moved lock to ${archivedPath}`);
    return 0;
  }

  // Normal execution path
  let lock;
  try {
    lock = readLock(lockPath);
  } catch (error) {
    // Corrupt lock file
    if (error instanceof SyntaxError || error.message.includes('invalid JSON')) {
      console.error('❌ Lock mismatch or corruption detected');
      console.error('Lock file contains invalid JSON');
      console.error('');
      console.error('Remediation: run `npm run build:release --restart` to move this lock');
      console.error('to the outbox and start a fresh stamp, or manually inspect and resolve.');
      return 1;
    }
    throw error;
  }

  if (!lock) {
    // Fresh release: stamp once and write new lock
    console.log('🚀 Starting fresh release');
    const exitCode = await runCommand('stamp', deps, root);
    if (exitCode !== 0) {
      throw new Error(`Stamp failed with exit code ${exitCode}`);
    }

    const newLock = {
      version: readVersion(root),
      sourceHead: getSourceHead(root),
      startedAt: new Date().toISOString(),
      completedStages: [],
    };

    writeLock(newLock, lockPath);
    console.log(`🔒 Wrote standroidsmissal-release-state.json v${newLock.version}`);
    lock = newLock;
  } else {
    // Existing lock: validate match
    if (!lockMatchesCurrent(lock, root)) {
      console.error('❌ Lock mismatch or corruption detected');
      console.error(`Lock version: ${lock.version}`);
      console.error(`Lock sourceHead: ${lock.sourceHead}`);
      console.error(`Current version: ${readVersion(root)}`);
      console.error(`Current sourceHead: ${getSourceHead(root)}`);
      console.error('');
      console.error('Remediation: run `npm run build:release --restart` to move this lock');
      console.error('to the outbox and start a fresh stamp, or manually inspect and resolve.');
      return 1;
    }

    console.log(`🔄 Resuming release v${lock.version}`);
    console.log(`Started at: ${lock.startedAt}`);
    console.log(`Completed stages: ${lock.completedStages.join(', ') || 'none'}`);
  }

  // Determine stages to run
  const completedStages = lock.completedStages;
  const pendingStages = STAGE_ORDER.filter(s => !completedStages.includes(s));

  if (pendingStages.length === 0) {
    console.log('✅ All stages already completed');
    return 0;
  }

  console.log(`⏭️  Stages to run: ${pendingStages.join(', ')}`);

  // Run pending stages
  for (const stage of pendingStages) {
    try {
      await runReleaseStage(stage, deps, root, lockPath);
    } catch (error) {
      console.error(`❌ Stage ${stage} failed:`, error.message);
      throw error;
    }
  }

  // Archive completed lock to dist/rubric-runs after successful collect
  const finalLock = readLock(lockPath);
  if (!finalLock) {
    throw new Error('Cannot archive lock: no valid lock file');
  }

  fsObj.mkdirSync(distRubricRuns, { recursive: true });
  const archivePath = pathObj.join(distRubricRuns, `release-state-v${finalLock.version}.json`);
  fsObj.writeFileSync(archivePath, JSON.stringify(finalLock, null, 2), 'utf-8');
  fsObj.unlinkSync(lockPath);
  console.log(`📦 Archived release state to ${archivePath}`);

  console.log('✅ Release complete');
  return 0;
}

// Only run main when executed directly (isMain guard)
const isMain = import.meta.url === `file://${process.argv[1]}`;
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
