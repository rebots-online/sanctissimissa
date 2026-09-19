#!/usr/bin/env node
/**
 * provision-secrets — materialize build-local secret files from their
 * canonical pointers.
 *
 * Doctrine (operator, 2026-09-09): Admin-Manual is the ONLY secrets
 * repository — values live there cleartext (ASCII-armored + QR backups per
 * the credentials README); project `.env` files carry POINTERS to them, and
 * this script dereferences the pointers into the gitignored build-local
 * files the toolchain consumes. Nothing secret is committed here.
 *
 * Pointers honored (from .env, via pre-build-gate's env loading):
 *   SAM_KEYSTORE_PROPERTIES — path to the canonical keystore properties file.
 *                             Materialized to src-tauri/gen/android/keystore.properties.
 *   OPENROUTER_API_KEY — path to the canonical Admin-Manual markdown file.
 *                        The key for Var name `OPENROUTER_API_KEY` is extracted
 *                        from its `## OpenRouter` section (table row; value cell
 *                        beginning sk-or-) and materialized to .env.local as
 *                        VITE_OPENROUTER_API_KEY for the hosted debug Companion.
 *                        The value itself is never logged or echoed.
 *
 * Idempotent; warns (not fails) when a pointer is absent so corpus-only
 * builds stay unblocked, but FAILS when a pointer names a missing file —
 * a dangling pointer is a credential regression, not a soft skip.
 *
 * Import-safe: top-level execution is guarded by an isMain check so tests can
 * import renderEnvLocal without materializing anything.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * Replace-or-append exactly ONE `envKey=value` line in an env-file body.
 * Pure (no IO): every other line is preserved verbatim in order, duplicate
 * lines for the same key collapse into the single new line (placed where the
 * first occurrence stood, or appended at the end when absent), and the
 * input's trailing-newline state is preserved.
 * @param {string} existing current file body ('' when the file is absent)
 * @param {string} envKey variable name, e.g. 'VITE_OPENROUTER_API_KEY'
 * @param {string} value cleartext value written as the single line
 * @returns {string} the new file body
 */
export function renderEnvLocal(existing, envKey, value) {
  const hadTrailingNewline = existing.endsWith('\n');
  const body = hadTrailingNewline ? existing.slice(0, -1) : existing;
  const lines = body === '' ? [] : body.split('\n');
  const prefix = `${envKey}=`;
  const line = `${envKey}=${value}`;
  const first = lines.findIndex((l) => l.startsWith(prefix));
  const kept = lines.filter((l) => !l.startsWith(prefix));
  if (first === -1) {
    kept.push(line);
  } else {
    const before = lines.slice(0, first).filter((l) => !l.startsWith(prefix));
    kept.splice(before.length, 0, line);
  }
  const out = kept.join('\n');
  return hadTrailingNewline ? `${out}\n` : out;
}

function loadEnvPointers() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function expandHome(p) {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

/**
 * Extract the OpenRouter API key from an Admin-Manual canonical markdown
 * file: the table row (inside the `## OpenRouter` section) whose Var-name
 * cell is `OPENROUTER_API_KEY`; the key is the adjacent value cell beginning
 * `sk-or-`. Returns null when no such row exists. Never logs the value.
 * @param {string} md full markdown text of the canonical file
 * @returns {string | null} the key, or null when absent
 */
function extractOpenRouterKey(md) {
  let inSection = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      inSection = /^##\s+OpenRouter\s*$/.test(line);
      continue;
    }
    if (!inSection || !line.includes('|')) continue;
    const cells = line.split('|').map((c) => c.trim().replace(/^`+|`+$/g, ''));
    const idx = cells.indexOf('OPENROUTER_API_KEY');
    if (idx === -1) continue;
    for (let j = idx + 1; j < cells.length; j += 1) {
      if (cells[j].startsWith('sk-or-')) return cells[j];
    }
  }
  return null;
}

const MATERIALIZATIONS = [
  {
    pointer: 'SAM_KEYSTORE_PROPERTIES',
    target: join(ROOT, 'src-tauri/gen/android/keystore.properties'),
    requiredFor: 'Android release signing',
  },
  {
    pointer: 'OPENROUTER_API_KEY',
    target: join(ROOT, '.env.local'),
    requiredFor: 'hosted debug Companion (VITE_OPENROUTER_API_KEY)',
    envKey: 'VITE_OPENROUTER_API_KEY',
    mode: 'env',
  },
  // Build-time app identity (operator, 2026-09-18: ".env references
  // $ENV_VARIABLES; the build exports them"). .env carries
  // VITE_APP_NAME=$SAM_APP_NAME / VITE_APP_URL=$SAM_APP_URL; the exported
  // values are resolved into .env.local (which Vite loads with precedence).
  // Unset exports default to THIS checkout's canonical identity; a sibling
  // build (helloword) exports its own identity.
  {
    pointer: 'SAM_APP_NAME',
    target: join(ROOT, '.env.local'),
    requiredFor: 'build-time app identity (VITE_APP_NAME)',
    envKey: 'VITE_APP_NAME',
    mode: 'identity',
    fallback: 'SanctissiMissa',
  },
  {
    pointer: 'SAM_APP_URL',
    target: join(ROOT, '.env.local'),
    requiredFor: 'build-time app identity (VITE_APP_URL)',
    envKey: 'VITE_APP_URL',
    mode: 'identity',
    fallback: 'https://sanctissimissa.surge.sh',
  },
];

