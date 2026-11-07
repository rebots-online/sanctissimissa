#!/usr/bin/env node
// Strict CC12 collector over the D12 dual-env matrix: reads the dist/ entries that stageOutputs
// staged (stage-as-produced), never deletes historical artifacts, hashes the final files and fails
// closed on gaps. DOCS/ARCHITECTURE/L-release-20261106.md §2.3 (union), §2.4/§2.5 (names, roles),
// §2.10 (incomplete inventory), §2.13 (manifest additions), §3 F4 (`--auto`).
//
//   node scripts/collect-artifacts.mjs --auto   union misses a pair other than collect@ubuntu → partial,
//                                               incomplete inventory, exit 2; else strict
//   node scripts/collect-artifacts.mjs          strict (fails on any missing pair or artifact)
//   --partial / RELEASE_PARTIAL=1               force partial, exit 0

import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  ARTIFACTS, PUBLICATION_ROLE, REQUIRED_PAIRS, RELEASE_ENVS, acceptedForPublication, distName, stageKey,
} from './release-matrix.mjs';
import { getInputHashes, pairsOfEnv, readLock, unionPairs } from './release-lock.mjs';
import {
  ROOT, assertRpmIdentity, readJson, releaseInputs, runtimeAssetRows, sha256, verifyReceipt,
} from './release-stage-outputs.mjs';

const DIST = resolve(ROOT, 'dist');
const SLUG = 'sanctissimissa';
const PRODUCT = 'SanctissiMissa';
const PACKAGE_NAME = 'mba.robin.sanctissimissa';
const RUNTIME_PREFIX = 'https://sanctissimissa.robin.mba/runtime/';

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

if (readFileSync(resolve(ROOT, 'version.txt'), 'utf8').trim() !== VERSION) throw new Error('version.txt and version.json disagree');
const packageJson = readJson(resolve(ROOT, 'package.json'));
const tauriConfig = readJson(resolve(ROOT, 'src-tauri/tauri.conf.json'));
if (versionJson.productName !== PRODUCT || versionJson.internalName !== SLUG ||
    versionJson.packageName !== PACKAGE_NAME || packageJson.name !== SLUG ||
    packageJson.productName !== PRODUCT || packageJson.version !== VERSION ||
    tauriConfig.productName !== PRODUCT || tauriConfig.identifier !== PACKAGE_NAME ||
    tauriConfig.version !== VERSION || tauriConfig.bundle?.android?.versionCode !== versionJson.versionCode) {
  throw new Error('Release package, Tauri and version metadata must agree on the SanctissiMissa identity/version');
}
const releaseState = readLock(resolve(ROOT, `${SLUG}-release-state.json`));
if (!releaseState) throw new Error('No release state (sanctissimissa-release-state.json)');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const sourceBranch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim();
if (releaseState.stampPending || releaseState.version !== VERSION || releaseState.sourceHead !== sourceCommit) {
  throw new Error('Release state does not match the current stamped version and source commit');
}
const currentHashes = getInputHashes(ROOT);
const frozen = releaseState.inputHashes ?? {};
if (Object.keys(frozen).length !== Object.keys(currentHashes).length ||
    !Object.entries(currentHashes).every(([name, hash]) => frozen[name] === hash)) {
  throw new Error(`Release inputs changed since the frozen build: ${Object.keys(currentHashes).join(', ')}`);
}

// §2.3 union of this lock and the windows environment copy (fails closed on identity mismatch).
const union = unionPairs(releaseState, ROOT);
const missingPairs = REQUIRED_PAIRS.filter((p) => p !== 'collect@ubuntu' && !union.includes(p));
const AUTO = process.argv.includes('--auto');
const PARTIAL = process.argv.includes('--partial') || process.env.RELEASE_PARTIAL === '1' || (AUTO && missingPairs.length > 0);
if (!PARTIAL && missingPairs.length) throw new Error(`Strict collection requires every pair; missing: ${missingPairs.join(', ')}`);
const completed = PARTIAL ? union : REQUIRED_PAIRS.filter((p) => p === 'collect@ubuntu' || union.includes(p));

