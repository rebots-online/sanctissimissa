/**
 * Enhanced Temporal Cycle Service
 * 
 * This service handles the Temporal Cycle of the liturgical year,
 * which includes seasons and moveable feasts based on Easter.
 */

import { calculateEaster, calculateDateRelativeToEaster, daysFromEaster } from './easterCalculator';
import { getLiturgicalSeason } from './seasonCalculator';
import { LiturgicalColor, LiturgicalRank } from '../../../models/calendar';

/**
 * Interface representing a temporal celebration
 */
export interface TemporalCelebration {
  id: string;
  name: string;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  date: Date;
  properTexts: boolean;
  commonTexts?: string;
  isHolyDay: boolean;
  isFeastDay: boolean;
  description?: string;
}

/**
 * Get the temporal celebration for a specific date
 * 
 * @param date The date to get the celebration for
 * @returns The temporal celebration or null if none
 */
export function getTemporalCelebration(date: Date): TemporalCelebration | null {
  const year = date.getFullYear();
  const easter = calculateEaster(year);
  const daysFromEasterSunday = daysFromEaster(date);
  const season = getLiturgicalSeason(date);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const isSunday = dayOfWeek === 0;
  
  // Check for specific major feasts in the Temporal cycle
  
  // Easter and Holy Week
  if (daysFromEasterSunday === 0) {
    return {
      id: 'easter_sunday',
      name: 'Easter Sunday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: true,
      isFeastDay: true,
      description: 'The Solemnity of the Resurrection of Our Lord'
    };
  }
  
  if (daysFromEasterSunday === -1) {
    return {
      id: 'holy_saturday',
      name: 'Holy Saturday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.PURPLE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'Easter Vigil'
    };
  }
  
  if (daysFromEasterSunday === -2) {
    return {
      id: 'good_friday',
      name: 'Good Friday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.BLACK,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'Commemoration of the Passion and Death of Our Lord'
    };
  }
  
  if (daysFromEasterSunday === -3) {
    return {
      id: 'holy_thursday',
      name: 'Holy Thursday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'Mass of the Lord\'s Supper'
    };
  }
  
  // Palm Sunday
  if (daysFromEasterSunday === -7) {
    return {
      id: 'palm_sunday',
      name: 'Palm Sunday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.PURPLE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'Second Sunday of Passiontide, commemorating Our Lord\'s entrance into Jerusalem'
    };
  }
  
  // Passion Sunday
  if (daysFromEasterSunday === -14) {
    return {
      id: 'passion_sunday',
      name: 'Passion Sunday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.PURPLE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'First Sunday of Passiontide'
    };
  }
  
  // Ash Wednesday
  if (daysFromEasterSunday === -46) {
    return {
      id: 'ash_wednesday',
      name: 'Ash Wednesday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.PURPLE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'The beginning of Lent'
    };
  }
  
  // Septuagesima, Sexagesima, Quinquagesima
  if (daysFromEasterSunday === -63 && isSunday) {
    return {
      id: 'septuagesima_sunday',
      name: 'Septuagesima Sunday',
      rank: LiturgicalRank.SECOND_CLASS,
      color: LiturgicalColor.PURPLE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'The beginning of pre-Lent season'
    };
  }
  
  if (daysFromEasterSunday === -56 && isSunday) {
    return {
      id: 'sexagesima_sunday',
      name: 'Sexagesima Sunday',
      rank: LiturgicalRank.SECOND_CLASS,
      color: LiturgicalColor.PURPLE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'The second Sunday of pre-Lent'
    };
  }
  
  if (daysFromEasterSunday === -49 && isSunday) {
    return {
      id: 'quinquagesima_sunday',
      name: 'Quinquagesima Sunday',
      rank: LiturgicalRank.SECOND_CLASS,
      color: LiturgicalColor.PURPLE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: 'The third Sunday of pre-Lent'
    };
  }
  
  // Easter Octave
  if (daysFromEasterSunday > 0 && daysFromEasterSunday <= 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      id: `easter_${dayNames[dayOfWeek].toLowerCase()}`,
      name: `Easter ${dayNames[dayOfWeek]}`,
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: dayOfWeek === 0, // Only Sunday is a Holy Day
      isFeastDay: true,
      description: `Day ${daysFromEasterSunday} in the Octave of Easter`
    };
  }
  
  // Low Sunday (Divine Mercy)
  if (daysFromEasterSunday === 7 && isSunday) {
    return {
      id: 'low_sunday',
      name: 'Low Sunday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: true,
      isFeastDay: false,
      description: 'The Octave Day of Easter, also known as Quasimodo Sunday or Divine Mercy Sunday'
    };
  }
  
  // Ascension Thursday
  if (daysFromEasterSunday === 39) {
    return {
      id: 'ascension_thursday',
      name: 'Ascension Thursday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: true,
      isFeastDay: true,
      description: 'The Solemnity of the Ascension of Our Lord'
    };
  }
  
  // Pentecost
  if (daysFromEasterSunday === 49) {
    return {
      id: 'pentecost_sunday',
      name: 'Pentecost Sunday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.RED,
      date,
      properTexts: true,
      isHolyDay: true,
      isFeastDay: true,
      description: 'The Solemnity of Pentecost, commemorating the descent of the Holy Spirit'
    };
  }
  
  // Pentecost Octave
  if (daysFromEasterSunday > 49 && daysFromEasterSunday <= 56) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      id: `pentecost_${dayNames[dayOfWeek].toLowerCase()}`,
      name: `${dayNames[dayOfWeek]} in the Octave of Pentecost`,
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.RED,
      date,
      properTexts: true,
      isHolyDay: dayOfWeek === 0, // Only Sunday is a Holy Day
      isFeastDay: false,
      description: `Day ${daysFromEasterSunday - 49} in the Octave of Pentecost`
    };
  }
  
  // Trinity Sunday
  if (daysFromEasterSunday === 56 && isSunday) {
    return {
      id: 'trinity_sunday',
      name: 'Trinity Sunday',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: true,
      isFeastDay: false,
      description: 'The Solemnity of the Most Holy Trinity'
    };
  }
  
  // Corpus Christi
  if (daysFromEasterSunday === 60) {
    return {
      id: 'corpus_christi',
      name: 'Corpus Christi',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: true,
      isFeastDay: true,
      description: 'The Solemnity of the Most Holy Body and Blood of Christ'
    };
  }
  
  // Sacred Heart
  if (daysFromEasterSunday === 68) {
    return {
      id: 'sacred_heart',
      name: 'Sacred Heart of Jesus',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: true,
      description: 'The Solemnity of the Most Sacred Heart of Jesus'
    };
  }
  
  // Sundays in general
  if (isSunday) {
    // Determine the Sunday name based on the season
    let sundayName = '';
    let sundayRank = LiturgicalRank.SECOND_CLASS;
    
    switch (season.id) {
      case 'advent':
        // Calculate which Sunday of Advent
        const christmas = new Date(year, 11, 25);
        const sundaysBefore = Math.ceil((christmas.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
        sundayName = `${sundaysBefore} Sunday of Advent`;
        sundayRank = LiturgicalRank.FIRST_CLASS;
        break;
        
      case 'lent':
        // Calculate which Sunday of Lent
        const lentSunday = Math.floor((date.getTime() - season.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        sundayName = `${lentSunday} Sunday of Lent`;
        sundayRank = LiturgicalRank.FIRST_CLASS;
        break;
        
      case 'easter':
        // Calculate which Sunday of Easter
        const easterSunday = Math.floor(daysFromEasterSunday / 7) + 1;
        if (easterSunday === 1) {
          sundayName = 'Easter Sunday';
        } else {
          sundayName = `${easterSunday} Sunday after Easter`;
        }
        break;
        
      case 'tempus_per_annum':
        // Calculate which Sunday after Pentecost
        const pentecost = calculateDateRelativeToEaster(year, 49);
        const sundaysAfterPentecost = Math.floor((date.getTime() - pentecost.getTime()) / (7 * 24 * 60 * 60 * 1000));
        sundayName = `${sundaysAfterPentecost} Sunday after Pentecost`;
        break;
        
      default:
        // For other seasons, just use the season name
        sundayName = `Sunday in ${season.name}`;
    }
    
    return {
      id: `sunday_${season.id}_${date.toISOString().split('T')[0]}`,
      name: sundayName,
      rank: sundayRank,
      color: season.color,
      date,
      properTexts: true,
      isHolyDay: true,
      isFeastDay: false,
      description: `Sunday in the season of ${season.name}`
    };
  }
  
  // Ember Days
  const isEmberDay = isEmberDayCheck(date, easter);
  if (isEmberDay) {
    const emberSeason = getEmberSeason(date, easter);
    return {
      id: `ember_${emberSeason}_${dayOfWeek}`,
      name: `Ember ${dayOfWeek === 3 ? 'Wednesday' : dayOfWeek === 5 ? 'Friday' : 'Saturday'} of ${emberSeason}`,
      rank: LiturgicalRank.SECOND_CLASS,
      color: season.color,
      date,
      properTexts: true,
      isHolyDay: false,
      isFeastDay: false,
      description: `Ember Day in the season of ${emberSeason}`
    };
  }
  
  // Regular ferias
  return {
    id: `feria_${season.id}_${date.toISOString().split('T')[0]}`,
    name: `Feria of ${season.name}`,
    rank: LiturgicalRank.FOURTH_CLASS,
    color: season.color,
    date,
    properTexts: false,
    isHolyDay: false,
    isFeastDay: false,
    description: `Weekday in the season of ${season.name}`
  };
}

/**
 * Check if a date is an Ember Day
 * 
 * @param date The date to check
 * @param easter Easter Sunday for the year
 * @returns True if the date is an Ember Day
 */
function isEmberDayCheck(date: Date, easter: Date): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Ember days are Wednesday, Friday, and Saturday
  if (dayOfWeek !== 3 && dayOfWeek !== 5 && dayOfWeek !== 6) {
    return false;
  }
  
  // Check for Advent Ember Days (Wednesday, Friday, Saturday after Gaudete Sunday)
  const year = date.getFullYear();
  const christmas = new Date(year, 11, 25);
  const christmasDayOfWeek = christmas.getDay();
  const daysToSubtract = (christmasDayOfWeek + 7) % 7 + 21; // 3 full weeks + days until previous Sunday
  const advent1 = new Date(year, 11, 25 - daysToSubtract);
  const gaudete = new Date(advent1);
  gaudete.setDate(advent1.getDate() + 14); // 3rd Sunday of Advent
  
  const adventEmberWednesday = new Date(gaudete);
  adventEmberWednesday.setDate(gaudete.getDate() + 3); // Wednesday after Gaudete
  
  if (date.getTime() === adventEmberWednesday.getTime() ||
      (date.getTime() === adventEmberWednesday.getTime() + 2 * 86400000) || // Friday
      (date.getTime() === adventEmberWednesday.getTime() + 3 * 86400000)) { // Saturday
    return true;
  }
  
  // Check for Lent Ember Days (Wednesday, Friday, Saturday after Invocabit Sunday)
  const invocabit = new Date(easter);
  invocabit.setDate(easter.getDate() - 42); // 1st Sunday of Lent
  
  const lentEmberWednesday = new Date(invocabit);
  lentEmberWednesday.setDate(invocabit.getDate() + 3); // Wednesday after Invocabit
  
  if (date.getTime() === lentEmberWednesday.getTime() ||
      (date.getTime() === lentEmberWednesday.getTime() + 2 * 86400000) || // Friday
      (date.getTime() === lentEmberWednesday.getTime() + 3 * 86400000)) { // Saturday
    return true;
  }
  
  // Check for Pentecost Ember Days (Wednesday, Friday, Saturday after Pentecost)
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  
  const pentecostEmberWednesday = new Date(pentecost);
  pentecostEmberWednesday.setDate(pentecost.getDate() + 3); // Wednesday after Pentecost
  
  if (date.getTime() === pentecostEmberWednesday.getTime() ||
      (date.getTime() === pentecostEmberWednesday.getTime() + 2 * 86400000) || // Friday
      (date.getTime() === pentecostEmberWednesday.getTime() + 3 * 86400000)) { // Saturday
    return true;
  }
  
  // Check for September Ember Days (Wednesday, Friday, Saturday after Holy Cross)
  const holyCross = new Date(year, 8, 14); // September 14
  const holyCrossDayOfWeek = holyCross.getDay();
  const daysToAdd = (7 - holyCrossDayOfWeek) % 7; // Days until next Sunday
  const sundayAfterHolyCross = new Date(holyCross);
  sundayAfterHolyCross.setDate(holyCross.getDate() + daysToAdd);
  
  const septemberEmberWednesday = new Date(sundayAfterHolyCross);
  septemberEmberWednesday.setDate(sundayAfterHolyCross.getDate() + 3); // Wednesday after Sunday after Holy Cross
  
  if (date.getTime() === septemberEmberWednesday.getTime() ||
      (date.getTime() === septemberEmberWednesday.getTime() + 2 * 86400000) || // Friday
      (date.getTime() === septemberEmberWednesday.getTime() + 3 * 86400000)) { // Saturday
    return true;
  }
  
  return false;
}

/**
 * Get the season name for an Ember Day
 * 
 * @param date The Ember Day date
 * @param easter Easter Sunday for the year
 * @returns The season name for the Ember Day
 */
function getEmberSeason(date: Date, easter: Date): string {
  const year = date.getFullYear();
  
  // Check for Advent Ember Days
  const christmas = new Date(year, 11, 25);
  const christmasDayOfWeek = christmas.getDay();
  const daysToSubtract = (christmasDayOfWeek + 7) % 7 + 21; // 3 full weeks + days until previous Sunday
  const advent1 = new Date(year, 11, 25 - daysToSubtract);
  const gaudete = new Date(advent1);
  gaudete.setDate(advent1.getDate() + 14); // 3rd Sunday of Advent
  
  const adventEmberWednesday = new Date(gaudete);
  adventEmberWednesday.setDate(gaudete.getDate() + 3); // Wednesday after Gaudete
  
  if (date.getTime() >= adventEmberWednesday.getTime() &&
      date.getTime() <= adventEmberWednesday.getTime() + 3 * 86400000) {
    return 'Advent';
  }
  
  // Check for Lent Ember Days
  const invocabit = new Date(easter);
  invocabit.setDate(easter.getDate() - 42); // 1st Sunday of Lent
  
  const lentEmberWednesday = new Date(invocabit);
  lentEmberWednesday.setDate(invocabit.getDate() + 3); // Wednesday after Invocabit
  
  if (date.getTime() >= lentEmberWednesday.getTime() &&
      date.getTime() <= lentEmberWednesday.getTime() + 3 * 86400000) {
    return 'Lent';
  }
  
  // Check for Pentecost Ember Days
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  
  const pentecostEmberWednesday = new Date(pentecost);
  pentecostEmberWednesday.setDate(pentecost.getDate() + 3); // Wednesday after Pentecost
  
  if (date.getTime() >= pentecostEmberWednesday.getTime() &&
      date.getTime() <= pentecostEmberWednesday.getTime() + 3 * 86400000) {
    return 'Pentecost';
  }
  
  // Check for September Ember Days
  const holyCross = new Date(year, 8, 14); // September 14
  const holyCrossDayOfWeek = holyCross.getDay();
  const daysToAdd = (7 - holyCrossDayOfWeek) % 7; // Days until next Sunday
  const sundayAfterHolyCross = new Date(holyCross);
  sundayAfterHolyCross.setDate(holyCross.getDate() + daysToAdd);
  
  const septemberEmberWednesday = new Date(sundayAfterHolyCross);
  septemberEmberWednesday.setDate(sundayAfterHolyCross.getDate() + 3); // Wednesday after Sunday after Holy Cross
  
  if (date.getTime() >= septemberEmberWednesday.getTime() &&
      date.getTime() <= septemberEmberWednesday.getTime() + 3 * 86400000) {
    return 'September';
  }
  
  return 'Unknown';
}
