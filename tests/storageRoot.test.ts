import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  appNamespace,
  configuredScope,
  orgNamespace,
  storageRootName,
} from '../src/core/storage/root.ts';

const KEYS = ['VITE_APP_NAMESPACE', 'VITE_STORAGE_SCOPE'] as const;

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

test('defaults: app namespace is the packaged identifier, scope common, root org-shared', () => {
  assert.equal(appNamespace(), 'mba.robin.sanctissimissa');
  assert.equal(configuredScope(), 'common');
  assert.equal(storageRootName(), 'mba.robin');
});

test('org namespace derives from the first two labels of the app namespace', () => {
  assert.equal(orgNamespace('mba.robin.sanctissimissa'), 'mba.robin');
  assert.equal(orgNamespace('com.rochemediaservices.someapp'), 'com.rochemediaservices');
});

test('scope common stores under the org root for any sibling app', () => {
  process.env.VITE_APP_NAMESPACE = 'mba.robin.helloword';
  assert.equal(configuredScope(), 'common');
  assert.equal(storageRootName(), 'mba.robin');
});

test('scope app stores app-private under the app namespace', () => {
  process.env.VITE_STORAGE_SCOPE = 'app';
  assert.equal(configuredScope(), 'app');
  assert.equal(storageRootName(), 'mba.robin.sanctissimissa');
});

test('empty env values fall through to defaults', () => {
  process.env.VITE_APP_NAMESPACE = '';
  process.env.VITE_STORAGE_SCOPE = '';
  assert.equal(appNamespace(), 'mba.robin.sanctissimissa');
  assert.equal(storageRootName(), 'mba.robin');
});

test('non-`app` scope values resolve to common (permissive default)', () => {
  process.env.VITE_STORAGE_SCOPE = 'shared';
  assert.equal(configuredScope(), 'common');
});