const { current, modules } = releaseInputs(ROOT);
const platformOf = (id) => (id === 'web-pwa' ? 'web' : id.startsWith('linux-') ? 'linux'
  : id.startsWith('windows-') ? 'windows' : id.startsWith('android-') ? 'android' : 'input');

// Every expected (artifact, env) of the matrix, resolved against the staged dist/ entries.
const expected = [];
for (const row of ARTIFACTS) {
  for (const env of row.envs) {
    const items = row.id === 'corpus' ? (current ? [{ id: 'corpus', meta: { corpus_version: current.corpus_version }, pin: current.sha256 }] : [])
      : row.id.startsWith('module-') ? modules.map((m) => ({ id: `module-${m.editionId}`, meta: { revision: m.revision }, pin: m.sha256 }))
        : [{ id: row.id, meta: {} }];
    for (const item of items) {
      expected.push({ ...item, env, stage: row.stage, ext: row.ext, filename: distName(item.id, VERSION, env, item.meta) });
    }
  }
}
const missing = [];
const staged = [];
for (const e of expected) {
  const path = join(DIST, e.filename);
  const pair = stageKey(e.stage, e.env);
  if (existsSync(path) && statSync(path).isFile()) staged.push({ ...e, path });
  else missing.push({ id: e.id, build_env: e.env, platform: platformOf(e.id), kind: e.ext,
    reason: union.includes(pair) ? `missing dist/${e.filename}` : `pair ${pair} pending` });
}
if (!PARTIAL && missing.length) {
  throw new Error(`Strict collection is missing staged artifacts: ${missing.map((m) => `${m.id}@${m.build_env}`).join(', ')}`);
}

// Verification. Inputs are always checked against their pins; tool checks run in strict mode.
function androidTools() {
  const buildTools = resolve(process.env.ANDROID_HOME || join(homedir(), 'Android', 'Sdk'), 'build-tools');
  const latest = readdirSync(buildTools).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
  if (!latest) throw new Error('Android build-tools are required to verify APKs');
  const win = process.platform === 'win32';
  return { apksigner: resolve(buildTools, latest, win ? 'apksigner.bat' : 'apksigner'),
    aapt2: resolve(buildTools, latest, win ? 'aapt2.exe' : 'aapt2') };
}
const receiptCopy = join(DIST, 'rubric-runs', `${PREFIX}-windows-native-metadata-buildenv-windows.json`);
const RECEIPT_KIND = { 'windows-native-standalone': 'exe', 'windows-msi': 'msi', 'windows-msix': 'msix' };
let tools = null;
for (const a of staged) {
  a.sha256 = sha256(a.path);
  a.size_bytes = statSync(a.path).size;
  try {
    if (a.pin) {
      if (a.sha256 !== a.pin) throw new Error(`sha256 ≠ ${a.id === 'corpus' ? 'CURRENT.json' : 'modules.json'}`);
      a.validation = 'verified';
      continue;
    }
    if (PARTIAL) {
      a.validation = 'unverified';
      continue;
    }
    if (a.id === 'android-apk-release') {
      tools ||= androidTools();
      execFileSync(tools.apksigner, ['verify', '--verbose', a.path], { stdio: 'pipe', shell: process.platform === 'win32' });
      const badging = execFileSync(tools.aapt2, ['dump', 'badging', a.path], { encoding: 'utf8' });
      const pkg = badging.match(/^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/m);
      if (!pkg || pkg[1] !== PACKAGE_NAME || pkg[2] !== VERSION_CODE || pkg[3] !== VERSION) {
        throw new Error('embedded Android identity/version does not match version.json');
      }
    } else if (a.id === 'android-aab-release') {
      execFileSync('jarsigner', ['-verify', a.path], { stdio: 'pipe' });
    } else if (a.id === 'linux-rpm') {
      assertRpmIdentity(a.path, VERSION, ROOT);
    } else if (RECEIPT_KIND[a.id]) {
      if (!existsSync(receiptCopy)) throw new Error(`no native Windows receipt at dist/rubric-runs/${PREFIX}-windows-native-metadata-buildenv-windows.json`);
      const pin = verifyReceipt(readJson(receiptCopy), RECEIPT_KIND[a.id], DIST, VERSION, sourceCommit).sha256;
      if (pin !== a.sha256) throw new Error('bytes do not match the native Windows receipt');
    }
    // Every other row was sha-checked against its build output when its stage staged it (CC14).
    a.validation = 'verified';
  } catch (err) {
    if (!PARTIAL) throw new Error(`${a.id}@${a.env}: ${err.message}`);
    a.validation = `rejected:${err.message}`;
  }
}

