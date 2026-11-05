/**
 * SK.2 (§K.0/§K.2) — SignInView, bound to the frozen Stitch sign-in screen
 * `LIBS/UI/STITCH/sanctissimissa-account-20261105/sign-in.html`
 * (project 7192660594233084032, screen b54212dd53234ad6a81670e985919031).
 *
 * The frozen specimen is the authority for layout, palette, and copy — every
 * visible string below is verbatim from the freeze. The specimen's nav rail,
 * sticky header, and footer are specimen-only chrome (per the freeze header);
 * this view renders the workspace content: masthead, vellum card, honest
 * footnote. All DOM ids from the freeze are preserved for wiring
 * (#toggle-email-btn, #email-form-section, #tab-login, #tab-signup,
 * #submit-auth-btn, #forgot-link).
 *
 * §K.2 tone: a true choice that feels like a benefit. The three benefit rows
 * state plainly what signing in gives you; the footnote outside the card says
 * honestly that signed-out use just works. No nagging, no shamed declination,
 * no withheld local features.
 */

import { useState } from 'react';
import { useAccount } from '../../core/account/useAccount.ts';
import './account.css';

/* Exact frozen copy — verified against sign-in.html (SK.2 verify clause). */
const KICKER = 'Sanctificátio • Tradítio • Consecrátio';
const TITLE = 'SanctissiMissa';
const TAGLINE = 'Your missal, with you everywhere.';
const CARD_TITLE = 'Sign In';
const CARD_SUBTITLE = 'Preserve your sacred texts, notes, and study companion in harmony.';
const BENEFITS = [
  'Journal, homily drafts, highlights and bookmarks follow you across every device.',
  'Ask the Sacristan, your resident guide to the Mass and Divine Office, with credits.',
  'Buy and own editions from the bookstore forever.',
] as const;
const GOOGLE_LABEL = 'Continue with Google';
const EMAIL_TOGGLE_LABEL = 'Continue with Email';
const TOGGLE_HINT = 'Log in or create account';
const TAB_LOGIN_LABEL = 'Log In';
const TAB_SIGNUP_LABEL = 'Create Account';
const SUBMIT_LOGIN = 'Sign In to SanctissiMissa';
const SUBMIT_SIGNUP = 'Create Free Account';
const EMAIL_LABEL = 'Email address';
const PASSWORD_LABEL = 'Password';
const FORGOT_LABEL = 'Forgot password?';
const CARD_FOOTER = 'Encrypted sync with respect for sacred focus and privacy. No promotional tracking.';
const FOOTNOTE = 'You can also use SanctissiMissa signed out — everything stays on this device.';
const UNCONFIGURED_NOTE = 'Sign-in isn’t configured on this build — everything keeps working on this device.';
const RESET_NOTE = 'If that address has an account, a reset email is on its way.';

type EmailMode = 'login' | 'signup';

/** Benefit-row icons, verbatim strokes from the freeze (book / sun / bag). */
function BenefitIcon({ kind }: { kind: 0 | 1 | 2 }) {
  const paths = [
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83M12 7a5 5 0 100 10 5 5 0 000-10z',
    'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  ];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[kind]} />
    </svg>
  );
}

