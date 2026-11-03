import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CatalogueValidationError,
  RESERVED_FREE_EDITION_IDS,
  canPublishEdition,
  filterCatalogue,
  isReservedFreeEdition,
  validateCatalogue,
} from '../src/core/library/catalogue.ts';
import type { CatalogueSeed, CatalogueWork, EditionRecord, RightsEvidence } from '../src/core/library/types.ts';

const raw: unknown = JSON.parse(readFileSync(new URL('../content/library/catalogue.seed.json', import.meta.url), 'utf8'));
const seed: CatalogueSeed = validateCatalogue(raw);

const HASH = 'a'.repeat(64);

function rights(over: Partial<RightsEvidence> = {}): RightsEvidence {
  return {
    assetId: 'asset-text-1', kind: 'text', sourceUrl: 'https://www.gutenberg.org/ebooks/8300',
    sourceEdition: 'Challoner revision, exact edition reviewed', translator: null, publicationYear: 1899,
    basis: 'Public domain by date in the listed territories', territories: ['CA', 'US'],
    commercial: true, redistribution: true, attribution: 'Project Gutenberg text', reviewedBy: 'R. Cheung',
    reviewedAt: '2026-10-01', sha256: HASH, ...over,
  };
}

function edition(over: Partial<EditionRecord> = {}): EditionRecord {
  return {
    id: 'douay-rheims-en', workId: 'work-c001', title: 'Douay-Rheims Bible', author: 'Challoner revision',
    category: 'Scripture and commentary', revision: 1, publication: 'ready', languages: ['en'],
    rights: [rights()], territories: ['CA', 'US'], free: false, entitlementId: 'reference_douay-rheims-en',
    previewBlockIds: [], packagePath: 'packages/douay-rheims-en.json', packageSha256: HASH, ...over,
  };
}

test('seed: 61 unique sequential works, 8 collections, 7 bundles', () => {
  assert.equal(seed.works.length, 61);
  assert.equal(seed.collections.length, 8);
  assert.equal(seed.bundles.length, 7);
  seed.works.forEach((w, i) => {
    assert.equal(w.catalogueId, `C${String(i + 1).padStart(3, '0')}`);
    assert.equal(w.id, `work-c${String(i + 1).padStart(3, '0')}`);
  });
  assert.equal(new Set(seed.works.map((w) => w.id)).size, 61);
});

test('seed: every row is a candidate with no fabricated price, product or edition', () => {
  for (const w of seed.works) {
    assert.equal(w.publication, 'candidate');
    assert.equal(w.editionId, null);
    assert.equal(w.price, null);
    assert.equal(w.productId, null);
  }
});

test('seed: no candidate can be published', () => {
  for (const w of seed.works) {
    const rec = edition({ id: w.id.replace('work-', 'edition-'), workId: w.id, publication: w.publication, rights: [], packagePath: null, packageSha256: null });
    for (const territory of ['CA', 'US', 'GB']) assert.equal(canPublishEdition(rec, territory), false);
  }
});

test('publication: a reviewed, ready fixture publishes only in allowed territories', () => {
  const e = edition();
  assert.equal(canPublishEdition(e, 'CA'), true);
  assert.equal(canPublishEdition(e, 'US'), true);
  assert.equal(canPublishEdition(e, 'GB'), false);
  assert.equal(canPublishEdition(e, ''), false);
  assert.equal(canPublishEdition(edition({ territories: [] }), 'CA'), false);
});

test('publication: territory must be allowed on the edition AND on every asset', () => {
  assert.equal(canPublishEdition(edition({ rights: [rights(), rights({ assetId: 'cover-1', kind: 'cover', territories: ['US'] })] }), 'CA'), false);
});

test('publication: missing rights, reviewer, review date, hash or package all fail', () => {
  assert.equal(canPublishEdition(edition({ rights: [] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ rights: [rights({ reviewedBy: null })] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ rights: [rights({ reviewedAt: null })] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ rights: [rights({ sha256: 'xyz' })] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ packageSha256: null }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ packageSha256: 'not-a-hash' }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ packagePath: null }), 'CA'), false);
});

test('publication: commercial and redistribution must both be affirmed per asset', () => {
  assert.equal(canPublishEdition(edition({ rights: [rights({ commercial: false })] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ rights: [rights({ redistribution: false })] }), 'CA'), false);
});

test('publication: free is not a rights bypass', () => {
  assert.equal(canPublishEdition(edition({ free: true, rights: [] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ free: true, rights: [rights({ reviewedBy: null })] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ free: true }), 'CA'), true);
});

test('publication: not-ready, bad revision, extra fields, bad URL and bad Unicode fail', () => {
  assert.equal(canPublishEdition(edition({ publication: 'reviewed' }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ publication: 'withdrawn' }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ revision: 0 }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ revision: -2 }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ revision: 1.5 }), 'CA'), false);
  assert.equal(canPublishEdition({ ...edition(), surprise: true } as unknown as EditionRecord, 'CA'), false);
  assert.equal(canPublishEdition(edition({ rights: [{ ...rights(), extra: 1 } as unknown as RightsEvidence] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ rights: [rights({ sourceUrl: 'not a url' })] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ rights: [rights({ sourceUrl: 'javascript:alert(1)' })] }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ title: 'bad \ud800 unicode' }), 'CA'), false);
  assert.equal(canPublishEdition(null as unknown as EditionRecord, 'CA'), false);
});

