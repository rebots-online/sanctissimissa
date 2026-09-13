import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { IDBFactory, IDBObjectStore as FakeIDBObjectStore } from 'fake-indexeddb';
import {
  SIDECAR_SCHEMA_SQL_V2,
  SidecarDb,
  migrateLocalStorageAnnotations,
} from '../src/core/accompaniment/store.ts';
import {
  addAnnotation,
  allAnnotations,
  removeAnnotation,
  updateAnnotation,
} from '../src/core/annotations/store.ts';

const CURRENT_DB = 'sanctissimissa';
const LEGACY_DB = 'standroidsmissal';
const CURRENT_ANNOTATIONS = 'sanctissimissa.annotations.v1';
const LEGACY_ANNOTATIONS = 'standroidsmissal.annotations.v1';
const SPEC_ANNOTATIONS = 'sam.annotations.v1';
const STAMP = '2026-09-04T12:00:00.000Z';

/** Each test owns its browser state; even pre-existing accessors are restored. */
function browserStorage(t: TestContext): { factory: IDBFactory; storage: Storage } {
  const factory = new IDBFactory();
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(String(key)) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(String(key)); },
    setItem(key, value) { values.set(String(key), String(value)); },
  };
  const descriptors = new Map(
    ['indexedDB', 'localStorage', 'window'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  for (const [key, value] of Object.entries({ indexedDB: factory, localStorage: storage, window: undefined })) {
    Object.defineProperty(globalThis, key, { configurable: true, enumerable: true, writable: true, value });
  }
  t.after(() => {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  return { factory, storage };
}

async function openRaw(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('blobs');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function seedRecord(factory: IDBFactory, name: string, value: unknown): Promise<void> {
  const db = await openRaw(factory, name);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Fixture transaction aborted'));
      tx.objectStore('blobs').put(value, 'sidecar.db');
    });
  } finally {
    db.close();
  }
}

/** Avoid creating a database while checking that a migration left it absent. */
async function readRecord(factory: IDBFactory, name: string): Promise<unknown> {
  if (!(await factory.databases()).some((db) => db.name === name)) return undefined;
  const db = await openRaw(factory, name);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('blobs', 'readonly');
      const request = tx.objectStore('blobs').get('sidecar.db');
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Fixture read aborted'));
    });
  } finally {
    db.close();
  }
}

