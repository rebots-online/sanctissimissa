/**
 * Theme test suite (BX.3) — validates theme registry, CSS completeness,
 * and HelloWord Glow implementation.
 */

import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  THEME_FAMILIES,
  DEFAULT_FAMILY,
  type ThemeFamily,
} from '../src/core/theme/themes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSS_PATH = join(__dirname, '../src/styles.css');
const cssContent = readFileSync(CSS_PATH, 'utf-8');

const REQUIRED_TOKENS = [
  '--surface',
  '--surface-2',
  '--card',
  '--card-border',
  '--rail-bg',
  '--ink',
  '--ink-soft',
  '--ink-faint',
  '--pane-latin-bg',
  '--pane-english-bg',
  '--card-shadow',
  '--rubric',
  '--dialogue-p',
  '--dialogue-s',
];

const SKEUOMORPHIC_FAMILY: ThemeFamily = 'skeuomorphic';
const HELLO_WORD_GLOW_FAMILY: ThemeFamily = 'hello-word-glow';

describe('Theme registry (BX.3)', () => {
  it('has exactly eight families', () => {
    strictEqual(THEME_FAMILIES.length, 8);
  });

  it('includes hello-word-glow as the eighth family', () => {
    const glow = THEME_FAMILIES.find((f) => f.id === HELLO_WORD_GLOW_FAMILY);
    ok(glow, 'hello-word-glow must exist');
    strictEqual(glow?.label, 'Hello Word Glow');
  });

  it('has truthful picker labels', () => {
    const labels = THEME_FAMILIES.map((f) => f.label);
    ok(labels.includes('Parchment (skeuomorphic)'));
    ok(labels.includes('Sanctissimissa'));
    ok(labels.includes('Glass — acrylic'));
    ok(labels.includes('Glass — clear'));
    ok(labels.includes('Retro-futurist'));
    ok(labels.includes('Brutalist'));
    ok(labels.includes('Neo-brutalist maximalist'));
    ok(labels.includes('Hello Word Glow'));
  });

  it('has default family as skeuomorphic', () => {
    strictEqual(DEFAULT_FAMILY, SKEUOMORPHIC_FAMILY);
  });
});

describe('CSS family selectors (BX.3)', () => {
  it('has exactly one selector per registry family', () => {
    for (const family of THEME_FAMILIES) {
      // Look for the main theme selector only (html[data-theme='id'] {)
      // not selectors with additional classes
      const selectorPattern = new RegExp(`html\\[data-theme='${family.id}'\\]\\s*\\{`, 'g');
      const matches = cssContent.match(selectorPattern);
      ok(matches, `No selector found for ${family.id}`);
      strictEqual(matches?.length, 1, `Expected exactly one selector for ${family.id}, found ${matches?.length}`);
    }
  });

  it('every family selector defines all 14 semantic tokens', () => {
    for (const family of THEME_FAMILIES) {
      const selectorPattern = new RegExp(`html\\[data-theme='${family.id}'\\]\\s*\\{([^}]+)\\}`, 's');
      const match = cssContent.match(selectorPattern);
      ok(match, `Could not find selector block for ${family.id}`);
      const block = match?.[1] || '';

      for (const token of REQUIRED_TOKENS) {
        ok(
          block.includes(token),
          `Token ${token} missing in ${family.id} selector block`
        );
      }
    }
  });

  it('skeuomorphic uses layered repeating-linear gradients for fabric', () => {
    const skeuoPattern = /html\[data-theme='skeuomorphic'\]\s*\.bilingual\s+\.latin[^}]+repeating-linear-gradient/s;
    const match = cssContent.match(skeuoPattern);
    ok(match, 'Skeuomorphic bilingual Latin must use repeating-linear-gradient');
  });

  it('skeuomorphic has weft and warp patterns', () => {
    const weftWarpPattern = /html\[data-theme='skeuomorphic'\][^}]+repeating-linear-gradient\(\s*90deg/s;
    const match = cssContent.match(weftWarpPattern);
    ok(match, 'Skeuomorphic must have 90deg (weft) gradient');
  });

  it('skeuomorphic has piped/tented-fabric border', () => {
    const borderPattern = /html\[data-theme='skeuomorphic'\][^}]+border-left:\s*3px/s;
    const match = cssContent.match(borderPattern);
    ok(match, 'Skeuomorphic must have piped border (3px left)');
  });

  it('skeuomorphic has shallow inward tension shadow', () => {
    const tensionPattern = /html\[data-theme='skeuomorphic'\][^}]+box-shadow:\s*inset/s;
    const match = cssContent.match(tensionPattern);
    ok(match, 'Skeuomorphic must have inset (tension) shadow');
  });
});

