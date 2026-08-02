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

/**
 * Per-host collection (`--partial` / `RELEASE_PARTIAL=1`).
 *
 * The ten-artifact set cannot be produced by any single machine: the Linux
 * deb/AppImage need a Linux host, while the MSI and MSIX need Windows (WiX and
 * the winapp CLI do not cross-build). Collecting strictly therefore ALWAYS
 * throws on whichever host you run it — which is why release artifacts have
 * been left orphaned in `target/` instead of landing in the tracked `dist/`.
 *
 * In partial mode a missing artifact is recorded with its reason and skipped,
 * the manifest is marked `partial`, and `missing[]` names exactly what still
 * has to come from another host. Strict mode is unchanged and remains the
 * default, so a genuine single-host complete set still fails loudly if it is
 * incomplete.
 */
const PARTIAL = process.argv.includes('--partial') || process.env.RELEASE_PARTIAL === '1';
const missing = [];

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
    return build();
  } catch (err) {
    if (!PARTIAL) throw err;
    missing.push({ id, platform, kind, reason: err.message });
    console.warn(`  ⏭  ${id}: not present on this host — ${err.message}`);
    return null;
  }
}

const sources = [
  {
    id: 'linux-deb', platform: 'linux', kind: 'deb',
    source: optional('linux-deb', 'linux', 'deb', () => exactOne(resolve(ROOT, 'src-tauri/target/release/bundle/deb'),
      (f) => f.endsWith('.deb') && f.includes(VERSION), 'Linux deb')),
    filename: `${PREFIX}-linux-amd64.deb`,
  },
  {
    id: 'linux-appimage', platform: 'linux', kind: 'appimage',
    source: optional('linux-appimage', 'linux', 'appimage', () => exactOne(resolve(ROOT, 'src-tauri/target/release/bundle/appimage'),
      (f) => f.endsWith('.AppImage') && f.includes(VERSION), 'Linux AppImage')),
    filename: `${PREFIX}-linux-amd64.AppImage`,
  },
  {
    id: 'windows-standalone', platform: 'windows', kind: 'exe',
    source: optional('windows-standalone', 'windows', 'exe', () => resolve(ROOT, 'src-tauri/target/x86_64-pc-windows-msvc/release/st-androids-missal.exe')),
    filename: `${PREFIX}-windows-x64-standalone.exe`,
  },
  {
    id: 'android-apk-debug', platform: 'android', kind: 'apk-debug',
    source: optional('android-apk-debug', 'android', 'apk-debug', () => exactOne(resolve(ROOT, 'src-tauri/gen/android/app/build/outputs/apk/universal/debug'),
      (f) => f === `${PREFIX}-universal-debug.apk`, 'Android debug APK')),
    filename: `${PREFIX}-android-universal-debug.apk`,
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

// MSIX is built by `npm run build:windows:msix` (winapp CLI, not Tauri's
// bundler) and emitted at the repo root as standroidsmissal-v<ver>-windows-x64.msix.
const msixPath = resolve(ROOT, `${PREFIX}-windows-x64.msix`);
if (existsSync(msixPath)) {
  sources.push({
    id: 'windows-msix', platform: 'windows', kind: 'msix',
    source: msixPath,
    filename: `${PREFIX}-windows-x64.msix`,
  });
}

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
/**
 * `zip` is not present on a stock Windows host, so this step aborted the whole
 * collection there — another place the pipeline silently assumed Linux. Prefer
 * the real `zip` when it exists (deterministic, streaming, handles the 194 MB
 * corpus well) and fall back to PowerShell's Compress-Archive on Windows.
 */
function archiveWeb() {
  const entries = readdirSync(WEBDIST).sort();
  try {
    execFileSync('zip', ['-r', webPath, ...entries], { cwd: WEBDIST, stdio: 'inherit' });
    return 'zip';
  } catch (err) {
    if (err.code !== 'ENOENT' || process.platform !== 'win32') throw err;
  }
  console.log('     zip not found — falling back to Compress-Archive');
  execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    `Compress-Archive -Path ${entries.map((e) => `'${e.replace(/'/g, "''")}'`).join(',')} ` +
    `-DestinationPath '${webPath.replace(/'/g, "''")}' -CompressionLevel Optimal -Force`,
  ], { cwd: WEBDIST, stdio: 'inherit' });
  return 'Compress-Archive';
}
const archiver = archiveWeb();
console.log(`     archived with ${archiver}`);

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
// Android identity/signature verification only runs when Android artifacts are
// actually present. Skipping it must be RECORDED, never silently implied by an
// empty loop — `android_signatures_verified` is a claim the manifest makes.
const androidVerified = apkSources.length > 0;
if (!androidVerified) {
  if (!PARTIAL) throw new Error('no Android artifacts to verify — refusing to write a manifest claiming otherwise');
  console.warn('  ⏭  Android signature verification skipped: no Android artifacts on this host.');
}
const buildTools = androidVerified
  ? resolve(process.env.ANDROID_HOME || join(homedir(), 'Android', 'Sdk'), 'build-tools')
  : null;