/** Real SQLite bytes, including data that must survive copying and later writes. */
async function sidecarBytes(label = 'legacy'): Promise<Uint8Array> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  try {
    db.exec(SIDECAR_SCHEMA_SQL_V2);
    for (const [key, value] of [['device.id', `${label}-device`], ['reader.preference', `${label}-setting`]]) {
      db.run('INSERT INTO settings (key, device_id, updated_at, value) VALUES (?, ?, ?, ?)', [
        key, `${label}-device`, STAMP, value,
      ]);
    }
    for (const [id, deletedAt] of [['journal-entry', null], ['deleted-entry', STAMP]]) {
      db.run(
        `INSERT INTO accompaniments
          (id, device_id, updated_at, deleted_at, title, body_html, anchors, exposure, quote, quote_alt, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, `${label}-device`, STAMP, deletedAt, `${label} journal`, `<p>${label} reflection</p>`,
          '["section:Tempora/Pent1-0#Introitus"]', 'journal', 'Dominus', 'The Lord', 'gold', STAMP,
        ],
      );
    }
    db.run('INSERT INTO occurrences (id, accompaniment_id, kind, value) VALUES (?, ?, ?, ?)', [
      'journal-date', 'journal-entry', 'date', '2026-09-04',
    ]);
    return db.export();
  } finally {
    db.close();
  }
}

function annotation(id: string, note: string) {
  return { id, nodeKey: 'section:test', quote: 'Dominus', note, color: 'gold', createdAt: STAMP };
}

test('legacy sidecar migrates journal, settings, device and tombstones without changing old bytes', async (t) => {
  const { factory } = browserStorage(t);
  const legacyBytes = await sidecarBytes();
  await seedRecord(factory, LEGACY_DB, legacyBytes);

  const sdb = await SidecarDb.open();
  assert.equal(sdb.getSetting('device.id'), 'legacy-device');
  assert.equal(sdb.getSetting('reader.preference'), 'legacy-setting');
  const [journal] = sdb.list('journal');
  assert.equal(sdb.list().length, 1);
  assert.equal(journal.id, 'journal-entry');
  assert.equal(journal.title, 'legacy journal');
  assert.equal(journal.bodyHtml, '<p>legacy reflection</p>');
  assert.deepEqual(journal.anchors, ['section:Tempora/Pent1-0#Introitus']);
  assert.equal(journal.quoteAlt, 'The Lord');
  assert.equal(journal.createdAt, STAMP);
  assert.equal(journal.deviceId, 'legacy-device');
  assert.equal(journal.selectors[0].value, '2026-09-04');
  assert.ok(await readRecord(factory, CURRENT_DB) instanceof Uint8Array, 'migration commits before open returns');
  assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);

  const SQL = await initSqlJs();
  const copied = new SQL.Database(sdb.export());
  try {
    assert.deepEqual(copied.exec("SELECT deleted_at FROM accompaniments WHERE id = 'deleted-entry'")[0].values, [[STAMP]]);
  } finally {
    copied.close();
  }
  const reopened = await SidecarDb.open();
  assert.equal(reopened.getSetting('device.id'), 'legacy-device');
  assert.equal(reopened.list('journal')[0].bodyHtml, '<p>legacy reflection</p>');
  assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);
});

test('current sidecar wins over legacy and persist/reopen keeps current edits and deletions', async (t) => {
  const { factory } = browserStorage(t);
  const legacyBytes = await sidecarBytes();
  await seedRecord(factory, LEGACY_DB, legacyBytes);
  await seedRecord(factory, CURRENT_DB, await sidecarBytes('current'));

  const sdb = await SidecarDb.open();
  assert.equal(sdb.getSetting('device.id'), 'current-device');
  assert.equal(sdb.list('journal')[0].title, 'current journal');
  sdb.remove('journal-entry');
  const created = sdb.save({ id: 'new-journal', exposure: 'journal', bodyHtml: '<p>New reflection</p>' });
  assert.equal(created.deviceId, 'current-device');
  sdb.setSetting('reader.preference', 'updated setting');
  await sdb.persist();

  const reopened = await SidecarDb.open();
  assert.equal(reopened.getSetting('reader.preference'), 'updated setting');
  assert.deepEqual(reopened.list().map((entry) => entry.id), ['new-journal']);
  assert.equal(reopened.list()[0].bodyHtml, '<p>New reflection</p>');
  assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);
});

test('opening and persisting a fresh sidecar never creates an absent legacy database', async (t) => {
  const { factory } = browserStorage(t);
  const sdb = await SidecarDb.open();
  assert.ok(!(await factory.databases()).some((db) => db.name === LEGACY_DB));
  sdb.save({ id: 'fresh-journal', exposure: 'journal', title: 'First entry' });
  await sdb.persist();
  const reopened = await SidecarDb.open();
  assert.equal(reopened.list()[0].id, 'fresh-journal');
  assert.deepEqual((await factory.databases()).map((db) => db.name), [CURRENT_DB]);
});

for (const [label, wrongValue] of [
  ['string', 'not bytes'], ['null', null], ['undefined', undefined], ['ArrayBuffer', new ArrayBuffer(16)],
] as const) {
  test(`wrong current byte type (${label}) rejects without falling back or overwriting either store`, async (t) => {
    const { factory } = browserStorage(t);
    const legacyBytes = await sidecarBytes();
    await seedRecord(factory, LEGACY_DB, legacyBytes);
    await seedRecord(factory, CURRENT_DB, wrongValue);
    await assert.rejects(SidecarDb.open());
    assert.deepEqual(await readRecord(factory, CURRENT_DB), wrongValue);
    assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);
  });
}

test('invalid current SQLite bytes reject without replacing them with valid legacy data', async (t) => {
  const { factory } = browserStorage(t);
  const invalidBytes = new TextEncoder().encode('This record is not a SQLite database.');
  const legacyBytes = await sidecarBytes();
  await seedRecord(factory, CURRENT_DB, invalidBytes);
  await seedRecord(factory, LEGACY_DB, legacyBytes);
  await assert.rejects(SidecarDb.open());
  assert.deepEqual(await readRecord(factory, CURRENT_DB), invalidBytes);
  assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);
});

test('invalid legacy SQLite bytes reject before any migration record is written', async (t) => {
  const { factory } = browserStorage(t);
  const invalidBytes = new TextEncoder().encode('This legacy record is not a SQLite database.');
  await seedRecord(factory, LEGACY_DB, invalidBytes);
  await assert.rejects(SidecarDb.open());
  assert.equal(await readRecord(factory, CURRENT_DB), undefined);
  assert.deepEqual(await readRecord(factory, LEGACY_DB), invalidBytes);
});

test('a current read transaction aborted after request success rejects without legacy fallback', async (t) => {
  const { factory } = browserStorage(t);
  const currentBytes = await sidecarBytes('current');
  const legacyBytes = await sidecarBytes();
  await seedRecord(factory, CURRENT_DB, currentBytes);
  await seedRecord(factory, LEGACY_DB, legacyBytes);
  const originalOpenCursor = FakeIDBObjectStore.prototype.openCursor;
  let readSucceeded = false;
  t.mock.method(FakeIDBObjectStore.prototype, 'openCursor', function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['openCursor']>) {
    const request = Reflect.apply(originalOpenCursor, this, args) as IDBRequest;
    if (this.transaction.db.name === CURRENT_DB) {
      request.addEventListener('success', () => {
        readSucceeded = true;
        this.transaction.abort();
      }, { once: true });
    }
    return request;
  });
  await assert.rejects(SidecarDb.open());
  assert.equal(readSucceeded, true, 'failure occurs after the read request succeeds');
  t.mock.restoreAll();
  assert.deepEqual(await readRecord(factory, CURRENT_DB), currentBytes);
  assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);
});

test('migration rejects a transaction aborted after put success and leaves legacy bytes available for retry', async (t) => {
  const { factory } = browserStorage(t);
  const legacyBytes = await sidecarBytes();
  await seedRecord(factory, LEGACY_DB, legacyBytes);
  const originalPut = FakeIDBObjectStore.prototype.put;
  let putSucceeded = false;
  t.mock.method(FakeIDBObjectStore.prototype, 'put', function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
    const request = Reflect.apply(originalPut, this, args) as IDBRequest;
    if (this.transaction.db.name === CURRENT_DB) {
      request.addEventListener('success', () => {
        putSucceeded = true;
        this.transaction.abort();
      }, { once: true });
    }
    return request;
  });

  await assert.rejects(SidecarDb.open());
  assert.equal(putSucceeded, true, 'failure occurs after the write request succeeds');
  t.mock.restoreAll();
  assert.equal(await readRecord(factory, CURRENT_DB), undefined);
  assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);
  const retried = await SidecarDb.open();
  assert.equal(retried.list()[0].title, 'legacy journal');
  assert.ok(await readRecord(factory, CURRENT_DB) instanceof Uint8Array);
  assert.deepEqual(await readRecord(factory, LEGACY_DB), legacyBytes);
});

test('annotations fall back to legacy, write only the new key and keep an empty new list authoritative', (t) => {
  const { storage } = browserStorage(t);
  const legacyRaw = JSON.stringify([annotation('legacy-annotation', 'Legacy & note')]);
  storage.setItem(LEGACY_ANNOTATIONS, legacyRaw);
  assert.equal(allAnnotations()[0].note, '<p>Legacy &amp; note</p>');
  assert.equal(storage.getItem(CURRENT_ANNOTATIONS), null, 'reading compatibility data does not write it');

  updateAnnotation('legacy-annotation', { note: 'Edited in SanctissiMissa' });
  assert.equal(allAnnotations()[0].note, '<p>Edited in SanctissiMissa</p>');
  assert.notEqual(storage.getItem(CURRENT_ANNOTATIONS), null);
  const added = addAnnotation({ nodeKey: 'section:test', quote: 'Pax', note: 'New note', color: 'sky' });
  assert.equal(allAnnotations().length, 2);
  assert.equal(added.note, '<p>New note</p>');
  removeAnnotation('legacy-annotation');
  removeAnnotation(added.id);
  assert.equal(storage.getItem(CURRENT_ANNOTATIONS), '[]');
  assert.deepEqual(allAnnotations(), [], 'legacy annotations cannot resurrect after deleting the last current item');
  assert.equal(storage.getItem(LEGACY_ANNOTATIONS), legacyRaw);
});

test('an existing malformed annotation value is guarded and does not fall back to legacy', (t) => {
  const { storage } = browserStorage(t);
  const legacyRaw = JSON.stringify([annotation('legacy-annotation', 'Old note')]);
  storage.setItem(LEGACY_ANNOTATIONS, legacyRaw);
  storage.setItem(CURRENT_ANNOTATIONS, '{invalid JSON');
  assert.deepEqual(allAnnotations(), []);
  assert.equal(storage.getItem(LEGACY_ANNOTATIONS), legacyRaw);
  assert.equal(storage.getItem(CURRENT_ANNOTATIONS), '{invalid JSON');
});

test('sidecar annotation import uses only a present current key and remains idempotent after reopen', async (t) => {
  const { storage } = browserStorage(t);
  const originals = new Map([
    [SPEC_ANNOTATIONS, JSON.stringify([annotation('shared-id', 'Spec note'), annotation('spec-only', 'Deleted spec note')])],
    [LEGACY_ANNOTATIONS, JSON.stringify([annotation('shared-id', 'Legacy note'), annotation('legacy-only', 'Deleted legacy note')])],
    [CURRENT_ANNOTATIONS, JSON.stringify([annotation('shared-id', 'Current note'), annotation('current-only', 'New note')])],
  ]);
  for (const [key, value] of originals) storage.setItem(key, value);
  const sdb = await SidecarDb.open();
  assert.ok(await migrateLocalStorageAnnotations(sdb) > 0);
  assert.equal(sdb.getSetting('migrated.localStorage.v2'), '1');
  assert.equal(sdb.list().length, 2);
  assert.equal(sdb.list().find((entry) => entry.id === 'shared-id')?.bodyHtml, '<p>Current note</p>');
  assert.equal(sdb.list().find((entry) => entry.id === 'current-only')?.bodyHtml, '<p>New note</p>');
  for (const [key, value] of originals) assert.equal(storage.getItem(key), value);

  sdb.remove('shared-id');
  await sdb.persist();
  const reopened = await SidecarDb.open();
  assert.equal(await migrateLocalStorageAnnotations(reopened), 0);
  assert.deepEqual(reopened.list().map((entry) => entry.id), ['current-only']);
  assert.equal(reopened.getSetting('migrated.localStorage.v2'), '1');
  for (const [key, value] of originals) assert.equal(storage.getItem(key), value);
});

for (const [label, currentValue] of [['empty', '[]'], ['malformed', '{invalid JSON']] as const) {
  test(`sidecar import respects a ${label} current annotation value without resurrecting legacy entries`, async (t) => {
    const { storage } = browserStorage(t);
    const originals = new Map([
      [SPEC_ANNOTATIONS, JSON.stringify([annotation('spec-only', 'Deleted spec note')])],
      [LEGACY_ANNOTATIONS, JSON.stringify([annotation('legacy-only', 'Deleted legacy note')])],
      [CURRENT_ANNOTATIONS, currentValue],
    ]);
    for (const [key, value] of originals) storage.setItem(key, value);
    const sdb = await SidecarDb.open();
    assert.equal(await migrateLocalStorageAnnotations(sdb), 0);
    assert.deepEqual(sdb.list(), []);
    assert.equal(sdb.getSetting('migrated.localStorage.v2'), '1');
    const reopened = await SidecarDb.open();
    assert.deepEqual(reopened.list(), []);
    assert.equal(await migrateLocalStorageAnnotations(reopened), 0);
    for (const [key, value] of originals) assert.equal(storage.getItem(key), value);
  });
}

test('sidecar import combines legacy keys only when the current key is absent and stays idempotent', async (t) => {
  const { storage } = browserStorage(t);
  const originals = new Map([
    [SPEC_ANNOTATIONS, JSON.stringify([annotation('shared-id', 'Spec note'), annotation('spec-only', 'Spec-only note')])],
    [LEGACY_ANNOTATIONS, JSON.stringify([annotation('shared-id', 'Legacy note'), annotation('legacy-only', 'Legacy-only note')])],
  ]);
  for (const [key, value] of originals) storage.setItem(key, value);
  const sdb = await SidecarDb.open();
  assert.ok(await migrateLocalStorageAnnotations(sdb) > 0);
  assert.deepEqual(sdb.list().map((entry) => entry.id).sort(), ['legacy-only', 'shared-id', 'spec-only']);
  assert.equal(sdb.list().find((entry) => entry.id === 'shared-id')?.bodyHtml, '<p>Legacy note</p>');
  assert.equal(await migrateLocalStorageAnnotations(sdb), 0);
  const reopened = await SidecarDb.open();
  assert.equal(await migrateLocalStorageAnnotations(reopened), 0);
  assert.equal(reopened.list().length, 3);
  assert.equal(storage.getItem(CURRENT_ANNOTATIONS), null);
  for (const [key, value] of originals) assert.equal(storage.getItem(key), value);
});
