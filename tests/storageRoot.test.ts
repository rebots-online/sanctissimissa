import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  appNamespace,
  configuredScope,
  orgNamespace,
  resolveStorage,
  storageRootName,
  type BuildStorage,
} from '../src/core/storage/root.ts';

test('build-time defaults: app namespace, common scope, org-shared root', () => {
  assert.equal(appNamespace(), 'mba.robin.sanctissimissa');
  assert.equal(configuredScope(), 'common');
  assert.equal(storageRootName(), 'mba.robin');
});

test('resolveStorage: common scope stores under the derived org root', () => {
  const build: BuildStorage = { namespace: 'mba.robin.helloword', scope: 'common' };
  assert.deepEqual(resolveStorage(build), {
    namespace: 'mba.robin.helloword',
    scope: 'common',
    org: 'mba.robin',
    root: 'mba.robin',
  });
});

test('resolveStorage: app scope stores app-private under the namespace', () => {
  const build: BuildStorage = { namespace: 'mba.robin.sanctissimissa', scope: 'app' };
  assert.equal(resolveStorage(build).root, 'mba.robin.sanctissimissa');
});

test('org root derives from the first two labels for other identifier families', () => {
  assert.equal(orgNamespace('com.rochemediaservices.someapp'), 'com.rochemediaservices');
  assert.equal(resolveStorage({ namespace: 'com.rochemediaservices.someapp', scope: 'common' }).root, 'com.rochemediaservices');
});

test('empty namespace falls through to the packaged default', () => {
  assert.equal(resolveStorage({ namespace: '', scope: 'common' }).namespace, 'mba.robin.sanctissimissa');
});
// (Unknown VITE_STORAGE_SCOPE values are normalized in vite.config.ts before
// they can reach BuildStorage — the type makes an invalid scope unexpressible.)
