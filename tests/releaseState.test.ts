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
import { createHash } from 'node:crypto';

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
  PENDING_RELEASE_EXIT_CODE,
  stageRunsOnHost,
} from '../scripts/release-state.mjs';

// Type for spawn result
interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

// Canonical stage order for verification
// The Windows installer stages sit immediately after the standalone PE: the
// MSI and MSIX are part of the release, not produced out of band (BUGS #7).
// web-deploy publishes the completed web output immediately after the web
// build, before native packaging (REL.1, operator 2026-09-18).
const CANONICAL_STAGE_ORDER = ['test', 'web', 'web-deploy', 'linux', 'windows', 'windows-msi', 'windows-msix', 'android-release', 'symbols', 'collect'];

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

// Helper: write sanctissimissa-release-state.json
function writeLock(root: string, lock: ReleaseState): void {
  fs.writeFileSync(
    path.join(root, 'sanctissimissa-release-state.json'),
    JSON.stringify(lock, null, 2),
    'utf-8'
  );
}

// Helper: read sanctissimissa-release-state.json
function readLock(root: string): ReleaseState {
  const content = fs.readFileSync(path.join(root, 'sanctissimissa-release-state.json'), 'utf-8');
  return JSON.parse(content);
}

// Helper: read sanctissimissa-release-stage-events.log from fixture dir
function readRunCommandLog(fixtureDir: string): string {
  const logPath = path.join(fixtureDir, 'sanctissimissa-release-stage-events.log');
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
    const result = expandHomePath('~/outbox/sanctissimissa', home);
    assert.strictEqual(result, '/home/testuser/outbox/sanctissimissa');
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

  it('should have 10 stages total (android-debug removed 2026-09-16; web-deploy added 2026-09-18)', () => {
    assert.strictEqual(STAGE_ORDER.length, 10);
  });

  it('places web-deploy immediately after web and before native packaging (REL.1)', () => {
    assert.strictEqual(STAGE_ORDER.indexOf('web-deploy'), STAGE_ORDER.indexOf('web') + 1);
    assert.ok(STAGE_ORDER.indexOf('web-deploy') < STAGE_ORDER.indexOf('linux'));
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

    // Terminal lock remains in root and has an archive copy
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);

    // Archived lock should exist in dist/rubric-runs
    const distDir = path.join(tempDir, 'dist', 'rubric-runs');
    assert.ok(fs.existsSync(distDir));
    const archiveFiles = fs.readdirSync(distDir);
    const archiveFile = archiveFiles.find(f => f.startsWith('sanctissimissa-v2.17.34595-release-state'));
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
    const expectedStages = ['web-deploy', 'linux', 'windows', 'windows-msi', 'windows-msix', 'android-release', 'symbols', 'collect'];
    assert.deepStrictEqual(commandsRun, expectedStages);

    // Lock should be archived
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);
    const distDir = path.join(tempDir, 'dist', 'rubric-runs');
    assert.ok(fs.existsSync(distDir));
    const archiveFiles = fs.readdirSync(distDir);
    assert.ok(archiveFiles.some(f => f.startsWith('sanctissimissa-v2.17.34595-release-state')));
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
    fs.writeFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), '{invalid json', 'utf-8');

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
    const afterContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');
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

    const outboxDir = path.join(tempDir, 'outbox', 'sanctissimissa');
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
    assert.deepStrictEqual(commandsRun, ['stamp', ...CANONICAL_STAGE_ORDER]);

    // Previous lock is preserved in outbox; active state remains
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);
    const outboxFiles = fs.readdirSync(outboxDir);
    assert.ok(outboxFiles.some(f => f.startsWith('sanctissimissa-v')));
  });

  it('should handle --clean-only flag with matching lock', async () => {
    const matchingLock: ReleaseState = {
      version: '2.17.34595',
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test'],
    };
    writeLock(tempDir, matchingLock);

    const outboxDir = path.join(tempDir, 'outbox', 'sanctissimissa');
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

    // Previous lock is preserved in outbox; active state remains
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);
    const outboxFiles = fs.readdirSync(outboxDir);
    assert.ok(outboxFiles.some(f => f.startsWith('sanctissimissa-v')));
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
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);
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

  it('keeps web-deploy incomplete on publication failure and retries it without a second stamp (REL.1)', async () => {
    const failDeploy: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        if (name === 'web-deploy') return 1; // publication failed
        return 0;
      },
      fixtureDir: tempDir,
    };

    await assert.rejects(
      async () => await main(['node', 'test'], failDeploy),
      /Stage web-deploy failed with exit code 1/
    );

    // web and everything before it completed; web-deploy did NOT
    const lockAfterFailure = readLock(tempDir);
    assert.deepStrictEqual(lockAfterFailure.completedStages, ['test', 'web']);

    // Resume under the same version: deploy retried first, no new stamp
    const retried: string[] = [];
    const passDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        retried.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };
    assert.strictEqual(await main(['node', 'test'], passDeps), 0);
    assert.strictEqual(retried[0], 'web-deploy');
    assert.ok(!retried.includes('stamp'));
    assert.strictEqual(retried.filter(c => c === 'web-deploy').length, 1);
    assert.deepStrictEqual(readLock(tempDir).completedStages, CANONICAL_STAGE_ORDER);
  });

  it('skips a completed web-deploy on later resumes (REL.1)', async () => {
    writeLock(tempDir, {
      version: '2.17.34595',
      sourceHead: 'abc123def456',
      startedAt: '2026-07-15T00:00:00.000Z',
      completedStages: ['test', 'web', 'web-deploy'],
    });

    const stubDeps: ReleaseDeps = {
      runCommand: async (name: string) => {
        commandsRun.push(name);
        return 0;
      },
      fixtureDir: tempDir,
    };

    assert.strictEqual(await main(['node', 'test'], stubDeps), 0);
    assert.ok(!commandsRun.includes('web-deploy'));
    assert.strictEqual(commandsRun[0], 'linux');
    assert.ok(!commandsRun.includes('stamp'));
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
      assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), false);
    });
  });

  describe('Hermetic stub mode with RELEASE_STATE_RUNNER=stub', () => {
    it('should log stamp and stages to sanctissimissa-release-stage-events.log on fresh release', async () => {
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
      const expectedStages = ['web-deploy', 'linux', 'windows', 'windows-msi', 'windows-msix', 'android-release', 'symbols', 'collect'];
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

      const outboxDir = path.join(tempDir, 'outbox', 'sanctissimissa');
      fs.mkdirSync(outboxDir, { recursive: true });

      const result = await spawnCli(['--restart'], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);

      // Active lock remains after the copy
      assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);
      const outboxFiles = fs.readdirSync(outboxDir);
      assert.ok(outboxFiles.some(f => f.startsWith('sanctissimissa-v')));

      // Restart runs a new complete release in this same invocation.
      const logContent = readRunCommandLog(tempDir);
      assert.deepStrictEqual(logContent.trim().split('\n'), ['stamp', ...CANONICAL_STAGE_ORDER]);
    });

    it('should preserve corrupt lock byte-identically in stub mode', async () => {
      const corruptContent = '{invalid json';
      fs.writeFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), corruptContent, 'utf-8');

      const result = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Lock mismatch or corruption detected'));

      // Corrupt lock should remain byte-identical
      const afterContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');
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
      const originalContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');

      const result = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Lock mismatch or corruption detected'));

      // Mismatched lock should remain byte-identical
      const afterContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');
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

      // Lock should show partial completion (test, web, web-deploy; linux interrupted)
      const lock1 = readLock(tempDir);
      assert.deepStrictEqual(lock1.completedStages, ['test', 'web', 'web-deploy']);

      // Receipt should exist with target='linux'
      assert.ok(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json')));
      const receipt1 = JSON.parse(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), 'utf-8'));
      assert.strictEqual(receipt1.target, 'linux');
      assert.strictEqual(receipt1.consumed, true);

      // Call 2: resume from same env, same fixture/lock/receipt
      const receiptBeforeBytes = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), 'utf-8');
      const r2 = await spawnCli([], env, tempDir);

      // Should exit 0 (resume succeeded)
      assert.strictEqual(r2.code, 0);

      // Receipt bytes unchanged by call 2
      const receiptAfterBytes = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), 'utf-8');
      assert.strictEqual(receiptAfterBytes, receiptBeforeBytes);

      // After both spawns: log should show stamp once, each stage once, in order
      const loggedCommands = readRunCommandLog(tempDir).trim().split('\n').filter(l => l);
      assert.deepStrictEqual(loggedCommands, ['stamp', 'test', 'web', 'web-deploy', 'linux', 'windows', 'windows-msi', 'windows-msix', 'android-release', 'symbols', 'collect']);

      // Stamp appears exactly once
      assert.strictEqual(loggedCommands.filter(c => c === 'stamp').length, 1);
    });

    it('corrupt interrupt receipt fails closed without mutating the lock', async () => {
      // Seed lock with test,web,web-deploy completed (linux is first pending)
      writeLock(tempDir, {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web', 'web-deploy'],
      });

      // Write corrupt receipt
      fs.writeFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), '{invalid json', 'utf-8');

      // Record lock bytes before spawn
      const lockBefore = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');

      // Spawn with interrupt at linux
      const r = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        RELEASE_STATE_INTERRUPT_AT: 'linux',
      }, tempDir);

      // Should exit nonzero
      assert.notStrictEqual(r.code, 0);

      // Lock byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8'), lockBefore);

      // Receipt byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), 'utf-8'), '{invalid json');
    });

    it('mismatched interrupt receipt fails closed without mutating the lock', async () => {
      // Seed lock with test,web,web-deploy completed (linux is first pending)
      writeLock(tempDir, {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web', 'web-deploy'],
      });

      // Write structurally valid but mismatched receipt (target='windows' not 'linux')
      fs.writeFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), JSON.stringify({
        target: 'windows',
        consumed: true,
        writtenAt: '2026-07-15T00:00:00.000Z',
      }), 'utf-8');

      // Record lock and receipt bytes before spawn
      const lockBefore = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');
      const receiptBefore = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), 'utf-8');

      // Spawn with interrupt at linux
      const r = await spawnCli([], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        RELEASE_STATE_INTERRUPT_AT: 'linux',
      }, tempDir);

      // Should exit nonzero
      assert.notStrictEqual(r.code, 0);

      // Lock byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8'), lockBefore);

      // Receipt byte-identical (no mutation)
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-interrupt-receipt.json'), 'utf-8'), receiptBefore);
    });
  });

  describe('--restart flag with real CLI', () => {
    it('should copy existing lock, start fresh and complete in one invocation', async () => {
      const lock: ReleaseState = {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web'],
      };
      writeLock(tempDir, lock);

      const outboxDir = path.join(tempDir, 'outbox', 'sanctissimissa');
      fs.mkdirSync(outboxDir, { recursive: true });

      const result = await spawnCli(['--restart'], {
        RELEASE_STATE_RUNNER: 'stub',
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Copied old lock') || result.stdout.includes('ℹ️'));

      // Terminal lock should remain in root
      assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);

      // Lock should be in outbox
      const outboxFiles = fs.readdirSync(outboxDir);
      assert.ok(outboxFiles.some(f => f.startsWith('sanctissimissa-v')));
    });

    it('should exit 0 when no lock file exists', async () => {
      const result = await spawnCli(['--restart'], { RELEASE_STATE_RUNNER: 'stub', RELEASE_STATE_FIXTURE: tempDir }, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Starting fresh release'));
    });
  });

  describe('--clean-only flag with real CLI', () => {
    it('should copy matching lock to outbox and keep it active', async () => {
      const lock: ReleaseState = {
        version: '2.17.34595',
        sourceHead: 'abc123def456',
        startedAt: '2026-07-15T00:00:00.000Z',
        completedStages: ['test', 'web'],
      };
      writeLock(tempDir, lock);

      const outboxDir = path.join(tempDir, 'outbox', 'sanctissimissa');
      fs.mkdirSync(outboxDir, { recursive: true });

      const result = await spawnCli(['--clean-only'], {
        RELEASE_STATE_FIXTURE: tempDir,
        HOME: tempDir,
      }, tempDir);

      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Copied lock'));

      assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), true);
      const outboxFiles = fs.readdirSync(outboxDir);
      assert.ok(outboxFiles.some(f => f.startsWith('sanctissimissa-v')));
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
    fs.writeFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), corruptContent, 'utf-8');

    const stubDeps: ReleaseDeps = {
      runCommand: async (_name: string) => 0,
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);

    const afterContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');
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
    const originalContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');

    const stubDeps: ReleaseDeps = {
      runCommand: async (_name: string) => 0,
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);

    const afterContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');
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
    const originalContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');

    const stubDeps: ReleaseDeps = {
      runCommand: async (_name: string) => 0,
      fixtureDir: tempDir,
    };

    const exitCode = await main(['node', 'test'], stubDeps);
    assert.strictEqual(exitCode, 1);

    const afterContent = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf-8');
    assert.strictEqual(afterContent, originalContent);
  });
});

