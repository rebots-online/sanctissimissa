/**
 * Enhanced Season Calculator Service
 * 
 * This service provides functions for calculating liturgical seasons
 * according to the 1962 Roman Missal.
 */

import { calculateEaster, calculateDateRelativeToEaster } from './easterCalculator';
import { LiturgicalColor } from '../../../models/calendar';

/**
 * Interface representing a liturgical season
 */
export interface LiturgicalSeason {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  color: LiturgicalColor;
  description?: string;
}

/**
 * Calculate all liturgical seasons for a given year
 * 
 * @param year The year to calculate seasons for
 * @returns Array of liturgical seasons
 */
export function calculateLiturgicalSeasons(year: number): LiturgicalSeason[] {
  const seasons: LiturgicalSeason[] = [];
  
  // Calculate Easter and related dates
  const easter = calculateEaster(year);
  const ashWednesday = calculateDateRelativeToEaster(year, -46);
  const passionSunday = calculateDateRelativeToEaster(year, -14);
  const pentecostSunday = calculateDateRelativeToEaster(year, 49);
  const trinitySunday = calculateDateRelativeToEaster(year, 56);
  const septuagesimaSunday = calculateDateRelativeToEaster(year, -63);
  
  // Calculate Christmas dates
  const christmas = new Date(year, 11, 25); // December 25
  const epiphany = new Date(year, 0, 6); // January 6
  
  // Calculate Advent (4th Sunday before Christmas)
  const christmas2 = new Date(year, 11, 25);
  const christmasDayOfWeek = christmas2.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = (christmasDayOfWeek + 7) % 7 + 21; // 3 full weeks + days until previous Sunday
  const advent1 = new Date(year, 11, 25 - daysToSubtract);
  
  // Calculate next year's Advent for season boundary
  const nextYearAdvent1 = new Date(year + 1, 11, 25);
  const nextChristmasDayOfWeek = nextYearAdvent1.getDay();
  const nextDaysToSubtract = (nextChristmasDayOfWeek + 7) % 7 + 21;
  const nextYearAdvent = new Date(year + 1, 11, 25 - nextDaysToSubtract);
  
  // Add Advent season
  seasons.push({
    id: 'advent',
    name: 'Advent',
    startDate: advent1,
    endDate: new Date(year, 11, 24), // December 24
    color: LiturgicalColor.PURPLE,
    description: 'The season of preparation for the Nativity of Our Lord'
  });
  
  // Add Christmas season
  seasons.push({
    id: 'christmas',
    name: 'Christmastide',
    startDate: christmas,
    endDate: new Date(year, 0, 5), // January 5
    color: LiturgicalColor.WHITE,
    description: 'The season celebrating the birth of Christ'
  });
  
  // Add Epiphany season
  seasons.push({
    id: 'epiphany',
    name: 'Epiphanytide',
    startDate: epiphany,
    endDate: new Date(septuagesimaSunday.getTime() - 86400000), // Day before Septuagesima
    color: LiturgicalColor.WHITE,
    description: 'The season celebrating the manifestation of Christ to the Gentiles'
  });
  
  // Add Septuagesima season
  seasons.push({
    id: 'septuagesima',
    name: 'Septuagesima',
    startDate: septuagesimaSunday,
    endDate: new Date(ashWednesday.getTime() - 86400000), // Day before Ash Wednesday
    color: LiturgicalColor.PURPLE,
    description: 'The pre-Lenten season of preparation'
  });
  
  // Add Lent season
  seasons.push({
    id: 'lent',
    name: 'Lent',
    startDate: ashWednesday,
    endDate: new Date(passionSunday.getTime() - 86400000), // Day before Passion Sunday
    color: LiturgicalColor.PURPLE,
    description: 'The penitential season preparing for Easter'
  });
  
  // Add Passiontide
  seasons.push({
    id: 'passiontide',
    name: 'Passiontide',
    startDate: passionSunday,
    endDate: new Date(easter.getTime() - 86400000), // Holy Saturday
    color: LiturgicalColor.PURPLE,
    description: 'The final two weeks of Lent focusing on Christ\'s Passion'
  });
  
  // Add Easter season
  seasons.push({
    id: 'easter',
    name: 'Eastertide',
    startDate: easter,
    endDate: new Date(pentecostSunday.getTime() - 86400000), // Day before Pentecost
    color: LiturgicalColor.WHITE,
    description: 'The joyful season celebrating Christ\'s Resurrection'
  });
  
  // Add Pentecost season (octave)
  seasons.push({
    id: 'pentecost',
    name: 'Pentecost',
    startDate: pentecostSunday,
    endDate: new Date(trinitySunday.getTime() - 86400000), // Day before Trinity Sunday
    color: LiturgicalColor.RED,
    description: 'The octave of Pentecost celebrating the descent of the Holy Spirit'
  });
  
  // Add Time after Pentecost
  seasons.push({
    id: 'tempus_per_annum',
    name: 'Time after Pentecost',
    startDate: trinitySunday,
    endDate: new Date(nextYearAdvent.getTime() - 86400000), // Day before next Advent
    color: LiturgicalColor.GREEN,
    description: 'The season representing the life of the Church under the guidance of the Holy Spirit'
  });
  
  return seasons;
}

/**
 * Get the liturgical season for a specific date
 * 
 * @param date The date to get the season for
 * @returns The liturgical season
 */
export function getLiturgicalSeason(date: Date): LiturgicalSeason {
  const year = date.getFullYear();
  
  // Calculate seasons for current year
  const seasons = calculateLiturgicalSeasons(year);
  
  // Find the season that contains the date
  for (const season of seasons) {
    if (date >= season.startDate && date <= season.endDate) {
      return season;
    }
  }
  
  // If not found, check previous year (for Advent and Christmas)
  const prevYearSeasons = calculateLiturgicalSeasons(year - 1);
  for (const season of prevYearSeasons) {
    if (date >= season.startDate && date <= season.endDate) {
      return season;
    }
  }
  
  // If still not found, check next year (unlikely but possible edge case)
  const nextYearSeasons = calculateLiturgicalSeasons(year + 1);
  for (const season of nextYearSeasons) {
    if (date >= season.startDate && date <= season.endDate) {
      return season;
    }
  }
  
  // This should never happen with proper season definitions
  throw new Error(`Could not determine liturgical season for date: ${date.toISOString()}`);
}