if (androidVerified) {
const buildToolsInner = resolve(process.env.ANDROID_HOME || join(homedir(), 'Android', 'Sdk'), 'build-tools');
const latestBuildTools = readdirSync(buildToolsInner).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
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
const aab = sources.find((a) => a.kind === 'aab-release');
if (aab) execFileSync('jarsigner', ['-verify', aab.source], { stdio: 'pipe' });
}

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

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const manifest = {
  schema: 'mba.robin.release-manifest.v1',
  project: "St. Android's Missal",
  slug: SLUG,
  version: VERSION,
  versionCode: versionJson.versionCode,
  built_at: versionJson.buildDate,
  release_status: PARTIAL ? 'partial' : 'release-candidate',
  host: { platform: process.platform, complete: missing.length === 0 },
  missing,
  working_status: process.env.RELEASE_WORKING_STATUS || 'unknown',
  source: { commit: sourceCommit, branch: execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim() },
  change_notes: changeNotes,
  artifacts: copied,
  verification: { sha256_command: 'sha256sum <filename>', android_signatures_verified: androidVerified },
};

const jsonName = `release-manifest-v${VERSION}.json`;
writeFileSync(join(DIST, jsonName), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const xmlEscape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const xmlArtifacts = copied.map((a) =>
  `  <artifact id="${xmlEscape(a.id)}" platform="${xmlEscape(a.platform)}" kind="${xmlEscape(a.kind)}"><filename>${xmlEscape(a.filename)}</filename><size_bytes>${a.size_bytes}</size_bytes><sha256>${a.sha256}</sha256></artifact>`
).join('\n');
const xmlHighlights = changeNotes.highlights
  .map((h) => `    <highlight>${xmlEscape(h)}</highlight>`)
  .join('\n');
const xmlChangeNotes =
  `  <change_notes source="${xmlEscape(changeNotes.source)}" present="${changeNotes.present}">\n` +
  (xmlHighlights ? `${xmlHighlights}\n` : '') +
  `  </change_notes>`;
writeFileSync(join(DIST, `release-manifest-v${VERSION}.xml`),
  `<?xml version="1.0" encoding="UTF-8"?>\n<release schema="mba.robin.release-manifest.v1" version="${xmlEscape(VERSION)}" versionCode="${VERSION_CODE}">\n${xmlChangeNotes}\n${xmlArtifacts}\n</release>\n`);
writeFileSync(join(DIST, `RELEASE_NOTES-v${VERSION}.md`),
  `# St. Android's Missal v${VERSION}\n\n${changeNotes.markdown}\n\n---\n\n` +
  `Built from commit ${sourceCommit}. See the adjacent release manifest for exact ` +
  `artifact hashes and verification state.\n`);

console.log(`\nCollected ${copied.length} coherent artifacts for v${VERSION}`);