describe('RP.1 shared release across build hosts', () => {
  let tempDir: string;
  let cleanup: () => void;
  const commands: string[] = [];
  const runner = async (name: string) => { commands.push(name); return 0; };

  beforeEach(() => {
    const t = createTempDir();
    tempDir = t.dir;
    cleanup = t.cleanup;
    commands.length = 0;
    setupMockGit(tempDir, 'abc123def456');
    setupVersion(tempDir, '2.17.34595');
  });

  afterEach(() => cleanup());

  it('uses one stamp through Linux, Windows, then Linux collection', async () => {
    const deps = { fixtureDir: tempDir, runCommand: runner };
    assert.strictEqual(await main(['node', 'test'], { ...deps, platform: 'linux' }), PENDING_RELEASE_EXIT_CODE);
    assert.deepStrictEqual(commands, ['stamp', 'test', 'web', 'web-deploy', 'linux', 'windows', 'android-release', 'symbols']);
    const linuxState = readLock(tempDir);
    assert.deepStrictEqual(linuxState.completedStages, commands.slice(1));
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'dist', 'rubric-runs')), false);

    assert.strictEqual(await main(['node', 'test', '--resume-only'], { ...deps, platform: 'win32' }), 2);
    assert.deepStrictEqual(commands.slice(8), ['windows-msi', 'windows-msix']);
    assert.strictEqual(readLock(tempDir).completedStages.includes('collect'), false);
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'dist', 'rubric-runs')), false);
    assert.strictEqual(await main(['node', 'test', '--resume-only'], { ...deps, platform: 'linux' }), 0);
    assert.deepStrictEqual(commands.slice(10), ['collect']);
    assert.strictEqual(commands.filter(name => name === 'stamp').length, 1);
    assert.strictEqual(readLock(tempDir).version, linuxState.version);
    assert.strictEqual(readLock(tempDir).sourceHead, linuxState.sourceHead);
    const completedBytes = fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'));
    const count = commands.length;
    assert.strictEqual(await main(['node', 'test', '--resume-only'], { ...deps, platform: 'win32' }), 0);
    assert.strictEqual(commands.length, count);
    assert.ok(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json')).equals(completedBytes));
  });

  it('can start on Windows and defer Linux targets until a same-version Linux continuation', async () => {
    const deps = { fixtureDir: tempDir, runCommand: runner };
    assert.strictEqual(await main(['node', 'test'], { ...deps, platform: 'win32' }), 2);
    assert.deepStrictEqual(commands, ['stamp', 'test', 'web', 'web-deploy', 'windows-msi', 'windows-msix']);
    assert.strictEqual(await main(['node', 'test', '--resume-only'], { ...deps, platform: 'linux' }), 0);
    assert.deepStrictEqual(commands.slice(6), ['linux', 'windows', 'android-release', 'symbols', 'collect']);
  });

  it('never stamps or writes state when resume-only has no existing state', async () => {
    assert.strictEqual(await main(['node', 'test', '--resume-only'], { fixtureDir: tempDir, runCommand: runner }), 1);
    assert.deepStrictEqual(commands, []);
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), false);
  });

  it('persists an interrupted stamp and rejects ordinary/resume-only retries without stamping again', async () => {
    const interruptedRunner = async (name: string) => {
      commands.push(name);
      assert.strictEqual(name, 'stamp');
      // The durable predecessor must exist before the stamper can mutate anything.
      assert.strictEqual(readLock(tempDir).stampPending, true);
      setupVersion(tempDir, '2.18.34596');
      return 9;
    };
    await assert.rejects(main(['node', 'test'], { fixtureDir: tempDir, runCommand: interruptedRunner }), /Stamp failed with exit code 9/);
    const statePath = path.join(tempDir, 'sanctissimissa-release-state.json');
    const failedState = fs.readFileSync(statePath);
    assert.strictEqual(readLock(tempDir).version, '2.17.34595');
    assert.deepStrictEqual(readLock(tempDir).completedStages, []);
    for (const args of [[], ['--resume-only']]) {
      assert.strictEqual(await main(['node', 'test', ...args], { fixtureDir: tempDir, runCommand: runner }), 1);
      assert.ok(fs.readFileSync(statePath).equals(failedState));
    }
    assert.deepStrictEqual(commands, ['stamp']);

    assert.strictEqual(await main(['node', 'test', '--restart'], { fixtureDir: tempDir, runCommand: runner }), 0);
    assert.strictEqual(commands.filter(name => name === 'stamp').length, 2);
    assert.strictEqual(readLock(tempDir).stampPending, undefined);
    const outbox = path.join(tempDir, 'outbox', 'sanctissimissa');
    const archived = fs.readdirSync(outbox).find(name => name.includes('release-state-restarted'));
    assert.ok(archived);
    assert.ok(fs.readFileSync(path.join(outbox, archived)).equals(failedState));
  });

  it('fails closed on structurally invalid state instead of silently starting fresh', async () => {
    for (const invalid of ['null', '{}', '{"version":"2.17.34595"}', JSON.stringify({
      version: '2.17.34595', sourceHead: 'abc123def456', startedAt: '2026-09-13T00:00:00Z', completedStages: ['collect'],
    })]) {
      fs.writeFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), invalid);
      assert.strictEqual(await main(['node', 'test'], { fixtureDir: tempDir, runCommand: runner }), 1);
      assert.strictEqual(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), 'utf8'), invalid);
    }
    assert.deepStrictEqual(commands, []);
  });

  it('restart preserves corrupt state byte-for-byte and runs a fresh stamp immediately', async () => {
    const bytes = '{invalid old state';
    fs.writeFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'), bytes);
    assert.strictEqual(await main(['node', 'test', '--restart'], { fixtureDir: tempDir, runCommand: runner }), 0);
    const outbox = path.join(tempDir, 'outbox', 'sanctissimissa');
    const oldState = fs.readdirSync(outbox).find(name => name.includes('release-state-restarted'));
    assert.ok(oldState);
    assert.strictEqual(fs.readFileSync(path.join(outbox, oldState), 'utf8'), bytes);
    assert.deepStrictEqual(commands, ['stamp', ...CANONICAL_STAGE_ORDER]);
  });

  it('rejects changed corpus or environment inputs before resuming any stage', async () => {
    fs.mkdirSync(path.join(tempDir, 'assets'));
    fs.writeFileSync(path.join(tempDir, 'assets', 'missal.db'), 'frozen corpus');
    const state: ReleaseState = {
      version: '2.17.34595', sourceHead: 'abc123def456', startedAt: '2026-09-13T00:00:00Z', completedStages: ['test'],
      inputHashes: { 'assets/missal.db': createHash('sha256').update('frozen corpus').digest('hex'), '.env': 'absent' },
    };
    writeLock(tempDir, state);
    fs.writeFileSync(path.join(tempDir, 'assets', 'missal.db'), 'changed corpus');
    assert.strictEqual(await main(['node', 'test', '--resume-only'], { fixtureDir: tempDir, runCommand: runner }), 1);
    assert.deepStrictEqual(readLock(tempDir), state);
    fs.writeFileSync(path.join(tempDir, 'assets', 'missal.db'), 'frozen corpus');
    fs.writeFileSync(path.join(tempDir, '.env'), 'CHANGED=true');
    assert.strictEqual(await main(['node', 'test', '--resume-only'], { fixtureDir: tempDir, runCommand: runner }), 1);
    assert.deepStrictEqual(commands, []);
    assert.deepStrictEqual(readLock(tempDir), state);
  });

  it('rejects WSL before stamping', async () => {
    assert.strictEqual(await main(['node', 'test'], {
      fixtureDir: tempDir, runCommand: runner, platform: 'linux', env: { WSL_DISTRO_NAME: 'Ubuntu' },
    }), 1);
    assert.deepStrictEqual(commands, []);
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), false);
  });

  it('rejects an unsupported production host before attempting Git or stamping', async () => {
    assert.strictEqual(await main(['node', 'test'], {
      platform: 'darwin', env: { RELEASE_ROOT: tempDir },
    }), 1);
    assert.strictEqual(fs.readFileSync(path.join(tempDir, 'version.txt'), 'utf8'), '2.17.34595');
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'sanctissimissa-release-state.json')), false);
  });

  it('preserves a previous completed archive before replacing it', async () => {
    const archiveDir = path.join(tempDir, 'dist', 'rubric-runs');
    fs.mkdirSync(archiveDir, { recursive: true });
    const archive = path.join(archiveDir, 'sanctissimissa-v2.17.34595-release-state.json');
    fs.writeFileSync(archive, 'prior archive bytes');
    assert.strictEqual(await main(['node', 'test'], { fixtureDir: tempDir, runCommand: runner }), 0);
    const outbox = path.join(tempDir, 'outbox', 'sanctissimissa');
    const prior = fs.readdirSync(outbox).find(name => name.includes('release-state-before-archive'));
    assert.ok(prior);
    assert.strictEqual(fs.readFileSync(path.join(outbox, prior), 'utf8'), 'prior archive bytes');
    assert.ok(fs.readFileSync(archive).equals(fs.readFileSync(path.join(tempDir, 'sanctissimissa-release-state.json'))));
  });

  it('declares host eligibility without treating unsupported targets as successful', () => {
    assert.strictEqual(stageRunsOnHost('windows-msi', 'linux'), false);
    assert.strictEqual(stageRunsOnHost('windows-msix', 'win32'), true);
    assert.strictEqual(stageRunsOnHost('android-release', 'win32'), false);
    assert.strictEqual(stageRunsOnHost('collect', 'win32'), false);
    assert.strictEqual(stageRunsOnHost('collect', 'linux'), true);
    assert.strictEqual(stageRunsOnHost('test', 'darwin'), false);
    // web-deploy publishes on both native hosts (REL.1 / operator 2026-09-18)
    assert.strictEqual(stageRunsOnHost('web-deploy', 'linux'), true);
    assert.strictEqual(stageRunsOnHost('web-deploy', 'win32'), true);
    assert.strictEqual(stageRunsOnHost('web-deploy', 'darwin'), false);
    assert.strictEqual(stageRunsOnHost('made-up-stage', 'linux'), false);
  });
});
