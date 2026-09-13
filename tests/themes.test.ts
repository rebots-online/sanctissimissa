/**
 * Theme test suite (BX.3 + theme-matrix normalization) — validates the theme
 * registry, the family × light/dark MATRIX structure in styles.css, the
 * light≠dark guarantee for every family, seasonal-accent orthogonality, and
 * the tokenized (no-raw-hex) chrome.
 */

import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual, ok, doesNotMatch, rejects } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  THEME_FAMILIES,
  DEFAULT_FAMILY,
  LEGACY_FAMILY_ALIASES,
  normalizeFamily,
  normalizeThemePreference,
  readThemePreference,
  writeThemePreference,
  applyTheme,
  type ThemeFamily,
  type ThemePreference,
  type ThemeSettingsStore,
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
    ok(labels.includes('Slate'));
    ok(labels.includes('Minimal'));
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
    strictEqual(normalizeFamily('__proto__'), DEFAULT_FAMILY);
    strictEqual(normalizeFamily('glass-acrylic'), 'slate');
    strictEqual(normalizeFamily('glass-clear'), 'minimal');
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

const DEFAULT_PREFERENCE: ThemePreference = { family: 'skeuomorphic', mode: 'system', glass: false };
const THEME_CACHE_KEY = 'sam.theme.v1';

