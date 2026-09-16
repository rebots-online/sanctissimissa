/**
 * PWA self-applying update tests (Stanza AM.08, convention CC16). The
 * registration module (pwaUpdate.ts) is Vite-only — import.meta/virtual
 * modules — so its contract is asserted by source-parse, while the pure
 * helpers are unit-tested directly (mirroring the aboutMedia test split).
 */

import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { readFileSync } from 'node:fs';

import {
  UPDATE_READY_EVENT,
  RELOAD_ONCE_KEY,
  UNSAVED_WORK_SELECTOR,
  isChunkLoadFailure,
} from '../src/pwa/pwaUpdatePlan.ts';

describe('AM.08 isChunkLoadFailure', () => {
  test('matches stale-shell dynamic import failures across engines', () => {
    assert.ok(isChunkLoadFailure('TypeError: Failed to fetch dynamically imported module: https://x/assets/ckeditor5-abc.js'));
    assert.ok(isChunkLoadFailure('Importing a module script failed.'));
    assert.ok(isChunkLoadFailure('error loading dynamically imported module'));
  });

  test('rejects unrelated errors and empties', () => {
    assert.ok(!isChunkLoadFailure('TypeError: x is not a function'));
    assert.ok(!isChunkLoadFailure(undefined));
    assert.ok(!isChunkLoadFailure(''));
  });
});

describe('AM.08 constants', () => {
  test('update event, reload guard key and unsaved-work selector are stable', () => {
    assert.equal(UPDATE_READY_EVENT, 'sam:update-ready');
    assert.equal(RELOAD_ONCE_KEY, 'sam-sw-reload-once');
    assert.ok(UNSAVED_WORK_SELECTOR.includes('.ck-editor'));
    assert.ok(UNSAVED_WORK_SELECTOR.includes('[contenteditable="true"]'));
  });
});

describe('AM.08 registration wiring (source-parse)', () => {
  const pwa = readFileSync('./src/pwa/pwaUpdate.ts', 'utf-8');
  const main = readFileSync('./src/main.tsx', 'utf-8');
  const app = readFileSync('./src/App.tsx', 'utf-8');
  const css = readFileSync('./src/styles.css', 'utf-8');
  const vite = readFileSync('./vite.config.ts', 'utf-8');

  test('autoUpdate registration with hourly checks, initialized before render', () => {
    assert.match(vite, /registerType: 'autoUpdate'/);
    assert.match(pwa, /registerSW\(\{/);
    assert.match(pwa, /onRegisteredSW/);
    assert.match(pwa, /60 \* 60 \* 1000/);
    assert.match(main, /initSelfApplyingUpdates\(\);/);
    assert.ok(main.indexOf('initSelfApplyingUpdates()') < main.indexOf('ReactDOM.createRoot'));
  });

  test('controllerchange auto-reload is one-shot and defers to the chip only for unsaved work', () => {
    assert.match(pwa, /addEventListener\('controllerchange'/);
    assert.match(pwa, /reloadOnce\('controllerchange'\)/);
    assert.match(pwa, /busyWithUnsavedWork\(\)/);
    assert.match(pwa, /sessionStorage\.getItem\(RELOAD_ONCE_KEY\)/);
  });

  test('stale-chunk failures self-heal via a recovery reload', () => {
    assert.match(pwa, /addEventListener\('error'/);
    assert.match(pwa, /addEventListener\('unhandledrejection'/);
    assert.match(pwa, /reloadOnce\('chunk-load-failure'\)/);
  });

  test('App renders the deferred update chip wired to applyPendingUpdate', () => {
    assert.match(app, /UPDATE_READY_EVENT/);
    assert.match(app, /applyPendingUpdate\(\)/);
    assert.match(app, /sam-update-chip/);
    assert.match(css, /\.sam-update-chip/);
  });

  test('no user-facing instruction to force-reload anywhere in src', () => {
    // Catches imperative instructions to users; prose describing the CC16 rule is fine.
    const instruction = /hard.?refresh|Ctrl\+Shift|please (?:hard |force )?reload|manually reload/i;
    for (const f of ['src/App.tsx', 'src/main.tsx', 'src/pwa/pwaUpdate.ts', 'src/content/about.ts']) {
      const s = readFileSync('./' + f, 'utf-8');
      assert.ok(!instruction.test(s), f + ' must not instruct force reloads');
    }
  });
});
