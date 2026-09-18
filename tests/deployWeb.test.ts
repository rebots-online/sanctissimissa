/**
 * Hermetic tests for scripts/deploy-web.mjs (REL.1 — Automatic Surge web
 * publication, operator 2026-09-18).
 *
 * The real Surge CLI is never invoked: DEPLOY_SURGE_BIN points at a stub
 * script that records its argv. RELEASE_ROOT redirects the web output root
 * to a temp directory, exactly like the release-state fixtures.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'deploy-web.mjs');
const DOMAIN = 'sanctissimissa.surge.sh';

interface DeployResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runDeploy(root: string, envOverrides: Record<string, string> = {}): DeployResult {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, RELEASE_ROOT: root, ...envOverrides },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

// An executable stub that records argv (one arg per line) then exits with EXIT.
function makeStubSurge(dir: string, exitCode = 0): { bin: string; argsFile: string } {
  const bin = path.join(dir, 'stub-surge.sh');
  const argsFile = path.join(dir, 'surge-args.txt');
  fs.writeFileSync(bin, `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > '${argsFile}'\nexit ${exitCode}\n`);
  fs.chmodSync(bin, 0o755);
  return { bin, argsFile };
}

describe('deploy-web.mjs (REL.1 hermetic)', () => {
  let tempDir: string;
  let cleanup: () => void;

  beforeEach(() => {
    tempDir = path.join(__dirname, '.tmp', `deploy-web-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(tempDir, 'dist-web'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'dist-web', 'index.html'), '<!doctype html><title>built</title>');
    cleanup = () => fs.rmSync(tempDir, { recursive: true, force: true });
  });

  afterEach(() => cleanup());

  it('refuses to publish without completed web output', () => {
    fs.rmSync(path.join(tempDir, 'dist-web', 'index.html'));
    const r = runDeploy(tempDir, { DEPLOY_SURGE_BIN: makeStubSurge(tempDir).bin });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /No completed web output/);
    assert.match(r.stderr, /build:vite/);
  });

  it('creates the SPA fallback 200.html and invokes the pinned CLI with explicit project/domain', () => {
    const { bin, argsFile } = makeStubSurge(tempDir);
    const r = runDeploy(tempDir, { DEPLOY_SURGE_BIN: bin });
    assert.strictEqual(r.status, 0);

    const fallback = fs.readFileSync(path.join(tempDir, 'dist-web', '200.html'), 'utf8');
    assert.strictEqual(fallback, fs.readFileSync(path.join(tempDir, 'dist-web', 'index.html'), 'utf8'));

    const args = fs.readFileSync(argsFile, 'utf8').trim().split('\n');
    assert.deepStrictEqual(args, ['--project', path.resolve(tempDir, 'dist-web'), '--domain', DOMAIN]);
  });

  it('propagates publication failure nonzero so the release stage stays retryable', () => {
    const { bin } = makeStubSurge(tempDir, 3);
    const r = runDeploy(tempDir, { DEPLOY_SURGE_BIN: bin });
    assert.strictEqual(r.status, 3);
    assert.match(r.stderr, /Surge publication failed/);
    assert.match(r.stderr, /remains incomplete/);
  });

  it('fails closed when the pinned project-local Surge CLI is absent', () => {
    // RELEASE_ROOT has no node_modules/.bin/surges; no DEPLOY_SURGE_BIN override
    const r = runDeploy(tempDir);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /Pinned Surge CLI not found/);
  });
});
