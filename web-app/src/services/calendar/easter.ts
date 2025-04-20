/**
 * Easter date calculation for the liturgical calendar
 * 
 * This implements Butcher's algorithm for calculating the date of Easter
 * in the Gregorian calendar.
 */

/**
 * Calculate the date of Easter for a given year
 * 
 * @param year The year to calculate Easter for
 * @returns Date object representing Easter Sunday
 */
export function calculateEaster(year: number): Date {
  // Butcher's algorithm for calculating Easter
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
  
  // Create Date object (months are 0-indexed in JavaScript)
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