/**
 * Change notes are a build INPUT: the `## v<version>` section of DOCS/CHANGELOG.md, else the
 * release-train section `## v<MAJOR>.<MINOR>.x` (L-release §2.9). A missing section yields empty
 * notes that say so — never boilerplate that reads as true.
 */
function readChangeNotes(version) {
  const path = resolve(ROOT, 'DOCS/CHANGELOG.md');
  const empty = { source: 'DOCS/CHANGELOG.md', present: false, heading: null, highlights: [],
    markdown: `No changelog section for v${version}. Add a "## v${version}" section to DOCS/CHANGELOG.md.` };
  if (!existsSync(path)) return empty;
  const lines = readFileSync(path, 'utf8').split('\n');
  const [major, minor] = version.split('.');
  let start = lines.findIndex((l) => new RegExp(`^##\\s+v${version.replace(/\./g, '\\.')}(\\s|$)`).test(l));
  if (start === -1) start = lines.findIndex((l) => new RegExp(`^##\\s+v${major}\\.${minor}\\.x(\\s|$)`).test(l));
  if (start === -1) return empty;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+v/.test(lines[i]) || /^---\s*$/.test(lines[i])) { end = i; break; }
  }
  const body = lines.slice(start + 1, end);
  // Highlights are the top-level bullets before the first sub-heading.
  const firstSub = body.findIndex((l) => /^###\s/.test(l));
  const highlights = (firstSub === -1 ? body : body.slice(0, firstSub))
    .filter((l) => /^-\s+/.test(l)).map((l) => l.replace(/^-\s+/, '').trim());
  return { source: 'DOCS/CHANGELOG.md', present: true, heading: lines[start].replace(/^##\s+/, '').trim(),
    highlights, markdown: body.join('\n').trim() };
}
const changeNotes = readChangeNotes(VERSION);
if (!changeNotes.present) console.warn(`  ⚠ no DOCS/CHANGELOG.md section for v${VERSION} — manifests will carry empty change notes.`);
else console.log(`  ⟳ change notes: ${changeNotes.highlights.length} highlight(s) from DOCS/CHANGELOG.md (${changeNotes.heading})`);

const jsonName = `${PREFIX}-release-manifest.json`;
const xmlName = `${PREFIX}-release-manifest.xml`;
const notesName = `${PREFIX}-release-notes.md`;
const inventoryName = `${PREFIX}-incomplete-inventory.md`;
// Validate predecessor metadata before any durable-file mutation.
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
if (existsSync(join(DIST, notesName)) && !readFileSync(join(DIST, notesName), 'utf8').startsWith(`# ${PRODUCT} v${VERSION}\n`)) {
  throw new Error('Existing release notes do not match this product/version');
}

const artifacts = staged.map((a) => {
  const role = PUBLICATION_ROLE(a.id, a.env);
  return {
    id: a.id, platform: platformOf(a.id), kind: a.ext, build_env: a.pin ? null : a.env,
    publication_role: role, accepted_for_publication: acceptedForPublication(role), filename: a.filename,
    ...(a.id.startsWith('windows-') ? { canonical_version: VERSION } : {}),
    ...(a.id === 'windows-msi' ? { installer_version: WINDOWS_VERSIONS.msi } : {}),
    ...(a.id === 'windows-msix' ? { installer_version: WINDOWS_VERSIONS.msix } : {}),
    size_bytes: a.size_bytes, sha256: a.sha256, validation: a.validation,
    locations: [{ role: 'canonical-checkout-dist', transport: 'local-fs', host: 'developer-workstation', path: a.path, public: false }],
  };
});
// Release inputs are staged by both envs under one name: list each file once.
const unique = artifacts.filter((a, i) => a.build_env !== null || artifacts.findIndex((b) => b.filename === a.filename) === i);
const allVerified = unique.every((a) => a.validation === 'verified');
const releaseStatus = !PARTIAL && completed.length === REQUIRED_PAIRS.length && allVerified ? 'release-candidate' : 'partial';
const verified = (id) => unique.some((a) => a.id === id && a.validation === 'verified');

const manifest = {
  schema: 'mba.robin.release-manifest.v1',
  project: PRODUCT,
  slug: SLUG,
  version: VERSION,
  versionCode: versionJson.versionCode,
  built_at: versionJson.buildDate,
  release_status: releaseStatus,
  host: { platform: process.platform, complete: releaseStatus === 'release-candidate' },
  missing,
  missing_pairs: REQUIRED_PAIRS.filter((p) => !completed.includes(p)),
  working_status: process.env.RELEASE_WORKING_STATUS || 'unknown',
  source: { commit: sourceCommit, branch: sourceBranch },
  change_notes: changeNotes,
  artifacts: unique,
  windows_versions: WINDOWS_VERSIONS,
  corpus: current ? { corpus_version: current.corpus_version, sha256: current.sha256 } : null,
  modules: modules.map((m) => ({ editionId: m.editionId, revision: m.revision, file: m.file, sha256: m.sha256 })),
  // BA.9 resolution 3: every non-same-origin row is served under the runtime prefix.
  runtime_assets: runtimeAssetRows(ROOT).map((r) => ({ id: r.id,
    mirror_url: r.runtime_path ? r.mirror_url ?? null : `${RUNTIME_PREFIX}models/sha256/${r.sha256}/${r.fileName}`,
    sha256: r.sha256, size_bytes: r.size_bytes })),
  build_envs: Object.fromEntries(RELEASE_ENVS.map((env) => [env, { completed: pairsOfEnv(completed, env) }])),
  verification: { sha256_command: 'sha256sum <filename>',
    android_signatures_verified: ['ubuntu', 'windows'].every((env) => unique.some((a) => a.id === 'android-apk-release' && a.build_env === env && a.validation === 'verified')),
    rpm_identity_verified: ['ubuntu', 'windows'].every((env) => unique.some((a) => a.id === 'linux-rpm' && a.build_env === env && a.validation === 'verified')),
    windows_package_signatures_verified: ['windows-native-standalone', 'windows-msi', 'windows-msix'].every(verified),
    windows_store_runtime: 'unverified', windows_store_acceptance: 'unverified', android_play_delivery: 'unverified (OP.11)' },
};

const xmlEscape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const xmlArtifacts = unique.map((a) =>
  `  <artifact id="${xmlEscape(a.id)}" platform="${xmlEscape(a.platform)}" kind="${xmlEscape(a.kind)}" build_env="${xmlEscape(a.build_env ?? '')}" publication_role="${a.publication_role}" accepted_for_publication="${a.accepted_for_publication}" validation="${xmlEscape(a.validation)}"><filename>${xmlEscape(a.filename)}</filename><size_bytes>${a.size_bytes}</size_bytes><sha256>${a.sha256}</sha256></artifact>`,
).join('\n');
const xmlVerification = `  <windows_versions canonical="${xmlEscape(VERSION)}" msi="${xmlEscape(WINDOWS_VERSIONS.msi)}" msix="${xmlEscape(WINDOWS_VERSIONS.msix)}"/>\n` +
  '  <verification windows_store_runtime="unverified" windows_store_acceptance="unverified" android_play_delivery="unverified (OP.11)"/>';
const xmlHighlights = changeNotes.highlights.map((h) => `    <highlight>${xmlEscape(h)}</highlight>`).join('\n');
const xmlChangeNotes = `  <change_notes source="${xmlEscape(changeNotes.source)}" present="${changeNotes.present}">\n` +
  (xmlHighlights ? `${xmlHighlights}\n` : '') + '  </change_notes>';
const xmlMissing = missing.map((entry) =>
  `    <artifact id="${xmlEscape(entry.id)}" build_env="${xmlEscape(entry.build_env)}" kind="${xmlEscape(entry.kind)}">${xmlEscape(entry.reason)}</artifact>`,
).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<release schema="mba.robin.release-manifest.v1" version="${xmlEscape(VERSION)}" versionCode="${VERSION_CODE}" status="${releaseStatus}">\n${xmlChangeNotes}\n${xmlVerification}\n${xmlArtifacts}\n  <missing>\n${xmlMissing}\n  </missing>\n</release>\n`;
const notes = `# ${PRODUCT} v${VERSION}\n\n${changeNotes.markdown}\n\n---\n\n` +
  `Built from commit ${sourceCommit}. See the adjacent release manifest for exact ` +
  `artifact hashes and verification state.\n\nCollection status: ${releaseStatus}.\n` +
  (missing.length ? `\nMissing or unverified required artifacts:\n\n${missing.map((m) => `- ${m.id} @ ${m.build_env}: ${m.reason}`).join('\n')}\n` : '') +
  '\nPlatform runtime, Store acceptance and Play delivery verification remain separate gates.\n';

// §2.10 incomplete-inventory format (partial collection only).
const label = (a) => (a.build_env ? `${a.id} @ ${a.build_env}` : `${a.id} @ input`);
const inventory = `# ${PRODUCT} v${VERSION} — incomplete inventory\n` +
  `Status: partial · Source: ${releaseState.sourceHead} · Stamp commit: ${sourceCommit} · Written: ${new Date().toISOString()}\n` +
  `Completed pairs: ${completed.join(', ') || 'none'} · Missing pairs: ${manifest.missing_pairs.join(', ') || 'none'}\n\n` +
  '| Artifact @ env | dist filename | sha256 | size_bytes | validation |\n|---|---|---|---|---|\n' +
  unique.map((a) => `| ${label(a)} | ${a.filename} | ${a.sha256} | ${a.size_bytes} | ${a.validation} |`).join('\n') +
  `\n\nMissing:\n${missing.map((m) => `- ${m.id} @ ${m.build_env}: ${m.reason}`).join('\n') || '- none'}\n`;

const metadata = [[jsonName, JSON.stringify(manifest, null, 2) + '\n'], [xmlName, xml], [notesName, notes],
  ...(PARTIAL ? [[inventoryName, inventory]] : [])];
mkdirSync(DIST, { recursive: true });
for (const [filename, content] of metadata) {
  const destination = join(DIST, filename);
  if (existsSync(destination)) {
    if (readFileSync(destination, 'utf8') === content) continue;
    // Archive-before-replace: the predecessor is kept under dist/rubric-runs/.
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = filename.slice(filename.lastIndexOf('.'));
    const qualifier = filename.slice(PREFIX.length + 1, -extension.length);
    const archive = join(DIST, 'rubric-runs', `${PREFIX}-${qualifier}-before-${timestamp}-${sha256(destination).slice(0, 12)}${extension}`);
    mkdirSync(dirname(archive), { recursive: true });
    if (existsSync(archive) && sha256(archive) !== sha256(destination)) throw new Error(`Conflicting predecessor metadata archive: ${archive}`);
    if (!existsSync(archive)) copyFileSync(destination, archive, constants.COPYFILE_EXCL);
  }
  writeFileSync(destination, content);
}

for (const a of unique) console.log(`  ✓ ${label(a)} → dist/${a.filename} (${a.validation})`);
console.log(`\nCollected ${unique.length} staged artifacts for v${VERSION}: ${releaseStatus}` +
  (PARTIAL ? `; ${manifest.missing_pairs.length} pair(s) and ${missing.length} artifact(s) pending (dist/${inventoryName}).` : '.'));
if (PARTIAL && AUTO) process.exit(2);