test('Haydock is reserved free regardless of readiness', () => {
  assert.deepEqual([...RESERVED_FREE_EDITION_IDS], ['haydock-1883-en', 'haydock-1859-en']);
  assert.equal(isReservedFreeEdition('haydock-1883-en'), true);
  assert.equal(isReservedFreeEdition('haydock-1859-en'), true);
  assert.equal(isReservedFreeEdition('imitation-benham-1886-en'), false);
  assert.equal(canPublishEdition(edition({ id: 'haydock-1883-en', free: false }), 'CA'), false);
  assert.equal(canPublishEdition(edition({ id: 'haydock-1883-en', free: true }), 'CA'), true);
});

function w(id: string, title: string, author: string, category: string): CatalogueWork {
  return { id, catalogueId: `C${id.slice(-3)}`, title, author, category, sourceNotes: 'n', sourceUrls: [], evidence: 'PG', publication: 'candidate', editionId: null, price: null, productId: null };
}

test('filter: accents and case are ignored; filters combine conjunctively', () => {
  const works = [
    w('work-c003', 'Écrits de Théologie', 'Bossuet', 'Theology'),
    w('work-c001', 'Ecrits de Theologie', 'Bossuet', 'Theology'),
    w('work-c002', 'Confessions', 'Augustine of Hippo', 'Fathers'),
    w('work-c004', 'City of God', 'Augustine of Hippo', 'Fathers'),
  ];
  assert.deepEqual(filterCatalogue(works, { query: 'ECRITS' }).map((x) => x.id), ['work-c001', 'work-c003']);
  assert.deepEqual(filterCatalogue(works, { query: 'theologie bossuet' }).map((x) => x.id), ['work-c001', 'work-c003']);
  assert.deepEqual(filterCatalogue(works, { author: 'augustine of hippo' }).map((x) => x.id), ['work-c004', 'work-c002']);
  assert.deepEqual(filterCatalogue(works, { author: 'Augustine of Hippo', query: 'city' }).map((x) => x.id), ['work-c004']);
  assert.deepEqual(filterCatalogue(works, { category: 'fathers', query: 'écrits' }).map((x) => x.id), []);
  assert.deepEqual(filterCatalogue(works, {}).map((x) => x.id), ['work-c004', 'work-c002', 'work-c001', 'work-c003']);
});

test('filter: stable title-then-ID order and the input is not mutated', () => {
  const works = Object.freeze([w('work-c009', 'Same', 'A', 'X'), w('work-c002', 'Same', 'A', 'X'), w('work-c005', 'Alpha', 'A', 'X')]);
  const before = JSON.stringify(works);
  assert.deepEqual(filterCatalogue(works, {}).map((x) => x.id), ['work-c005', 'work-c002', 'work-c009']);
  assert.equal(JSON.stringify(works), before);
});

test('filter: seed categories return their real counts', () => {
  assert.equal(filterCatalogue(seed.works, { category: 'Fathers and early Church' }).length, 13);
  assert.equal(filterCatalogue(seed.works, { category: 'fathers and early church' }).length, 13);
  assert.equal(filterCatalogue(seed.works, {}).length, 61);
});

test('validateCatalogue: rejects invalid enums, duplicates, URLs, references, fields and Unicode', () => {
  const clone = (): any => JSON.parse(JSON.stringify(raw));
  const bad = (mutate: (c: any) => void): string[] => {
    const c = clone();
    mutate(c);
    try {
      validateCatalogue(c);
    } catch (e) {
      assert.ok(e instanceof CatalogueValidationError);
      return (e as CatalogueValidationError).issues;
    }
    assert.fail('expected the catalogue to be rejected');
  };
  assert.ok(bad((c) => { c.works[0].publication = 'sold'; }).some((i) => i.includes('publication')));
  assert.ok(bad((c) => { c.works[1].id = c.works[0].id; }).some((i) => i.includes('duplicate')));
  assert.ok(bad((c) => { c.works[1].catalogueId = c.works[0].catalogueId; }).some((i) => i.includes('duplicate')));
  assert.ok(bad((c) => { c.works[0].sourceUrls = ['ftp://x']; }).some((i) => i.includes('sourceUrls')));
  assert.ok(bad((c) => { c.works[0].sourceUrls = ['nope']; }).some((i) => i.includes('sourceUrls')));
  assert.ok(bad((c) => { c.bundles[0].workIds.push('work-c999'); }).some((i) => i.includes('broken work reference')));
  assert.ok(bad((c) => { c.works[0].admin = true; }).some((i) => i.includes('unexpected field')));
  assert.ok(bad((c) => { c.extra = 1; }).some((i) => i.includes('unexpected field')));
  assert.ok(bad((c) => { c.works[0].title = 'bad \udc00'; }).some((i) => i.includes('title')));
  assert.ok(bad((c) => { c.schemaVersion = 2; }).some((i) => i.includes('schemaVersion')));
  assert.ok(bad((c) => { c.works[0].editionId = 'Not Kebab'; }).some((i) => i.includes('editionId')));
  assert.throws(() => validateCatalogue(null), CatalogueValidationError);
  assert.throws(() => validateCatalogue([]), CatalogueValidationError);
});
