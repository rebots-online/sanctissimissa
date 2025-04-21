/**
 * Data models for Traditional Latin Mass (Extraordinary Form) texts
 */

export type Language = 'latin' | 'english';

export interface TextWithTranslation {
  latin: string;
  english: string;
}

export interface Rubric {
  text: string;
  isImportant?: boolean;
}

export interface MassPart {
  id: string;
  title: TextWithTranslation;
  content: TextWithTranslation;
  rubrics?: Rubric[];
}

export interface MassOrdinary {
  kyrie: MassPart;
  gloria: MassPart;
  credo: MassPart;
  sanctus: MassPart;
  agnusDei: MassPart;
  dismissal: MassPart;
}

export interface MassProper {
  introit: MassPart;
  collect: MassPart;
  epistle: MassPart;
  gradual: MassPart;
  alleluia?: MassPart;
  tract?: MassPart;
  sequence?: MassPart;
  gospel: MassPart;
  offertory: MassPart;
  secret: MassPart;
  preface: MassPart;
  communion: MassPart;
  postcommunion: MassPart;
}

export interface MassReadings {
  epistle: MassPart;
  gospel: MassPart;
}

export interface MassDay {
  id: string;
  date: string;
  title: TextWithTranslation;
  description?: TextWithTranslation;
  liturgicalDay: {
    season: string;
    week: string;
    day: string;
    rank: number;
    color: 'white' | 'red' | 'green' | 'purple' | 'rose' | 'black';
  };
  proper: MassProper;
  readings: MassReadings;
  ordinary?: Partial<MassOrdinary>; // Optional, can use default ordinary
  commemorations?: MassPart[]; // For days with multiple celebrations
}

export interface MassSettings {
  language: Language;
  showRubrics: boolean;
  showTranslations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}
