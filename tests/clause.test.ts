import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitClauses, bestClause } from '../src/core/vector/clause.ts';

const PSALM = 'Dominus regit me: et nihil mihi deerit; in loco pascuae ibi me collocavit.';

test('splitClauses offsets are exact into the original string', () => {
  const text = 'Deus in adiutorium meum intende: Domine ad adiuvandum me festina; Gloria Patri et Filio et Spiritui Sancto sicut erat.';
  const clauses = splitClauses(text);
  assert.ok(clauses.length > 1);
  for (const c of clauses) {
    assert.equal(text.slice(c.start, c.end), c.text);
  }
});

test('splitClauses keeps the delimiter with the preceding clause', () => {
  const text = 'Confitemini Domino quoniam bonus est ille: quoniam in saeculum misericordia eius manet semper.';
  const clauses = splitClauses(text);
  assert.equal(clauses.length, 2);
  assert.ok(clauses[0].text.endsWith(':'));
  assert.ok(clauses[1].text.endsWith('.'));
});

test('splitClauses merges fragments shorter than 25 chars into a neighbour', () => {
  const text = 'Amen. Grant we beseech thee almighty God that thy family may walk in the way of salvation.';
  const clauses = splitClauses(text);
  // 'Amen.' (5 chars) must not survive as its own clause.
  assert.ok(clauses.every((c) => c.text !== 'Amen.'));
  assert.equal(clauses.length, 1);
  assert.ok(clauses[0].text.startsWith('Amen.'));
  assert.equal(text.slice(clauses[0].start, clauses[0].end), clauses[0].text);
  // With multiple surviving clauses, none is below the merge threshold.
  const multi = splitClauses(PSALM);
  assert.ok(multi.length > 1);
  for (const c of multi) assert.ok(c.text.length >= 25);
});

test('splitClauses returns [] on empty and whitespace-only input', () => {
  assert.deepEqual(splitClauses(''), []);
  assert.deepEqual(splitClauses('   \n\t  '), []);
});

test('bestClause is deterministic — same input twice gives identical result', () => {
  const a = bestClause(PSALM, 'pascuae');
  const b = bestClause(PSALM, 'pascuae');
  assert.ok(a !== null);
  assert.deepEqual(a, b);
});

test('bestClause picks the clause containing the query subject', () => {
  const best = bestClause(PSALM, 'pascuae');
  assert.ok(best !== null);
  assert.ok(best.text.includes('pascuae'), `expected clause with 'pascuae', got: ${best.text}`);
  assert.equal(PSALM.slice(best.start, best.end), best.text);
  assert.ok(best.score > 0);
});

test('bestClause returns null on empty text and the sole clause when only one exists', () => {
  assert.equal(bestClause('', 'pascuae'), null);
  assert.equal(bestClause('  \n ', 'pascuae'), null);
  const single = bestClause('In loco pascuae ibi me collocavit.', 'pascuae');
  assert.ok(single !== null);
  assert.equal(single.text, 'In loco pascuae ibi me collocavit.');
  assert.equal(typeof single.score, 'number');
});
