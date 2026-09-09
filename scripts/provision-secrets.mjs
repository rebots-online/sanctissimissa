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
 *
 * Idempotent; warns (not fails) when a pointer is absent so corpus-only
 * builds stay unblocked, but FAILS when a pointer names a missing file —
 * a dangling pointer is a credential regression, not a soft skip.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

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

const env = { ...loadEnvPointers(), ...(process.env.SAM_KEYSTORE_PROPERTIES ? { SAM_KEYSTORE_PROPERTIES: process.env.SAM_KEYSTORE_PROPERTIES } : {}) };

const MATERIALIZATIONS = [
  {
    pointer: 'SAM_KEYSTORE_PROPERTIES',
    target: join(ROOT, 'src-tauri/gen/android/keystore.properties'),
    requiredFor: 'Android release signing',
  },
];

let failures = 0;
for (const { pointer, target, requiredFor } of MATERIALIZATIONS) {
  const raw = env[pointer];
  if (!raw) {
    if (existsSync(target)) {
      console.log(`[provision-secrets] ${pointer} unset — keeping existing ${target}`);
    } else {
      console.warn(`[provision-secrets] ${pointer} unset and ${target} absent — ${requiredFor} will not work until the pointer is set (see .env.example)`);
    }
    continue;
  }
  const source = expandHome(raw);
  if (!existsSync(source)) {
    console.error(`[provision-secrets] FATAL: ${pointer}=${raw} — canonical file missing. Admin-Manual is the only secrets repository; restore it there first.`);
    failures += 1;
    continue;
  }
  mkdirSync(join(target, '..'), { recursive: true });
  copyFileSync(source, target);
  execSync(`chmod 600 ${JSON.stringify(target)}`);
  console.log(`[provision-secrets] ${pointer} -> ${target} (materialized from Admin-Manual pointer)`);
}

process.exit(failures ? 1 : 0);
