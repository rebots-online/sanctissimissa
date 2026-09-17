#!/usr/bin/env node
// Strict CC12 collector: one stamped release set, slug-first names, no deletion
// of historical artifacts, hashes from the final files, and fail-closed gaps.

import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  closeSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const WEBDIST = resolve(ROOT, 'dist-web');
const COLLECTOR = resolve(ROOT, 'src-tauri/target/collector');
const SLUG = 'sanctissimissa';
const PRODUCT = 'SanctissiMissa';
const PACKAGE_NAME = 'mba.robin.sanctissimissa';
function readJson(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
    return value;
  } catch {
    const error = new Error(`Invalid JSON object: ${path}`);
    error.code = 'INVALID_RELEASE_JSON';
    throw error;
  }
}
const versionJson = readJson(resolve(ROOT, 'version.json'));
const VERSION = versionJson.version;
if (typeof VERSION !== 'string' || !/^\d+\.\d+\.\d+$/.test(VERSION) ||
    !Number.isSafeInteger(versionJson.versionCode) || versionJson.versionCode <= 0 ||
    typeof versionJson.buildDate !== 'string' || !Number.isFinite(Date.parse(versionJson.buildDate))) {
  throw new Error('version.json has an invalid release version, versionCode or buildDate');
}
const VERSION_CODE = String(versionJson.versionCode);
const PREFIX = `${SLUG}-v${VERSION}`;
const [windowsMajor, windowsMinor] = VERSION.split('.');
const WINDOWS_VERSIONS = { canonical: VERSION, msi: `${windowsMajor}.${windowsMinor}.0`, msix: `${windowsMajor}.${windowsMinor}.0.0` };

if (readFileSync(resolve(ROOT, 'version.txt'), 'utf8').trim() !== VERSION) {
  throw new Error('version.txt and version.json disagree');
}
const packageJson = readJson(resolve(ROOT, 'package.json'));
const tauriConfig = readJson(resolve(ROOT, 'src-tauri/tauri.conf.json'));
if (versionJson.productName !== PRODUCT || versionJson.internalName !== SLUG ||
    versionJson.packageName !== PACKAGE_NAME || packageJson.name !== SLUG ||
    packageJson.productName !== PRODUCT || packageJson.version !== VERSION ||
    tauriConfig.productName !== PRODUCT || tauriConfig.identifier !== PACKAGE_NAME ||
    tauriConfig.version !== VERSION || tauriConfig.bundle?.android?.versionCode !== versionJson.versionCode) {
  throw new Error('Release package, Tauri and version metadata must agree on the SanctissiMissa identity/version');
}
const releaseState = readJson(resolve(ROOT, `${SLUG}-release-state.json`));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const sourceBranch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim();
if (releaseState.stampPending || releaseState.version !== VERSION || releaseState.sourceHead !== sourceCommit) {
  throw new Error('Release state does not match the current stamped version and source commit');
}
if (!releaseState.inputHashes || typeof releaseState.inputHashes !== 'object' ||
    Array.isArray(releaseState.inputHashes) ||
    typeof releaseState.inputHashes['assets/missal.db'] !== 'string' ||
    !/^[a-f0-9]{64}$/.test(releaseState.inputHashes['assets/missal.db']) ||
    typeof releaseState.inputHashes['.env'] !== 'string' ||
    !(releaseState.inputHashes['.env'] === 'absent' || /^[a-f0-9]{64}$/.test(releaseState.inputHashes['.env']))) {
  throw new Error('Release state requires frozen hashes for assets/missal.db and .env');
}
if (!Array.isArray(releaseState.completedStages) ||
    !releaseState.completedStages.every((stage) => typeof stage === 'string')) {
  throw new Error('Release state requires a completedStages array');
}
for (const [name, expected] of Object.entries(releaseState.inputHashes)) {
  if (!['assets/missal.db', '.env'].includes(name) ||
      !(expected === 'absent' || /^[a-f0-9]{64}$/.test(expected))) {
    throw new Error('Release state contains an invalid input hash');
  }
  const path = resolve(ROOT, name);
  if ((existsSync(path) ? sha256(path) : 'absent') !== expected) {
    throw new Error(`Release input changed since the frozen build: ${name}`);
  }
}

// dist/ is an append-only release archive. Older versions remain in place;
// cleanup and deployment retention are separate, explicit operator actions.