async function withGlobals(overrides: Record<string, PropertyDescriptor>, run: () => void | Promise<void>): Promise<void> {
  const originals = new Map(Object.keys(overrides).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  try {
    for (const [key, descriptor] of Object.entries(overrides)) {
      Object.defineProperty(globalThis, key, { configurable: true, ...descriptor });
    }
    await run();
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

function browserStorage(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(THEME_CACHE_KEY, raw);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

function sidecarStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  let persistCount = 0;
  const sidecar: ThemeSettingsStore = {
    getSetting: (key) => values.get(key) ?? null,
    setSetting: (key, value) => { values.set(key, value); },
    persist: async () => { persistCount++; },
  };
  return { values, sidecar, persistCount: () => persistCount };
}

describe('Independent theme preference', () => {
  it('defaults malformed and missing preferences to parchment/system with glass off', () => {
    for (const raw of [null, undefined, [], 'slate', 1, true, {}, { family: {}, mode: [], glass: 1 }]) {
      deepStrictEqual(normalizeThemePreference(raw), DEFAULT_PREFERENCE);
    }
    deepStrictEqual(normalizeThemePreference({ family: 'invalid', mode: 'invalid', glass: 'true' }), DEFAULT_PREFERENCE);
  });

  it('migrates both legacy glass palettes while preserving an explicit off preference', () => {
    for (const [legacy, family] of [['glass-acrylic', 'slate'], ['glass-clear', 'minimal']]) {
      deepStrictEqual(normalizeThemePreference({ family: legacy, mode: 'dark' }), { family, mode: 'dark', glass: true });
      for (const glass of [false, '0']) {
        deepStrictEqual(normalizeThemePreference({ family: legacy, mode: 'light', glass }), { family, mode: 'light', glass: false });
      }
    }
    deepStrictEqual(normalizeThemePreference({ family: 'neo-brutalist' }), { family: 'retro-terminal', mode: 'system', glass: false });
  });

  it('accepts booleans and the sidecar 1/0 encoding without truthy coercion', () => {
    for (const glass of [true, '1']) strictEqual(normalizeThemePreference({ glass }).glass, true);
    for (const glass of [false, '0', 'false', 'true', 1, {}, []]) strictEqual(normalizeThemePreference({ glass }).glass, false);
  });

  it('applies every palette and mode with glass on/off without modifying the seasonal color', async () => {
    const dataset: Record<string, string> = { color: 'red' };
    await withGlobals({ document: { value: { documentElement: { dataset } } } }, () => {
      for (const { id: family } of THEME_FAMILIES) {
        for (const mode of ['light', 'dark'] as const) {
          for (const glass of [false, true]) {
            applyTheme(family, mode, glass);
            deepStrictEqual(dataset, { color: 'red', theme: family, mode, glass: String(glass) });
          }
        }
      }
      applyTheme('skeuomorphic', 'light');
      strictEqual(dataset.glass, 'false', 'Omitting the optional material must turn it off');
    });
  });
});

describe('Theme preference persistence', () => {
  it('round-trips local preferences across every palette, mode preference and glass value', async () => {
    const storage = browserStorage();
    await withGlobals({ localStorage: { value: storage } }, async () => {
      for (const { id: family } of THEME_FAMILIES) {
        for (const mode of ['light', 'dark', 'system'] as const) {
          for (const glass of [false, true]) {
            const preference = { family, mode, glass };
            await writeThemePreference(null, preference);
            deepStrictEqual(readThemePreference(null), preference);
          }
        }
      }
      deepStrictEqual([...storage.values.keys()], [THEME_CACHE_KEY], 'Reuse the existing cache namespace');
    });
  });

  it('round-trips sidecar preferences and also updates the normalized local cache', async () => {
    const storage = browserStorage();
    const { sidecar, values, persistCount } = sidecarStorage();
    await withGlobals({ localStorage: { value: storage } }, async () => {
      const preference: ThemePreference = { family: 'brutalist', mode: 'light', glass: true };
      await writeThemePreference(sidecar, preference);
      deepStrictEqual(readThemePreference(sidecar), preference);
      deepStrictEqual(readThemePreference(null), preference);
      deepStrictEqual(Object.fromEntries(values), { 'theme.family': 'brutalist', 'theme.mode': 'light', 'theme.glass': '1' });
      await writeThemePreference(sidecar, { ...preference, glass: false });
      strictEqual(values.get('theme.glass'), '0');
      strictEqual(persistCount(), 2);
    });
  });

  it('valid sidecar fields take precedence while absent and corrupt fields retain local values', async () => {
    const cached: ThemePreference = { family: 'hello-word-glow', mode: 'dark', glass: true };
    await withGlobals({ localStorage: { value: browserStorage(JSON.stringify(cached)) } }, () => {
      deepStrictEqual(readThemePreference(sidecarStorage().sidecar), cached);
      deepStrictEqual(readThemePreference(sidecarStorage({ 'theme.family': 'slate' }).sidecar), { ...cached, family: 'slate' });
      deepStrictEqual(readThemePreference(sidecarStorage({ 'theme.mode': 'system', 'theme.glass': '0' }).sidecar), { ...cached, mode: 'system', glass: false });
      deepStrictEqual(readThemePreference(sidecarStorage({ 'theme.family': 'invalid', 'theme.mode': 'invalid', 'theme.glass': 'true' }).sidecar), cached);
      const corrupt = sidecarStorage().sidecar;
      corrupt.getSetting = (() => ({ invalid: true })) as unknown as ThemeSettingsStore['getSetting'];
      deepStrictEqual(readThemePreference(corrupt), cached);
    });
  });

  it('migrates legacy cache and sidecar values, including sidecar legacy material intent', async () => {
    const storage = browserStorage(JSON.stringify({ family: 'glass-clear', mode: 'dark' }));
    await withGlobals({ localStorage: { value: storage } }, async () => {
      deepStrictEqual(readThemePreference(null), { family: 'minimal', mode: 'dark', glass: true });
      await writeThemePreference(null, { family: 'minimal', mode: 'dark', glass: false });
      deepStrictEqual(readThemePreference(sidecarStorage({ 'theme.family': 'glass-acrylic' }).sidecar), { family: 'slate', mode: 'dark', glass: true });
      deepStrictEqual(readThemePreference(sidecarStorage({ 'theme.family': 'glass-acrylic', 'theme.glass': '0' }).sidecar), { family: 'slate', mode: 'dark', glass: false });
      storage.setItem(THEME_CACHE_KEY, JSON.stringify({ family: 'glass-clear', mode: 'light', glass: false }));
      deepStrictEqual(readThemePreference(null), { family: 'minimal', mode: 'light', glass: false });
    });
  });

  it('survives corrupt JSON, missing storage and malformed stored objects', async () => {
    for (const raw of [null, '{broken', 'null', '[]', '42', '{"family":1,"mode":false,"glass":{}}']) {
      await withGlobals({ localStorage: { value: browserStorage(raw) } }, () => {
        deepStrictEqual(readThemePreference(null), DEFAULT_PREFERENCE);
      });
    }
    await withGlobals({ localStorage: { value: undefined } }, async () => {
      deepStrictEqual(readThemePreference(null), DEFAULT_PREFERENCE);
      await writeThemePreference(null, DEFAULT_PREFERENCE);
    });
  });

  it('continues using the sidecar when localStorage access or writes are blocked', async () => {
    const preference: ThemePreference = { family: 'retro-terminal', mode: 'dark', glass: true };
    for (const descriptor of [
      { get: () => { throw new Error('Storage blocked'); } },
      { value: { getItem: () => { throw new Error('Read blocked'); }, setItem: () => { throw new Error('Quota exceeded'); } } },
    ]) {
      await withGlobals({ localStorage: { value: browserStorage() } }, async () => {
        await writeThemePreference(null, DEFAULT_PREFERENCE);
        deepStrictEqual(readThemePreference(null), DEFAULT_PREFERENCE);
      });
      await withGlobals({ localStorage: descriptor }, async () => {
        const { sidecar, persistCount } = sidecarStorage();
        deepStrictEqual(readThemePreference(null), DEFAULT_PREFERENCE);
        await writeThemePreference(sidecar, preference);
        deepStrictEqual(readThemePreference(sidecar), preference);
        strictEqual(persistCount(), 1);
      });
    }
  });

  it('preserves explicit session choices on reread when storage is blocked and no sidecar exists', async () => {
    const preference: ThemePreference = { family: 'hello-word-glow', mode: 'dark', glass: true };
    await withGlobals({ localStorage: { get: () => { throw new Error('Storage blocked'); } } }, async () => {
      await writeThemePreference(null, preference);
      deepStrictEqual(readThemePreference(null), preference, 'System-mode listeners must retain the live explicit selection');
    });
  });

  it('retains newer session choices over readable stale cache after quota failure until a write succeeds', async () => {
    const storage = browserStorage();
    const preference: ThemePreference = { family: 'brutalist', mode: 'dark', glass: true };
    await withGlobals({ localStorage: { value: storage } }, async () => {
      await writeThemePreference(null, DEFAULT_PREFERENCE);
      const save = storage.setItem;
      storage.setItem = () => { throw new Error('Quota exceeded'); };
      await writeThemePreference(null, preference);
      strictEqual(storage.getItem(THEME_CACHE_KEY), JSON.stringify(DEFAULT_PREFERENCE), 'Failed writes leave readable stale bytes');
      deepStrictEqual(readThemePreference(null), preference);
      deepStrictEqual(readThemePreference(null), preference, 'A successful read must not clear the unsaved preference');

      storage.setItem = save;
      await writeThemePreference(null, preference);
      storage.setItem(THEME_CACHE_KEY, JSON.stringify(DEFAULT_PREFERENCE));
      deepStrictEqual(readThemePreference(null), DEFAULT_PREFERENCE, 'Successful writes restore ordinary cache reads');
    });
  });

  it('retains the local cache when sidecar persistence rejects and exposes the rejection to its caller', async () => {
    const storage = browserStorage();
    const { sidecar } = sidecarStorage();
    sidecar.persist = async () => { throw new Error('Disk unavailable'); };
    await withGlobals({ localStorage: { value: storage } }, async () => {
      const preference: ThemePreference = { family: 'sanctissimissa', mode: 'system', glass: true };
      await rejects(writeThemePreference(sidecar, preference), /Disk unavailable/);
      deepStrictEqual(readThemePreference(null), preference);
    });
  });

  it('normalizes malformed runtime values before writing either store', async () => {
    const storage = browserStorage();
    const { sidecar } = sidecarStorage();
    await withGlobals({ localStorage: { value: storage } }, async () => {
      await writeThemePreference(sidecar, { family: 'glass-acrylic', mode: 'invalid', glass: '0' } as unknown as ThemePreference);
      const expected = { family: 'slate', mode: 'system', glass: false };
      deepStrictEqual(readThemePreference(sidecar), expected);
      deepStrictEqual(readThemePreference(null), expected);
    });
  });
});

describe('Theme control and startup integration', () => {
  const picker = readFileSync(join(__dirname, '../src/ui/ThemePicker.tsx'), 'utf-8');
  const app = readFileSync(join(__dirname, '../src/App.tsx'), 'utf-8');

  it('offers an independent native checkbox with associated explanatory text', () => {
    ok(/type\s*=\s*["']checkbox["']/.test(picker));
    ok(picker.includes('Frosted glass'));
    ok(picker.includes('theme-glass-toggle') && picker.includes('theme-glass-help'));
    ok(picker.includes('useId') && picker.includes('aria-describedby'));
    ok(picker.includes('Text and controls stay clear.'));
  });

  it('shares persistence and handles sidecar failures at the component boundary', () => {
    ok(picker.includes('readThemePreference(sidecar)'));
    ok(/writeThemePreference\([\s\S]*?\.catch\(/.test(picker));
    doesNotMatch(picker, /JSON\.parse|localStorage\./, 'ThemePicker must use the shared persistence layer');
  });

  it('restores appearance in App and cleans up the system-mode listener', () => {
    ok(app.includes('readThemePreference(sidecar)'));
    ok(app.includes("matchMedia('(prefers-color-scheme: dark)')"));
    ok(/addEventListener\(['"]change['"]/.test(app));
    ok(/removeEventListener\(['"]change['"]/.test(app));
    ok(app.includes("preference.mode === 'system' ? systemMode() : preference.mode"), 'System changes must honor an explicit mode');
  });
});

describe('Palette-independent glass material', () => {
  const rules = [...cssContent.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match) => ({ selector: match[1].trim(), body: match[2] }));
  const glassRules = rules.filter(({ selector }) => /\[data-glass\s*=\s*['"]true['"]\]/.test(selector));

  it('gates shared material on glass rather than a particular palette', () => {
    ok(glassRules.length > 0, 'An independent material selector must exist');
    for (const { selector, body } of glassRules) {
      doesNotMatch(selector, /\[data-theme\s*=/, 'Glass cannot depend on a family value');
      doesNotMatch(body, /(?:^|[;\n])\s*(?:filter|opacity)\s*:/, 'Keep text and controls sharp');
    }
    doesNotMatch(cssContent, /\[data-theme\s*=\s*['"]glass-(?:acrylic|clear)['"]\]/);
    ok(glassRules.some(({ body }) => /backdrop-filter\s*:/.test(body)));
    ok(glassRules.some(({ body }) => /-webkit-backdrop-filter\s*:/.test(body)));
    ok(glassRules.some(({ body }) => /color-mix\([^;]+transparent/s.test(body)), 'Material must derive translucency from palette tokens');
  });

  it('covers inactive tabs with legible labels while preserving the active accent fill', () => {
    const inactiveTabs = glassRules.filter(({ selector }) => /\.settings-tabs\s+button:not\(\.active\)/.test(selector));
    ok(inactiveTabs.length > 0);
    ok(inactiveTabs.some(({ body }) => /color\s*:\s*var\(--ink\)/.test(body)));
    ok(glassRules.some(({ selector, body }) => /:focus-visible/.test(selector) && /outline\s*:/.test(body)));
    const activeTabs = rules.find(({ selector }) => selector === 'button.active');
    ok(activeTabs && /background\s*:\s*var\(--accent\)/.test(activeTabs.body));
  });

  it('limits optional material to supported screens and restores opacity for reduced transparency', () => {
    ok(/@media\s+screen\s*\{/.test(cssContent), 'Print retains opaque baseline fills');
    ok(/@supports\s*\(\(backdrop-filter\s*:[\s\S]*?or\s*\(-webkit-backdrop-filter\s*:/.test(cssContent));
    const reduced = cssContent.match(/@media\s*\(prefers-reduced-transparency\s*:\s*reduce\)\s*\{\s*html\[data-glass\s*=\s*['"]true['"]\]\s*\{([^}]+)\}/);
    ok(reduced, 'Reduced transparency requires an explicit opaque fallback');
    ok(/--glass-strength\s*:\s*100%/.test(reduced[1]));
    ok(/--glass-chrome-strength\s*:\s*100%/.test(reduced[1]));
    ok(/--glass-backdrop\s*:\s*none/.test(reduced[1]));
    for (const family of ['slate', 'minimal'] as const) {
      for (const block of [lightBlock(family), darkBlock(family)]) {
        doesNotMatch(tokenValue(block, '--card') ?? '', /rgba?\(|transparent/, 'Former glass palettes must have opaque base cards');
      }
    }
  });
});
