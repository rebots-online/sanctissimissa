import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MASS_ORDO, MASS_SECTION_ORDER, trunkOf, branchOf, stationActive } from '../src/core/model/massOrdo.ts';

test('every proper station maps to a canonical DO section key', () => {
  for (const s of MASS_ORDO) {
    if (s.sectionKey) {
      assert.ok(
        (MASS_SECTION_ORDER as readonly string[]).includes(s.sectionKey),
        `${s.id} → ${s.sectionKey} not in MASS_SECTION_ORDER`,
      );
    }
  }
});

test('subway topology: two trunks, ember loop between Oratio and Lectio', () => {
  const cat = trunkOf('catechumens').map((s) => s.id);
  const fai = trunkOf('faithful').map((s) => s.id);
  assert.ok(cat.indexOf('introitus') < cat.indexOf('oratio'));
  assert.ok(cat.indexOf('oratio') < cat.indexOf('lectio'));
  assert.ok(cat.indexOf('lectio') < cat.indexOf('evangelium'));
  assert.ok(fai.indexOf('offertorium') < fai.indexOf('secreta'));
  assert.ok(fai.indexOf('canon') < fai.indexOf('communio'));
  assert.equal(branchOf('ember').length, 3);
  const chants = branchOf('chant');
  assert.ok(chants.length >= 3, 'gradual/alleluia/tractus parallel tracks');
});

test('seasonal chant switch: Tractus in Lent, no Alleluia; Paschal alleluia at Easter', () => {
  const byId = Object.fromEntries(MASS_ORDO.map((s) => [s.id, s]));
  assert.ok(stationActive(byId['tractus'], 'Lent'));
  assert.ok(!stationActive(byId['alleluia'], 'Lent'));
  assert.ok(stationActive(byId['graduale-p'], 'Paschaltide'));
  assert.ok(!stationActive(byId['tractus'], 'Paschaltide'));
});
