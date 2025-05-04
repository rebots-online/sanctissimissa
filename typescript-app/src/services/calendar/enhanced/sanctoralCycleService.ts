/**
 * Enhanced Sanctoral Cycle Service
 * 
 * This service handles the Sanctoral Cycle of the liturgical year,
 * which includes fixed-date feasts of saints and other celebrations.
 */

import { LiturgicalColor, LiturgicalRank } from '../../../models/calendar';

/**
 * Interface representing a sanctoral celebration
 */
export interface SanctoralCelebration {
  id: string;
  name: string;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  date: Date;
  monthDay: string; // MM-DD format
  properTexts: boolean;
  commonTexts?: string;
  isHolyDay: boolean;
  isFeastDay: boolean;
  description?: string;
}

/**
 * Get the sanctoral celebration for a specific date
 * 
 * @param date The date to get the celebration for
 * @returns The sanctoral celebration or null if none
 */
export function getSanctoralCelebration(date: Date): SanctoralCelebration | null {
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Get the celebration from the sanctoral calendar
  const celebration = SANCTORAL_CALENDAR[monthDay];
  
  if (!celebration) {
    return null;
  }
  
  return {
    ...celebration,
    date,
    monthDay
  };
}

/**
 * Get all sanctoral celebrations for a year
 * 
 * @param year The year to get celebrations for
 * @returns Array of sanctoral celebrations
 */
export function getAllSanctoralCelebrations(year: number): SanctoralCelebration[] {
  const celebrations: SanctoralCelebration[] = [];
  
  for (const monthDay in SANCTORAL_CALENDAR) {
    const [month, day] = monthDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    celebrations.push({
      ...SANCTORAL_CALENDAR[monthDay],
      date,
      monthDay
    });
  }
  
  return celebrations;
}

/**
 * Sanctoral calendar with fixed-date celebrations
 * This is a partial implementation with major feasts
 */
const SANCTORAL_CALENDAR: Record<string, Omit<SanctoralCelebration, 'date' | 'monthDay'>> = {
  // January
  '01-01': {
    id: 'circumcision',
    name: 'Circumcision of Our Lord',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Octave Day of Christmas, commemorating the Circumcision of Our Lord'
  },
  '01-06': {
    id: 'epiphany',
    name: 'Epiphany of Our Lord',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Commemoration of the manifestation of Christ to the Gentiles'
  },
  
  // February
  '02-02': {
    id: 'purification',
    name: 'Purification of the Blessed Virgin Mary',
    rank: LiturgicalRank.SECOND_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Candlemas, commemorating the presentation of Jesus at the Temple'
  },
  
  // March
  '03-19': {
    id: 'st_joseph',
    name: 'St. Joseph, Spouse of the Blessed Virgin Mary',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Solemnity of St. Joseph, Patron of the Universal Church'
  },
  '03-25': {
    id: 'annunciation',
    name: 'Annunciation of the Blessed Virgin Mary',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Commemoration of the Annunciation of the Incarnation to the Blessed Virgin Mary'
  },
  
  // May
  '05-01': {
    id: 'st_joseph_worker',
    name: 'St. Joseph the Worker',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of St. Joseph the Worker'
  },
  
  // June
  '06-24': {
    id: 'st_john_baptist',
    name: 'Nativity of St. John the Baptist',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Solemnity of the Birth of St. John the Baptist'
  },
  '06-29': {
    id: 'sts_peter_paul',
    name: 'Sts. Peter and Paul, Apostles',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.RED,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Solemnity of the Holy Apostles Peter and Paul'
  },
  
  // July
  '07-01': {
    id: 'precious_blood',
    name: 'Most Precious Blood of Our Lord Jesus Christ',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.RED,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of the Most Precious Blood of Our Lord Jesus Christ'
  },
  
  // August
  '08-15': {
    id: 'assumption',
    name: 'Assumption of the Blessed Virgin Mary',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Solemnity of the Assumption of the Blessed Virgin Mary into Heaven'
  },
  
  // September
  '09-08': {
    id: 'nativity_bvm',
    name: 'Nativity of the Blessed Virgin Mary',
    rank: LiturgicalRank.SECOND_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of the Birth of the Blessed Virgin Mary'
  },
  '09-14': {
    id: 'exaltation_cross',
    name: 'Exaltation of the Holy Cross',
    rank: LiturgicalRank.SECOND_CLASS,
    color: LiturgicalColor.RED,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of the Exaltation of the Holy Cross'
  },
  
  // October
  '10-11': {
    id: 'divine_maternity',
    name: 'Divine Maternity of the Blessed Virgin Mary',
    rank: LiturgicalRank.SECOND_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of the Divine Maternity of the Blessed Virgin Mary'
  },
  
  // November
  '11-01': {
    id: 'all_saints',
    name: 'All Saints',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Solemnity of All Saints'
  },
  '11-02': {
    id: 'all_souls',
    name: 'All Souls',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.BLACK,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: false,
    description: 'Commemoration of All the Faithful Departed'
  },
  
  // December
  '12-08': {
    id: 'immaculate_conception',
    name: 'Immaculate Conception of the Blessed Virgin Mary',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Solemnity of the Immaculate Conception of the Blessed Virgin Mary'
  },
  '12-25': {
    id: 'christmas',
    name: 'Nativity of Our Lord Jesus Christ',
    rank: LiturgicalRank.FIRST_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: true,
    isFeastDay: true,
    description: 'Solemnity of the Birth of Our Lord Jesus Christ'
  },
  '12-26': {
    id: 'st_stephen',
    name: 'St. Stephen, First Martyr',
    rank: LiturgicalRank.SECOND_CLASS,
    color: LiturgicalColor.RED,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of St. Stephen, the First Martyr'
  },
  '12-27': {
    id: 'st_john_evangelist',
    name: 'St. John, Apostle and Evangelist',
    rank: LiturgicalRank.SECOND_CLASS,
    color: LiturgicalColor.WHITE,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of St. John, Apostle and Evangelist'
  },
  '12-28': {
    id: 'holy_innocents',
    name: 'Holy Innocents',
    rank: LiturgicalRank.SECOND_CLASS,
    color: LiturgicalColor.RED,
    properTexts: true,
    isHolyDay: false,
    isFeastDay: true,
    description: 'Feast of the Holy Innocents, Martyrs'
  }
};
