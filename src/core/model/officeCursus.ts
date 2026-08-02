/**
 * The Divine Office cursus — the eight canonical hours of the Breviary
 * (Extraordinary Form) as a loop line. v1 renders the rubrical structure of
 * each hour; the full text schema (custom hour-construction rules over the
 * DO corpus) is the Phase-2 next-major deliverable.
 */

export interface Hour {
  id: string;
  latin: string;
  english: string;
  /** Approximate traditional time, for the loop layout. */
  clock: string;
  /** Structural parts of the hour in order (rubrical skeleton, invariable). */
  parts: string[];
}

export const OFFICE_CURSUS: Hour[] = [
  {
    id: 'matutinum', latin: 'Matutinum', english: 'Matins', clock: '00:00',
    parts: ['Invitatorium', 'Hymnus', 'Nocturni (Psalmi & Antiphonae)', 'Lectiones cum Responsoriis', 'Te Deum'],
  },
  {
    id: 'laudes', latin: 'Laudes', english: 'Lauds', clock: '03:00',
    parts: ['Deus in adiutorium', 'Psalmi & Antiphonae', 'Capitulum', 'Hymnus & Versus', 'Benedictus', 'Oratio'],
  },
  {
    id: 'prima', latin: 'Prima', english: 'Prime', clock: '06:00',
    parts: ['Deus in adiutorium', 'Hymnus', 'Psalmi', 'Capitulum', 'Martyrologium', 'Oratio'],
  },
  {
    id: 'tertia', latin: 'Tertia', english: 'Terce', clock: '09:00',
    parts: ['Deus in adiutorium', 'Hymnus', 'Psalmi', 'Capitulum', 'Oratio'],
  },
  {
    id: 'sexta', latin: 'Sexta', english: 'Sext', clock: '12:00',
    parts: ['Deus in adiutorium', 'Hymnus', 'Psalmi', 'Capitulum', 'Oratio'],
  },
  {
    id: 'nona', latin: 'Nona', english: 'None', clock: '15:00',
    parts: ['Deus in adiutorium', 'Hymnus', 'Psalmi', 'Capitulum', 'Oratio'],
  },
  {
    id: 'vesperae', latin: 'Vesperae', english: 'Vespers', clock: '18:00',
    parts: ['Deus in adiutorium', 'Psalmi & Antiphonae', 'Capitulum', 'Hymnus & Versus', 'Magnificat', 'Oratio'],
  },
  {
    id: 'completorium', latin: 'Completorium', english: 'Compline', clock: '21:00',
    parts: ['Lectio brevis', 'Confiteor', 'Psalmi', 'Hymnus', 'Nunc dimittis', 'Oratio', 'Antiphona B.M.V.'],
  },
];
