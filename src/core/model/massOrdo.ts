/**
 * The skeleton structure of the Mass, expanded — the data model behind the
 * subway map. Two trunk lines (Mass of the Catechumens, Mass of the Faithful),
 * with the Ember-Day loop between the Collect and the Epistle, the seasonal
 * chant switch (Graduale / Alleluia / Tractus / GradualeP), conditional
 * Gloria and Credo, and the Lenten Super populum spur.
 *
 * `sectionKey` values are Divinum Officium section keys — proper stations pull
 * the day's text from the corpus; ordinary stations are invariable.
 */

import type { Season } from '../calendar/computus.ts';

export type StationKind =
  | 'ordinary' // invariable text of the Ordo Missae
  | 'proper' // varies with the day — DO section key
  | 'conditional' // present/absent by rubric (Gloria, Credo, Super populum…)
  | 'switch'; // seasonal alternatives occupying the same slot (chants)

export type LineId = 'catechumens' | 'faithful';

export interface Station {
  id: string;
  latin: string;
  english: string;
  kind: StationKind;
  line: LineId;
  /** DO corpus section key when kind is 'proper' | 'switch' | some conditionals. */
  sectionKey?: string;
  /** Branch group: stations sharing a branch render off the trunk. */
  branch?: 'ember' | 'chant' | 'spur';
  /** For 'switch'/'conditional': in which seasons this station is active. */
  activeIn?: Season[];
  /** For conditionals not driven by season alone (e.g. Gloria on feasts). */
  note?: string;
  /**
   * Detail-layer station: hidden when the map is folded to the basic
   * skeleton (the Montreal-metro simple view), shown in full detail.
   */
  detail?: boolean;
}

/** Canonical DO Mass section order (from HelloWord corpus-db.js — verbatim). */
export const MASS_SECTION_ORDER = [
  'Introitus',
  'Oratio', 'Oratio 2', 'Oratio 3',
  'LectioL1', 'GradualeL1', 'OratioL1', // Ember Day group: between Oratio and Lectio
  'Lectio', 'Lectio 2',
  'Graduale', 'GradualeP',
  'Tractus', 'Alleluia',
  'Evangelium',
  'Offertorium',
  'Secreta', 'Secreta 2', 'Secreta 3',
  'Communio',
  'Postcommunio', 'Postcommunio 2', 'Postcommunio 3',
  'Missa',
  'Super populum',
] as const;

