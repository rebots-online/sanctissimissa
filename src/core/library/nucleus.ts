/**
 * Library-plane nucleus source manifest — DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md §2.5
 * (fields = the rights-seed `nucleus` keys + `checksumSha256`).
 * The older, differently shaped `NucleusSourceManifest` in src/core/data/types.ts is intentionally
 * left untouched (CHECKLIST Stanza BA author resolution 4).
 */
import type { NucleusAuthorityKind } from '../data/types.ts';

export interface NucleusSourceManifest {
  sourceId: string;
  editionId: string;
  work: string;
  workDate: string;
  editionTitle: string;
  editionDate: string;
  translationDate: string;
  languages: string[];
  translatorEditor: string;
  publicationPlace: string;
  publisher: string;
  rightsBasis: string;
  authorityKind: NucleusAuthorityKind;
  provenanceUrl: string;
  vendoredPath: string;
  checksumSha256: string;
}

/**
 * Haydock is builtin: never written into the generated nucleus-sources.json, never module-attached.
 * Authored from VENDORED/haydock/PROVENANCE.md (decision 21 gap closure).
 * checksumSha256 formula (computed once at coding time, 2026-11-06, pasted as a literal):
 *   find VENDORED/haydock/ENG-B-Haydock1883-pd-PSFM -name '*.sfm' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1
 */
export const HAYDOCK_NUCLEUS_SOURCE: NucleusSourceManifest = {
  sourceId: 'haydock',
  editionId: 'haydock-1883-en',
  work: 'Haydock Catholic Bible Commentary',
  workDate: '1811–1814',
  editionTitle: 'The Holy Catholic Bible … with useful notes (Haydock), 1883 expanded edition',
  editionDate: '1883',
  translationDate: '1750',
  languages: ['en'],
  translatorEditor: 'Rev. George Leo Haydock (commentary); Douay-Rheims, Challoner revision (text)',
  publicationPlace: 'New York',
  publisher: 'Edward Dunigan and Brother',
  rightsBasis: 'Public domain (pre-1900 publication)',
  authorityKind: 'scriptural-commentary',
  provenanceUrl: 'https://github.com/cmahte/ENG-B-Haydock1883-pd-PSFM/tree/0332c84aedf35638a0d87b0185cc01eb14a65492',
  vendoredPath: 'VENDORED/haydock/PROVENANCE.md',
  checksumSha256: '35ad4c0d405e369a7f8410d2518284554e80112d0b53be52b43e14c0077d34d4',
};
