#!/usr/bin/env node
// modules-deploy (ubuntu only) — upload content modules and runtime-asset files to the runtime host.
// DOCS/ARCHITECTURE/L-release-20261106.md §2.14 (host layout, transport keys) and BA.9 cross-partial
// resolutions 2–3: module files and model objects are immutable (scp to `<path>.partial-<sha12>`, then
// `ssh mv -n`); `models/manifest.json` and `modules/modules.json` are the only mutable files and go last;
// CORS (`access-control-allow-origin: *`) is required on modules.json (L-content §3.2 duties).
// Transport is OpenSSH + HTTPS GET (no DOCS/sdk snapshot; n/a per L-release §4).
//
// Exit 0 deployed/already mirrored · 1 failure (never overwrites differing bytes) · 2 pending (OP.8).

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, readJson, runtimeAssetRows, sha256, vendoredModule } from './release-stage-outputs.mjs';

const PREFIX = 'https://sanctissimissa.robin.mba/runtime/';
const ssh = process.env.SANCTISSIMISSA_RUNTIME_SSH;
const root = (process.env.SANCTISSIMISSA_RUNTIME_ROOT || '/var/www/sanctissimissa/runtime').replace(/\/+$/, '');

class DeployError extends Error {}

/** GET a runtime URL; returns {status, sha256, headers} (body hashed while streaming). */
async function probe(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return { status: 404, sha256: null, headers: res.headers };
  if (!res.ok) throw new DeployError(`GET ${url} → HTTP ${res.status}`);
  const hash = createHash('sha256');
  for await (const chunk of res.body) hash.update(chunk);
  return { status: res.status, sha256: hash.digest('hex'), headers: res.headers };
}

function run(cmd, args) {
  console.log(`  $ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.error || r.status !== 0) throw new DeployError(`${cmd} failed (${r.error?.message ?? `exit ${r.status}`})`);
}

const remoteDir = (path) => path.slice(0, path.lastIndexOf('/'));

/** Upload `local` to `<root>/<path>` via a `.partial-<sha12>` name and `mv -n` (immutable). */
function uploadImmutable(local, path, sha) {
  const partial = `${root}/${path}.partial-${sha.slice(0, 12)}`;
  run('ssh', [ssh, 'mkdir', '-p', `${root}/${remoteDir(path)}`]);
  run('scp', ['-q', local, `${ssh}:${partial}`]);
  run('ssh', [ssh, 'mv', '-n', partial, `${root}/${path}`]);
}

/** One immutable object: skip when mirrored, upload when 404, fail when the host holds other bytes. */
async function deployImmutable(local, path, sha) {
  if (!local || !existsSync(local)) throw new DeployError(`local file for ${path} is absent`);
  if (sha256(local) !== sha) throw new DeployError(`local ${local} does not equal its pinned sha256`);
  const url = PREFIX + path;
  const seen = await probe(url);
  if (seen.status !== 404) {
    if (seen.sha256 === sha) return console.log(`already mirrored ${path}`);
    throw new DeployError(`runtime host holds different bytes at ${path}`);
  }
  uploadImmutable(local, path, sha);
  const after = await probe(url);
  if (after.sha256 !== sha) throw new DeployError(`uploaded ${path} does not verify (got ${after.sha256 ?? 'HTTP 404'})`);
  console.log(`✓ mirrored ${path}`);
}

/** A mutable index: replace via partial + `mv -f`, then verify the served bytes. */
async function deployMutable(local, path) {
  const sha = sha256(local);
  const url = PREFIX + path;
  const seen = await probe(url);
  if (seen.sha256 !== sha) {
    const partial = `${root}/${path}.partial-${sha.slice(0, 12)}`;
    run('ssh', [ssh, 'mkdir', '-p', `${root}/${remoteDir(path)}`]);
    run('scp', ['-q', local, `${ssh}:${partial}`]);
    run('ssh', [ssh, 'mv', '-f', partial, `${root}/${path}`]);
  }
  const after = await probe(url);
  if (after.sha256 !== sha) throw new DeployError(`${path} does not verify after upload`);
  console.log(`${seen.sha256 === sha ? 'already mirrored' : '✓ published'} ${path}`);
  return after;
}

async function main() {
  if (!ssh) {
    console.log('⏸ modules-deploy pending: SANCTISSIMISSA_RUNTIME_SSH unset (operator item OP.8)');
    return 2;
  }
  const modulesPath = join(ROOT, 'content', 'library', 'modules.json');
  const manifestPath = join(ROOT, 'VENDORED', 'models', 'manifest.json');
  const modules = existsSync(modulesPath) ? readJson(modulesPath).modules ?? [] : [];
  if (!existsSync(modulesPath)) console.log('ℹ no content/library/modules.json — no modules to deploy');
  if (!existsSync(manifestPath)) console.log('ℹ no runtime-asset manifest (VENDORED/models/manifest.json)');
  const rows = runtimeAssetRows(ROOT).filter((r) => r.runtime_path == null);

  // Resolution 3: every non-same-origin row resolves under the runtime prefix, or fail closed.
  for (const r of rows) {
    const expected = `${PREFIX}models/sha256/${r.sha256}/${r.fileName}`;
    if (typeof r.mirror_url !== 'string' || !r.mirror_url.startsWith(PREFIX)) {
      console.error(`✖ mirror_url outside runtime prefix: ${r.id}`);
      return 1;
    }
    if (r.mirror_url !== expected) {
      console.error(`✖ mirror_url of ${r.id} is not the §2.14 layout models/sha256/<sha256>/<fileName>`);
      return 1;
    }
  }
  for (const m of modules) {
    const local = vendoredModule(ROOT, m) ?? join(ROOT, 'build', 'modules', m.file);
    await deployImmutable(local, `modules/${m.file}`, m.sha256);
  }
  for (const r of rows) {
    await deployImmutable(join(ROOT, 'VENDORED', 'models', 'sha256', r.sha256, r.fileName),
      `models/sha256/${r.sha256}/${r.fileName}`, r.sha256);
  }
  // Last: the two mutable indexes, so no index names bytes that are not yet served.
  if (existsSync(manifestPath)) await deployMutable(manifestPath, 'models/manifest.json');
  if (existsSync(modulesPath)) {
    const served = await deployMutable(modulesPath, 'modules/modules.json');
    if (served.headers.get('access-control-allow-origin') !== '*') {
      console.error('✖ runtime/modules/modules.json lacks access-control-allow-origin: * (nginx /runtime/ block, OP.8)');
      return 1;
    }
  }
  return 0;
}

main().then((code) => process.exit(code), (err) => {
  console.error(`✖ modules-deploy: ${err.message}`);
  process.exit(1);
});