/**
 * 'env' materialization: dereference the pointer, extract the key from the
 * Admin-Manual markdown canonical, and render it into the env file as its
 * single `envKey=` line. Returns true on success; logs (never the value) and
 * returns false on failure.
 * @param {{ pointer: string, target: string, envKey: string }} m
 * @param {string} source absolute path to the canonical markdown file
 * @returns {boolean}
 */
function materializeEnv({ pointer, target, envKey }, source) {
  const key = extractOpenRouterKey(readFileSync(source, 'utf8'));
  if (!key) {
    console.error(`[provision-secrets] FATAL: ${pointer} canonical file has no OpenRouter key row (Var name \`OPENROUTER_API_KEY\`, value beginning sk-or-). Admin-Manual is the only secrets repository; restore it there first.`);
    return false;
  }
  const existing = existsSync(target) ? readFileSync(target, 'utf8') : '';
  writeFileSync(target, renderEnvLocal(existing, envKey, key));
  execSync(`chmod 600 ${JSON.stringify(target)}`);
  console.log(`[provision-secrets] ${pointer} -> ${target} (${envKey} materialized from Admin-Manual pointer; value not logged)`);
  return true;
}

function main() {
  const env = { ...loadEnvPointers() };
  for (const { pointer } of MATERIALIZATIONS) {
    if (process.env[pointer]) env[pointer] = process.env[pointer];
  }

  let failures = 0;
  for (const m of MATERIALIZATIONS) {
    const { pointer, target, requiredFor } = m;
    const raw = env[pointer];
    if (!raw) {
      if (m.mode === 'identity') {
        // Identity always materializes (this checkout's canonical fallback)
        // so an unexpanded $REF from .env never reaches Vite. Fresh clones
        // set VITE_APP_* directly in .env — Vite reads those natively.
        const existing = existsSync(m.target) ? readFileSync(m.target, 'utf8') : '';
        writeFileSync(m.target, renderEnvLocal(existing, m.envKey, m.fallback));
        console.log(`[provision-secrets] ${pointer} unset — ${m.envKey}=${m.fallback} (canonical identity fallback)`);
        continue;
      }
      if (existsSync(target)) {
        console.log(`[provision-secrets] ${pointer} unset — keeping existing ${target}`);
      } else {
        console.warn(`[provision-secrets] ${pointer} unset and ${target} absent — ${requiredFor} will not work until the pointer is set (see .env.example)`);
      }
      continue;
    }
    const source = expandHome(raw);
    // Identity mode: the exported build-time value (or this checkout's
    // canonical fallback) is resolved into .env.local so an unexpanded
    // `$REF` from .env can never reach the bundle.
    if (m.mode === 'identity') {
      const value = raw && !raw.startsWith('$') ? raw : m.fallback;
      const existing = existsSync(m.target) ? readFileSync(m.target, 'utf8') : '';
      writeFileSync(m.target, renderEnvLocal(existing, m.envKey, value));
      console.log(`[provision-secrets] ${pointer} -> ${m.target} (${m.envKey}=${value})`);
      continue;
    }
    // Value-form (operator directive 2026-09-18: the key is exported in the
    // current environment via .bashrc): when the variable directly carries a
    // key value (sk-or-…), use it as-is. Pointer values are NEVER printed.
    if (m.mode === 'env' && /^sk-or-/.test(raw)) {
      const existing = existsSync(m.target) ? readFileSync(m.target, 'utf8') : '';
      writeFileSync(m.target, renderEnvLocal(existing, m.envKey, raw));
      execSync(`chmod 600 ${JSON.stringify(m.target)}`);
      console.log(`[provision-secrets] ${pointer} -> ${m.target} (${m.envKey} materialized from exported environment value; value not logged)`);
      continue;
    }
    if (!existsSync(source)) {
      console.error(`[provision-secrets] FATAL: ${pointer} names no existing canonical file and is not a direct key value (value masked; never printed). Admin-Manual is the only secrets repository; restore it there or export the value, then retry.`);
      failures += 1;
      continue;
    }
    if (m.mode === 'env') {
      if (!materializeEnv(m, source)) failures += 1;
      continue;
    }
    mkdirSync(join(target, '..'), { recursive: true });
    copyFileSync(source, target);
    execSync(`chmod 600 ${JSON.stringify(target)}`);
    console.log(`[provision-secrets] ${pointer} -> ${target} (materialized from Admin-Manual pointer)`);
  }

  process.exit(failures ? 1 : 0);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
