/**
 * Catalogue validation, filtering and publication gate (LS.01).
 *
 *  - validateCatalogue: runtime validator for the committed seed; throws a
 *    structured CatalogueValidationError listing every issue by path.
 *  - filterCatalogue: accent/case-insensitive, conjunctive, stable title-then-ID order, no mutation.
 *  - canPublishEdition: the single rights gate. `free` is never a rights bypass.
 *
 * Erasable TypeScript only (see types.ts).
 */

import type {
  AssetKind,
  CatalogueBundle,
  CatalogueCollection,
  CatalogueFilter,
  CatalogueSeed,
  CatalogueWork,
  EditionRecord,
  Publication,
  RightsEvidence,
} from './types.ts';

const PUBLICATIONS: readonly string[] = ['candidate', 'reviewed', 'ready', 'withdrawn'];
const ASSET_KINDS: readonly string[] = ['text', 'score', 'audio', 'cover'];

/** Haydock is free for ever, independent of any edition's readiness (LS-1). */
export const RESERVED_FREE_EDITION_IDS: readonly string[] = ['haydock-1883-en', 'haydock-1859-en'];

export function isReservedFreeEdition(editionId: string): boolean {
  return RESERVED_FREE_EDITION_IDS.includes(editionId);
}

export class CatalogueValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Invalid catalogue: ${issues.length} issue(s); first: ${issues[0] ?? 'unknown'}`);
    this.name = 'CatalogueValidationError';
    this.issues = issues;
  }
}

// ---- small checks ---------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** No lone surrogates (invalid Unicode). */
function wellFormed(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = s.charCodeAt(i + 1);
      if (!(n >= 0xdc00 && n <= 0xdfff)) return false;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function goodText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && wellFormed(v);
}

function goodUrl(v: unknown): v is string {
  if (!goodText(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function goodSha256(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
}

function goodIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.+\-Z]+)?$/.test(v) && !Number.isNaN(Date.parse(v));
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function onlyKeys(o: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(o).filter((k) => !allowed.includes(k));
}

// ---- validateCatalogue ----------------------------------------------------

const WORK_KEYS = ['id', 'catalogueId', 'title', 'author', 'category', 'sourceNotes', 'sourceUrls', 'evidence', 'publication', 'editionId', 'price', 'productId'];
const COLLECTION_KEYS = ['id', 'title', 'description', 'publication'];
const BUNDLE_KEYS = ['id', 'title', 'workIds', 'description', 'publication'];
const SEED_KEYS = ['schemaVersion', 'reviewedAt', 'works', 'collections', 'bundles'];

export function validateCatalogue(input: unknown): CatalogueSeed {
  const issues: string[] = [];
  if (!isRecord(input)) throw new CatalogueValidationError(['$: catalogue must be an object']);

  for (const k of onlyKeys(input, SEED_KEYS)) issues.push(`$.${k}: unexpected field`);
  if (input.schemaVersion !== 1) issues.push('$.schemaVersion: must be 1');
  if (!goodIsoDate(input.reviewedAt)) issues.push('$.reviewedAt: must be an ISO date');
  if (!Array.isArray(input.works)) issues.push('$.works: must be an array');
  if (!Array.isArray(input.collections)) issues.push('$.collections: must be an array');
  if (!Array.isArray(input.bundles)) issues.push('$.bundles: must be an array');
  if (issues.length > 0 && (!Array.isArray(input.works) || !Array.isArray(input.collections) || !Array.isArray(input.bundles))) {
    throw new CatalogueValidationError(issues);
  }

  const works = input.works as unknown[];
  const collections = input.collections as unknown[];
  const bundles = input.bundles as unknown[];

  const workIds = new Set<string>();
  const catalogueIds = new Set<string>();
  works.forEach((w, i) => {
    const p = `$.works[${i}]`;
    if (!isRecord(w)) { issues.push(`${p}: must be an object`); return; }
    for (const k of onlyKeys(w, WORK_KEYS)) issues.push(`${p}.${k}: unexpected field`);
    for (const k of ['title', 'author', 'category', 'sourceNotes', 'evidence']) {
      if (!goodText(w[k])) issues.push(`${p}.${k}: must be non-empty well-formed text`);
    }
    if (typeof w.catalogueId !== 'string' || !/^C\d{3}$/.test(w.catalogueId)) {
      issues.push(`${p}.catalogueId: must look like C001`);
    } else if (catalogueIds.has(w.catalogueId)) {
      issues.push(`${p}.catalogueId: duplicate ${w.catalogueId}`);
    } else {
      catalogueIds.add(w.catalogueId);
    }
    if (typeof w.id !== 'string' || !/^work-c\d{3}$/.test(w.id)) {
      issues.push(`${p}.id: must look like work-c001`);
    } else {
      if (typeof w.catalogueId === 'string' && w.id !== `work-${w.catalogueId.toLowerCase()}`) issues.push(`${p}.id: must match catalogueId`);
      if (workIds.has(w.id)) issues.push(`${p}.id: duplicate ${w.id}`);
      workIds.add(w.id);
    }
    if (!Array.isArray(w.sourceUrls) || !w.sourceUrls.every(goodUrl)) issues.push(`${p}.sourceUrls: must be an array of http(s) URLs`);
    if (typeof w.publication !== 'string' || !PUBLICATIONS.includes(w.publication)) issues.push(`${p}.publication: invalid value`);
    if (w.editionId !== null && !(typeof w.editionId === 'string' && KEBAB.test(w.editionId))) issues.push(`${p}.editionId: must be null or ASCII kebab-case`);
    if (w.price !== null && !goodText(w.price)) issues.push(`${p}.price: must be null or text`);
    if (w.productId !== null && !goodText(w.productId)) issues.push(`${p}.productId: must be null or text`);
  });

  const collectionIds = new Set<string>();
  collections.forEach((c, i) => {
    const p = `$.collections[${i}]`;
    if (!isRecord(c)) { issues.push(`${p}: must be an object`); return; }
    for (const k of onlyKeys(c, COLLECTION_KEYS)) issues.push(`${p}.${k}: unexpected field`);
    if (typeof c.id !== 'string' || !/^collection-[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) issues.push(`${p}.id: invalid`);
    else if (collectionIds.has(c.id)) issues.push(`${p}.id: duplicate ${c.id}`);
    else collectionIds.add(c.id);
    for (const k of ['title', 'description']) if (!goodText(c[k])) issues.push(`${p}.${k}: must be non-empty well-formed text`);
    if (typeof c.publication !== 'string' || !PUBLICATIONS.includes(c.publication)) issues.push(`${p}.publication: invalid value`);
  });

  const bundleIds = new Set<string>();
  bundles.forEach((b, i) => {
    const p = `$.bundles[${i}]`;
    if (!isRecord(b)) { issues.push(`${p}: must be an object`); return; }
    for (const k of onlyKeys(b, BUNDLE_KEYS)) issues.push(`${p}.${k}: unexpected field`);
    if (typeof b.id !== 'string' || !/^bundle-[a-z0-9]+(-[a-z0-9]+)*$/.test(b.id)) issues.push(`${p}.id: invalid`);
    else if (bundleIds.has(b.id)) issues.push(`${p}.id: duplicate ${b.id}`);
    else bundleIds.add(b.id);
    for (const k of ['title', 'description']) if (!goodText(b[k])) issues.push(`${p}.${k}: must be non-empty well-formed text`);
    if (typeof b.publication !== 'string' || !PUBLICATIONS.includes(b.publication)) issues.push(`${p}.publication: invalid value`);
    if (!Array.isArray(b.workIds) || b.workIds.length === 0) {
      issues.push(`${p}.workIds: must be a non-empty array`);
    } else {
      const seen = new Set<string>();
      b.workIds.forEach((id, j) => {
        if (typeof id !== 'string' || !workIds.has(id)) issues.push(`${p}.workIds[${j}]: broken work reference ${String(id)}`);
        else if (seen.has(id)) issues.push(`${p}.workIds[${j}]: duplicate ${id}`);
        else seen.add(id);
      });
    }
  });

  if (issues.length > 0) throw new CatalogueValidationError(issues);
  return {
    schemaVersion: 1,
    reviewedAt: input.reviewedAt as string,
    works: works as CatalogueWork[],
    collections: collections as CatalogueCollection[],
    bundles: bundles as CatalogueBundle[],
  };
}

// ---- filterCatalogue ------------------------------------------------------

/** Lower-case, accent-stripped, whitespace-collapsed form used for matching. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function filterCatalogue(works: readonly CatalogueWork[], filter: CatalogueFilter = {}): CatalogueWork[] {
  const terms = fold(filter.query ?? '').split(' ').filter(Boolean);
  const author = filter.author ? fold(filter.author) : '';
  const category = filter.category ? fold(filter.category) : '';
  const hit = works.filter((w) => {
    if (author && fold(w.author) !== author) return false;
    if (category && fold(w.category) !== category) return false;
    if (terms.length > 0) {
      const hay = fold(`${w.title} ${w.author} ${w.category} ${w.catalogueId}`);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  return hit.slice().sort((a, b) => {
    const ta = fold(a.title);
    const tb = fold(b.title);
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

// ---- canPublishEdition ----------------------------------------------------

const EDITION_KEYS = ['id', 'workId', 'title', 'author', 'category', 'revision', 'publication', 'languages', 'rights', 'territories', 'free', 'entitlementId', 'previewBlockIds', 'packagePath', 'packageSha256'];
const RIGHTS_KEYS = ['assetId', 'kind', 'sourceUrl', 'sourceEdition', 'translator', 'publicationYear', 'basis', 'territories', 'commercial', 'redistribution', 'attribution', 'reviewedBy', 'reviewedAt', 'sha256'];

function rightsOk(r: unknown, territory: string): r is RightsEvidence {
  if (!isRecord(r)) return false;
  if (onlyKeys(r, RIGHTS_KEYS).length > 0) return false;
  if (!goodText(r.assetId) || !goodText(r.sourceEdition) || !goodText(r.basis) || !goodText(r.attribution)) return false;
  if (typeof r.kind !== 'string' || !ASSET_KINDS.includes(r.kind as AssetKind)) return false;
  if (!goodUrl(r.sourceUrl) || !goodSha256(r.sha256)) return false;
  if (!Array.isArray(r.territories) || !r.territories.includes(territory)) return false;
  if (r.commercial !== true || r.redistribution !== true) return false;
  if (!goodText(r.reviewedBy) || !goodIsoDate(r.reviewedAt)) return false;
  return true;
}

/**
 * True only for a ready record that is publishable in `territory`: allowed territory,
 * a verified package path and hash, and every distributed asset reviewed for both
 * commercial use and redistribution there. Malformed or over-specified records are
 * simply not publishable (never throw). `free` grants nothing here.
 */
export function canPublishEdition(edition: EditionRecord, territory: string): boolean {
  const e: unknown = edition;
  if (!isRecord(e)) return false;
  if (onlyKeys(e, EDITION_KEYS).length > 0) return false;
  if (!goodText(territory)) return false;
  if (typeof e.id !== 'string' || !KEBAB.test(e.id)) return false;
  if (!goodText(e.workId) || !goodText(e.title) || !goodText(e.author) || !goodText(e.category)) return false;
  if (!Number.isInteger(e.revision) || (e.revision as number) <= 0) return false;
  if ((e.publication as Publication) !== 'ready') return false;
  if (!Array.isArray(e.territories) || e.territories.length === 0 || !e.territories.includes(territory)) return false;
  if (typeof e.free !== 'boolean') return false;
  if (isReservedFreeEdition(e.id) && e.free !== true) return false;
  if (!goodText(e.packagePath) || !goodSha256(e.packageSha256)) return false;
  if (!Array.isArray(e.rights) || e.rights.length === 0) return false;
  return e.rights.every((r) => rightsOk(r, territory));
}