/**
 * Per-host collection (`--partial` / `RELEASE_PARTIAL=1`).
 *
 * Linux produces deb/AppImage and cross EXE/NSIS; native Windows produces
 * EXE/MSI/MSIX. Strict collection requires both hosts' same-release outputs
 * and the native verification receipt to have been gathered into this checkout.
 *
 * In partial mode a missing artifact is recorded with its reason and skipped,
 * the manifest is marked `partial`, and `missing[]` names exactly what still
 * has to come from another host. Strict mode is unchanged and remains the
 * default, so a genuine single-host complete set still fails loudly if it is
 * incomplete.
 */
const PARTIAL = process.argv.includes('--partial') || process.env.RELEASE_PARTIAL === '1';
const missing = [];
const sourceStages = {
  'web-pwa': 'web',
  'linux-deb': 'linux',
  'linux-appimage': 'linux',
  'windows-standalone': 'windows',
  'windows-nsis': 'windows',
  'windows-native-standalone': 'windows-msi',
  'windows-msi': 'windows-msi',
  'windows-msix': 'windows-msix',
  'android-apk-release': 'android-release',
  'android-aab-release': 'android-release',
  'android-native-debug-symbols': 'symbols',
};

function exactOne(dir, predicate, label) {
  if (!existsSync(dir)) throw new Error(`${label}: missing directory ${dir}`);
  const matches = readdirSync(dir).filter(predicate).sort();
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one current artifact in ${dir}, found ${matches.join(', ') || 'none'}`);
  }
  return join(dir, matches[0]);
}

/** Wrap a source entry so partial mode records the gap instead of aborting. */
function optional(id, platform, kind, build) {
  try {
    if (!releaseState.completedStages.includes(sourceStages[id])) {
      throw new Error(`Required build stage is still pending: ${sourceStages[id]}`);
    }
    return build();
  } catch (err) {
    if (!PARTIAL || err.code === 'INVALID_RELEASE_JSON') throw err;
    missing.push({ id, platform, kind, reason: err.message });
    console.warn(`  ⏭  ${id}: unavailable or unverified — ${err.message}`);
    return null;
  }
}

// A native receipt ties installer-format versions and exact binary hashes to
// the frozen full release, so an old mapped-version MSI cannot be collected.
function nativeWindowsArtifact(kind) {
  const target = resolve(ROOT, 'src-tauri/target/windows-native');
  const receipt = readJson(join(target, `${PREFIX}-windows-native-metadata.json`));
  if (receipt.version !== VERSION || receipt.sourceHead !== sourceCommit ||
      receipt.msiVersion !== WINDOWS_VERSIONS.msi || receipt.msixVersion !== WINDOWS_VERSIONS.msix ||
      receipt.verification?.signatures !== true) {
    throw new Error('Native Windows receipt does not match the frozen release or package verification');
  }
  const artifact = receipt.artifacts?.[kind];
  if (!artifact || typeof artifact.path !== 'string' || isAbsolute(artifact.path) ||
      /^[A-Za-z]:|^\\\\/.test(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
    throw new Error(`Native Windows receipt has no valid ${kind} artifact`);
  }
  const path = resolve(target, artifact.path.replaceAll('\\', '/'));
  const inside = relative(target, path);
  if (!inside || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
    throw new Error('Native Windows receipt path escapes its target directory');
  }
  if (!existsSync(path) || !statSync(path).isFile() || sha256(path) !== artifact.sha256) {
    throw new Error(`Native Windows ${kind} does not match its release receipt hash`);
  }
  return path;
}

const sources = [
  {
    id: 'linux-deb', platform: 'linux', kind: 'deb',
    source: optional('linux-deb', 'linux', 'deb', () => exactOne(resolve(ROOT, 'src-tauri/target/release/bundle/deb'),
      (f) => f.endsWith('.deb') && [SLUG, PRODUCT].some((name) => f.startsWith(`${name}_${VERSION}_`)), 'Linux deb')),
    filename: `${PREFIX}-linux-amd64.deb`,
  },
  {
    id: 'linux-appimage', platform: 'linux', kind: 'appimage',
    source: optional('linux-appimage', 'linux', 'appimage', () => exactOne(resolve(ROOT, 'src-tauri/target/release/bundle/appimage'),
      (f) => f.endsWith('.AppImage') && [SLUG, PRODUCT].some((name) => f.startsWith(`${name}_${VERSION}_`)), 'Linux AppImage')),
    filename: `${PREFIX}-linux-amd64.AppImage`,
  },
  {
    id: 'windows-standalone', platform: 'windows', kind: 'exe',
    source: optional('windows-standalone', 'windows', 'exe', () => resolve(ROOT, 'src-tauri/target/x86_64-pc-windows-msvc/release/sanctissimissa.exe')),
    filename: `${PREFIX}-windows-x64-standalone.exe`,
  },
  {
    id: 'windows-nsis', platform: 'windows', kind: 'nsis',
    source: optional('windows-nsis', 'windows', 'nsis', () => exactOne(resolve(ROOT, 'src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis'),
      (f) => f === `SanctissiMissa_${VERSION}_x64-setup.exe`, 'Windows NSIS')),
    filename: `${PREFIX}-windows-x64-setup.exe`,
  },
  {
    id: 'windows-native-standalone', platform: 'windows', kind: 'exe-native',
    source: optional('windows-native-standalone', 'windows', 'exe-native', () => nativeWindowsArtifact('exe')),
    filename: `${PREFIX}-windows-x64-native-standalone.exe`,
  },
  {
    id: 'windows-msi', platform: 'windows', kind: 'msi',
    source: optional('windows-msi', 'windows', 'msi', () => nativeWindowsArtifact('msi')),
    filename: `${PREFIX}-windows-x64.msi`, installer_version: WINDOWS_VERSIONS.msi,
  },
  {
    id: 'windows-msix', platform: 'windows', kind: 'msix',
    source: optional('windows-msix', 'windows', 'msix', () => nativeWindowsArtifact('msix')),
    filename: `${PREFIX}-windows-x64.msix`, installer_version: WINDOWS_VERSIONS.msix,
  },
  {
    id: 'android-apk-release', platform: 'android', kind: 'apk-release',
    source: optional('android-apk-release', 'android', 'apk-release', () => exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/apk/universal/release'),
      (f) => f === `${PREFIX}-universal-release.apk`, 'Android release APK')),
    filename: `${PREFIX}-android-universal-release.apk`,
  },
  {
    id: 'android-aab-release', platform: 'android', kind: 'aab-release',
    source: optional('android-aab-release', 'android', 'aab-release', () => exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/bundle/universalRelease'),
      (f) => f === `${PREFIX}-universal-release.aab`, 'Android release AAB')),
    filename: `${PREFIX}-android-universal-release.aab`,
  },
  {
    id: 'android-native-debug-symbols', platform: 'android', kind: 'native-debug-symbols',
    source: optional('android-native-debug-symbols', 'android', 'native-debug-symbols', () => exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/native-debug-symbols/universalRelease'),
      (f) => f === `${PREFIX}-android-native-debug-symbols.zip`, 'Android native debug symbols')),
    filename: `${PREFIX}-android-native-debug-symbols.zip`,
  },
];

// `optional()` yields null for anything this host cannot produce (partial mode).
const present = sources.filter((a) => a.source !== null);
for (const artifact of present) {
  if (!existsSync(artifact.source)) {
    if (!PARTIAL) throw new Error(`${artifact.id}: missing ${artifact.source}`);
    missing.push({ id: artifact.id, platform: artifact.platform, kind: artifact.kind, reason: `missing ${artifact.source}` });
  }
}
sources.length = 0;
sources.push(...present.filter((a) => existsSync(a.source)));

// Web/PWA is another required matrix row, including when it is absent on a
// partial host. Validate inputs first; the ZIP is built in a disposable target
// directory and never updates an existing archive in place.
const webReady = optional('web-pwa', 'web', 'pwa-zip', () => {
  // registerSW.js no longer emitted since AM.08: registration is bundled via
  // virtual:pwa-register (src/pwa/pwaUpdate.ts initSelfApplyingUpdates).
  for (const required of [
    'index.html', 'assets', 'icon.png', 'icon-192.png', 'manifest.webmanifest',
    'sw.js', 'missal.db',
  ]) {
    if (!existsSync(join(WEBDIST, required))) throw new Error(`Web build missing dist-web/${required}`);
  }
  if (!readdirSync(WEBDIST).some((entry) => /^workbox-[\w-]+\.js$/.test(entry))) {
    throw new Error('Web build missing generated Workbox runtime');
  }
  return true;
});

function archiveWeb(webPath) {
  const entries = readdirSync(WEBDIST).sort();
  try {
    // -X excludes access-time extra fields: reading the same inputs a second
    // time must produce the same candidate bytes for actual SHA256 comparison.
    execFileSync('zip', ['-X', '-r', webPath, ...entries], { cwd: WEBDIST, stdio: 'inherit' });
    return 'zip';
  } catch (err) {
    if (err.code !== 'ENOENT' || process.platform !== 'win32') throw err;
  }
  execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    `Compress-Archive -Path ${entries.map((e) => `'${e.replace(/'/g, "''")}'`).join(',')} ` +
    `-DestinationPath '${webPath.replace(/'/g, "''")}' -CompressionLevel Optimal`,
  ], { cwd: WEBDIST, stdio: 'inherit' });
  return 'Compress-Archive';
}

