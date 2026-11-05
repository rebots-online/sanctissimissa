/**
 * SK.2 — SignInView bound to the frozen sign-in screen (§K.0/§K.2).
 * Source-contract tests (house convention: the Node strip-types runner cannot
 * render React, so the view is contracted against its exact source). The
 * frozen specimen `LIBS/UI/STITCH/sanctissimissa-account-20261105/sign-in.html`
 * is the copy authority — every user-visible string below is asserted
 * verbatim against it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/ui/account/SignInView.tsx', import.meta.url), 'utf8');

/* ── frozen copy, verbatim ─────────────────────────────────────────────── */

test('SK.2: masthead carries the frozen tagline verbatim', () => {
  assert.ok(src.includes('Your missal, with you everywhere.'), 'frozen tagline');
  assert.ok(src.includes('Sanctificátio • Tradítio • Consecrátio'), 'frozen kicker');
  assert.ok(src.includes("const TITLE = 'SanctissiMissa'"), 'frozen title');
});

test('SK.2: the three benefit rows render the exact frozen copy', () => {
  assert.ok(src.includes('Journal, homily drafts, highlights and bookmarks follow you across every device.'), 'benefit 1 — sync');
  assert.ok(src.includes('Ask the Sacristan, your resident guide to the Mass and Divine Office, with credits.'), 'benefit 2 — Sacristan with credits');
  assert.ok(src.includes('Buy and own editions from the bookstore forever.'), 'benefit 3 — bookstore ownership');
});

test('SK.2: card chrome, footnote, and privacy line match the freeze', () => {
  assert.ok(src.includes("'Preserve your sacred texts, notes, and study companion in harmony.'"), 'card subtitle');
  assert.ok(src.includes("'Encrypted sync with respect for sacred focus and privacy. No promotional tracking.'"), 'card footer');
  assert.ok(
    src.includes("'You can also use SanctissiMissa signed out — everything stays on this device.'"),
    'the honest footnote outside the card',
  );
});

/* ── frozen DOM ids preserved for wiring ───────────────────────────────── */

test('SK.2: every frozen DOM id is preserved', () => {
  for (const id of ['toggle-email-btn', 'email-form-section', 'tab-login', 'tab-signup', 'submit-auth-btn', 'forgot-link']) {
    assert.ok(src.includes(`id="${id}"`), `#${id}`);
  }
});

/* ── interactions ──────────────────────────────────────────────────────── */

test('SK.2: the email accordion toggles with honest aria state', () => {
  assert.match(src, /aria-expanded=\{emailOpen\}/, 'aria-expanded tracks state');
  assert.match(src, /aria-controls="email-form-section"/, 'accordion owns its panel');
  assert.match(src, /setEmailOpen\(\(open\) => !open\)/, 'the toggle flips state');
  assert.ok(src.includes("'Continue with Email'") && src.includes("'Log in or create account'"), 'frozen toggle copy');
});

test('SK.2: tabs switch the submit label (login/signup)', () => {
  assert.ok(src.includes("'Log In'") && src.includes("'Create Account'"), 'frozen tab labels');
  assert.ok(src.includes("'Sign In to SanctissiMissa'"), 'frozen login submit');
  assert.ok(src.includes("'Create Free Account'"), 'frozen signup submit');
  assert.match(src, /mode === 'login' \? SUBMIT_LOGIN : SUBMIT_SIGNUP/, 'submit label follows the active tab');
});

test('SK.2: Google + submit wire to the injected SK.1 auth (useAccount)', () => {
  assert.match(src, /account\.signInGoogle\(\)/, 'Google button calls the injected auth');
  assert.match(src, /account\.signInEmail\(email, password\)/, 'login tab calls injected email sign-in');
  assert.match(src, /account\.signUpEmail\(email, password\)/, 'signup tab calls injected email sign-up');
  assert.match(src, /useAccount\(\)/, 'auth arrives through the SK.1 provider, not a direct SDK import');
  assert.ok(!/from 'firebase\//.test(src), 'no Firebase SDK import in the view — handles stay injected');
});

test('SK.2: forgot-password triggers resetPassword with an authored status', () => {
  assert.match(src, /account\.resetPassword\(email\)/);
  assert.match(src, /role="status"/, 'reset confirmation is a status line, not a nag');
  assert.match(
    src,
    /If that address has an account, a reset email is on its way\./,
    'the reset copy stays neutral — it never confirms or denies account existence',
  );
});

/* ── no dark patterns (§K.2 hard rule) ─────────────────────────────────── */

test('SK.2: no loss-framing, nagging, or shamed declination anywhere in the view', () => {
  const bannedPatterns = [/don't lose/i, /you'?ll lose/i, /missing out/i, /risk losing/i, /only \$?\d/i, /act now/i, /last chance/i, /limited time/i];
  for (const pattern of bannedPatterns) {
    assert.ok(!pattern.test(src), `banned pressure pattern: ${pattern}`);
  }
  assert.ok(!/[A-Za-z]!/.test(src), 'no exclamation-mark pressure in copy');
});

test('SK.2: unconfigured builds state the fact calmly and stay usable', () => {
  assert.match(src, /account\.configured \?/, 'auth actions render only when configured');
  assert.match(
    src,
    /Sign-in isn’t configured on this build — everything keeps working on this device\./,
    'the unconfigured note keeps the signed-out promise',
  );
});
