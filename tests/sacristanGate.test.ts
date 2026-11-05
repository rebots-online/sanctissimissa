/**
 * SK.4 — the §K.3 credit visibility gate.
 *
 *  1. Real behavior: `isSacristanVisible` — hosted Sacristan UI mounts only
 *     for a signed-in user with remaining credits; null credits count as
 *     zero (never an optimistic yes); a credit drop to zero closes the gate.
 *  2. Source contract: App mounts the badge/panel (ChatView) and the
 *     orientation tour conditionally on that gate — never display:none — and
 *     the Account & Sync rail entry stays reachable so funding is
 *     discoverable without any nag. SettingsView's tour affordance obeys the
 *     same gate (no dead clicks when the tour cannot mount).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSacristanVisible } from '../src/core/account/useAccount.ts';

const user = { uid: 'u-1', email: 'ecclesia@sanctissimissa.org', getIdToken: async () => 'tok' };

/* ───────────────────────── gate truth table ───────────────────────────── */

test('SK.4: gate is false signed-out — even with credits somehow present', () => {
  assert.equal(isSacristanVisible(null, 420), false);
  assert.equal(isSacristanVisible(null, null), false);
  assert.equal(isSacristanVisible(null, 0), false);
});

test('SK.4: gate is false signed-in with zero or unknown credits', () => {
  assert.equal(isSacristanVisible(user, 0), false);
  assert.equal(isSacristanVisible(user, null), false, 'unknown credits are treated as zero — never optimistic');
});

test('SK.4: gate is true only for a funded signed-in account; a drop to 0 closes it', () => {
  assert.equal(isSacristanVisible(user, 420), true);
  assert.equal(isSacristanVisible(user, 1), true, 'a single remaining cent still funds a mint');
  assert.equal(isSacristanVisible(user, -5), false, 'nonsense negative balance never opens the gate');
});

/* ───────────────────────── App source contract ────────────────────────── */

const appSrc = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('SK.4: App mounts ChatView + OrientationGuide conditionally on the gate (never display:none)', () => {
  assert.match(appSrc, /const sacristanGate = isSacristanVisible\(account\.user, account\.creditUnits\);/);
  assert.match(appSrc, /\{sacristanGate && <ChatView sidecar=\{sidecar\} \/>\}/, 'badge/panel unmount with the gate');
  assert.match(appSrc, /\{sacristanGate && <OrientationGuide \/>\}/, 'orientation cards/tour unmount with the gate');
  assert.ok(!appSrc.includes('display: none'), 'gating is by mount, never by CSS hiding');
});

test('SK.4: the Account & Sync rail entry stays reachable regardless of the gate', () => {
  assert.match(appSrc, /\{ id: 'account', ico: '👤', label: 'Account & Sync' \}/, 'funding is discoverable signed-out');
  assert.match(appSrc, /view === 'account' && \(account\.user \? <AccountView \/> : <SignInView \/>\)/,
    'the frozen sign-in screen serves signed-out sessions; the account screen serves signed-in ones');
});

test('SK.4: no nag — the sign-in surface mounts only inside the account view', () => {
  const signInMounts = appSrc.match(/<SignInView \/>/g) ?? [];
  assert.equal(signInMounts.length, 1, 'exactly one mount site');
  assert.ok(!/useEffect[\s\S]*setView\('account'\)/.test(appSrc), 'nothing auto-routes to sign-in on load');
});

test('SK.4: one AccountProvider wraps the shell with the production credit reader', () => {
  assert.match(appSrc, /const CREDIT_READER = creditReaderFromEnv\(\);/, 'stable reader identity (module-level)');
  assert.match(appSrc, /<AccountProvider creditReader=\{CREDIT_READER\}>\s*\n\s*<AppShell \/>\s*\n\s*<\/AccountProvider>/);
  assert.match(appSrc, /function AppShell\(\) \{\s*\n\s*const account = useAccount\(\);/);
});

/* ───────────────────────── SettingsView tour affordance ───────────────── */

const settingsSrc = readFileSync(new URL('../src/ui/SettingsView.tsx', import.meta.url), 'utf8');

test('SK.4: the Settings tour affordance obeys the same gate (no dead clicks)', () => {
  assert.match(settingsSrc, /isSacristanVisible\(account\.user, account\.creditUnits\) && \(\s*\n\s*<button[\s\S]*?>Restart orientation<\/button>/,
    'Restart orientation mounts only while the tour can');
  assert.match(settingsSrc, /const account = useAccount\(\);/);
});
