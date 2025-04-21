/**
 * Data models for Divine Office texts
 */

/**
 * Bilingual text content
 */
export interface BilingualText {
  latin: string;
  english: string;
}

/**
 * Psalm in the Divine Office
 */
export interface OfficePsalm {
  number: string;
  title: BilingualText;
  text: BilingualText;
}

/**
 * Reading in the Divine Office
 */
export interface OfficeReading {
  number: string;
  text: BilingualText;
}

/**
 * Hour of the Divine Office
 */
export interface OfficeHour {
  id: string;
  date: string;
  hour: string;
  title: BilingualText;
  hymn?: BilingualText;
  psalms: OfficePsalm[];
  chapter?: {
    latin: string;
    english: string;
    reference: string;
  };
  readings: OfficeReading[];
  prayer?: BilingualText;
}

/**
 * Day in the Divine Office
 */
export interface OfficeDay {
  id: string;
  date: string;
  hours: {
    matins?: OfficeHour;
    lauds?: OfficeHour;
    prime?: OfficeHour;
    terce?: OfficeHour;
    sext?: OfficeHour;
    none?: OfficeHour;
    vespers?: OfficeHour;
    compline?: OfficeHour;
  };
}

/**
 * Settings for the Divine Office
 */
export interface OfficeSettings {
  language: 'latin' | 'english';
  showTranslations: boolean;
  showRubrics: boolean;
  fontSize: 'small' | 'medium' | 'large';
}
