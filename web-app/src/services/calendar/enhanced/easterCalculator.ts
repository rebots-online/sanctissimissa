/**
 * Enhanced Easter Calculator Service
 * 
 * This service provides functions for calculating Easter Sunday and related dates
 * according to the Gregorian calendar used in the 1962 Roman Missal.
 */

/**
 * Calculate Easter Sunday date for a given year using Butcher's algorithm
 * 
 * @param year Year to calculate Easter for
 * @returns Date object for Easter Sunday
 */
export function calculateEaster(year: number): Date {
  // Algorithm from Butcher's Ecclesiastical Calendar
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Calculate the date of Easter for a range of years
 * 
 * @param startYear The first year to calculate Easter for
 * @param endYear The last year to calculate Easter for
 * @returns Map of years to Easter dates
 */
export function calculateEasterRange(startYear: number, endYear: number): Map<number, Date> {
  const easterDates = new Map<number, Date>();
  
  for (let year = startYear; year <= endYear; year++) {
    easterDates.set(year, calculateEaster(year));
  }
  
  return easterDates;
}

/**
 * Calculate a date relative to Easter
 * 
 * @param year The year to calculate for
 * @param offset Number of days from Easter (negative for before Easter)
 * @returns Date object for the calculated date
 */
export function calculateDateRelativeToEaster(year: number, offset: number): Date {
  const easter = calculateEaster(year);
  const result = new Date(easter);
  result.setDate(easter.getDate() + offset);
  return result;
}

/**
 * Check if the given date is Easter Sunday
 * 
 * @param date The date to check
 * @returns True if the date is Easter Sunday
 */
export function isEasterSunday(date: Date): boolean {
  const year = date.getFullYear();
  const easter = calculateEaster(year);
  
  return date.getDate() === easter.getDate() && 
         date.getMonth() === easter.getMonth() && 
         date.getFullYear() === easter.getFullYear();
}

/**
 * Calculate the number of days between the given date and Easter Sunday
 * for the same year. Negative values indicate days before Easter.
 * 
 * @param date The date to calculate the offset for
 * @returns Number of days from Easter (negative for before Easter)
 */
export function daysFromEaster(date: Date): number {
  const year = date.getFullYear();
  const easter = calculateEaster(year);
  
  // Calculate difference in milliseconds and convert to days
  const diffTime = date.getTime() - easter.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get a map of important liturgical dates based on Easter
 * 
 * @param year The year to calculate for
 * @returns Map of date names to Date objects
 */
export function getLiturgicalDatesForYear(year: number): Record<string, Date> {
  const easter = calculateEaster(year);
  
  // Calculate dates before Easter
  const septuagesimaSunday = calculateDateRelativeToEaster(year, -63); // 9 weeks before Easter
  const sexagesimaSunday = calculateDateRelativeToEaster(year, -56); // 8 weeks before Easter
  const quinquagesimaSunday = calculateDateRelativeToEaster(year, -49); // 7 weeks before Easter
  const ashWednesday = calculateDateRelativeToEaster(year, -46); // 46 days before Easter
  const passionSunday = calculateDateRelativeToEaster(year, -14); // 2 weeks before Easter
  const palmSunday = calculateDateRelativeToEaster(year, -7); // 1 week before Easter
  const holyThursday = calculateDateRelativeToEaster(year, -3); // 3 days before Easter
  const goodFriday = calculateDateRelativeToEaster(year, -2); // 2 days before Easter
  const holySaturday = calculateDateRelativeToEaster(year, -1); // 1 day before Easter
  
  // Calculate dates after Easter
  const divineMercySunday = calculateDateRelativeToEaster(year, 7); // 1 week after Easter
  const ascensionThursday = calculateDateRelativeToEaster(year, 39); // 40 days after Easter (includes Easter)
  const pentecostSunday = calculateDateRelativeToEaster(year, 49); // 50 days after Easter (includes Easter)
  const trinitySunday = calculateDateRelativeToEaster(year, 56); // 1 week after Pentecost
  const corpusChristi = calculateDateRelativeToEaster(year, 60); // Thursday after Trinity Sunday
  const sacredHeart = calculateDateRelativeToEaster(year, 68); // Friday after Corpus Christi octave
  
  return {
    septuagesimaSunday,
    sexagesimaSunday,
    quinquagesimaSunday,
    ashWednesday,
    passionSunday,
    palmSunday,
    holyThursday,
    goodFriday,
    holySaturday,
    easter,
    divineMercySunday,
    ascensionThursday,
    pentecostSunday,
    trinitySunday,
    corpusChristi,
    sacredHeart
  };
}
