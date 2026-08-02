import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripStations, stationForAnchor } from '../src/core/model/massOrdo.ts';

test('Lenten strip carries the Tract, never the Alleluia', () => {
  const ids = stripStations('Lent').map((s) => s.id);
  assert.ok(ids.includes('tractus'));
  assert.ok(!ids.includes('alleluia'));
  assert.ok(!ids.includes('graduale-p'));
});

test('Paschal strip carries the doubled Alleluia, never the Gradual', () => {
  const ids = stripStations('Paschaltide').map((s) => s.id);
  assert.ok(ids.includes('graduale-p'));
  assert.ok(ids.includes('alleluia'));
  assert.ok(!ids.includes('graduale'));
  assert.ok(!ids.includes('tractus'));
});

test('chants sit in their liturgical slot, after the Epistle', () => {
  const ids = stripStations('Time after Pentecost').map((s) => s.id);
  assert.equal(ids[ids.indexOf('lectio') + 1], 'graduale');
  assert.ok(ids.indexOf('graduale') < ids.indexOf('evangelium'));
});

test('strip is skeleton-only and spans both trunks in order', () => {
  const ids = stripStations('Advent').map((s) => s.id);
  assert.ok(!ids.includes('orate-fratres')); // detail station stays folded
  assert.ok(!ids.includes('asperges')); // spur stays off the strip
  assert.ok(!ids.includes('lectio-l1')); // ember branch stays off the strip
  assert.ok(ids.indexOf('introitus') < ids.indexOf('evangelium'));
  assert.ok(ids.indexOf('evangelium') < ids.indexOf('canon'));
  assert.ok(ids.indexOf('canon') < ids.indexOf('ultimum-evangelium'));
});

test('stationForAnchor inverts proper, numbered and ordo anchors', () => {
  assert.equal(stationForAnchor('Introitus'), 'introitus');
  assert.equal(stationForAnchor('Oratio 2'), 'oratio');
  assert.equal(stationForAnchor('Secreta 3'), 'secreta');
  assert.equal(stationForAnchor('ordo:Canon'), 'canon');
  assert.equal(stationForAnchor('ordo:Kyrie'), 'kyrie'); // first non-detail sharer wins
  assert.equal(stationForAnchor('ordo:Incipit'), 'iudica');
  assert.equal(stationForAnchor('no-such-section'), null);
});
