/**
 * Library domain types (LS common contract, CHECKLIST stanza LS, architecture LS-1).
 *
 * Erasable TypeScript only: no enums, no parameter properties, so Node's
 * `--experimental-strip-types` can run the tests that import this file.
 * Work IDs (`work-c001`) are catalogue research handles; edition IDs are
 * immutable ASCII kebab-case publication handles. They must never be confused.
 */

export type Publication = 'candidate' | 'reviewed' | 'ready' | 'withdrawn';
export type AssetKind = 'text' | 'score' | 'audio' | 'cover';

export interface RightsEvidence {
  assetId: string;
  kind: AssetKind;
  sourceUrl: string;
  sourceEdition: string;
  translator: string | null;
  publicationYear: number | null;
  basis: string;
  territories: string[];
  commercial: boolean;
  redistribution: boolean;
  attribution: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  sha256: string;
}

export interface EditionRecord {
  id: string;
  workId: string;
  title: string;
  author: string;
  category: string;
  revision: number;
  publication: Publication;
  languages: string[];
  rights: RightsEvidence[];
  territories: string[];
  free: boolean;
  entitlementId: string | null;
  previewBlockIds: string[];
  packagePath: string | null;
  packageSha256: string | null;
}

export interface EditionBlock {
  id: string;
  sectionId: string;
  sectionTitle: string;
  sourceLocator: string;
  latin: string | null;
  english: string | null;
}

export interface EditionContent {
  schemaVersion: 1;
  editionId: string;
  revision: number;
  blocks: EditionBlock[];
  sourceUrls: string[];
  redirects: Record<string, string[]>;
}

export interface EditionBundle {
  id: string;
  revision: number;
  title: string;
  editionIds: string[];
  publication: Publication;
  territories: string[];
}

export interface ReadingAnchor {
  documentId: string;
  revision: number;
  blockId: string;
  language: 'la' | 'en';
  line: number;
  start: number;
  end: number;
  quote: string;
  prefix: string;
  suffix: string;
}

export type RecordKind = 'bookmark' | 'progress' | 'recording' | 'chant-plan' | 'practice';

export interface UserRecord {
  id: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BookmarkRecord extends UserRecord {
  anchor: ReadingAnchor;
  label: string;
}

export interface ProgressRecord extends UserRecord {
  documentId: string;
  anchor: ReadingAnchor;
}

export interface RecordingRecord extends UserRecord {
  anchor: ReadingAnchor;
  blobId: string;
  mimeType: string;
  bytes: number;
  durationMs: number;
  title: string;
  visibility: 'private';
}

export type LibraryDestination =
  | { view: 'library' | 'bookstore' }
  | { view: 'chant'; planId?: string }
  | { view: 'mass-reference'; articleId?: string; blockId?: string }
  | { view: 'book-reader'; editionId: string; blockId?: string };

/** One research row of `content/library/catalogue.seed.json` (C001-C061). All null fields stay null in the seed. */
export interface CatalogueWork {
  id: string;
  catalogueId: string;
  title: string;
  author: string;
  category: string;
  sourceNotes: string;
  sourceUrls: string[];
  evidence: string;
  publication: Publication;
  editionId: string | null;
  price: string | null;
  productId: string | null;
}

export interface CatalogueCollection {
  id: string;
  title: string;
  description: string;
  publication: Publication;
}

export interface CatalogueBundle {
  id: string;
  title: string;
  workIds: string[];
  description: string;
  publication: Publication;
}

export interface CatalogueSeed {
  schemaVersion: 1;
  reviewedAt: string;
  works: CatalogueWork[];
  collections: CatalogueCollection[];
  bundles: CatalogueBundle[];
}

export interface CatalogueFilter {
  query?: string;
  author?: string;
  category?: string;
}