export const MASS_ORDO: Station[] = [
  // ── Line 1: Mass of the Catechumens ─────────────────────────────
  { id: 'asperges', latin: 'Asperges me', english: 'Sprinkling Rite', kind: 'conditional', line: 'catechumens', branch: 'spur', note: 'Principal Sunday Mass; Vidi aquam in Paschaltide', detail: true },
  { id: 'iudica', latin: 'Iudica me (Ps. 42)', english: 'Prayers at the Foot of the Altar', kind: 'ordinary', line: 'catechumens' },
  { id: 'confiteor', latin: 'Confiteor', english: 'Confession of Sin', kind: 'ordinary', line: 'catechumens' },
  { id: 'introitus', latin: 'Introitus', english: 'Introit', kind: 'proper', line: 'catechumens', sectionKey: 'Introitus' },
  { id: 'kyrie', latin: 'Kyrie eleison', english: 'Kyrie', kind: 'ordinary', line: 'catechumens' },
  { id: 'gloria', latin: 'Gloria in excelsis', english: 'Gloria', kind: 'conditional', line: 'catechumens', note: 'Omitted in Advent, Septuagesima–Lent ferias, Requiems' },
  { id: 'oratio', latin: 'Oratio (Collecta)', english: 'Collect', kind: 'proper', line: 'catechumens', sectionKey: 'Oratio' },
  // Ember-Day loop — between the Collect and the Epistle
  { id: 'lectio-l1', latin: 'Lectio prior', english: 'Ember Lesson', kind: 'proper', line: 'catechumens', sectionKey: 'LectioL1', branch: 'ember' },
  { id: 'graduale-l1', latin: 'Graduale I', english: 'Ember Gradual', kind: 'proper', line: 'catechumens', sectionKey: 'GradualeL1', branch: 'ember' },
  { id: 'oratio-l1', latin: 'Oratio altera', english: 'Ember Collect', kind: 'proper', line: 'catechumens', sectionKey: 'OratioL1', branch: 'ember' },
  { id: 'lectio', latin: 'Lectio (Epistola)', english: 'Epistle', kind: 'proper', line: 'catechumens', sectionKey: 'Lectio' },
  // Seasonal chant switch — parallel tracks in the same slot
  { id: 'graduale', latin: 'Graduale', english: 'Gradual', kind: 'switch', line: 'catechumens', sectionKey: 'Graduale', branch: 'chant', activeIn: ['Advent', 'Christmastide', 'Time after Epiphany', 'Pre-Lent', 'Lent', 'Time after Pentecost'] },
  { id: 'alleluia', latin: 'Alleluia', english: 'Alleluia Verse', kind: 'switch', line: 'catechumens', sectionKey: 'Alleluia', branch: 'chant', activeIn: ['Advent', 'Christmastide', 'Time after Epiphany', 'Paschaltide', 'Time after Pentecost'] },
  { id: 'tractus', latin: 'Tractus', english: 'Tract', kind: 'switch', line: 'catechumens', sectionKey: 'Tractus', branch: 'chant', activeIn: ['Pre-Lent', 'Lent'] },
  { id: 'graduale-p', latin: 'Alleluia paschale', english: 'Paschal Alleluia', kind: 'switch', line: 'catechumens', sectionKey: 'GradualeP', branch: 'chant', activeIn: ['Paschaltide'] },
  { id: 'evangelium', latin: 'Evangelium', english: 'Gospel', kind: 'proper', line: 'catechumens', sectionKey: 'Evangelium' },
  { id: 'credo', latin: 'Credo', english: 'Creed', kind: 'conditional', line: 'catechumens', note: 'Sundays, I class feasts, feasts of Our Lord, Our Lady, Apostles, Doctors' },

  // ── Line 2: Mass of the Faithful ────────────────────────────────
  { id: 'offertorium', latin: 'Offertorium', english: 'Offertory Antiphon', kind: 'proper', line: 'faithful', sectionKey: 'Offertorium' },
  { id: 'lavabo', latin: 'Lavabo (Ps. 25)', english: 'Washing of Hands', kind: 'ordinary', line: 'faithful' },
  { id: 'orate-fratres', latin: 'Orate, fratres', english: 'Pray, Brethren', kind: 'ordinary', line: 'faithful', detail: true },
  { id: 'secreta', latin: 'Secreta', english: 'Secret', kind: 'proper', line: 'faithful', sectionKey: 'Secreta' },
  { id: 'praefatio', latin: 'Praefatio', english: 'Preface', kind: 'ordinary', line: 'faithful', note: 'Common or seasonal/festal preface' },
  { id: 'sanctus', latin: 'Sanctus', english: 'Sanctus', kind: 'ordinary', line: 'faithful' },
  { id: 'canon', latin: 'Canon Missae', english: 'The Roman Canon', kind: 'ordinary', line: 'faithful', note: 'Te igitur → consecration → doxology — the still center of the map' },
  { id: 'pater-noster', latin: 'Pater noster', english: "Lord's Prayer", kind: 'ordinary', line: 'faithful', detail: true },
  { id: 'agnus-dei', latin: 'Agnus Dei', english: 'Lamb of God', kind: 'ordinary', line: 'faithful', detail: true },
  { id: 'communio', latin: 'Communio', english: 'Communion Antiphon', kind: 'proper', line: 'faithful', sectionKey: 'Communio' },
  { id: 'postcommunio', latin: 'Postcommunio', english: 'Postcommunion', kind: 'proper', line: 'faithful', sectionKey: 'Postcommunio' },
  { id: 'super-populum', latin: 'Oratio super populum', english: 'Prayer over the People', kind: 'conditional', line: 'faithful', sectionKey: 'Super populum', branch: 'spur', activeIn: ['Lent'], note: 'Lenten ferias' },
  { id: 'ite', latin: 'Ite, missa est', english: 'Dismissal', kind: 'ordinary', line: 'faithful', note: 'Benedicamus Domino when Gloria was omitted', detail: true },
  { id: 'ultimum-evangelium', latin: 'Ultimum Evangelium', english: 'Last Gospel (John 1)', kind: 'ordinary', line: 'faithful' },
];

/**
 * Ordinary stations → their section in the ingested Ordinary of the Mass
 * (corpus file "Ordo/Missae", from missa/<lang>/Ordo/Ordo.txt). Several
 * stations share one Ordo section (Kyrie+Gloria, Preface+Sanctus…).
 */
export const ORDO_STATION_SECTION: Record<string, string> = {
  asperges: 'Prelude',
  iudica: 'Incipit',
  confiteor: 'Incipit',
  kyrie: 'Kyrie',
  gloria: 'Kyrie',
  credo: 'Credo',
  lavabo: 'Offertorium',
  'orate-fratres': 'Offertorium',
  praefatio: 'Præfatio',
  sanctus: 'Præfatio',
  canon: 'Canon',
  'pater-noster': 'Preparatio Communionis',
  'agnus-dei': 'Preparatio Communionis',
  ite: 'Conclusio',
  'ultimum-evangelium': 'Conclusio',
};