/**
 * Hash in-process. This shelled out to `sha256sum`, which a stock Windows host
 * does not have — so the collection aborted after every artifact had already
 * been copied into dist/, leaving a release staged but unmanifested. Node's
 * crypto is portable and streams, so the 194 MB corpus zip does not have to be
 * held in memory.
 */
function sha256(path) {
  const hash = createHash('sha256');
  const CHUNK = 1 << 20;
  const buf = Buffer.allocUnsafe(CHUNK);
  const fd = openSync(path, 'r');
  try {
    let bytes;
    while ((bytes = readSync(fd, buf, 0, CHUNK, null)) > 0) hash.update(buf.subarray(0, bytes));
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

const apkSources = sources.filter((a) => a.kind.startsWith('apk-'));
// Android identity/signature verification only runs when Android artifacts are
// actually present. Skipping it must be RECORDED, never silently implied by an
// empty loop — `android_signatures_verified` is a claim the manifest makes.
const androidVerified = apkSources.length > 0;
if (!androidVerified) {
  if (!PARTIAL) throw new Error('no Android artifacts to verify — refusing to write a manifest claiming otherwise');
  console.warn('  ⏭  Android signature verification skipped: no Android artifacts on this host.');
}
if (androidVerified) {
  const buildToolsInner = resolve(process.env.ANDROID_HOME || join(homedir(), 'Android', 'Sdk'), 'build-tools');
  const latestBuildTools = readdirSync(buildToolsInner).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
  if (!latestBuildTools) throw new Error('Android build-tools are required to verify APKs');
  const apksigner = resolve(buildToolsInner, latestBuildTools, 'apksigner');
  const aapt2 = resolve(buildToolsInner, latestBuildTools, 'aapt2');
  for (const artifact of apkSources) {
    execFileSync(apksigner, ['verify', '--verbose', artifact.source], { stdio: 'pipe' });
    const badging = execFileSync(aapt2, ['dump', 'badging', artifact.source], { encoding: 'utf8' });
    const pkg = badging.match(/^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/m);
    if (!pkg || pkg[1] !== versionJson.packageName || pkg[2] !== VERSION_CODE || pkg[3] !== VERSION) {
      throw new Error(`${artifact.id}: embedded Android identity/version does not match version.json`);
    }
  }
}
const aab = sources.find((a) => a.kind === 'aab-release');
if (aab) execFileSync('jarsigner', ['-verify', aab.source], { stdio: 'pipe' });

/**
 * Change notes are a build INPUT, not an afterthought. `DOCS/CHANGELOG.md`
 * carries one `## v<version>` section per release; the section matching this
 * build is embedded in both manifests and written out as RELEASE_NOTES.
 *
 * A missing section yields empty notes that say so. It deliberately does NOT
 * fall back to boilerplate — the previous RELEASE_NOTES stub was hardcoded
 * prose about the "v0.5 browser-verified wave" that every later release
 * silently reprinted, which is worse than nothing because it reads as true.
 */
function readChangeNotes(version) {
  const path = resolve(ROOT, 'DOCS/CHANGELOG.md');
  const empty = {
    source: 'DOCS/CHANGELOG.md',
    present: false,
    heading: null,
    highlights: [],
    markdown: `No changelog section for v${version}. Add a "## v${version}" section to DOCS/CHANGELOG.md.`,
  };
  if (!existsSync(path)) return empty;
  const lines = readFileSync(path, 'utf8').split('\n');
  const start = lines.findIndex((l) => new RegExp(`^##\\s+v${version.replace(/\./g, '\\.')}(\\s|$)`).test(l));
  if (start === -1) return empty;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+v/.test(lines[i]) || /^---\s*$/.test(lines[i])) { end = i; break; }
  }
  const body = lines.slice(start + 1, end);
  // Highlights are the top-level bullets before the first sub-heading.
  const firstSub = body.findIndex((l) => /^###\s/.test(l));
  const highlightScope = firstSub === -1 ? body : body.slice(0, firstSub);
  const highlights = highlightScope
    .filter((l) => /^-\s+/.test(l))
    .map((l) => l.replace(/^-\s+/, '').trim());
  return {
    source: 'DOCS/CHANGELOG.md',
    present: true,
    heading: lines[start].replace(/^##\s+/, '').trim(),
    highlights,
    markdown: body.join('\n').trim(),
  };
}
const changeNotes = readChangeNotes(VERSION);
if (!changeNotes.present) {
  console.warn(`  ⚠ no DOCS/CHANGELOG.md section for v${VERSION} — manifests will carry empty change notes.`);
} else {
  console.log(`  ⟳ change notes: ${changeNotes.highlights.length} highlight(s) from DOCS/CHANGELOG.md`);
}

const jsonName = `${PREFIX}-release-manifest.json`;
const xmlName = `${PREFIX}-release-manifest.xml`;
const notesName = `${PREFIX}-release-notes.md`;
// Validate predecessor metadata before any archive or durable-file mutations.
// Its hashes are never proof that a destination still contains those bytes.
if (existsSync(join(DIST, jsonName))) {
  const previous = readJson(join(DIST, jsonName));
  if (previous.schema !== 'mba.robin.release-manifest.v1' || previous.slug !== SLUG ||
      previous.project !== PRODUCT || previous.version !== VERSION ||
      previous.versionCode !== versionJson.versionCode || previous.source?.commit !== sourceCommit) {
    throw new Error('Existing release manifest belongs to a different release identity/source');
  }
}
if (existsSync(join(DIST, xmlName)) &&
    !readFileSync(join(DIST, xmlName), 'utf8').includes(`version="${VERSION}" versionCode="${VERSION_CODE}"`)) {
  throw new Error('Existing release XML does not match this version');
}
if (existsSync(join(DIST, notesName)) &&
    !readFileSync(join(DIST, notesName), 'utf8').startsWith(`# ${PRODUCT} v${VERSION}\n`)) {
  throw new Error('Existing release notes do not match this product/version');
}

if (webReady) {
  mkdirSync(COLLECTOR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const candidateDir = mkdtempSync(join(COLLECTOR, `${PREFIX}-collection-${timestamp}-`));
  const webFilename = `${PREFIX}-web-pwa.zip`;
  const webPath = join(candidateDir, webFilename);
  console.log(`  ⟳ web-pwa: preparing a candidate with ${archiveWeb(webPath)}`);
  sources.unshift({ id: 'web-pwa', platform: 'web', kind: 'pwa-zip', source: webPath, filename: webFilename });
}

// Check the entire set before copying any absent artifact. A conflict is an
// error even in partial mode; it cannot be relabeled or silently overwritten.
for (const artifact of sources) {
  if (!statSync(artifact.source).isFile()) throw new Error(`${artifact.id}: source is not a file`);
  artifact.expectedHash = sha256(artifact.source);
  const destination = join(DIST, artifact.filename);
  if (existsSync(destination) && (!statSync(destination).isFile() || sha256(destination) !== artifact.expectedHash)) {
    throw new Error(`Conflicting bytes at existing release artifact: ${destination}`);
  }
}
mkdirSync(DIST, { recursive: true });
const copied = [];
for (const artifact of sources) {
  const destination = join(DIST, artifact.filename);
  const reused = existsSync(destination);
  if (!reused) copyFileSync(artifact.source, destination, constants.COPYFILE_EXCL);
  const hash = sha256(destination);
  if (hash !== artifact.expectedHash) throw new Error(`${artifact.id}: staged bytes changed during collection`);
  copied.push({
    id: artifact.id, platform: artifact.platform, kind: artifact.kind, filename: artifact.filename,
    ...(artifact.platform === 'windows' ? { canonical_version: VERSION } : {}),
    ...(artifact.installer_version ? { installer_version: artifact.installer_version } : {}),
    size_bytes: statSync(destination).size,
    sha256: hash,
    locations: [{ role: 'canonical-checkout-dist', transport: 'local-fs', host: 'developer-workstation', path: destination, public: false }],
  });
  console.log(`  ✓ ${artifact.id} → dist/${artifact.filename}${reused ? ' (matching bytes reused)' : ''}`);
}

const manifest = {
  schema: 'mba.robin.release-manifest.v1',
  project: PRODUCT,
  slug: SLUG,
  version: VERSION,
  versionCode: versionJson.versionCode,
  built_at: versionJson.buildDate,
  release_status: PARTIAL ? 'partial' : 'release-candidate',
  host: { platform: process.platform, complete: !PARTIAL && missing.length === 0 },
  missing,
  working_status: process.env.RELEASE_WORKING_STATUS || 'unknown',
  source: { commit: sourceCommit, branch: sourceBranch },
  change_notes: changeNotes,
  artifacts: copied,
  windows_versions: WINDOWS_VERSIONS,
  verification: { sha256_command: 'sha256sum <filename>', android_signatures_verified: androidVerified,
    windows_package_signatures_verified: ['windows-native-standalone', 'windows-msi', 'windows-msix'].every((id) => copied.some((artifact) => artifact.id === id)),
    windows_store_runtime: 'unverified', windows_store_acceptance: 'unverified',
    android_play_delivery: 'unverified (BP.1)' },
};

const xmlEscape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const xmlArtifacts = copied.map((a) =>
  `  <artifact id="${xmlEscape(a.id)}" platform="${xmlEscape(a.platform)}" kind="${xmlEscape(a.kind)}"><filename>${xmlEscape(a.filename)}</filename><size_bytes>${a.size_bytes}</size_bytes><sha256>${a.sha256}</sha256></artifact>`
).join('\n');
const xmlVerification = `  <windows_versions canonical="${xmlEscape(VERSION)}" msi="${xmlEscape(WINDOWS_VERSIONS.msi)}" msix="${xmlEscape(WINDOWS_VERSIONS.msix)}"/>\n` +
  `  <verification windows_store_runtime="unverified" windows_store_acceptance="unverified" android_play_delivery="unverified (BP.1)"/>`;
const xmlHighlights = changeNotes.highlights
  .map((h) => `    <highlight>${xmlEscape(h)}</highlight>`)
  .join('\n');
const xmlChangeNotes =
  `  <change_notes source="${xmlEscape(changeNotes.source)}" present="${changeNotes.present}">\n` +
  (xmlHighlights ? `${xmlHighlights}\n` : '') +
  `  </change_notes>`;
const xmlMissing = missing.map((entry) =>
  `    <artifact id="${xmlEscape(entry.id)}" platform="${xmlEscape(entry.platform)}" kind="${xmlEscape(entry.kind)}">${xmlEscape(entry.reason)}</artifact>`
).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<release schema="mba.robin.release-manifest.v1" version="${xmlEscape(VERSION)}" versionCode="${VERSION_CODE}" status="${manifest.release_status}">\n${xmlChangeNotes}\n${xmlVerification}\n${xmlArtifacts}\n  <missing>\n${xmlMissing}\n  </missing>\n</release>\n`;
const notes = `# ${PRODUCT} v${VERSION}\n\n${changeNotes.markdown}\n\n---\n\n` +
  `Built from commit ${sourceCommit}. See the adjacent release manifest for exact ` +
  `artifact hashes and verification state.\n\nCollection status: ${manifest.release_status}.\n` +
  (missing.length ? `\nMissing or unverified required artifacts:\n\n${missing.map((entry) => `- ${entry.id}: ${entry.reason}`).join('\n')}\n` : '') +
  '\nPlatform runtime, Store acceptance and Play delivery verification remain separate gates.\n';

const metadata = [[jsonName, JSON.stringify(manifest, null, 2) + '\n'], [xmlName, xml], [notesName, notes]];
for (const [filename, content] of metadata) {
  const destination = join(DIST, filename);
  if (existsSync(destination)) {
    if (readFileSync(destination, 'utf8') === content) continue;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = filename.slice(filename.lastIndexOf('.'));
    const qualifier = filename.slice(PREFIX.length + 1, -extension.length);
    const archive = join(DIST, 'rubric-runs', `${PREFIX}-${qualifier}-before-${timestamp}-${sha256(destination).slice(0, 12)}${extension}`);
    mkdirSync(dirname(archive), { recursive: true });
    if (existsSync(archive) && sha256(archive) !== sha256(destination)) {
      throw new Error(`Conflicting predecessor metadata archive: ${archive}`);
    }
    if (!existsSync(archive)) copyFileSync(destination, archive, constants.COPYFILE_EXCL);
  }
  writeFileSync(destination, content);
}

console.log(`\nCollected ${copied.length} coherent artifacts for v${VERSION}; ${PARTIAL ? `partial inventory, ${missing.length} required artifact(s) missing or unverified; strict collection remains pending` : 'strict artifact collection passed; platform/Store acceptance remains subject to recorded gates'}.`);
