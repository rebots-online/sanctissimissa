import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticStore, diagnostics, serializeDebug, traceOperation } from '../src/core/diagnostics/store.ts';
import { installDiagnosticCapture } from '../src/core/diagnostics/capture.ts';

test('diagnostics retain receipt order, frozen payloads and an honest dropped count', () => {
  const store = new DiagnosticStore(2);
  const input = { stage: 'loading' };
  store.record('native', 'progress', input);
  input.stage = 'changed';
  assert.equal(JSON.parse(store.snapshot()[0].detail).stage, 'loading');
  store.record('native', 'ready', { progress: 1 });
  store.record('console', 'error', new Error('raw failure'));
  assert.deepEqual(store.snapshot().map(event => event.seq), [2, 3]);
  assert.equal(store.dropped, 1);
  const exported = store.export().split('\n').map(line => JSON.parse(line));
  assert.equal(JSON.parse(exported[1].detail).message, 'raw failure');
  assert.match(JSON.parse(exported[1].detail).stack, /Error: raw failure/);
});

test('cyclic data and a broken subscriber cannot stop recording', () => {
  const store = new DiagnosticStore();
  let notified = 0;
  store.subscribe(() => { throw new Error('viewer failed'); });
  store.subscribe(() => { notified++; });
  const circular: { self?: unknown } = {};
  circular.self = circular;
  store.record('test', 'cycle', circular);
  assert.equal(notified, 1);
  assert.equal(JSON.parse(store.snapshot()[0].detail).self, '[Circular]');
  assert.deepEqual(JSON.parse(serializeDebug(new Uint8Array(2048))), { type: 'Uint8Array', byteLength: 2048 });
});

test('failed operations keep the original error and correlate start and failure', async () => {
  diagnostics.clear();
  const original = new Error('engine missing', { cause: new Error('native detail') });
  await assert.rejects(traceOperation('test-ipc', 'load', { path: '/model.gguf' }, async () => { throw original; }), error => error === original);
  const events = diagnostics.snapshot().filter(event => event.source === 'test-ipc');
  assert.deepEqual(events.map(event => event.operation), ['load.start', 'load.error']);
  assert.ok(events[0].traceId);
  assert.equal(events[0].traceId, events[1].traceId);
  assert.equal(JSON.parse(events[1].detail).error.cause.message, 'native detail');
});

test('capture installs even when __TAURI_INTERNALS__.invoke is read-only (WebKitGTK/JSC regression)', () => {
  // WebKitGTK's Tauri injection exposes invoke as a read-only property; the
  // strict-mode assignment used to throw during bundle evaluation, leaving
  // div#root empty — the v1.56/v1.57 desktop blank-window regression.
  diagnostics.clear();
  const internals = { invoke: (command: string) => Promise.resolve(command) };
  Object.defineProperty(internals, 'invoke', { writable: false, configurable: false, value: internals.invoke });
  (globalThis as { window?: unknown }).window = {
    __TAURI_INTERNALS__: internals,
    addEventListener: () => {},
    fetch: async () => { throw new Error('unused in this test'); },
  };
  assert.doesNotThrow(() => installDiagnosticCapture(), 'boot must survive a read-only invoke');
  const note = diagnostics.snapshot().find(event => event.source === 'diagnostics' && /invoke/.test(event.detail) && /read-only/.test(event.detail));
  assert.ok(note, 'the unavailable native-ipc tracing is recorded honestly');
  delete (globalThis as { window?: unknown }).window;
});
