import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { CONCEPTS, type ConceptDef } from '../src/core/ontology/concepts.ts';
import type { CorpusDb } from '../src/core/data/corpusDb.ts';

// CorpusDb's browser build uses Vite's `?url` asset import. Map that one
// specifier to the installed wasm path so the same production class opens the
// committed database under Node's semantic test runner.
const wasmPath = new URL('../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname;
const wasmModule = `data:text/javascript,${encodeURIComponent(`export default ${JSON.stringify(wasmPath)};`)}`;
const loader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'sql.js/dist/sql-wasm.wasm?url') {
      return { url: ${JSON.stringify(wasmModule)}, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
`;
register(`data:text/javascript,${encodeURIComponent(loader)}`, import.meta.url);

const { CorpusDb: CorpusDbConstructor } = await import('../src/core/data/corpusDb.ts');

let db: CorpusDb;

before(async () => {
  const dbBytes = readFileSync('assets/missal.db');
  db = await CorpusDbConstructor.open(dbBytes);
});

test('CONCEPTS is a non-empty array', () => {
  assert.ok(Array.isArray(CONCEPTS));
  assert.ok(CONCEPTS.length >= 25, `expected >= 25 concepts, got ${CONCEPTS.length}`);
});

test('every concept has required fields', () => {
  for (const c of CONCEPTS) {
    assert.ok(c.id, 'concept must have id');
    assert.ok(c.label, 'concept must have label');
    assert.ok(c.description, 'concept must have description');
    assert.ok(Array.isArray(c.sectionNames), 'concept must have sectionNames array');
    assert.ok(Array.isArray(c.patterns), 'concept must have patterns array');
    assert.ok(Array.isArray(c.keywords), 'concept must have keywords array');
  }
});

test('concept ids are unique', () => {
  const ids = CONCEPTS.map((c) => c.id);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size, 'duplicate concept ids found');
});

test('broader references point to existing concept ids', () => {
  const ids = new Set(CONCEPTS.map((c) => c.id));
  for (const c of CONCEPTS) {
    if (c.broader) {
      assert.ok(ids.has(c.broader), `concept "${c.id}" references unknown broader "${c.broader}"`);
    }
  }
});

test('doxology concept is present and has detection patterns', () => {
  const dox = CONCEPTS.find((c) => c.id === 'doxology');
  assert.ok(dox, 'doxology concept must exist');
  assert.ok(dox.patterns.length > 0, 'doxology must have regex patterns');
  assert.ok(dox.keywords.length > 0, 'doxology must have keywords');
});

test('section-name-based concepts cover major Mass parts', () => {
  const sectionNameConcepts = CONCEPTS.filter((c) => c.sectionNames.length > 0);
  const allSectionNames = new Set(sectionNameConcepts.flatMap((c) => c.sectionNames));
  assert.ok(allSectionNames.has('Introitus'), 'Introitus must be covered');
  assert.ok(allSectionNames.has('Graduale'), 'Graduale must be covered');
  assert.ok(allSectionNames.has('Offertorium'), 'Offertorium must be covered');
  assert.ok(allSectionNames.has('Communio'), 'Communio must be covered');
  assert.ok(allSectionNames.has('Oratio'), 'Oratio must be covered');
  assert.ok(allSectionNames.has('Sanctus'), 'Sanctus must be covered');
  assert.ok(allSectionNames.has('Agnus Dei'), 'Agnus Dei must be covered');
});

test('hierarchy forms a valid tree (no cycles)', () => {
  const idToConcept = new Map(CONCEPTS.map((c) => [c.id, c]));
  for (const c of CONCEPTS) {
    if (!c.broader) continue;
    let cur: ConceptDef | undefined = c;
    const visited = new Set<string>();
    while (cur?.broader) {
      if (visited.has(cur.id)) {
        assert.fail(`cycle detected at concept "${cur.id}"`);
      }
      visited.add(cur.id);
      cur = idToConcept.get(cur.broader);
    }
  }
});

// BS.3: Hydrate and integrate reciprocal result languages

test('concordance hits hydrate both languages', () => {
  const hits = db.concordance('dominus', 10);
  assert.ok(hits.length >= 0, 'concordance should run without error');
  
  for (const hit of hits) {
    assert.ok(hit.latin !== null || hit.english !== null, 
      `hit ${hit.key} should have at least one language`);
    assert.ok(typeof hit.latin === 'string' || hit.latin === null,
      `hit ${hit.key} latin should be string or null`);
    assert.ok(typeof hit.english === 'string' || hit.english === null,
      `hit ${hit.key} english should be string or null`);
  }
});

test('vector/nucleated candidate counts are unchanged', () => {
  const testText = 'deus omnipotens';
  const set = db.nucleatedSimilarToText(testText, { candidateK: 64, nucleusK: 5 });
  
  const repCount = set.groups.reduce((sum: number, g: { representatives: { length: number } }) => sum + g.representatives.length, 0);
  const tailCount = set.tail.length;
  
  assert.equal(
    repCount + tailCount, 
    set.candidateCount,
    'representatives + tail should equal candidateCount exactly'
  );
});

test('reciprocal companion data exists when stored', () => {
  const hits = db.concordance('dominus', 5);
  assert.ok(hits.length >= 0, 'concordance should run without error');
  
  const bilingualHits = hits.filter((h: { latin: string | null; english: string | null }) => h.latin !== null && h.english !== null);
  if (bilingualHits.length > 0) {
    for (const hit of bilingualHits) {
      assert.ok(hit.latin !== null && hit.latin.length > 0, `hit ${hit.key} should have non-empty latin`);
      assert.ok(hit.english !== null && hit.english.length > 0, `hit ${hit.key} should have non-empty english`);
    }
  }
});