/**
 * Canonical interleaving of the Ordinary (o:) and the day's propers (p:)
 * for the full-Mass reader. Ordinary entries reference Ordo/Missae sections.
 */
export const READER_ORDER: { kind: 'ordo' | 'proper'; section: string; title?: string }[] = [
  { kind: 'ordo', section: 'Incipit', title: 'Prayers at the Foot of the Altar' },
  { kind: 'proper', section: 'Introitus' },
  { kind: 'ordo', section: 'Kyrie', title: 'Kyrie · Gloria' },
  { kind: 'proper', section: 'Oratio' },
  { kind: 'proper', section: 'Oratio 2' },
  { kind: 'proper', section: 'Oratio 3' },
  { kind: 'proper', section: 'LectioL1' },
  { kind: 'proper', section: 'GradualeL1' },
  { kind: 'proper', section: 'OratioL1' },
  { kind: 'proper', section: 'Lectio' },
  { kind: 'proper', section: 'Lectio 2' },
  { kind: 'proper', section: 'Graduale' },
  { kind: 'proper', section: 'GradualeP' },
  { kind: 'proper', section: 'Tractus' },
  { kind: 'proper', section: 'Alleluia' },
  { kind: 'proper', section: 'Evangelium' },
  { kind: 'ordo', section: 'Credo', title: 'Credo' },
  { kind: 'proper', section: 'Offertorium' },
  { kind: 'ordo', section: 'Offertorium', title: 'Offertory · Lavabo · Orate fratres' },
  { kind: 'proper', section: 'Secreta' },
  { kind: 'proper', section: 'Secreta 2' },
  { kind: 'proper', section: 'Secreta 3' },
  { kind: 'ordo', section: 'Præfatio', title: 'Preface · Sanctus' },
  { kind: 'ordo', section: 'Canon', title: 'The Roman Canon' },
  { kind: 'ordo', section: 'Preparatio Communionis', title: 'Pater noster · Agnus Dei' },
  { kind: 'proper', section: 'Communio' },
  { kind: 'proper', section: 'Postcommunio' },
  { kind: 'proper', section: 'Postcommunio 2' },
  { kind: 'proper', section: 'Postcommunio 3' },
  { kind: 'proper', section: 'Super populum' },
  { kind: 'ordo', section: 'Conclusio', title: 'Ite missa est · Last Gospel' },
];

/** Trunk stations of a line, in order (branches excluded). */
export function trunkOf(line: LineId): Station[] {
  return MASS_ORDO.filter((s) => s.line === line && !s.branch);
}

/** Stations of a named branch. */
export function branchOf(branch: NonNullable<Station['branch']>): Station[] {
  return MASS_ORDO.filter((s) => s.branch === branch);
}

/** Is a switch/conditional station active in the given season? */
export function stationActive(station: Station, season: Season): boolean {
  if (!station.activeIn) return true;
  return station.activeIn.includes(season);
}

/**
 * The ever-present map strip's station sequence: both trunks (skeleton only —
 * detail stations stay folded) with the season's active chant switch(es)
 * spliced in at their liturgical slot, right after the Epistle.
 */
export function stripStations(season: Season): Station[] {
  const cat = trunkOf('catechumens').filter((s) => !s.detail);
  const chant = branchOf('chant').filter((s) => stationActive(s, season));
  const fai = trunkOf('faithful').filter((s) => !s.detail);
  const at = cat.findIndex((s) => s.id === 'lectio') + 1;
  return [...cat.slice(0, at), ...chant, ...cat.slice(at), ...fai];
}

/**
 * Inverse of the reader's anchor scheme, for scroll-spy: which station does a
 * `data-section` anchor ("Introitus", "Oratio 2", "ordo:Canon") belong to?
 */
export function stationForAnchor(anchor: string): string | null {
  if (anchor.startsWith('ordo:')) {
    const sec = anchor.slice(5);
    const hit =
      MASS_ORDO.find((s) => !s.detail && ORDO_STATION_SECTION[s.id] === sec) ??
      MASS_ORDO.find((s) => ORDO_STATION_SECTION[s.id] === sec);
    return hit?.id ?? null;
  }
  const exact = MASS_ORDO.find((s) => s.sectionKey === anchor);
  if (exact) return exact.id;
  const base = anchor.replace(/ \d+$/, '');
  return MASS_ORDO.find((s) => s.sectionKey === base)?.id ?? null;
}
