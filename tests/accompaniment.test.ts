import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SIDECAR_SCHEMA_SQL_V2 } from '../src/core/accompaniment/store.ts';
import { matchesSelector, type DayProjection } from '../src/core/accompaniment/resolve.ts';
import { parseISODate, getWeekKey, getSeason, dateForWeekKey } from '../src/core/calendar/computus.ts';

/* ------------------------------------------------------------------ */
/* (a) Sidecar v2 schema — applied to a real SQLite (node:sqlite)      */
/* ------------------------------------------------------------------ */

function openSchema(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(SIDECAR_SCHEMA_SQL_V2);
  return db;
}

test('SIDECAR_SCHEMA_SQL_V2 creates all sidecar v2 tables', () => {
  const db = openSchema();
  const names = (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((r) => r.name);
  for (const table of [
    'accompaniments',
    'occurrences',
    'lore',
    'sidecar_embeddings',
    'parish_profile',
    'reading_progress',
    'settings',
  ]) {
    assert.ok(names.includes(table), `table ${table} exists`);
  }
  db.close();
});

test('accompaniments carries tombstone + write-metadata + highlight columns', () => {
  const db = openSchema();
  const cols = (db.prepare('PRAGMA table_info(accompaniments)').all() as { name: string }[]).map(
    (r) => r.name,
  );
  for (const col of [
    'id',
    'device_id',
    'updated_at',
    'deleted_at', // tombstone — deletes never drop rows
    'title',
    'body_pm',
    'body_html',
    'anchors',
    'exposure',
    'provenance',
    'quote',
    'quote_alt', // §7.7 dual-pane highlight
    'color',
    'created_at',
  ]) {
    assert.ok(cols.includes(col), `accompaniments.${col} present`);
  }
  db.close();
});

test('occurrences and settings shapes match the §7.6 DDL', () => {
  const db = openSchema();
  const occ = (db.prepare('PRAGMA table_info(occurrences)').all() as { name: string }[]).map((r) => r.name);
  assert.deepEqual(occ, ['id', 'accompaniment_id', 'kind', 'value']);
  const set = (db.prepare('PRAGMA table_info(settings)').all() as { name: string }[]).map((r) => r.name);
  assert.deepEqual(set, ['key', 'device_id', 'updated_at', 'value']);
  db.close();
});

/* ------------------------------------------------------------------ */
/* (b) matchesSelector — pure selector-vs-day predicate                */
/* ------------------------------------------------------------------ */

/** Day projection computed from the perpetual calendar (no db needed). */
function dayOf(iso: string, winnerKey?: string): DayProjection {
  const weekKey = getWeekKey(parseISODate(iso));
  return { date: iso, weekKey, season: getSeason(weekKey), winner: winnerKey ? { key: winnerKey } : null };
}

test('date selector matches only the exact ISO date', () => {
  const sel = { kind: 'date' as const, value: '2026-08-07' };
  assert.ok(matchesSelector(sel, dayOf('2026-08-07')));
  assert.ok(!matchesSelector(sel, dayOf('2026-08-08')));
});

test('temporal selector follows a moveable feast across a year boundary', () => {
  // Easter Tuesday 2026 (Easter 2026 = Apr 5) → week key Pasc0-2.
  const iso2026 = '2026-04-07';
  const weekKey = getWeekKey(parseISODate(iso2026));
  assert.equal(weekKey, 'Pasc0-2');
  // The same week key falls on a different date in 2027 (Easter = Mar 28).
  const iso2027 = dateForWeekKey(weekKey, '2027-04-01');
  assert.equal(iso2027, '2027-03-30');
  assert.notEqual(iso2027, iso2026);
  const sel = { kind: 'temporal' as const, value: weekKey };
  assert.ok(matchesSelector(sel, dayOf(iso2026)), 'matches the 2026 occurrence');
  assert.ok(matchesSelector(sel, dayOf(iso2027!)), 'matches the 2027 occurrence');
  assert.ok(!matchesSelector(sel, dayOf('2026-04-08')), 'rejects the following day');
});

test('sancti selector matches by MM-DD and by resolved winner key', () => {
  const sel = { kind: 'sancti' as const, value: '08-15' };
  assert.ok(matchesSelector(sel, dayOf('2026-08-15')), 'the date itself');
  assert.ok(matchesSelector(sel, dayOf('2027-08-15')), 'perpetual — any year');
  // A transferred celebration: winner key carries the Sancti file on another date.
  assert.ok(matchesSelector(sel, dayOf('2026-08-16', 'Sancti/08-15')), 'winner key match');
  assert.ok(!matchesSelector(sel, dayOf('2026-08-16')), 'no match without winner');
});

test('season selector is case-insensitive', () => {
  // 2026-02-25 is Ember Wednesday of Lent I (Quad1-3 fixture).
  const lentDay = dayOf('2026-02-25');
  assert.equal(lentDay.season, 'Lent');
  assert.ok(matchesSelector({ kind: 'season', value: 'lent' }, lentDay));
  assert.ok(matchesSelector({ kind: 'season', value: 'Lent' }, lentDay));
  assert.ok(!matchesSelector({ kind: 'season', value: 'Advent' }, lentDay));
});

test('weekly recurrence matches its weekday (0 = Sunday)', () => {
  const sel = { kind: 'recurrence' as const, value: 'weekly:3' };
  assert.ok(matchesSelector(sel, dayOf('2026-08-05')), 'Wednesday Aug 5 2026');
  assert.ok(matchesSelector(sel, dayOf('2026-08-12')), 'the next Wednesday');
  assert.ok(!matchesSelector(sel, dayOf('2026-08-06')), 'Thursday rejected');
  assert.ok(!matchesSelector(sel, dayOf('2026-08-09')), 'Sunday rejected');
});

test('nth-weekday recurrence: First Friday', () => {
  const sel = { kind: 'recurrence' as const, value: 'nth-weekday:1:5' };
  assert.ok(matchesSelector(sel, dayOf('2026-08-07')), 'first Friday of Aug 2026');
  assert.ok(!matchesSelector(sel, dayOf('2026-08-14')), 'second Friday rejected');
  assert.ok(!matchesSelector(sel, dayOf('2026-08-06')), 'first Thursday rejected');
  assert.ok(matchesSelector(sel, dayOf('2026-09-04')), 'first Friday of Sep 2026');
});

test('malformed recurrence rules never match', () => {
  for (const value of ['weekly:7', 'nth-weekday:0:5', 'nth-weekday:1:9', 'monthly:1', '']) {
    assert.ok(!matchesSelector({ kind: 'recurrence', value }, dayOf('2026-08-07')), `"${value}"`);
  }
});

test('theme selector never matches a day (themes are facets)', () => {
  const sel = { kind: 'theme' as const, value: 'mercy' };
  for (const iso of ['2026-08-07', '2026-12-25', '2026-04-05']) {
    assert.ok(!matchesSelector(sel, dayOf(iso)));
  }
});
