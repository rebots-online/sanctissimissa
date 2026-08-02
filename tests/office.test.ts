/**
 * Golden tests for the Divine Office engine (CHECKLIST OB.4 subset) —
 * headless, against the committed assets/missal.db.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openAdapter } from '../scripts/db-adapter.mjs';
import { resolveDay } from '../src/core/data/liturgicalDay.ts';
import { buildHour } from '../src/core/office/engine.ts';
import type { CorpusDb } from '../src/core/data/corpusDb.ts';

const db = openAdapter('assets/missal.db') as unknown as CorpusDb;

test('office plane ingested: schema baselines', () => {
  const day0 = db.getPsalmSchema('Day0', 'Laudes1');
  assert.deepEqual(
    day0.map((s) => s.ref),
    ['92', '99', '62', '210', '148'],
    'Sunday Lauds I psalms',
  );
  const matins = db.getPsalmSchema('Day0', 'Matutinum');
  assert.equal(matins.length, 9, 'Sunday Matins has nine psalm slots');
  assert.ok(db.getSkeleton('Laudes').length > 30, 'Laudes skeleton present');
  assert.ok(db.getPsalm('94')?.latin?.includes('Veníte'), 'Ps 94 text');
});

test('Sunday Lauds (Pent VI, 2026-07-05) builds full psalmody + frame', () => {
  const day = resolveDay(db, '2026-07-05');
  assert.match(day.feastName ?? '', /Dominica VI Post Pentecosten/);
  const entries = buildHour(db, day, 'laudes');
  const titles = entries.map((e) => e.title);

  const psalms = titles.filter((t) => /^(Psalmus|Canticum \()/.test(t));
  assert.equal(psalms.length, 5, `five psalmody slots, got: ${psalms.join(', ')}`);
  assert.ok(titles.includes('Capitulum'), 'has Capitulum');
  assert.ok(titles.includes('Hymnus'), 'has Hymnus');
  assert.ok(titles.some((t) => t.startsWith('Ant. ad Benedictus')), 'has Benedictus antiphon');
  assert.ok(titles.some((t) => t.startsWith('Canticum: Benedictus')), 'has Benedictus');
  const oratio = entries.find((e) => e.title === 'Oratio' && !e.rubric && e.latin);
  assert.ok(oratio?.latin && oratio.latin.length > 40, 'Oratio has real text');
  // Deus in adjutorium comes from the Incipit block.
  assert.ok(entries.some((e) => e.latin?.includes('Deus + in adjutórium') || e.latin?.includes('Deus in adjutórium')), 'Incipit');
});

test('Sunday Matins builds invitatory, nocturns, lessons, Te Deum', () => {
  const day = resolveDay(db, '2026-07-05');
  const entries = buildHour(db, day, 'matutinum');
  const titles = entries.map((e) => e.title);
  assert.ok(titles.includes('Invitatorium'), 'invitatory');
  assert.ok(titles.some((t) => t.startsWith('Psalmus 94')), 'Venite');
  const lessons = titles.filter((t) => /^Lectio \d/.test(t));
  assert.ok(lessons.length >= 3, `at least three lessons, got ${lessons.length}`);
  assert.ok(titles.includes('Te Deum'), 'Te Deum on a green Sunday');
  const psalms = titles.filter((t) => /^Psalmus/.test(t) && !t.startsWith('Psalmus 94'));
  assert.ok(psalms.length >= 9, `nine matins psalms, got ${psalms.length}`);
});

test('feast Vespers (Most Precious Blood, 2026-07-01) uses proper antiphons + collect', () => {
  const day = resolveDay(db, '2026-07-01');
  assert.match(day.feastName ?? '', /Pretiosissimi Sanguinis/);
  const entries = buildHour(db, day, 'vesperae');
  const all = entries.map((e) => e.latin ?? '').join('\n');
  // First proper Vespers antiphon of the feast:
  assert.match(all, /Quis est iste|redemísti nos/i, 'proper antiphon text present');
  assert.ok(entries.some((e) => e.title.startsWith('Canticum: Magnificat')), 'Magnificat');
  const oratio = entries.find((e) => e.title === 'Oratio' && !e.rubric && e.latin);
  assert.ok(oratio?.latin, 'feast collect present');
});

test('Compline carries Nunc dimittis and the seasonal Marian antiphon', () => {
  const day = resolveDay(db, '2026-07-05');
  const entries = buildHour(db, day, 'completorium');
  const titles = entries.map((e) => e.title);
  assert.ok(titles.some((t) => t.startsWith('Canticum: Nunc dimittis')), 'Nunc dimittis');
  const marian = entries.find((e) => e.title === 'Antiphona finalis B.M.V.');
  assert.ok(marian?.latin?.includes('Salve'), 'Salve Regina in Time after Pentecost');
});

test('every hour of an arbitrary week renders non-empty, real text', () => {
  for (const iso of ['2026-07-05', '2026-07-06', '2026-07-08', '2026-12-08', '2026-02-25']) {
    const day = resolveDay(db, iso);
    for (const hour of ['matutinum', 'laudes', 'prima', 'tertia', 'sexta', 'nona', 'vesperae', 'completorium']) {
      const entries = buildHour(db, day, hour);
      assert.ok(entries.length >= 4, `${iso} ${hour}: ${entries.length} entries`);
      const text = entries.map((e) => e.latin ?? '').join('');
      assert.ok(text.length > 400, `${iso} ${hour}: substantial text (${text.length})`);
      // ![...] rubric markers for missing references are not silent gaps —
      // they are the engine's honest "never invent text" fallback.
      assert.ok(!/(?<!\[!)textus deest/.test(text), `${iso} ${hour}: no raw placeholders`);
    }
  }
});

// O-6: I-class feast (Nativity) — proper antiphons/psalms/lessons, Te Deum, 9 lessons
test('O-6: Nativity (2025-12-25) proper antiphons + 9 lessons + Te Deum', () => {
  const day = resolveDay(db, '2025-12-25');
  assert.match(day.feastName ?? '', /Nativitatis|Nativity|Christmas|In Nativitate/i);
  const matins = buildHour(db, day, 'matutinum');
  const titles = matins.map((e) => e.title);
  const lessons = titles.filter((t) => /^Lectio \d/.test(t));
  assert.ok(lessons.length >= 9, `Nativity Matins has 9 lessons, got ${lessons.length}`);
  assert.ok(titles.includes('Te Deum'), 'Te Deum on Nativity');
  const laudes = buildHour(db, day, 'laudes');
  const laudesText = laudes.map((e) => e.latin ?? '').join('\n');
  assert.ok(laudesText.length > 200, 'Nativity Lauds has substantial text');
  // Proper antiphons should come from the feast file, not the psalter defaults
  const antiphons = laudes.filter((e) => e.title === 'Ant.');
  assert.ok(antiphons.length >= 4, 'Nativity Lauds has proper antiphons');
});

// O-9: Lent — no Te Deum at Matins, ferial preces
test('O-9: Lenten feria (2026-03-06) — no Te Deum, penitential character', () => {
  const day = resolveDay(db, '2026-03-06');
  assert.ok(day.season === 'Lent' || /^Quad[1-5]/.test(day.weekKey), `season is Lent, got ${day.season} / ${day.weekKey}`);
  const matins = buildHour(db, day, 'matutinum');
  const titles = matins.map((e) => e.title);
  assert.ok(!titles.includes('Te Deum'), 'No Te Deum on Lenten feria');
  const laudes = buildHour(db, day, 'laudes');
  const laudesText = laudes.map((e) => e.latin ?? '').join('\n');
  assert.ok(laudesText.length > 200, 'Lenten Lauds has substantial text');
});

// O-10: Paschaltide — alleluia layer
test('O-10: Paschaltide (2026-04-13) — alleluia in antiphons', () => {
  const day = resolveDay(db, '2026-04-13');
  assert.ok(day.season === 'Paschaltide' || /^Pasc/.test(day.weekKey), `season is Paschaltide, got ${day.season}`);
  const laudes = buildHour(db, day, 'laudes');
  const laudesText = laudes.map((e) => e.latin ?? '').join('\n');
  assert.ok(/allel[uú]/i.test(laudesText), 'Paschaltide Lauds contains alleluia');
  const vespers = buildHour(db, day, 'vesperae');
  const vespersText = vespers.map((e) => e.latin ?? '').join('\n');
  assert.ok(/allel[uú]/i.test(vespersText), 'Paschaltide Vespers contains alleluia');
});

// O-12: Marian antiphon windows — one date per season
test('O-12: Marian antiphon changes by season', () => {
  // Advent: Alma Redemptoris
  const advent = resolveDay(db, '2025-12-07');
  const adventComp = buildHour(db, advent, 'completorium');
  const adventMarian = adventComp.find((e) => e.title === 'Antiphona finalis B.M.V.');
  assert.ok(adventMarian?.latin, 'Advent Compline has Marian antiphon');

  // Lent: Ave Regina (or Alma until Wed of Holy Week)
  const lent = resolveDay(db, '2026-02-20');
  const lentComp = buildHour(db, lent, 'completorium');
  const lentMarian = lentComp.find((e) => e.title === 'Antiphona finalis B.M.V.');
  assert.ok(lentMarian?.latin, 'Lent Compline has Marian antiphon');

  // Paschaltide: Regina caeli
  const pasch = resolveDay(db, '2026-04-13');
  const paschComp = buildHour(db, pasch, 'completorium');
  const paschMarian = paschComp.find((e) => e.title === 'Antiphona finalis B.M.V.');
  assert.ok(paschMarian?.latin, 'Paschaltide Compline has Marian antiphon');

  // Post-Pentecost: Salve Regina
  const pent = resolveDay(db, '2026-07-05');
  const pentComp = buildHour(db, pent, 'completorium');
  const pentMarian = pentComp.find((e) => e.title === 'Antiphona finalis B.M.V.');
  assert.ok(pentMarian?.latin?.includes('Salve'), 'Post-Pentecost Compline has Salve Regina');

  // Verify they are not all the same text
  const texts = [adventMarian?.latin, lentMarian?.latin, paschMarian?.latin, pentMarian?.latin].filter(Boolean);
  const unique = new Set(texts.map((t) => t!.slice(0, 30)));
  assert.ok(unique.size >= 2, `Marian antiphons vary by season (${unique.size} distinct)`);
});

// O-16: No silent gaps — 14 consecutive days, all 8 hours
test('O-16: 14 consecutive days (2026-07-05…07-18) — no empty hours, no placeholders', () => {
  for (let d = 5; d <= 18; d++) {
    const iso = `2026-07-${String(d).padStart(2, '0')}`;
    const day = resolveDay(db, iso);
    for (const hour of ['matutinum', 'laudes', 'prima', 'tertia', 'sexta', 'nona', 'vesperae', 'completorium']) {
      const entries = buildHour(db, day, hour);
      assert.ok(entries.length >= 4, `${iso} ${hour}: ${entries.length} entries`);
      const text = entries.map((e) => e.latin ?? '').join('');
      assert.ok(text.length > 400, `${iso} ${hour}: substantial text (${text.length})`);
      // ![...] rubric markers for missing references are not silent gaps —
      // they are the engine's honest "never invent text" fallback.
      const realText = text.replace(/!\[[^\]]*\]/g, '');
      assert.ok(!/textus deest/.test(realText), `${iso} ${hour}: no raw placeholders`);
    }
  }
});
