/**
 * Enhanced Liturgical Day Service
 *
 * This service combines all the calendar services to determine
 * the complete liturgical day information for any given date.
 */

import { getLiturgicalSeason, LiturgicalSeason } from './seasonCalculator';
import { getTemporalCelebration, TemporalCelebration } from './temporalCycleService';
import { getSanctoralCelebration, SanctoralCelebration } from './sanctoralCycleService';
import { determinePrecedence, Commemoration } from './precedenceService';
import { LiturgicalColor, LiturgicalRank } from '../../../models/calendar';

/**
 * Interface representing a complete liturgical day
 */
export interface LiturgicalDay {
  date: string;
  season: LiturgicalSeason;
  celebration: string;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  commemorations: Commemoration[];
  isHolyDay: boolean;
  isFeastDay: boolean;
  properTexts: boolean;
  commonTexts?: string;
  description?: string;
  temporalCelebration?: TemporalCelebration;
  sanctoralCelebration?: SanctoralCelebration;
  // Added for consistent date display
  displayDate?: Date;
}

/**
 * Get the complete liturgical day information for a given date
 *
 * @param date The date to get the liturgical day for
 * @returns The complete liturgical day information
 */
export function getLiturgicalDay(date: Date): LiturgicalDay {
  // Get the liturgical season
  const season = getLiturgicalSeason(date);

  // Get the temporal and sanctoral celebrations
  const temporalCelebration = getTemporalCelebration(date);
  const sanctoralCelebration = getSanctoralCelebration(date);

  // Determine which celebration takes precedence
  let primaryCelebration: TemporalCelebration | SanctoralCelebration;
  let commemorations: Commemoration[] = [];

  if (temporalCelebration && sanctoralCelebration) {
    const precedenceResult = determinePrecedence(temporalCelebration, sanctoralCelebration);
    primaryCelebration = precedenceResult.primaryCelebration;
    commemorations = precedenceResult.commemorations;
  } else if (temporalCelebration) {
    primaryCelebration = temporalCelebration;
  } else if (sanctoralCelebration) {
    primaryCelebration = sanctoralCelebration;
  } else {
    // Default to a feria of the season if no celebration is found
    primaryCelebration = {
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

  // Format the date as YYYY-MM-DD
  const dateString = date.toISOString().split('T')[0];

  // Create a new date object with the same year, month, and day
  // This ensures we're using the exact same date as the one provided
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Return the complete liturgical day information
  return {
    date: dateString,
    season,
    celebration: primaryCelebration.name,
    rank: primaryCelebration.rank,
    color: primaryCelebration.color,
    commemorations,
    isHolyDay: primaryCelebration.isHolyDay,
    isFeastDay: primaryCelebration.isFeastDay,
    properTexts: primaryCelebration.properTexts,
    commonTexts: 'commonTexts' in primaryCelebration ? primaryCelebration.commonTexts : undefined,
    description: primaryCelebration.description,
    temporalCelebration: temporalCelebration || undefined,
    sanctoralCelebration: sanctoralCelebration || undefined,
    // Add the normalized date for consistent date display
    displayDate: normalizedDate
  };
}

/**
 * Get liturgical days for a range of dates
 *
 * @param startDate The start date of the range
 * @param endDate The end date of the range
 * @returns Array of liturgical days
 */
export function getLiturgicalDaysRange(startDate: Date, endDate: Date): LiturgicalDay[] {
  const days: LiturgicalDay[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    days.push(getLiturgicalDay(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

/**
 * Get liturgical days for an entire year
 *
 * @param year The year to get liturgical days for
 * @returns Array of liturgical days
 */
export function getLiturgicalYear(year: number): LiturgicalDay[] {
  const startDate = new Date(year, 0, 1); // January 1
  const endDate = new Date(year, 11, 31); // December 31

  return getLiturgicalDaysRange(startDate, endDate);
}

/**
 * Get liturgical days for a specific month
 *
 * @param year The year
 * @param month The month (1-12)
 * @returns Array of liturgical days
 */
export function getLiturgicalMonth(year: number, month: number): LiturgicalDay[] {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of the month

  return getLiturgicalDaysRange(startDate, endDate);
}

/**
 * Get liturgical days for a specific week
 *
 * @param date A date in the week
 * @param startOnSunday Whether the week should start on Sunday (true) or Monday (false)
 * @returns Array of liturgical days
 */
export function getLiturgicalWeek(date: Date, startOnSunday: boolean = true): LiturgicalDay[] {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToSubtract = startOnSunday ? dayOfWeek : (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

  const startDate = new Date(date);
  startDate.setDate(date.getDate() - daysToSubtract);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return getLiturgicalDaysRange(startDate, endDate);
}
