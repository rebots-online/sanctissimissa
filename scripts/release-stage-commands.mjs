// Release stage commands per build environment — DOCS/ARCHITECTURE/L-release-20261106.md §2.2
// (`STAGE_ENVS` command table) and §2.11 (Linux container for the windows environment).
// `stageCommand` returns the command's exit status; release-state.mjs treats 2 as pending
// (PENDING_RELEASE_EXIT_CODE) and any other non-zero as failure.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { STAGE_ENVS } from './release-matrix.mjs';

const status = (r) => (r.error ? 1 : r.status ?? 1);

/** Run a shell command line with the driver's inherited stdio/env; returns its exit status. */
function sh(line, inherited, extraEnv = {}) {
  console.log(`  $ ${line}`);
  return status(spawnSync(line, { ...inherited, env: { ...inherited.env, ...extraEnv }, shell: true }));
}

/** Run a repo script with this Node binary. */
function node(script, args, inherited) {
  console.log(`  $ node ${script} ${args.join(' ')}`.trimEnd());
  return status(spawnSync(process.execPath, [script, ...args], inherited));
}

/** First non-zero status of a sequence of steps (later steps do not run). */
function sequence(...steps) {
  for (const step of steps) {
    const code = step();
    if (code !== 0) return code;
  }
  return 0;
}

/** §2.11 image tag: first 12 hex of sha256(ci/images/linux-build/Dockerfile). */
export function linuxImage(root) {
  const dockerfile = path.join(root, 'ci', 'images', 'linux-build', 'Dockerfile');
  const tag = createHash('sha256').update(fs.readFileSync(dockerfile)).digest('hex').slice(0, 12);
  return `sanctissimissa-linux-build:${tag}`;
}

/** Build the image locally when `docker image inspect` misses it. No registry, no Forgejo (CC5). */
export function ensureLinuxImage(root, stdio = 'inherit') {
  const image = linuxImage(root);
  if (status(spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' })) === 0) return image;
  console.log(`  ⟳ building ${image} from ci/images/linux-build/Dockerfile`);
  const code = status(spawnSync('docker', ['build', '-t', image, path.join(root, 'ci', 'images', 'linux-build')],
    { cwd: root, stdio }));
  if (code !== 0) throw new Error(`docker build of ${image} failed (exit ${code})`);
  return image;
}

/** §2.11 run command, verbatim shape; the named volume shadows the native node_modules. */
function inContainer(line, inherited, extraEnv = {}) {
  const root = inherited.cwd;
  const image = ensureLinuxImage(root);
  const outbox = path.join(inherited.env.USERPROFILE || inherited.env.HOME || '', 'outbox');
  const envArgs = Object.entries({ SAM_RELEASE_ENV: 'windows', ...extraEnv }).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
  const args = ['run', '--rm', '-v', `${root}:/src`, '-v', 'sanctissimissa-linux-node-modules:/src/node_modules',
    '-v', `${outbox}:/root/outbox`, ...envArgs, '-w', '/src', image, 'bash', '-lc', `npm ci && ${line}`];
  console.log(`  $ docker ${args.join(' ')}`);
  return status(spawnSync('docker', args, { ...inherited, shell: false }));
}

const exists = (inherited, rel) => fs.existsSync(path.join(inherited.cwd, rel));

const LINUX_BUILD = 'npm exec -- tauri build --bundles deb,appimage,rpm --ci';

const COMMANDS = {
  inputs: (_env, inh) => sequence(
    () => node('scripts/release-inputs.mjs', ['--verify', '--stage'], inh),
    () => {
      // L-content §3.2 modules-stage runs as the second command of `inputs` (resolution 1).
      if (exists(inh, 'scripts/modules-stage.mjs')) return node('scripts/modules-stage.mjs', [], inh);
      console.warn('⚠ modules-stage.mjs absent (BA.1): content manifest and module asset pack not staged');
      return 0;
    },
  ),
  web: (_env, inh) => sh('npm run build:vite', inh),
  'modules-deploy': (_env, inh) => node('scripts/modules-deploy.mjs', [], inh),
  'web-deploy': (_env, inh) => node('scripts/deploy-web.mjs', [], inh),
  linux: (env, inh) => (env === 'windows'
    ? inContainer(LINUX_BUILD, inh, { CARGO_TARGET_DIR: 'src-tauri/target/linux-container' })
    : sh(LINUX_BUILD, inh)),
  windows: (env, inh) => (env === 'windows'
    ? sh('npm exec -- tauri build --bundles nsis --ci', inh)
    : sh('npm run build:windows:unstamped', inh)),
  'windows-msi': (_env, inh) => status(spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File',
    'scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1', '-Kind', 'MSI'], inh)),
  'windows-msix': (_env, inh) => status(spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File',
    'scripts/sanctissimissa-v1.40.21223-windows-native-20260913.ps1', '-Kind', 'MSIX'], inh)),
  // Natively in both envs. stage-model-packs: L-native-embed F3 (BA.12); --android-pack: BA.1.
  'android-release': (_env, inh) => sequence(
    () => node('scripts/provision-secrets.mjs', [], inh),
    () => (exists(inh, 'scripts/stage-model-packs.mjs') ? node('scripts/stage-model-packs.mjs', ['--require'], inh) : 0),
    () => (exists(inh, 'scripts/modules-stage.mjs') ? node('scripts/modules-stage.mjs', ['--android-pack'], inh) : 0),
    () => sh('npm exec -- tauri android build --apk --aab --ci', inh,
      { CARGO_PROFILE_RELEASE_DEBUG: '2', CARGO_PROFILE_RELEASE_STRIP: 'false' }),
  ),
  symbols: (env, inh) => (env === 'windows'
    ? inContainer('npm run package:android-symbols', inh)
    : sh('npm run package:android-symbols', inh)),
  collect: (_env, inh) => node('scripts/collect-artifacts.mjs', ['--auto'], inh),
};

/**
 * Run `stage` for build environment `env` with the driver's `inherited` spawn options
 * (`{cwd, stdio, env}`; env already carries SAM_RELEASE_ENV). Returns the exit status.
 */
export function stageCommand(stage, env, inherited) {
  if (!STAGE_ENVS[stage]?.includes(env)) throw new Error(`Stage ${stage} does not run in ${env}`);
  console.log(`🔧 Stage: ${stage}@${env}`);
  return COMMANDS[stage](env, inherited);
}
