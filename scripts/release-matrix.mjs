// Release matrix — the closed sets of DOCS/ARCHITECTURE/L-release-20261106.md (Phase L).
// §2.1 build environments · §2.2 stages and pairs · §2.4 artifact table · §2.5 publication roles.
// Data only: release-state.mjs, release-stage-commands.mjs, release-stage-outputs.mjs and
// collect-artifacts.mjs import from here so the matrix is stated exactly once.

/** §2.1 — Closed set, Phase L. */
export const RELEASE_ENVS = ['ubuntu', 'windows'];

/** §2.1 — `'linux'` → `'ubuntu'`, `'win32'` → `'windows'`, anything else throws. */
export function envOf(platform) {
  if (platform === 'linux') return 'ubuntu';
  if (platform === 'win32') return 'windows';
  throw new Error(`unsupported release platform: ${platform}`);
}

/** §2.2 — Closed set, Phase L (supersedes the 1.69 order with `test`). */
export const STAGE_ORDER = [
  'inputs', 'web', 'modules-deploy', 'web-deploy', 'linux',
  'windows', 'windows-msi', 'windows-msix',
  'android-release', 'symbols', 'collect',
];

const BOTH = ['ubuntu', 'windows'];
/** §2.2 — where each stage runs. Closed set, Phase L. */
export const STAGE_ENVS = {
  inputs: BOTH,
  web: BOTH,
  'modules-deploy': ['ubuntu'],
  'web-deploy': ['ubuntu'],
  linux: BOTH,
  windows: BOTH,
  'windows-msi': ['windows'],
  'windows-msix': ['windows'],
  'android-release': BOTH,
  symbols: BOTH,
  collect: ['ubuntu'],
};

/** §2.2 — `pair := stage "@" env`. */
export const stageKey = (s, e) => s + '@' + e;

/** §2.2 — 17 required pairs (12 both-env + 3 ubuntu-only + 2 windows-only). */
export const REQUIRED_PAIRS = STAGE_ORDER.flatMap((s) => STAGE_ENVS[s].map((e) => stageKey(s, e)));

/** §2.3 — grammar of every `completedStages` entry in lock v2. */
export const PAIR_RE = /^(inputs|web|modules-deploy|web-deploy|linux|windows|windows-msi|windows-msix|android-release|symbols|collect)@(ubuntu|windows)$/;

/** Pairs that must be complete before a stage runs; `<env>` is the running env. */
export const STAGE_PREREQS = { 'web-deploy': ['modules-deploy@ubuntu'], symbols: ['android-release@<env>'] };

/** The prerequisite pairs of `stage` when it runs in `env`. */
export const stagePrereqs = (stage, env) => (STAGE_PREREQS[stage] ?? []).map((p) => p.replace('<env>', env));

const ANDROID_OUT = 'src-tauri/gen/android/app/build/outputs';
const linuxBundle = (env, kind) =>
  `src-tauri/target/${env === 'windows' ? 'linux-container' : 'release'}/bundle/${kind}`;
const linuxNamed = (ext) => (ver) => (f) => f.endsWith(ext) &&
  ['sanctissimissa', 'SanctissiMissa'].some((n) => f.startsWith(`${n}_${ver}_`));

/**
 * §2.4 `ARTIFACTS` — Closed set, Phase L (14 rows). `source(env, ver)` returns one of
 * `{dir, match}` (exactly one file in `dir` satisfying `match`), `{file}`, `{receipt}`
 * (native Windows receipt kind), `{webZip: true}` (zip of `dist-web/`) or `{vendored}`.
 */
