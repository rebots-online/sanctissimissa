import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEaster, getWeekKey, getSeason, seasonColor, parseISODate, toISODate, dateForWeekKey } from '../src/core/calendar/computus.ts';
import { resolveWinner } from '../src/core/calendar/precedence.ts';

// Known Easter dates (Gregorian), including the earliest possible (Mar 22)
// and latest possible (Apr 25) occurrences.
const KNOWN_EASTER: Record<number, string> = {
  1818: '1818-03-22',
  1886: '1886-04-25',
  1943: '1943-04-25',
  2000: '2000-04-23',
  2024: '2024-03-31',
  2025: '2025-04-20',
  2026: '2026-04-05',
  2038: '2038-04-25',
};

test('Butcher computus matches known Easter dates', () => {
  for (const [year, iso] of Object.entries(KNOWN_EASTER)) {
    assert.equal(toISODate(getEaster(Number(year))), iso, `Easter ${year}`);
  }
});

test('week keys match DO conventions', () => {
  // Easter Sunday 2026
  assert.equal(getWeekKey(parseISODate('2026-04-05')), 'Pasc0-0');
  // Pentecost Sunday 2026 = Easter + 49
  assert.equal(getWeekKey(parseISODate('2026-05-24')), 'Pasc7-0');
  // Ash Wednesday 2026 = Easter − 46 → belongs to Quinquagesima week (Quadp3)
  assert.equal(getWeekKey(parseISODate('2026-02-18')), 'Quadp3-3');
  // First Sunday of Lent 2026 = Easter − 42
  assert.equal(getWeekKey(parseISODate('2026-02-22')), 'Quad1-0');
  // Lent I Wednesday (Ember Wednesday) — the Quad1-3 fixture used throughout
  assert.equal(getWeekKey(parseISODate('2026-02-25')), 'Quad1-3');
  // Christmas week uses DO day-file stems: Dec 25 → Nat25, Sunday → Nat1-0
  assert.equal(getWeekKey(parseISODate('2026-12-25')), 'Nat25');
  assert.equal(getWeekKey(parseISODate('2026-12-27')), 'Nat1-0');
  // January before the first Sunday after Epiphany: Nat0d; Holy Name Sunday
  assert.equal(getWeekKey(parseISODate('2026-01-02')), 'Nat02');
  assert.equal(getWeekKey(parseISODate('2026-01-04')), 'Nat2-0');
  // First Sunday after Epiphany = Holy Family = Epi1-0
  assert.equal(getWeekKey(parseISODate('2026-01-11')), 'Epi1-0');
  // Time after Pentecost is zero-padded
  const pent = getWeekKey(parseISODate('2026-08-16'));
  assert.match(pent, /^Pent\d{2}-0$/);
  // Resumed Sundays after Epiphany before Advent (missa: PentEpi keys)
  assert.equal(getWeekKey(parseISODate('2026-11-15')), 'PentEpi6-0');
  // Last Sunday before Advent is always Pent24
  assert.equal(getWeekKey(parseISODate('2026-11-22')), 'Pent24-0');
});

test('seasons and colors derive from week keys', () => {
  assert.equal(getSeason('Quad1-3'), 'Lent');
  assert.equal(getSeason('Quadp2-4'), 'Pre-Lent');
  assert.equal(getSeason('Pasc3-2'), 'Paschaltide');
  assert.equal(seasonColor('Quad1-3'), 'purple');
  assert.equal(seasonColor('Pent12-4'), 'green');
  assert.equal(seasonColor('Pent12-4', 'St. N., Martyr'), 'red');
});

test('1960 occurrence: privileged Lenten ferias, Sundays, feasts of the Lord', () => {
  // Later-Lent ferias carry rank 3.9 under 1960 and outrank III-class feasts (2.2).
  const feria = { key: 'Tempora/Quad3-1', title: 'Feria Secunda', rankClass: 'Feria major', rankNum: 3.9, color: 'purple' };
  const feast3 = { key: 'Sancti/03-10', title: 'S. N.', rankClass: 'Semiduplex', rankNum: 2.2, color: 'white' };
  const feast2 = { key: 'Sancti/03-19', title: 'S. Joseph', rankClass: 'Duplex I classis', rankNum: 6, color: 'white' };
  assert.equal(resolveWinner(1, 'Lent', feria, [feast3])?.key, 'Tempora/Quad3-1');
  assert.equal(resolveWinner(1, 'Lent', feria, [feast2])?.key, 'Sancti/03-19');

  // II-class Sundays yield only to I-class feasts and II-class feasts of the Lord.
  const sunday = { key: 'Tempora/Pent20-0', title: 'Dominica XX Post Pentecosten', rankClass: 'Semiduplex', rankNum: 5, color: 'green' };
  const maternity = { key: 'Sancti/10-11', title: 'Maternitatis B.M.V.', rankClass: 'Duplex 2 classis', rankNum: 5, color: 'white' };
  const transfig = { key: 'Sancti/08-06', title: 'In Transfiguratione D.N.J.C.', rankClass: 'Duplex 2 classis', rankNum: 5.1, color: 'white', festumDomini: true };
  const allSaints = { key: 'Sancti/11-01', title: 'Omnium Sanctorum', rankClass: 'Duplex I classis', rankNum: 6.4, color: 'white' };
  assert.equal(resolveWinner(0, 'Time after Pentecost', sunday, [maternity])?.key, 'Tempora/Pent20-0');
  assert.equal(resolveWinner(0, 'Time after Pentecost', sunday, [transfig])?.key, 'Sancti/08-06');
  assert.equal(resolveWinner(0, 'Time after Pentecost', sunday, [allSaints])?.key, 'Sancti/11-01');
});

test('feast-title color fallback: Precious Blood, Cross, Apostles, Cathedra', () => {
  assert.equal(seasonColor('Pent05-3', 'Pretiosissimi Sanguinis Domini Nostri Jesu Christi'), 'red');
  assert.equal(seasonColor('Pent14-2', 'In Exaltatione Sanctae Crucis'), 'red');
  assert.equal(seasonColor('Pent06-4', 'S. N. Apostoli'), 'red');
  assert.equal(seasonColor('Epi3-6', 'Cathedra S. Petri'), 'white');
  assert.equal(seasonColor('Pent12-4', 'S. N. Virginis et Martyris'), 'red'); // martyr outranks virgin
});

test('dateForWeekKey inverts getWeekKey near a reference date', () => {
  assert.equal(dateForWeekKey('Pent05-3', '2026-07-11'), '2026-07-01');
  assert.equal(getWeekKey(parseISODate(dateForWeekKey('Adv1-0', '2026-07-11')!)), 'Adv1-0');
  assert.equal(dateForWeekKey('NoSuchKey-9', '2026-07-11'), null);
});
