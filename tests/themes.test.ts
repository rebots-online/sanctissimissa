/**
 * Theme test suite (BX.3 + theme-matrix normalization) — validates the theme
 * registry, the family × light/dark MATRIX structure in styles.css, the
 * light≠dark guarantee for every family, seasonal-accent orthogonality, and
 * the tokenized (no-raw-hex) chrome.
 */

import { describe, it } from 'node:test';
import { strictEqual, ok, doesNotMatch } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  THEME_FAMILIES,
  DEFAULT_FAMILY,
  LEGACY_FAMILY_ALIASES,
  normalizeFamily,
  type ThemeFamily,
} from '../src/core/theme/themes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSS_PATH = join(__dirname, '../src/styles.css');
const cssContent = readFileSync(CSS_PATH, 'utf-8');

/** Core palette tokens — every family must define these in BOTH modes. */
const CORE_TOKENS = [
  '--surface',
  '--surface-2',
  '--card',
  '--card-border',
  '--rail-bg',
  '--card-shadow',
  '--ink',
  '--ink-soft',
  '--ink-faint',
  '--pane-latin-bg',
  '--pane-english-bg',
  '--rubric',
  '--dialogue-p',
  '--dialogue-s',
];

/** Mode-level element tokens — defined once per mode, never per family.
 *  (--on-accent is a constant: #fff on the accent fill in all 16 cells.) */
const MODE_TOKENS = [
  '--scheme',
  '--scrim',
  '--shadow-color',
  '--shadow-strong',
  '--mark-ann',
  '--query-bg',
  '--dot-border',
  '--lens-a',
  '--lens-b',
  '--marker-yellow',
  '--marker-green',
  '--marker-pink',
  '--marker-blue',
];

const SKEUOMORPHIC_FAMILY: ThemeFamily = 'skeuomorphic';
const HELLO_WORD_GLOW_FAMILY: ThemeFamily = 'hello-word-glow';
const RETRO_TERMINAL_FAMILY: ThemeFamily = 'retro-terminal';

/** Extract the body of a `selector { … }` block (first match). */
function blockBody(selectorPattern: RegExp): string | null {
  const match = cssContent.match(selectorPattern);
  return match?.[1] ?? null;
}

function lightBlock(family: ThemeFamily): string {
  const body = blockBody(new RegExp(`html\\[data-theme='${family}'\\]\\s*\\{([^}]+)\\}`, 's'));
  ok(body, `Missing LIGHT block html[data-theme='${family}']`);
  return body!;
}

function darkBlock(family: ThemeFamily): string {
  const body = blockBody(
    new RegExp(`html\\[data-theme='${family}'\\]\\[data-mode='dark'\\]\\s*\\{([^}]+)\\}`, 's'),
  );
  ok(body, `Missing DARK block html[data-theme='${family}'][data-mode='dark']`);
  return body!;
}

function tokenValue(block: string, token: string): string | undefined {
  return block.match(new RegExp(`${token}:\\s*([^;]+)`))?.[1]?.trim();
}

describe('Theme registry', () => {
  it('has exactly eight families', () => {
    strictEqual(THEME_FAMILIES.length, 8);
  });

  it('includes the reference identities', () => {
    ok(THEME_FAMILIES.some((f) => f.id === SKEUOMORPHIC_FAMILY), 'parchment identity must exist');
    ok(THEME_FAMILIES.some((f) => f.id === 'sanctissimissa'), 'sanctissimissa must exist');
    ok(THEME_FAMILIES.some((f) => f.id === HELLO_WORD_GLOW_FAMILY), 'hello-word-glow must exist');
  });

  it('has truthful picker labels', () => {
    const labels = THEME_FAMILIES.map((f) => f.label);
    ok(labels.includes('Parchment (skeuomorphic)'));
    ok(labels.includes('Sanctissimissa'));
    ok(labels.includes('Glass — acrylic'));
    ok(labels.includes('Glass — clear'));
    ok(labels.includes('Retro-futurist'));
    ok(labels.includes('Brutalist'));
    ok(labels.includes('Retro Terminal (CRT)'));
    ok(labels.includes('Hello Word Glow'));
  });

  it('has default family as skeuomorphic', () => {
    strictEqual(DEFAULT_FAMILY, SKEUOMORPHIC_FAMILY);
  });

  it('migrates legacy family ids on read', () => {
    strictEqual(LEGACY_FAMILY_ALIASES['neo-brutalist'], RETRO_TERMINAL_FAMILY);
    strictEqual(normalizeFamily('neo-brutalist'), RETRO_TERMINAL_FAMILY);
    strictEqual(normalizeFamily('retro-terminal'), RETRO_TERMINAL_FAMILY);
    strictEqual(normalizeFamily('bogus'), DEFAULT_FAMILY);
  });
});