export const ARTIFACTS = [
  { id: 'web-pwa', stage: 'web', envs: BOTH, source: () => ({ webZip: true }), qualifier: 'web-pwa', ext: 'zip' },
  { id: 'linux-deb', stage: 'linux', envs: BOTH, qualifier: 'linux-amd64', ext: 'deb',
    source: (env, ver) => ({ dir: linuxBundle(env, 'deb'), match: linuxNamed('.deb')(ver) }) },
  { id: 'linux-appimage', stage: 'linux', envs: BOTH, qualifier: 'linux-amd64', ext: 'AppImage',
    source: (env, ver) => ({ dir: linuxBundle(env, 'appimage'), match: linuxNamed('.AppImage')(ver) }) },
  { id: 'linux-rpm', stage: 'linux', envs: BOTH, qualifier: 'linux-x86_64', ext: 'rpm',
    source: (env, ver) => ({ dir: linuxBundle(env, 'rpm'),
      match: (f) => f.startsWith(`SanctissiMissa-${ver}-`) && f.endsWith('.x86_64.rpm') }) },
  { id: 'windows-standalone', stage: 'windows', envs: BOTH, qualifier: 'windows-x64-standalone', ext: 'exe',
    source: (env) => ({ file: env === 'windows' ? 'src-tauri/target/release/sanctissimissa.exe'
      : 'src-tauri/target/x86_64-pc-windows-msvc/release/sanctissimissa.exe' }) },
  { id: 'windows-nsis', stage: 'windows', envs: BOTH, qualifier: 'windows-x64-setup', ext: 'exe',
    source: (env, ver) => ({ file: `src-tauri/target/${env === 'windows' ? '' : 'x86_64-pc-windows-msvc/'}release/bundle/nsis/SanctissiMissa_${ver}_x64-setup.exe` }) },
  { id: 'windows-native-standalone', stage: 'windows-msi', envs: ['windows'], qualifier: 'windows-x64-native-standalone',
    ext: 'exe', source: () => ({ receipt: 'exe' }) },
  { id: 'windows-msi', stage: 'windows-msi', envs: ['windows'], qualifier: 'windows-x64', ext: 'msi',
    source: () => ({ receipt: 'msi' }) },
  { id: 'windows-msix', stage: 'windows-msix', envs: ['windows'], qualifier: 'windows-x64', ext: 'msix',
    source: () => ({ receipt: 'msix' }) },
  { id: 'android-apk-release', stage: 'android-release', envs: BOTH, qualifier: 'android-universal-release', ext: 'apk',
    source: (_env, ver) => ({ file: `${ANDROID_OUT}/apk/universal/release/sanctissimissa-v${ver}-universal-release.apk` }) },
  { id: 'android-aab-release', stage: 'android-release', envs: BOTH, qualifier: 'android-universal-release', ext: 'aab',
    source: (_env, ver) => ({ file: `${ANDROID_OUT}/bundle/universalRelease/sanctissimissa-v${ver}-universal-release.aab` }) },
  { id: 'android-native-debug-symbols', stage: 'symbols', envs: BOTH, qualifier: 'android-native-debug-symbols', ext: 'zip',
    source: (_env, ver) => ({ file: `${ANDROID_OUT}/native-debug-symbols/universalRelease/sanctissimissa-v${ver}-android-native-debug-symbols.zip` }) },
  { id: 'corpus', stage: 'inputs', envs: BOTH, qualifier: 'corpus', ext: 'db', source: () => ({ vendored: 'corpus' }) },
  { id: 'module-<editionId>', stage: 'inputs', envs: BOTH, qualifier: 'module', ext: 'db', source: () => ({ vendored: 'module' }) },
];

/** The ARTIFACTS row for an id (`module-<editionId>` ids resolve to the module row). */
export const artifactRow = (id) => ARTIFACTS.find((a) => a.id === id) ??
  (id.startsWith('module-') ? ARTIFACTS.find((a) => a.id === 'module-<editionId>') : undefined);

/** §2.5 — Closed set, Phase L. */
export const PUBLICATION_ROLES = ['play-upload', 'web-deploy', 'direct-download', 'store-upload', 'parity-only', 'release-input'];

/** §2.5 — the publication role of artifact `id` built in `env`. */
export function PUBLICATION_ROLE(id, env) {
  if (id === 'corpus' || id.startsWith('module-')) return 'release-input';
  if (env === 'ubuntu') {
    if (['android-aab-release', 'android-native-debug-symbols'].includes(id)) return 'play-upload';
    if (id === 'web-pwa') return 'web-deploy';
    if (['linux-deb', 'linux-appimage', 'linux-rpm', 'windows-standalone', 'windows-nsis', 'android-apk-release'].includes(id)) {
      return 'direct-download';
    }
  }
  if (env === 'windows' && id === 'windows-msi') return 'direct-download';
  if (env === 'windows' && id === 'windows-msix') return 'store-upload';
  return 'parity-only';
}

/** §2.13 — `accepted_for_publication`. */
export const acceptedForPublication = (role) => !['parity-only', 'release-input'].includes(role);

/**
 * §2.4 name grammar: `sanctissimissa-v<ver>-<qualifier>-buildenv-<env>.<ext>`; release inputs carry
 * no `-buildenv-`: `…-corpus-<corpus_version>.db`, `…-module-<editionId>-r<revision>.db`.
 * `meta` = `{corpus_version}` for the corpus, `{revision}` for a module.
 */
export function distName(id, ver, env, meta = {}) {
  const prefix = `sanctissimissa-v${ver}`;
  if (id === 'corpus') return `${prefix}-corpus-${meta.corpus_version}.db`;
  if (id.startsWith('module-')) return `${prefix}-${id}-r${meta.revision}.db`;
  const row = artifactRow(id);
  if (!row) throw new Error(`unknown release artifact: ${id}`);
  if (!RELEASE_ENVS.includes(env)) throw new Error(`unknown build env: ${env}`);
  return `${prefix}-${row.qualifier}-buildenv-${env}.${row.ext}`;
}