describe('HelloWord Glow (BX.3)', () => {
  it('uses exact palette colors', () => {
    const glowPattern = /html\[data-theme='hello-word-glow'\]\s*\{([^}]+)\}/s;
    const match = cssContent.match(glowPattern);
    ok(match, 'Could not find hello-word-glow selector');
    const block = match?.[1] || '';

    ok(block.includes('#07111f'), 'Missing Midnight Nave #07111f');
    ok(block.includes('#0b1f3a'), 'Missing Chapel Blue #0b1f3a');
    ok(block.includes('#63e6ff'), 'Missing Luminous Cyan #63e6ff');
    ok(block.includes('#8b7cff'), 'Missing Marian Violet #8b7cff');
    ok(block.includes('#f3ebd8'), 'Missing Warm Ivory #f3ebd8');
    ok(block.includes('#ff6b72'), 'Missing Rubric Coral #ff6b72');
  });

  it('has glow-pulse keyframes', () => {
    ok(cssContent.includes('@keyframes glow-pulse'), 'Missing glow-pulse keyframes');
    ok(cssContent.includes('animation: glow-pulse'), 'Missing glow-pulse animation usage');
  });

  it('has slow soft luminance pulse (no flashing, no text glow)', () => {
    const pulsePattern = /@keyframes glow-pulse\s*\{([^}]+)\}/s;
    const match = cssContent.match(pulsePattern);
    ok(match, 'Could not find glow-pulse keyframes');
    const keyframes = match?.[1] || '';

    // Check for slow animation timing in the animation property (4s)
    const animationPattern = /animation:\s*glow-pulse\s+(\d+s)/;
    const animationMatch = cssContent.match(animationPattern);
    ok(animationMatch, 'Could not find glow-pulse animation with timing');
    const timing = animationMatch?.[1] || '';
    ok(timing.includes('4s') || timing.includes('6s'), `Pulse should be slow (4s-6s), found ${timing}`);
    
    ok(!keyframes.includes('text-shadow'), 'Should not have text glow (text-shadow)');
    ok(!cssContent.includes('animation: blink'), 'Should not have flashing animations');
  });

  it('has reduced-motion override that disables animation', () => {
    const reducedMotionPattern = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]+)\}/s;
    const match = cssContent.match(reducedMotionPattern);
    ok(match, 'Missing reduced-motion media query');
    const block = match?.[1] || '';

    ok(block.includes('animation: none'), 'Reduced motion must set animation: none');
  });
});

describe('Token differentiation (BX.3)', () => {
  it('hello-word-glow differs from skeuomorphic in at least four tokens', () => {
    const glowPattern = /html\[data-theme='hello-word-glow'\]\s*\{([^}]+)\}/s;
    const skeuoPattern = /html\[data-theme='skeuomorphic'\]\s*\{([^}]+)\}/s;

    const glowMatch = cssContent.match(glowPattern);
    const skeuoMatch = cssContent.match(skeuoPattern);

    ok(glowMatch, 'Could not find hello-word-glow selector');
    ok(skeuoMatch, 'Could not find skeuomorphic selector');

    const glowBlock = glowMatch?.[1] || '';
    const skeuoBlock = skeuoMatch?.[1] || '';

    let diffCount = 0;
    for (const token of REQUIRED_TOKENS) {
      const glowRegex = new RegExp(`${token}:\\s*([^;]+)`);
      const skeuoRegex = new RegExp(`${token}:\\s*([^;]+)`);

      const glowValue = glowBlock.match(glowRegex)?.[1]?.trim();
      const skeuoValue = skeuoBlock.match(skeuoRegex)?.[1]?.trim();

      if (glowValue && skeuoValue && glowValue !== skeuoValue) {
        diffCount++;
      }
    }

    ok(diffCount >= 4, `Expected at least 4 different tokens, found ${diffCount}`);
  });
});

describe('ThemePicker persistence (BX.3)', () => {
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

  it('preserves family ID validation', () => {
    const themePickerPath = join(__dirname, '../src/ui/ThemePicker.tsx');
    const themePickerContent = readFileSync(themePickerPath, 'utf-8');

    ok(themePickerContent.includes('FAMILY_IDS.includes'), 'Must validate family IDs');
    ok(themePickerContent.includes('DEFAULT_FAMILY'), 'Must fall back to DEFAULT_FAMILY for invalid IDs');
  });
});