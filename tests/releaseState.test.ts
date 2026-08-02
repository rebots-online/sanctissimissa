/**
 * Hermetic tests for release state management.
 *
 * Tests cover fresh, interrupted, resumed, mismatched, and completed states
 * without invoking real builds. All state changes are isolated to a temp directory.
 *
 * All tests exercise production code in two ways:
 * 1. Import and call production main() with injected stub runCommand
 * 2. Spawn the real CLI with RELEASE_STATE_RUNNER=stub environment
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Import production declarations and code for unit tests
import type { ReleaseState, ReleaseDeps } from '../scripts/release-state.d.mts';
import {
  expandHomePath,
  STAGE_ORDER,
  main,
  printUsage,
} from '../scripts/release-state.mjs';

// Type for spawn result
interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

// Canonical stage order for verification
const CANONICAL_STAGE_ORDER = ['test', 'web', 'linux', 'windows', 'android-debug', 'android-release', 'symbols', 'collect'];

// Helper: create a temporary directory and return cleanup function
function createTempDir() {
  const tempDir = path.join(__dirname, '.tmp', `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return {
    dir: tempDir,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
}

// Helper: mock a minimal git repo with .git/HEAD
function setupMockGit(root: string, commit: string): void {
  const gitDir = path.join(root, '.git');
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, 'HEAD'), commit, 'utf-8');
}

// Helper: create version.txt
function setupVersion(root: string, version: string): void {
  fs.writeFileSync(path.join(root, 'version.txt'), version, 'utf-8');
}

// Helper: write standroidsmissal-release-state.json
function writeLock(root: string, lock: ReleaseState): void {
  fs.writeFileSync(
    path.join(root, 'standroidsmissal-release-state.json'),
    JSON.stringify(lock, null, 2),
    'utf-8'
  );
}

// Helper: read standroidsmissal-release-state.json
function readLock(root: string): ReleaseState {
  const content = fs.readFileSync(path.join(root, 'standroidsmissal-release-state.json'), 'utf-8');
  return JSON.parse(content);
}

// Helper: read standroidsmissal-release-stage-events.log from fixture dir
function readRunCommandLog(fixtureDir: string): string {
  const logPath = path.join(fixtureDir, 'standroidsmissal-release-stage-events.log');
  if (!fs.existsSync(logPath)) {
    return '';
  }
  return fs.readFileSync(logPath, 'utf-8');
}

// Helper: spawn the real CLI and return result
async function spawnCli(args: string[], envOverrides: Record<string, string> = {}, cwd: string = ROOT): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      RELEASE_ROOT: cwd,
      ...envOverrides,
    };

    const child = spawn(process.execPath, ['scripts/release-state.mjs', ...args], {
      cwd: ROOT,
      env,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', reject);
  });
}

describe('Unit tests: expandHomePath', () => {
  it('should expand ~ to home directory', () => {
    const home = '/home/testuser';
    const result = expandHomePath('~', home);
    assert.strictEqual(result, home);
  });

  it('should expand ~/path to home/path', () => {
    const home = '/home/testuser';
    const result = expandHomePath('~/outbox/standroidsmissal', home);
    assert.strictEqual(result, '/home/testuser/outbox/standroidsmissal');
  });

  it('should pass absolute paths unchanged', () => {
    const result = expandHomePath('/absolute/path', '/home/testuser');
    assert.strictEqual(result, '/absolute/path');
  });

  it('should pass relative paths unchanged', () => {
    const result = expandHomePath('relative/path', '/home/testuser');
    assert.strictEqual(result, 'relative/path');
  });

  it('should reject ~user paths', () => {
    assert.throws(
      () => expandHomePath('~user/path', '/home/testuser'),
      /User-specific path expansion.*is not supported/
    );
  });
});

describe('Unit tests: STAGE_ORDER', () => {
  it('should define all required stages in canonical order', () => {
    assert.deepStrictEqual(STAGE_ORDER, CANONICAL_STAGE_ORDER);
  });

  it('should have 8 stages total', () => {
    assert.strictEqual(STAGE_ORDER.length, 8);
  });
});

describe('Unit tests: printUsage', () => {
  it('should be a function', () => {
    assert.strictEqual(typeof printUsage, 'function');
  });
});

describe('Unit tests: main with injected deps', () => {
  let tempDir: string;
  let cleanup: () => void;
  const commandsRun: string[] = [];

  beforeEach(() => {
    const t = createTempDir();
    tempDir = t.dir;
    cleanup = t.cleanup;
    commandsRun.length = 0;

    // Create a mock environment
    setupMockGit(tempDir, 'abc123def456');
    setupVersion(tempDir, '2.17.34595');
  });

  afterEach(() => {
    cleanup();
  });

  it('should accept help flag and exit 0 without running commands', async () => {
    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test', '--help'], stubDeps);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(commandsRun.length, 0);
  });

  it('should accept -h as alias for --help and exit 0', async () => {
    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test', '-h'], stubDeps);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(commandsRun.length, 0);
  });

  it('should reject --restart and --clean-only together', async () => {
    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test', '--restart', '--clean-only'], stubDeps);
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(commandsRun.length, 0);
  });

  it('should run stamp once on fresh release', async () => {
    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 0);
    assert.ok(commandsRun.includes('stamp'));
    assert.strictEqual(commandsRun.filter(c => c === 'stamp').length, 1);

    // Lock should be archived after completion (not in root)
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);

    // Archived lock should exist in dist/rubric-runs
    const distDir = path.join(tempDir, 'dist', 'rubric-runs');
    assert.ok(fs.existsSync(distDir));
    const archiveFiles = fs.readdirSync(distDir);
    const archiveFile = archiveFiles.find(f => f.startsWith('release-state-v2.17.34595'));
    assert.ok(archiveFile);

    // Verify archived lock contents
    const archivePath = path.join(distDir, archiveFile);
    const archiveContent = fs.readFileSync(archivePath, 'utf-8');
    const archivedLock = JSON.parse(archiveContent);
    assert.strictEqual(archivedLock.version, '2.17.34595');
    assert.strictEqual(archivedLock.sourceHead, 'abc123def456');
    assert.deepStrictEqual(archivedLock.completedStages, CANONICAL_STAGE_ORDER);
  });

  it('should resume without stamping when lock exists', async () => {
    // Create a partial lock
    const partialLock: ReleaseState = {
      version: '2.17.34595',
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test', 'web'],
    };
    writeLock(tempDir, partialLock);

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 0);
    assert.ok(!commandsRun.includes('stamp'));

    // Should run only remaining stages
    const expectedStages = ['linux', 'windows', 'android-debug', 'android-release', 'symbols', 'collect'];
    assert.deepStrictEqual(commandsRun, expectedStages);

    // Lock should be archived
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);
    const distDir = path.join(tempDir, 'dist', 'rubric-runs');
    assert.ok(fs.existsSync(distDir));
    const archiveFiles = fs.readdirSync(distDir);
    assert.ok(archiveFiles.some(f => f.startsWith('release-state-v2.17.34595')));
  });

  it('should fail on mismatched version lock', async () => {
    const mismatchedLock: ReleaseState = {
      version: '2.17.34594', // Different version
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, mismatchedLock);

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(commandsRun.length, 0);

    // Lock should remain unchanged
    const afterLock = readLock(tempDir);
    assert.strictEqual(afterLock.version, '2.17.34594');
  });

  it('should fail on mismatched sourceHead lock', async () => {
    const mismatchedLock: ReleaseState = {
      version: '2.17.34595',
      sourceHead: 'differentcommit', // Different commit
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, mismatchedLock);

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(commandsRun.length, 0);

    // Lock should remain unchanged
    const afterLock = readLock(tempDir);
    assert.strictEqual(afterLock.sourceHead, 'differentcommit');
  });

  it('should fail on corrupt JSON lock', async () => {
    fs.writeFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), '{invalid json', 'utf-8');

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(commandsRun.length, 0);

    // Corrupt lock should remain byte-identical
    const afterContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');
    assert.strictEqual(afterContent, '{invalid json');
  });

  it('should handle --restart flag', async () => {
    const existingLock: ReleaseState = {
      version: '2.17.34595',
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, existingLock);

    const outboxDir = path.join(tempDir, 'outbox', 'standroidsmissal');
    fs.mkdirSync(outboxDir, { recursive: true });

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
      env: { HOME: tempDir },
    };

    const exitCode = await main(['node', 'test', '--restart'], stubDeps);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(commandsRun.length, 0);

    // Lock should be moved to outbox
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);
    const outboxFiles = fs.readdirSync(outboxDir);
    assert.ok(outboxFiles.some(f => f.startsWith('standroidsmissal-release-state-v')));
  });

  it('should handle --clean-only flag with matching lock', async () => {
    const matchingLock: ReleaseState = {
      version: '2.17.34595',
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, matchingLock);

    const outboxDir = path.join(tempDir, 'outbox', 'standroidsmissal');
    fs.mkdirSync(outboxDir, { recursive: true });

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
      env: { HOME: tempDir },
    };

    const exitCode = await main(['node', 'test', '--clean-only'], stubDeps);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(commandsRun.length, 0);

    // Lock should be moved to outbox
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);
    const outboxFiles = fs.readdirSync(outboxDir);
    assert.ok(outboxFiles.some(f => f.startsWith('standroidsmissal-release-state-v')));
  });

  it('should fail --clean-only with mismatched lock', async () => {
    const mismatchedLock: ReleaseState = {
      version: '2.17.34594', // Mismatched
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, mismatchedLock);

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
      env: { HOME: tempDir },
    };

    const exitCode = await main(['node', 'test', '--clean-only'], stubDeps);
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(commandsRun.length, 0);

    // Lock should remain unchanged
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), true);
  });

  it('should exit 0 when all stages already completed', async () => {
    const completedLock: ReleaseState = {
      version: '2.17.34595',
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: [...CANONICAL_STAGE_ORDER],
    };
    writeLock(tempDir, completedLock);

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(commandsRun.length, 0);
  });

  it('should propagate non-zero exit code from stage failure', async () => {
    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        if (name === 'linux') {
          return 1; // Simulate failure
        }
        return 0;
      },
      fixtureDir: tempDir,
    };

    await assert.rejects(
      async () => await main(['node', 'test'], stubDeps),
      /Stage linux failed with exit code 1/
    );

    // Should stop at failed stage
    assert.ok(commandsRun.includes('test'));
    assert.ok(commandsRun.includes('web'));
    assert.ok(commandsRun.includes('linux'));
    assert.ok(!commandsRun.includes('windows'));
  });
});

describe('Integration tests: Real CLI spawning', () => {
  let tempDir: string;
  let cleanup: () => void;

  beforeEach(() => {
    const t = createTempDir();
    tempDir = t.dir;
    cleanup = t.cleanup;

    // Create a mock environment
    setupMockGit(tempDir, 'abc123def456');
    setupVersion(tempDir, '2.17.34595');
  });

  afterEach(() => {
    cleanup();
  });

  describe('--help flag', () => {
    it('should print usage and exit 0', async () => {
      const result = await spawnCli(['--help'], {}, ROOT);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Usage:'));
      assert.ok(result.stdout.includes('Release stages'));
      assert.ok(result.stdout.includes('--help'));
    });

    it('-h should be an alias for --help', async () => {
      const result = await spawnCli(['-h'], {}, ROOT);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Usage:'));
    });

    it('should not read/write any files when --help is used', async () => {
      const initialVersion = fs.readFileSync(path.join(tempDir, 'version.txt'), 'utf-8');

      const result = await spawnCli(['--help'], {}, tempDir);

      assert.strictEqual(result.code, 0);
      const afterVersion = fs.readFileSync(path.join(tempDir, 'version.txt'), 'utf-8');
      assert.strictEqual(initialVersion, afterVersion);
      assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);
    });
  });

  describe('Hermetic stub mode with RELEASE_STATE_RUNNER=stub', () => {
    it('should log stamp and stages to standroidsmissal-release-stage-events.log on fresh release', async () => {
      const result = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Starting fresh release'));

      const logContent = readRunCommandLog(tempDir);
      const loggedCommands = logContent.trim().split('\n').filter(l => l);

      // Should have stamp + all stages
      assert.ok(loggedCommands.includes('stamp'));
      for (const stage of CANONICAL_STAGE_ORDER) {
        assert.ok(loggedCommands.includes(stage), `Stage ${stage} should be logged`);
      }

      // Stamp should appear exactly once
      const stampCount = loggedCommands.filter(c => c === 'stamp').length;
      assert.strictEqual(stampCount, 1);
    });

    it('should resume without stamp when lock exists', async () => {
      // Create partial lock
      const partialLock: ReleaseState = {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web'],
      };
      writeLock(tempDir, partialLock);

      const result = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Resuming release'));

      const logContent = readRunCommandLog(tempDir);
      const loggedCommands = logContent.trim().split('\n').filter(l => l);

      // Should NOT have stamp
      assert.ok(!loggedCommands.includes('stamp'));

      // Should have only remaining stages
      const expectedStages = ['linux', 'windows', 'android-debug', 'android-release', 'symbols', 'collect'];
      assert.deepStrictEqual(loggedCommands, expectedStages);
    });

    it('should handle --restart in stub mode', async () => {
      const existingLock: ReleaseState = {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test'],
      };
      writeLock(tempDir, existingLock);

      const outboxDir = path.join(tempDir, 'outbox', 'standroidsmissal');
      fs.mkdirSync(outboxDir, { recursive: true });

      const result = await spawnCli(['--restart'], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);

      // Lock should be moved
      assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);
      const outboxFiles = fs.readdirSync(outboxDir);
      assert.ok(outboxFiles.some(f => f.startsWith('standroidsmissal-release-state-v')));

      // No commands should be logged
      const logContent = readRunCommandLog(tempDir);
      assert.strictEqual(logContent.trim(), '');
    });

    it('should preserve corrupt lock byte-identically in stub mode', async () => {
      const corruptContent = '{invalid json';
      fs.writeFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), corruptContent, 'utf-8');

      const result = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Lock mismatch or corruption detected'));

      // Corrupt lock should remain byte-identical
      const afterContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');
      assert.strictEqual(afterContent, corruptContent);
    });

    it('should preserve mismatched lock byte-identically in stub mode', async () => {
      const mismatchedLock: ReleaseState = {
        version: '2.17.34594', // Wrong version
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test'],
      };
      writeLock(tempDir, mismatchedLock);
      const originalContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');

      const result = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Lock mismatch or corruption detected'));

      // Mismatched lock should remain byte-identical
      const afterContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');
      assert.strictEqual(afterContent, originalContent);
    });
  });

  describe('BT.2R3 controlled interrupt/resume (two real CLI spawns)', () => {
    it('two real CLI spawns prove controlled interrupt then resume (one stamp, each stage once)', async () => {
      const env = {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        RELEASE_STATE_INTERRUPT_AT: 'linux',
      };

      // Call 1: fresh release, interrupted at linux
      const r1 = await spawnCli([], env, tempDir);

      // Should exit nonzero (interrupted)
      assert.notStrictEqual(r1.code, 0);

      // Lock should show partial completion (test, web only)
      const lock1 = readLock(tempDir);
      assert.deepStrictEqual(lock1.completedStages, ['test', 'web']);

      // Receipt should exist with target='linux'
      assert.ok(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json')));
      const receipt1 = JSON.parse(fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), 'utf-8'));
      assert.strictEqual(receipt1.target, 'linux');
      assert.strictEqual(receipt1.consumed, true);

      // Call 2: resume from same env, same fixture/lock/receipt
      const receiptBeforeBytes = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), 'utf-8');
      const r2 = await spawnCli([], env, tempDir);

      // Should exit 0 (resume succeeded)
      assert.strictEqual(r2.code, 0);

      // Receipt bytes unchanged by call 2
      const receiptAfterBytes = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), 'utf-8');
      assert.strictEqual(receiptAfterBytes, receiptBeforeBytes);

      // After both spawns: log should show stamp once, each stage once, in order
      const loggedCommands = readRunCommandLog(tempDir).trim().split('\n').filter(l => l);
      assert.deepStrictEqual(loggedCommands, ['stamp', 'test', 'web', 'linux', 'windows', 'android-debug', 'android-release', 'symbols', 'collect']);

      // Stamp appears exactly once
      assert.strictEqual(loggedCommands.filter(c => c === 'stamp').length, 1);
    });

    it('corrupt interrupt receipt fails closed without mutating the lock', async () => {
      // Seed lock with test,web completed (linux is first pending)
      writeLock(tempDir, {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web'],
      });

      // Write corrupt receipt
      fs.writeFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), '{invalid json', 'utf-8');

      // Record lock bytes before spawn
      const lockBefore = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');

      // Spawn with interrupt at linux
      const r = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        RELEASE_STATE_INTERRUPT_AT: 'linux',
      }, tempDir);

      // Should exit nonzero
      assert.notStrictEqual(r.code, 0);

      // Lock byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8'), lockBefore);

      // Receipt byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), 'utf-8'), '{invalid json');
    });

    it('mismatched interrupt receipt fails closed without mutating the lock', async () => {
      // Seed lock with test,web completed (linux is first pending)
      writeLock(tempDir, {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web'],
      });

      // Write structurally valid but mismatched receipt (target='windows' not 'linux')
      fs.writeFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), JSON.stringify({
        target: 'windows',
        consumed: true,
        writtenAt: '2026-07-15T00:00:00.000Z',
      }), 'utf-8');

      // Record lock and receipt bytes before spawn
      const lockBefore = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');
      const receiptBefore = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), 'utf-8');

      // Spawn with interrupt at linux
      const r = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        RELEASE_STATE_INTERRUPT_AT: 'linux',
      }, tempDir);

      // Should exit nonzero
      assert.notStrictEqual(r.code, 0);

      // Lock byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8'), lockBefore);

      // Receipt byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-interrupt-receipt.json'), 'utf-8'), receiptBefore);
    });
  });

  describe('--restart flag with real CLI', () => {
    it('should move existing lock to outbox and exit 0', async () => {
      const lock: ReleaseState = {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web'],
      };
      writeLock(tempDir, lock);

      const outboxDir = path.join(tempDir, 'outbox', 'standroidsmissal');
      fs.mkdirSync(outboxDir, { recursive: true });

      const result = await spawnCli(['--restart'], {
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Moved old lock') || result.stdout.includes('ℹ️'));

      // Lock should be removed from root
      assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);

      // Lock should be in outbox
      const outboxFiles = fs.readdirSync(outboxDir);
      assert.ok(outboxFiles.some(f => f.startsWith('standroidsmissal-release-state-v')));
    });

    it('should exit 0 when no lock file exists', async () => {
      const result = await spawnCli(['--restart'], {}, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('No lock file found'));
    });
  });

  describe('--clean-only flag with real CLI', () => {
    it('should move matching lock to outbox and exit 0', async () => {
      const lock: ReleaseState = {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web'],
      };
      writeLock(tempDir, lock);

      const outboxDir = path.join(tempDir, 'outbox', 'standroidsmissal');
      fs.mkdirSync(outboxDir, { recursive: true });

      const result = await spawnCli(['--clean-only'], {
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Moved lock'));

      assert.strictEqual(fs.existsSync(path.join(tempDir, 'standroidsmissal-release-state.json')), false);
      const outboxFiles = fs.readdirSync(outboxDir);
      assert.ok(outboxFiles.some(f => f.startsWith('standroidsmissal-release-state-v')));
    });

    it('should fail closed when version mismatches', async () => {
      const lock: ReleaseState = {
        version: '2.17.34594', // Different version
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test'],
      };
      writeLock(tempDir, lock);

      const result = await spawnCli(['--clean-only'], {
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Lock mismatch or corruption detected'));
    });

    it('should fail closed when sourceHead mismatches', async () => {
      const lock: ReleaseState = {
        version: '2.17.34595',
        sourceHead: 'def456', // Different commit
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test'],
      };
      writeLock(tempDir, lock);

      const result = await spawnCli(['--clean-only'], {
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Lock mismatch or corruption detected'));
    });
  });
});

describe('Byte-identical nonmutation tests', () => {
  let tempDir: string;
  let cleanup: () => void;

  beforeEach(() => {
    const t = createTempDir();
    tempDir = t.dir;
    cleanup = t.cleanup;

    setupMockGit(tempDir, 'abc123def456');
    setupVersion(tempDir, '2.17.34595');
  });

  afterEach(() => {
    cleanup();
  });

  it('should preserve corrupt lock byte-identically after failure', async () => {
    const corruptContent = '{invalid json';
    fs.writeFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), corruptContent, 'utf-8');

    const stubDeps: ReleaseDeps = {
      runCommand: async (_name: string) => 0,
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);

    const afterContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');
    assert.strictEqual(afterContent, corruptContent);
  });

  it('should preserve version-mismatched lock byte-identically after failure', async () => {
    const mismatchedLock: ReleaseState = {
      version: '2.17.34594', // Wrong version
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, mismatchedLock);
    const originalContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');

    const stubDeps: ReleaseDeps = {
      runCommand: async (_name: string) => 0,
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);

    const afterContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');
    assert.strictEqual(afterContent, originalContent);
  });

  it('should preserve sourceHead-mismatched lock byte-identically after failure', async () => {
    const mismatchedLock: ReleaseState = {
      version: '2.17.34595',
      sourceHead: 'differentcommit', // Wrong commit
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, mismatchedLock);
    const originalContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');

    const stubDeps: ReleaseDeps = {
      runCommand: async (_name: string) => 0,
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);

    const afterContent = fs.readFileSync(path.join(tempDir, 'standroidsmissal-release-state.json'), 'utf-8');
    assert.strictEqual(afterContent, originalContent);
  });
});
