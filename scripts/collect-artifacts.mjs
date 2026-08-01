#!/usr/bin/env node
// Strict CC12 collector: one stamped release set, slug-first names, no deletion
// of historical artifacts, hashes from the final files, and fail-closed gaps.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const WEBDIST = resolve(ROOT, 'dist-web');
const SLUG = 'standroidsmissal';
const versionJson = JSON.parse(readFileSync(resolve(ROOT, 'version.json'), 'utf8'));
const VERSION = versionJson.version;
const VERSION_CODE = String(versionJson.versionCode);
const PREFIX = `${SLUG}-v${VERSION}`;

if (readFileSync(resolve(ROOT, 'version.txt'), 'utf8').trim() !== VERSION) {
  throw new Error('version.txt and version.json disagree');
}
mkdirSync(DIST, { recursive: true });

// dist/ is an append-only release archive. Older versions remain in place;
// cleanup and deployment retention are separate, explicit operator actions.

function exactOne(dir, predicate, label) {
  if (!existsSync(dir)) throw new Error(`${label}: missing directory ${dir}`);
  const matches = readdirSync(dir).filter(predicate).sort();
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one current artifact in ${dir}, found ${matches.join(', ') || 'none'}`);
  }
  return join(dir, matches[0]);
}

const sources = [
  {
    id: 'linux-deb', platform: 'linux', kind: 'deb',
    source: exactOne(resolve(ROOT, 'src-tauri/target/release/bundle/deb'),
      (f) => f.endsWith('.deb') && f.includes(VERSION), 'Linux deb'),
    filename: `${PREFIX}-linux-amd64.deb`,
  },
  {
    id: 'linux-appimage', platform: 'linux', kind: 'appimage',
    source: exactOne(resolve(ROOT, 'src-tauri/target/release/bundle/appimage'),
      (f) => f.endsWith('.AppImage') && f.includes(VERSION), 'Linux AppImage'),
    filename: `${PREFIX}-linux-amd64.AppImage`,
  },
  {
    id: 'windows-standalone', platform: 'windows', kind: 'exe',
    source: resolve(ROOT, 'src-tauri/target/x86_64-pc-windows-msvc/release/st-androids-missal.exe'),
    filename: `${PREFIX}-windows-x64-standalone.exe`,
  },
  {
    id: 'android-apk-debug', platform: 'android', kind: 'apk-debug',
    source: exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/apk/universal/debug'),
      (f) => f === `${PREFIX}-universal-debug.apk`, 'Android debug APK'),
    filename: `${PREFIX}-android-universal-debug.apk`,
  },
  {
    id: 'android-apk-release', platform: 'android', kind: 'apk-release',
    source: exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/apk/universal/release'),
      (f) => f === `${PREFIX}-universal-release.apk`, 'Android release APK'),
    filename: `${PREFIX}-android-universal-release.apk`,
  },
  {
    id: 'android-aab-release', platform: 'android', kind: 'aab-release',
    source: exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/bundle/universalRelease'),
      (f) => f === `${PREFIX}-universal-release.aab`, 'Android release AAB'),
    filename: `${PREFIX}-android-universal-release.aab`,
  },
  {
    id: 'android-native-debug-symbols', platform: 'android', kind: 'native-debug-symbols',
    source: exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/native-debug-symbols/universalRelease'),
      (f) => f === `${PREFIX}-android-native-debug-symbols.zip`, 'Android native debug symbols'),
    filename: `${PREFIX}-android-native-debug-symbols.zip`,
  },
];

const nsisDir = resolve(ROOT, 'src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis');
if (existsSync(nsisDir)) {
  const nsisMatches = readdirSync(nsisDir).filter((f) => f.endsWith('.exe') && f.includes(VERSION));
  if (nsisMatches.length === 1) {
    sources.push({
      id: 'windows-nsis', platform: 'windows', kind: 'nsis',
      source: join(nsisDir, nsisMatches[0]),
      filename: `${PREFIX}-windows-x64-setup.exe`,
    });
  }
}

const msiDir = resolve(ROOT, 'src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi');
if (existsSync(msiDir)) {
  const msiMatches = readdirSync(msiDir).filter((f) => f.endsWith('.msi') && f.includes(VERSION));
  if (msiMatches.length === 1) {
    sources.push({
      id: 'windows-msi', platform: 'windows', kind: 'msi',
      source: join(msiDir, msiMatches[0]),
      filename: `${PREFIX}-windows-x64.msi`,
    });
  }
}

for (const artifact of sources) {
  if (!existsSync(artifact.source)) throw new Error(`${artifact.id}: missing ${artifact.source}`);
}

// Web/PWA: the runnable web surface lives in the clean `dist-web/` embed dir
// (vite outDir), zipped into `dist/` alongside the native artifacts. dist-web/
// holds ONLY the web surface, so the zip is never contaminated by prior
// release binaries the way a shared `dist/` would be.
for (const required of [
  'index.html',
  'assets',
  'icon.png',
  'icon-192.png',
  'manifest.webmanifest',
  'registerSW.js',
  'sw.js',
  'missal.db',
]) {
  if (!existsSync(join(WEBDIST, required))) throw new Error(`Web build missing dist-web/${required}`);
}
if (!readdirSync(WEBDIST).some((entry) => /^workbox-[\w-]+\.js$/.test(entry))) {
  throw new Error('Web build missing generated Workbox runtime');
}
const webFilename = `${PREFIX}-web-pwa.zip`;
const webPath = join(DIST, webFilename);
if (existsSync(webPath)) {
  throw new Error(`Refusing to overwrite existing release artifact: ${webPath}`);
}
console.log(`  ⟳ web-pwa: archiving dist-web/ to dist/${webFilename}`);
execFileSync('zip', ['-r', webPath, ...readdirSync(WEBDIST).sort()], {
  cwd: WEBDIST,
  stdio: 'inherit',
});

const copied = [{ id: 'web-pwa', platform: 'web', kind: 'pwa-zip', filename: webFilename }];
for (const artifact of sources) {
  const destination = join(DIST, artifact.filename);
  if (existsSync(destination)) {
    throw new Error(`Refusing to overwrite existing release artifact: ${destination}`);
  }
  copyFileSync(artifact.source, destination);
  copied.push({
    id: artifact.id,
    platform: artifact.platform,
    kind: artifact.kind,
    filename: artifact.filename,
  });
  console.log(`  ✓ ${artifact.id} → dist/${artifact.filename}`);
}

function sha256(path) {
  return execFileSync('sha256sum', [path], { encoding: 'utf8' }).split(/\s+/, 1)[0];
}

for (const artifact of copied) {
  const path = join(DIST, artifact.filename);
  artifact.size_bytes = statSync(path).size;
  artifact.sha256 = sha256(path);
  artifact.locations = [{
    role: 'canonical-checkout-dist',
    transport: 'local-fs',
    host: 'developer-workstation',
    path,
    public: false,
  }];
}

const apkSources = sources.filter((a) => a.kind.startsWith('apk-'));
const buildTools = resolve(process.env.ANDROID_HOME || join(homedir(), 'Android', 'Sdk'), 'build-tools');
const latestBuildTools = readdirSync(buildTools).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
const apksigner = resolve(buildTools, latestBuildTools, 'apksigner');
const aapt2 = resolve(buildTools, latestBuildTools, 'aapt2');
for (const artifact of apkSources) {
  execFileSync(apksigner, ['verify', '--verbose', artifact.source], { stdio: 'pipe' });
  const badging = execFileSync(aapt2, ['dump', 'badging', artifact.source], { encoding: 'utf8' });
  const pkg = badging.match(/^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/m);
  if (!pkg || pkg[1] !== versionJson.packageName || pkg[2] !== VERSION_CODE || pkg[3] !== VERSION) {
    throw new Error(`${artifact.id}: embedded Android identity/version does not match version.json`);
  }
}
const aab = sources.find((a) => a.kind === 'aab-release');
execFileSync('jarsigner', ['-verify', aab.source], { stdio: 'pipe' });

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const manifest = {
  schema: 'mba.robin.release-manifest.v1',
  project: "St. Android's Missal",
  slug: SLUG,
  version: VERSION,
  versionCode: versionJson.versionCode,
  built_at: versionJson.buildDate,
  release_status: 'release-candidate',
  working_status: process.env.RELEASE_WORKING_STATUS || 'unknown',
  source: { commit: sourceCommit, branch: execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim() },
  artifacts: copied,
  verification: { sha256_command: 'sha256sum <filename>', android_signatures_verified: true },
};

const jsonName = `release-manifest-v${VERSION}.json`;
writeFileSync(join(DIST, jsonName), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const xmlEscape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const xmlArtifacts = copied.map((a) =>
  `  <artifact id="${xmlEscape(a.id)}" platform="${xmlEscape(a.platform)}" kind="${xmlEscape(a.kind)}"><filename>${xmlEscape(a.filename)}</filename><size_bytes>${a.size_bytes}</size_bytes><sha256>${a.sha256}</sha256></artifact>`
).join('\n');
writeFileSync(join(DIST, `release-manifest-v${VERSION}.xml`),
  `<?xml version="1.0" encoding="UTF-8"?>\n<release schema="mba.robin.release-manifest.v1" version="${xmlEscape(VERSION)}" versionCode="${VERSION_CODE}">\n${xmlArtifacts}\n</release>\n`);
writeFileSync(join(DIST, `RELEASE_NOTES-v${VERSION}.md`),
  `# St. Android's Missal v${VERSION}\n\nRelease-candidate multiplatform build of the v0.5 browser-verified wave. See the adjacent release manifest for exact artifact hashes and verification state.\n`);

console.log(`\nCollected ${copied.length} coherent artifacts for v${VERSION}`);
