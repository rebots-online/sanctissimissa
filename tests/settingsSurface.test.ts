import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SIDECAR_SCHEMA_SQL_V2 } from '../src/core/accompaniment/store.ts';

/* CP.0 — Settings six-tab real controls (ARCHITECTURE §10.2: no static-only tab). */

const settings = readFileSync(new URL('../src/ui/SettingsView.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/core/accompaniment/store.ts', import.meta.url), 'utf8');
const corpus = readFileSync(new URL('../src/core/data/corpusDb.ts', import.meta.url), 'utf8');

test('CP.0: all six tab sections exist', () => {
  for (const t of ['appearance', 'missal', 'account', 'library', 'journal', 'sync']) {
    assert.ok(settings.includes(`tab === '${t}'`), `tab '${t}' section present`);
  }
});

test('CP.0: Missal wires mass.form + mass.roleLens (same keys TrayPanel consumes)', () => {
  assert.ok(settings.includes(`name="mass-form"`));
  assert.ok(settings.includes(`setSetting('mass.form'`));
  assert.ok(settings.includes(`name="role-lens"`));
  assert.ok(settings.includes(`setSetting('mass.roleLens'`));
});

test('CP.0: legacy mass.solemn checkbox removed (form radios derive it)', () => {
  assert.ok(!settings.includes('Solemn Mass'), 'the old placeholder-era checkbox label is gone');
  assert.ok(settings.includes(`setSetting('mass.solemn'`), 'form change still derives mass.solemn for ReaderView');
});

test('CP.0: Journal wires the mode key JournalView reads', () => {
  assert.ok(settings.includes(`name="journal-mode"`));
  assert.ok(settings.includes(`setSetting('mode'`));
});

test('CP.0: Sync exports real bytes and imports through SidecarDb.importBytes', () => {
  assert.ok(settings.includes('sidecar.export()'));
  assert.ok(settings.includes('SidecarDb.importBytes'));
  assert.ok(settings.includes('window.location.reload'));
});

test('CP.0: Account shows live gate state with an honestly-disabled restore', () => {
  assert.ok(settings.includes('VITE_REVENUECAT_API_KEY'));
  assert.ok(settings.includes('data-gate-state'));
  assert.ok(settings.includes('Restore purchases'));
  assert.ok(settings.includes('disabled={!billingConfigured}'));
});

test('CP.0: Library lists real attached sources, no fake catalog controls', () => {
  assert.ok(settings.includes('commentarySources()'));
  assert.ok(settings.includes('data-source-count'));
  assert.ok(!settings.includes('Buy'), 'no commerce affordances before the LS bookstore lands');
});

test('CP.0: SidecarDb.importBytes validates sidecar tables BEFORE persisting', () => {
  const at = store.indexOf('static async importBytes');
  assert.ok(at > 0, 'importBytes exists');
  const persistIdx = store.indexOf('save_sidecar', at);
  const idbIdx = store.indexOf('idbPut(bytes)', at);
  const firstPersist = persistIdx === -1 ? idbIdx : idbIdx === -1 ? persistIdx : Math.min(persistIdx, idbIdx);
  assert.ok(firstPersist > 0, 'a persistence call follows');
  const validation = store.slice(at, firstPersist);
  assert.ok(validation.includes("type='table'"), 'sqlite_master table validation precedes persistence');
  assert.ok(validation.includes("'settings'") && validation.includes("'accompaniments'"));
});

test('CP.0: sidecar schema still contains the tables importBytes validates against', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(SIDECAR_SCHEMA_SQL_V2);
  const names = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => String((r as { name: string }).name));
  assert.ok(names.includes('settings') && names.includes('accompaniments'));
  db.close();
});

test('CP.0: CorpusDb exposes a real commentary-source listing', () => {
  assert.ok(corpus.includes('commentarySources()'));
  assert.ok(corpus.includes("kind = 'commentary'"));
});
