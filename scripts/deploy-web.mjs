#!/usr/bin/env node
// deploy-web.mjs — publish the completed web build to SanctissiMissa's Surge
// domain (ARCHITECTURE.md § "Automatic Surge web publication", operator
// request 2026-09-18; signoff DOCS/ARCHITECTURE-SIGNOFF.md 2026-09-18).
//
// Contract (REL.1): publish only already-built output — no rebuild, no stamp.
// Requires dist-web/index.html; prepares the SPA fallback 200.html; invokes
// the pinned project-local Surge CLI with explicit --project/--domain.
// Credentials come from the host's Surge login or environment and are never
// read, stored or echoed here. Every failure exits nonzero so the release
// stage stays incomplete and retryable without a second stamp.

import { execFileSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Hermetic tests redirect the release root the same way release-state.mjs does.
const root = process.env.RELEASE_ROOT ? resolve(process.env.RELEASE_ROOT) : ROOT;

const DIST = resolve(root, 'dist-web');
const DOMAIN = 'sanctissimissa.surge.sh';
const INDEX = resolve(DIST, 'index.html');
const FALLBACK = resolve(DIST, '200.html');
// The pinned devDependency owns the CLI in production; DEPLOY_SURGE_BIN is a
// test/ops override for a stubbed or relocated binary.
const surgeBin = process.env.DEPLOY_SURGE_BIN
  ? resolve(process.env.DEPLOY_SURGE_BIN)
  : resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'surge.cmd' : 'surge');

if (!existsSync(INDEX)) {
  console.error(`❌ No completed web output at ${INDEX}. Run the web stage (npm run build:vite) first; deployment is build-only-then-publish and will not rebuild.`);
  process.exit(1);
}

// Surge serves 200.html for unmatched routes — the SPA fallback.
copyFileSync(INDEX, FALLBACK);

if (!existsSync(surgeBin)) {
  console.error(`❌ Pinned Surge CLI not found at ${surgeBin}. Install project dependencies (npm ci) — deployment never uses an unpinned global CLI.`);
  process.exit(1);
}

console.log(`🚀 Publishing ${DIST} → https://${DOMAIN}`);
try {
  execFileSync(surgeBin, ['--project', DIST, '--domain', DOMAIN], { stdio: 'inherit' });
} catch (error) {
  console.error(`❌ Surge publication failed (exit ${error.status ?? 'signal'}). The release stage remains incomplete; retry resumes without a new stamp.`);
  process.exit(error.status && Number.isInteger(error.status) && error.status > 0 ? error.status : 1);
}
console.log(`✅ Surge publication reported success for https://${DOMAIN}. Verify the served version before treating the deployment as live.`);