describe('Theme matrix structure (family × mode)', () => {
  it('has exactly one LIGHT cell and one DARK cell per family', () => {
    for (const family of THEME_FAMILIES) {
      const light = cssContent.match(new RegExp(`html\\[data-theme='${family.id}'\\]\\s*\\{`, 'g'));
      ok(light, `No light selector found for ${family.id}`);
      strictEqual(light.length, 1, `Expected exactly one light selector for ${family.id}`);

      const dark = cssContent.match(
        new RegExp(`html\\[data-theme='${family.id}'\\]\\[data-mode='dark'\\]\\s*\\{`, 'g'),
      );
      ok(dark, `No dark selector found for ${family.id}`);
      strictEqual(dark.length, 1, `Expected exactly one dark selector for ${family.id}`);
    }
  });

  it('every family cell defines all 14 core tokens, in both modes', () => {
    for (const family of THEME_FAMILIES) {
      for (const token of CORE_TOKENS) {
        ok(
          lightBlock(family.id).includes(token),
          `Token ${token} missing in ${family.id} LIGHT block`,
        );
        ok(
          darkBlock(family.id).includes(token),
          `Token ${token} missing in ${family.id} DARK block`,
        );
      }
    }
  });

  it('REGRESSION: every family renders DIFFERENT tokens in dark mode (light ≠ dark)', () => {
    for (const family of THEME_FAMILIES) {
      const light = lightBlock(family.id);
      const dark = darkBlock(family.id);
      let diffCount = 0;
      for (const token of CORE_TOKENS) {
        const lv = tokenValue(light, token);
        const dv = tokenValue(dark, token);
        if (lv && dv && lv !== dv) diffCount++;
      }
      ok(
        diffCount >= 4,
        `${family.id}: expected ≥4 tokens to differ between light and dark, found ${diffCount} — dark mode must never be a no-op`,
      );
    }
  });

  it('families never declare the seasonal accent (data-color stays orthogonal)', () => {
    for (const family of THEME_FAMILIES) {
      doesNotMatch(lightBlock(family.id), /--accent\s*:/, `${family.id} light must not pin --accent`);
      doesNotMatch(darkBlock(family.id), /--accent\s*:/, `${family.id} dark must not pin --accent`);
    }
  });

  it('mode-level element tokens exist once per mode and dark re-derives accent-soft', () => {
    const sharedDark = cssContent.match(/html\[data-mode='dark'\]\s*\{([^}]+)\}/s);
    ok(sharedDark, 'Missing shared html[data-mode=dark] block');
    const block = sharedDark![1];
    for (const token of MODE_TOKENS) {
      ok(block.includes(token), `Mode token ${token} missing in shared dark block`);
    }
    ok(block.includes('color-mix(in srgb, var(--accent)'), 'dark --accent-soft must derive from the seasonal --accent');
  });

  it('REGRESSION: no global dark block re-declares core family tokens', () => {
    const sharedDark = cssContent.match(/html\[data-mode='dark'\]\s*\{([^}]+)\}/s);
    ok(sharedDark, 'Missing shared html[data-mode=dark] block');
    for (const token of CORE_TOKENS) {
      doesNotMatch(
        sharedDark![1],
        new RegExp(`${token}\\s*:`),
        `${token} must live in per-family cells, not the shared dark block (cascade would break dark mode again)`,
      );
    }
  });

  it('the root element follows the theme scheme', () => {
    ok(cssContent.includes('color-scheme: var(--scheme)'), ':root must set color-scheme from --scheme');
    ok(/--on-accent:\s*#fff/.test(cssContent), ':root must define the --on-accent constant');
  });
});

