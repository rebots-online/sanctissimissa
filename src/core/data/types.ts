import type { Season, LiturgicalColor } from '../calendar/computus.ts';
import type { DayFileMeta } from '../calendar/precedence.ts';

export interface GraphNode {
  id: number;
  kind: 'file' | 'section';
  key: string;
  title: string | null;
  category: string | null;
  rankClass: string | null;
  rankNum: number;
  color: string | null;
  meta: Record<string, unknown>;
}

export interface SectionText {
  nodeKey: string;
  section: string;
  latin: string | null;
  english: string | null;
  /** Corpus path the text actually came from (feast file or its commune). */
  sourcePath: string;
  fromCommune: boolean;
}

export interface DayInfo {
  date: string;
  weekday: string;
  weekKey: string;
  season: Season;
  color: LiturgicalColor | string;
  temporaPath: string;
  winner: DayFileMeta | null;
  feastName: string | null;
  rank: number;
  commemorations: DayFileMeta[];
}

export interface SimilarHit {
  key: string;
  section: string;
  title: string | null;
  score: number;
  latin: string | null;
  english: string | null;
}

export interface ConcordanceHit {
  key: string;
  section: string;
  snippet: string;
  latin: string | null;
  english: string | null;
}

export interface CrossRef {
  fromKey: string;
  toKey: string;
  rel: string;
  directive: string | null;
  toTitle: string | null;
}

export interface ConceptHit {
  conceptId: string;
  label: string;
  description: string;
  score: number;
  sectionCount: number;
}

export interface GroupedHit<T = SimilarHit | ConcordanceHit> {
  conceptId: string | null;
  label: string;
  description: string | null;
  count: number;
  representative: T;
  hits: T[];
}

export type NucleusAuthorityKind =
  | 'scriptural-commentary'
  | 'catechesis'
  | 'magisterium'
  | 'patristics'
  | 'scholastic-theology'
  | 'spiritual-classic'
  | 'encyclopedic';

export interface NucleusSourceManifest {
  id: string;
  label: string;
  authorityKind: NucleusAuthorityKind;
  workDate: string;
  editionDate: string;
  translationDate: string | null;
  languages: string[];
  translator: string | null;
  publicationPlace: string;
  rightsBasis: string;
  provenanceUrl: string;
  sha256: string;
  moduleId: string;
}

export interface InterpretiveNucleus {
  key: string;
  title: string;
  clause: string;
  queryScore: number;
  anchors: string[];
  concepts: { conceptId: string; label: string }[];
  source: string;
  authorityKind: NucleusAuthorityKind;
}

export interface NucleatedSimilarityHit {
  hit: SimilarHit;
  clause: string;
  nucleusKey: string | null;
  nucleusAffinity: number;
  contextScore: number;
}

export interface NucleatedSimilarityGroup {
  nucleus: InterpretiveNucleus | null;
  label: string;
  representatives: NucleatedSimilarityHit[];
}

export interface NucleatedSimilaritySet {
  candidateCount: number;
  groups: NucleatedSimilarityGroup[];
  tail: NucleatedSimilarityHit[];
}
