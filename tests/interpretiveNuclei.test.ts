import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { splitClauses } from '../src/core/vector/clause.ts';
import { cosine, embedText } from '../src/core/vector/embed.ts';
import type { NucleatedSimilaritySet } from '../src/core/data/types.ts';

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

const { CorpusDb } = await import('../src/core/data/corpusDb.ts');

function ordered(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function assertLossless(rawKeys: string[], set: NucleatedSimilaritySet) {
  const emitted = [
    ...set.groups.flatMap((group) => group.representatives.map((item) => item.hit.key)),
    ...set.tail.map((item) => item.hit.key),
  ];
  assert.equal(set.candidateCount, rawKeys.length);
  assert.deepEqual(ordered(emitted), ordered(rawKeys));
}

test('Haydock nuclei atomise, rank, evidence, and conserve the vector horizon', async () => {
  const raw = new DatabaseSync('assets/missal.db', { readOnly: true });
  const seed = raw.prepare(
    `SELECT n.key, tb.english
     FROM nodes n JOIN text_blocks tb ON tb.node_id = n.id
     WHERE n.key LIKE 'commentary:haydock/%' AND LENGTH(tb.english) > 300
     ORDER BY n.key LIMIT 1`,
  ).get() as { key: string; english: string } | undefined;
  assert.ok(seed?.english, 'committed corpus must contain a substantial Haydock record');
  const query = splitClauses(seed.english)[0]?.text ?? seed.english;

  const db = await CorpusDb.open(readFileSync('assets/missal.db'));
  const nuclei = db.interpretiveNucleiForText(query, { k: 5 });
  assert.ok(nuclei.length > 0);
  for (let i = 0; i < nuclei.length; i++) {
    const nucleus = nuclei[i];
    assert.equal(nucleus.source, 'haydock');
    assert.equal(nucleus.authorityKind, 'scriptural-commentary');
    const source = raw.prepare(
      `SELECT tb.english FROM nodes n JOIN text_blocks tb ON tb.node_id = n.id WHERE n.key = ?`,
    ).get(nucleus.key) as { english: string } | undefined;
    const sourceEnglish = source?.english;
    assert.ok(sourceEnglish, `${nucleus.key} commentary text must resolve`);
    assert.ok(sourceEnglish.includes(nucleus.clause), `${nucleus.key} clause must be verbatim`);
    assert.ok(nucleus.clause.length > 0);
    assert.ok(
      nucleus.clause.length < sourceEnglish.length,
      `${nucleus.key} nucleus must be a proper atomic substring of its commentary record`,
    );
    assert.deepEqual(nucleus.anchors, ordered([...new Set(nucleus.anchors)]));
    for (const anchor of nucleus.anchors) {
      const exists = raw.prepare('SELECT COUNT(*) count FROM nodes WHERE key = ?').get(anchor) as { count: number };
      assert.equal(exists.count, 1, `${anchor} must resolve`);
    }
    const conceptIds = nucleus.concepts.map((concept) => concept.conceptId);
    assert.deepEqual(conceptIds, ordered([...new Set(conceptIds)]));
    if (i > 0) {
      const previous = nuclei[i - 1];
      assert.ok(
        previous.queryScore > nucleus.queryScore ||
          (previous.queryScore === nucleus.queryScore && previous.key.localeCompare(nucleus.key) <= 0),
      );
    }
  }

  const candidateK = 24;
  const rawHits = db.similarToText(query, candidateK);
  const set = db.nucleatedSimilarToText(query, { candidateK, nucleusK: 5 });
  assertLossless(rawHits.map((hit) => hit.key), set);
  assert.ok(set.groups.length <= 5);
  const nucleusByKey = new Map(nuclei.map((nucleus) => [nucleus.key, nucleus]));
  const emitted = [
    ...set.groups.flatMap((group) => group.representatives),
    ...set.tail,
  ];
  for (const item of emitted) {
    const full = item.hit.english ?? item.hit.latin ?? '';
    assert.ok(full.includes(item.clause), `${item.hit.key} clause must be verbatim`);
    const nucleus = item.nucleusKey ? nucleusByKey.get(item.nucleusKey) : undefined;
    assert.ok(nucleus, `${item.hit.key} must name its Haydock nucleus`);
    const affinity = cosine(embedText(item.clause), embedText(nucleus.clause));
    assert.ok(Math.abs(item.nucleusAffinity - affinity) < 1e-12);
    assert.ok(Math.abs(item.contextScore - (0.7 * item.hit.score + 0.3 * affinity)) < 1e-12);
  }
  for (const group of set.groups) {
    assert.ok(group.representatives.length <= 3);
  }
  for (let i = 1; i < set.groups.length; i++) {
    const previous = set.groups[i - 1].representatives[0];
    const current = set.groups[i].representatives[0];
    assert.ok(
      previous.contextScore > current.contextScore ||
        (previous.contextScore === current.contextScore &&
          (set.groups[i - 1].nucleus?.key ?? '').localeCompare(set.groups[i].nucleus?.key ?? '') <= 0),
    );
  }
  for (let i = 1; i < set.tail.length; i++) {
    assert.ok(
      set.tail[i - 1].contextScore > set.tail[i].contextScore ||
        (set.tail[i - 1].contextScore === set.tail[i].contextScore &&
          set.tail[i - 1].hit.key.localeCompare(set.tail[i].hit.key) <= 0),
    );
  }

  const originalNuclei = db.interpretiveNucleiForText.bind(db);
  db.interpretiveNucleiForText = () => [];
  const fallback = db.nucleatedSimilarToText(query, { candidateK, nucleusK: 5 });
  db.interpretiveNucleiForText = originalNuclei;
  assertLossless(rawHits.map((hit) => hit.key), fallback);
  assert.ok(fallback.groups.every((group) => group.nucleus === null));
  assert.ok(
    [...fallback.groups.flatMap((group) => group.representatives), ...fallback.tail]
      .every((item) => item.nucleusAffinity === 0),
  );

  // Raw free text carries no manual theme/tag input. It must still return the
  // same lossless shape with ordinary automatic nuclei enabled.
  const untaggedQuery = 'mercy offered to the penitent and hope after exile';
  const untaggedRaw = db.similarToText(untaggedQuery, candidateK);
  const untagged = db.nucleatedSimilarToText(untaggedQuery, { candidateK, nucleusK: 5 });
  assertLossless(untaggedRaw.map((hit) => hit.key), untagged);
  assert.ok(untagged.groups.length <= 5);
  assert.ok(untagged.groups.every((group) => group.representatives.length <= 3));
  raw.close();
});