describe('Family idioms', () => {
  it('skeuomorphic uses layered repeating-linear gradients for fabric', () => {
    ok(
      /html\[data-theme='skeuomorphic'\]\s*\.bilingual\s+\.latin[^}]+repeating-linear-gradient/s.test(cssContent),
      'Skeuomorphic bilingual Latin must use repeating-linear-gradient',
    );
  });

  it('skeuomorphic has weft and warp patterns', () => {
    ok(
      /html\[data-theme='skeuomorphic'\][^}]+repeating-linear-gradient\(\s*90deg/s.test(cssContent),
      'Skeuomorphic must have 90deg (weft) gradient',
    );
  });

  it('skeuomorphic has piped/tented-fabric border', () => {
    ok(
      /html\[data-theme='skeuomorphic'\][^}]+border-left:\s*3px/s.test(cssContent),
      'Skeuomorphic must have piped border (3px left)',
    );
  });

  it('skeuomorphic has shallow inward tension shadow', () => {
    ok(
      /html\[data-theme='skeuomorphic'\][^}]+box-shadow:\s*inset/s.test(cssContent),
      'Skeuomorphic must have inset (tension) shadow',
    );
  });

  it('retro-terminal is a phosphor CRT: mono chrome, green ink, amber rubric, scanlines', () => {
    const light = lightBlock(RETRO_TERMINAL_FAMILY);
    const dark = darkBlock(RETRO_TERMINAL_FAMILY);
    ok(light.includes('monospace'), 'retro-terminal chrome voice must be monospace');
    ok(dark.includes('#7ee787'), 'dark CRT must use phosphor green ink');
    ok(dark.includes('#ffb000'), 'dark CRT must use amber rubric');
    ok(
      /html\[data-theme='retro-terminal'\]\[data-mode='dark'\]\s*body::after[^}]+repeating-linear-gradient/s.test(cssContent),
      'dark CRT must carry the static scanline overlay',
    );
    ok(
      /html\[data-theme='retro-terminal'\]\[data-mode='light'\]\s*body[^}]+repeating-linear-gradient/s.test(cssContent),
      'light retro-terminal must carry the green-bar paper stripes',
    );
  });

  it('retro-terminal differs from skeuomorphic in at least four tokens', () => {
    const terminal = lightBlock(RETRO_TERMINAL_FAMILY);
    const skeuo = lightBlock(SKEUOMORPHIC_FAMILY);
    let diffCount = 0;
    for (const token of CORE_TOKENS) {
      const tv = tokenValue(terminal, token);
      const sv = tokenValue(skeuo, token);
      if (tv && sv && tv !== sv) diffCount++;
    }
    ok(diffCount >= 4, `Expected at least 4 different tokens, found ${diffCount}`);
  });
});

describe('HelloWord Glow', () => {
  it('dark cell uses the exact Midnight Nave palette', () => {
    const block = darkBlock(HELLO_WORD_GLOW_FAMILY);
    ok(block.includes('#07111f'), 'Missing Midnight Nave #07111f');
    ok(block.includes('#0b1f3a'), 'Missing Chapel Blue #0b1f3a');
    ok(block.includes('#63e6ff'), 'Missing Luminous Cyan #63e6ff');
    ok(block.includes('#8b7cff'), 'Missing Marian Violet #8b7cff');
    ok(block.includes('#f3ebd8'), 'Missing Warm Ivory #f3ebd8');
    ok(block.includes('#ff6b72'), 'Missing Rubric Coral #ff6b72');
  });

  it('light cell is a real day-chapel variant (not the midnight palette)', () => {
    const block = lightBlock(HELLO_WORD_GLOW_FAMILY);
    ok(block.includes('#eef6fb'), 'Missing day-chapel surface #eef6fb');
    doesNotMatch(block, /#07111f/, 'light cell must not reuse the midnight surface');
  });

  it('has glow-pulse keyframes', () => {
    ok(cssContent.includes('@keyframes glow-pulse'), 'Missing glow-pulse keyframes');
    ok(cssContent.includes('animation: glow-pulse'), 'Missing glow-pulse animation usage');
  });

  it('has slow soft luminance pulse (no flashing, no text glow)', () => {
    const keyframes = blockBody(/@keyframes glow-pulse\s*\{([^}]+)\}/s);
    ok(keyframes, 'Could not find glow-pulse keyframes');

    const animationMatch = cssContent.match(/animation:\s*glow-pulse\s+(\d+s)/);
    ok(animationMatch, 'Could not find glow-pulse animation with timing');
    const timing = animationMatch![1];
    ok(timing.includes('4s') || timing.includes('6s'), `Pulse should be slow (4s-6s), found ${timing}`);

    ok(!keyframes!.includes('text-shadow'), 'Should not have text glow (text-shadow)');
    ok(!cssContent.includes('animation: blink'), 'Should not have flashing animations');
  });

  it('pulse colors are tokenized so the light cell pulses its own hue', () => {
    ok(cssContent.includes('var(--glow-border)'), 'keyframes must reference --glow-border');
    ok(lightBlock(HELLO_WORD_GLOW_FAMILY).includes('--glow-border:'), 'light cell must define glow tokens');
    ok(darkBlock(HELLO_WORD_GLOW_FAMILY).includes('--glow-border:'), 'dark cell must define glow tokens');
  });

  it('has reduced-motion override that disables animation', () => {
    const block = blockBody(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]+)\}/s);
    ok(block, 'Missing reduced-motion media query');
    ok(block!.includes('animation: none'), 'Reduced motion must set animation: none');
  });
});