export default function SignInView() {
  const account = useAccount();
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<EmailMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetNote, setResetNote] = useState<string | null>(null);

  const submitLabel = mode === 'login' ? SUBMIT_LOGIN : SUBMIT_SIGNUP;

  function onToggleEmail() {
    setEmailOpen((open) => !open);
    setResetNote(null);
  }

  function onSwitchTab(next: EmailMode) {
    setMode(next);
    setResetNote(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (account.busy) return;
    setResetNote(null);
    if (mode === 'login') void account.signInEmail(email, password);
    else void account.signUpEmail(email, password);
  }

  function onForgot() {
    if (!email || account.busy) return;
    void account.resetPassword(email);
    setResetNote(RESET_NOTE);
  }

  return (
    <div className="account-surface">
      {/* Decorative cross watermark, verbatim geometry from the freeze. */}
      <div className="account-watermark" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <path d="M45,5 L55,5 L55,35 L85,35 L85,45 L55,45 L55,95 L45,95 L45,45 L15,45 L15,35 L45,35 Z" />
        </svg>
      </div>

      {/* Masthead */}
      <div className="account-masthead">
        <div className="account-kicker">{KICKER}</div>
        <h1 className="account-title">{TITLE}</h1>
        <p className="account-tagline">{TAGLINE}</p>
        <div className="ornament-rule" />
      </div>

      {/* Vellum card */}
      <div className="account-card">
        <div className="account-card-head">
          <h2>{CARD_TITLE}</h2>
          <p>{CARD_SUBTITLE}</p>
        </div>

        <ul className="benefit-rows">
          {BENEFITS.map((benefit, i) => (
            <li className="benefit-row" key={benefit}>
              <span className="benefit-icon"><BenefitIcon kind={i as 0 | 1 | 2} /></span>
              <p>{benefit}</p>
            </li>
          ))}
        </ul>

        {account.configured ? (
          <div className="account-actions">
            <button type="button" className="google-btn" disabled={account.busy} onClick={() => void account.signInGoogle()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.24 10.285V13.4h6.887C18.2 16.48 15.65 18.7 12.24 18.7c-3.7 0-6.7-3-6.7-6.7s3-6.7 6.7-6.7c1.78 0 3.39.7 4.6 1.83l2.3-2.3C17.37 3.1 14.97 2.1 12.24 2.1 6.8 2.1 2.4 6.5 2.4 12s4.4 9.9 9.84 9.9c5.68 0 9.44-3.99 9.44-9.61 0-.65-.07-1.29-.19-1.9h-9.25z" /></svg>
              <span>{GOOGLE_LABEL}</span>
            </button>

            <div className="email-accordion">
              <button
                type="button"
                id="toggle-email-btn"
                aria-expanded={emailOpen}
                aria-controls="email-form-section"
                className="email-toggle"
                onClick={onToggleEmail}
              >
                <span className="email-toggle-lead">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {EMAIL_TOGGLE_LABEL}
                </span>
                <span className="email-toggle-hint">
                  {TOGGLE_HINT}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={emailOpen ? 'chevron open' : 'chevron'}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {emailOpen && (
                <div id="email-form-section" className="email-panel">
                  <div className="auth-tabs">
                    <button type="button" id="tab-login" className={mode === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => onSwitchTab('login')}>
                      {TAB_LOGIN_LABEL}
                    </button>
                    <button type="button" id="tab-signup" className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => onSwitchTab('signup')}>
                      {TAB_SIGNUP_LABEL}
                    </button>
                  </div>

                  <form onSubmit={onSubmit}>
                    <div className="auth-field">
                      <label htmlFor="auth-email">{EMAIL_LABEL}</label>
                      <input id="auth-email" type="email" autoComplete="email" placeholder="ecclesia@sanctissimissa.org"
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="auth-field">
                      <div className="auth-field-row">
                        <label htmlFor="auth-password">{PASSWORD_LABEL}</label>
                        {mode === 'login' && (
                          <a href="#forgot-link" id="forgot-link" className="forgot-link" onClick={(e) => { e.preventDefault(); onForgot(); }}>
                            {FORGOT_LABEL}
                          </a>
                        )}
                      </div>
                      <input id="auth-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" id="submit-auth-btn" className="submit-btn" disabled={account.busy}>
                      {submitLabel}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="account-unconfigured" role="note">{UNCONFIGURED_NOTE}</p>
        )}

        {account.error && <p className="account-alert" role="alert">{account.error}</p>}
        {resetNote && <p className="account-status" role="status">{resetNote}</p>}

        <div className="account-card-footer">
          <p>{CARD_FOOTER}</p>
        </div>
      </div>

      {/* Honest quiet footnote OUTSIDE the card — the tacit option, stated once, calmly. */}
      <p className="account-footnote">{FOOTNOTE}</p>
    </div>
  );
}