describe('Tokenized chrome (no raw colors in shared component rules)', () => {
  const TOKENIZED_SELECTORS = [
    '.ctx-menu {',
    '.about-overlay {',
    'mark.ann {',
    'button.primary {',
    '.day-chip {',
    '.rail-toggle:hover {',
    '.theme-picker {',
    '.result-query {',
  ];

  it('former hardcoded offenders consume tokens only', () => {
    for (const selector of TOKENIZED_SELECTORS) {
      const idx = cssContent.indexOf(selector);
      ok(idx !== -1, `Selector not found: ${selector}`);
      const body = cssContent.slice(idx + selector.length, cssContent.indexOf('}', idx));
      doesNotMatch(
        body,
        /#[0-9a-fA-F]{3,8}\b|rgba?\(/,
        `${selector} must not contain raw colors — use the token contract`,
      );
    }
  });

  it('CKEditor chrome maps onto tokens (no stock save/cancel/link/highlight colors)', () => {
    const ckPath = join(__dirname, '../src/ui/richtext/richtext-theme.css');
    const ck = readFileSync(ckPath, 'utf-8');
    ok(ck.includes('--ck-color-button-save: var(--accent)'), 'save must follow the theme');
    ok(ck.includes('--ck-color-button-cancel: var(--rubric)'), 'cancel must follow the theme');
    ok(ck.includes('--ck-color-link-default: var(--accent)'), 'links must follow the theme');
    ok(ck.includes('--ck-color-highlight-background: var(--marker-yellow)'), 'highlight must follow the theme');
    ok(ck.includes('var(--on-accent)'), 'on-accent text must be tokenized');
    doesNotMatch(ck, /#008a00|#db3700|#0000f0|#ff0\b/, 'no stock CKEditor colors may remain');
  });
});

describe('ThemePicker persistence', () => {
  it('preserves corrupt JSON guarded fallback', () => {
    const themePickerPath = join(__dirname, '../src/ui/ThemePicker.tsx');
    const themePickerContent = readFileSync(themePickerPath, 'utf-8');

    ok(themePickerContent.includes('try {'), 'Must have try-catch for JSON parsing');
    ok(themePickerContent.includes('catch'), 'Must have catch block for corrupt JSON');
    ok(themePickerContent.includes('JSON.parse(raw)'), 'Must parse raw localStorage value');
  });

  it('preserves sidecar persistence behavior', () => {
    const themePickerPath = join(__dirname, '../src/ui/ThemePicker.tsx');
    const themePickerContent = readFileSync(themePickerPath, 'utf-8');

    ok(themePickerContent.includes('sidecar.getSetting'), 'Must use sidecar.getSetting');
    ok(themePickerContent.includes('sidecar.setSetting'), 'Must use sidecar.setSetting');
    ok(themePickerContent.includes('localStorage.setItem'), 'Must fallback to localStorage');
  });

  it('validates + normalizes family IDs through the registry', () => {
    const themePickerPath = join(__dirname, '../src/ui/ThemePicker.tsx');
    const themePickerContent = readFileSync(themePickerPath, 'utf-8');

    ok(themePickerContent.includes('normalizeFamily'), 'Must validate/normalize family IDs via the registry');
    ok(themePickerContent.includes('DEFAULT_FAMILY'), 'Must fall back to DEFAULT_FAMILY for invalid IDs');
  });
});
