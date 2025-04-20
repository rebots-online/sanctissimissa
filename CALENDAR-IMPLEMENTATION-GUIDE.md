# Liturgical Calendar Implementation Guide

This guide provides detailed information on implementing the liturgical calendar service for the SanctissiMissa application, focusing on the Extraordinary Form (1962 calendar).

## Overview

The liturgical calendar is a complex system that determines the feasts, seasons, and readings for each day of the year. The Extraordinary Form calendar follows specific rules that differ from the Ordinary Form (post-1969) calendar.

## Key Components

### 1. Easter Date Calculation

Easter is the central feast of the liturgical year, and many other dates are calculated based on it. The traditional method for calculating Easter in the Western Church is:

1. Easter falls on the first Sunday after the first full moon on or after the vernal equinox.
2. For ecclesiastical purposes, the vernal equinox is always considered to be March 21.
3. The "full moon" refers to the ecclesiastical full moon, which is determined by tables rather than astronomical observation.

```typescript
// web-app/src/services/calendar/easter.ts

/**
 * Calculate the date of Easter for a given year using the Meeus/Jones/Butcher algorithm
 * 
 * @param year The year to calculate Easter for
 * @returns Date object representing Easter Sunday
 */
export function calculateEaster(year: number): Date {
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
```

### 2. Liturgical Seasons

The liturgical year is divided into several seasons, each with its own character, color, and prayers. The main seasons are:

1. **Advent**: The four weeks before Christmas
2. **Christmas**: From Christmas to the Baptism of the Lord
3. **Epiphany**: From Epiphany (January 6) to Septuagesima
4. **Pre-Lent (Septuagesima)**: The three Sundays before Ash Wednesday
5. **Lent**: From Ash Wednesday to Passion Sunday
6. **Passiontide**: From Passion Sunday to Holy Saturday
7. **Easter**: From Easter Sunday to the Saturday before Pentecost
8. **Ascensiontide**: From Ascension Thursday to the Saturday before Pentecost
9. **Pentecost**: Pentecost Sunday and the octave
10. **Time after Pentecost**: From Trinity Sunday to the Saturday before Advent

Each season needs to be calculated based on Easter and fixed dates:

```typescript
// web-app/src/services/calendar/seasons.ts

import { calculateEaster } from './easter';

/**
 * Calculate the start and end dates of liturgical seasons for a given year
 * 
 * @param year The year to calculate seasons for
 * @returns Object containing the start and end dates of each season
 */
export function calculateLiturgicalSeasons(year: number): Record<string, { start: Date, end: Date }> {
  // Calculate Easter
  const easter = calculateEaster(year);
  
  // Calculate other movable dates based on Easter
  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);
  
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  
  const ascensionThursday = new Date(easter);
  ascensionThursday.setDate(easter.getDate() + 39);
  
  const passionSunday = new Date(easter);
  passionSunday.setDate(easter.getDate() - 14);
  
  const septuagesima = new Date(easter);
  septuagesima.setDate(easter.getDate() - 63);
  
  const trinitySunday = new Date(pentecost);
  trinitySunday.setDate(pentecost.getDate() + 7);
  
  // Fixed dates
  const christmas = new Date(year, 11, 25); // December 25
  const epiphany = new Date(year, 0, 6); // January 6
  const baptismOfLord = new Date(year, 0, 13); // January 13 (fixed in EF)
  
  // First Sunday of Advent (4th Sunday before Christmas)
  const christmasDay = christmas.getDay();
  const daysToSubtract = christmasDay + 21; // 3 weeks + days until Sunday
  const firstAdventSunday = new Date(christmas);
  firstAdventSunday.setDate(christmas.getDate() - daysToSubtract);
  
  // Calculate season boundaries
  return {
    advent: {
      start: firstAdventSunday,
      end: new Date(christmas.getTime() - 1) // End the day before Christmas
    },
    christmas: {
      start: christmas,
      end: new Date(epiphany.getTime() - 1) // End the day before Epiphany
    },
    epiphany: {
      start: epiphany,
      end: new Date(septuagesima.getTime() - 1) // End the day before Septuagesima
    },
    preLent: {
      start: septuagesima,
      end: new Date(ashWednesday.getTime() - 1) // End the day before Ash Wednesday
    },
    lent: {
      start: ashWednesday,
      end: new Date(passionSunday.getTime() - 1) // End the day before Passion Sunday
    },
    passiontide: {
      start: passionSunday,
      end: new Date(easter.getTime() - 1) // End the day before Easter
    },
    easter: {
      start: easter,
      end: new Date(ascensionThursday.getTime() - 1) // End the day before Ascension
    },
    ascensiontide: {
      start: ascensionThursday,
      end: new Date(pentecost.getTime() - 1) // End the day before Pentecost
    },
    pentecost: {
      start: pentecost,
      end: new Date(trinitySunday.getTime() - 1) // End the day before Trinity Sunday
    },
    timeAfterPentecost: {
      start: trinitySunday,
      end: new Date(new Date(year + 1, 11, 25).getTime() - daysToSubtract - 1) // End the day before First Sunday of Advent
    }
  };
}
```

### 3. Sanctoral Cycle (Calendar of Saints)

The sanctoral cycle consists of fixed-date feasts celebrating saints and other events in the life of Christ and the Church. These feasts have different ranks and can take precedence over the temporal cycle depending on their importance.

```typescript
// web-app/src/services/calendar/sanctoral.ts

import { LiturgicalRank, LiturgicalColor, Celebration } from '../../models/calendar';

/**
 * Get the sanctoral celebration for a given date
 * 
 * @param month Month (1-12)
 * @param day Day of the month
 * @returns Celebration object or null if no celebration
 */
export function getSanctoralCelebration(month: number, day: number): Celebration | null {
  // This would be a large database of saints' feasts
  // Here's a simplified example with just a few major feasts
  
  const celebrations: Record<string, Celebration> = {
    // January
    '1-1': {
      id: 'circumcision',
      name: 'Circumcision of Our Lord',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '01-01',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '1-6': {
      id: 'epiphany',
      name: 'Epiphany of Our Lord',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '01-06',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    
    // Major feasts throughout the year
    '3-19': {
      id: 'st-joseph',
      name: 'St. Joseph, Spouse of the Blessed Virgin Mary',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '03-19',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '3-25': {
      id: 'annunciation',
      name: 'Annunciation of the Blessed Virgin Mary',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '03-25',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '6-24': {
      id: 'st-john-baptist',
      name: 'Nativity of St. John the Baptist',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '06-24',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '6-29': {
      id: 'sts-peter-paul',
      name: 'Sts. Peter and Paul, Apostles',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.RED,
      date: '06-29',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '8-15': {
      id: 'assumption',
      name: 'Assumption of the Blessed Virgin Mary',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '08-15',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '11-1': {
      id: 'all-saints',
      name: 'All Saints',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '11-01',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '12-8': {
      id: 'immaculate-conception',
      name: 'Immaculate Conception of the Blessed Virgin Mary',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '12-08',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    },
    '12-25': {
      id: 'christmas',
      name: 'Nativity of Our Lord (Christmas)',
      rank: LiturgicalRank.FIRST_CLASS,
      color: LiturgicalColor.WHITE,
      date: '12-25',
      movable: false,
      cycle: 'sanctoral',
      properTexts: true
    }
  };
  
  const key = `${month}-${day}`;
  return celebrations[key] || null;
}
```

### 4. Precedence Rules

When a day in the temporal cycle coincides with a feast in the sanctoral cycle, precedence rules determine which takes priority. These rules are complex and depend on the ranks of the celebrations.

```typescript
// web-app/src/services/calendar/precedence.ts

import { LiturgicalRank, Celebration } from '../../models/calendar';

/**
 * Determine which celebration takes precedence when two coincide
 * 
 * @param celebration1 First celebration
 * @param celebration2 Second celebration
 * @returns The celebration that takes precedence and any commemorations
 */
export function determinePrecedence(
  celebration1: Celebration,
  celebration2: Celebration
): { primary: Celebration, commemorations: Celebration[] } {
  // First Class feasts take precedence over everything
  if (celebration1.rank === LiturgicalRank.FIRST_CLASS && celebration2.rank !== LiturgicalRank.FIRST_CLASS) {
    return {
      primary: celebration1,
      commemorations: celebration2.rank !== LiturgicalRank.COMMEMORATION ? [celebration2] : []
    };
  }
  
  if (celebration2.rank === LiturgicalRank.FIRST_CLASS && celebration1.rank !== LiturgicalRank.FIRST_CLASS) {
    return {
      primary: celebration2,
      commemorations: celebration1.rank !== LiturgicalRank.COMMEMORATION ? [celebration1] : []
    };
  }
  
  // If both are First Class, use more specific rules (simplified here)
  if (celebration1.rank === LiturgicalRank.FIRST_CLASS && celebration2.rank === LiturgicalRank.FIRST_CLASS) {
    // In a real implementation, this would use a table of precedence for First Class feasts
    // For simplicity, we'll just use the first one
    return {
      primary: celebration1,
      commemorations: []
    };
  }
  
  // Second Class feasts take precedence over Third and Fourth Class
  if (celebration1.rank === LiturgicalRank.SECOND_CLASS && 
      (celebration2.rank === LiturgicalRank.THIRD_CLASS || celebration2.rank === LiturgicalRank.FOURTH_CLASS)) {
    return {
      primary: celebration1,
      commemorations: [celebration2]
    };
  }
  
  if (celebration2.rank === LiturgicalRank.SECOND_CLASS && 
      (celebration1.rank === LiturgicalRank.THIRD_CLASS || celebration1.rank === LiturgicalRank.FOURTH_CLASS)) {
    return {
      primary: celebration2,
      commemorations: [celebration1]
    };
  }
  
  // If both are Second Class, use more specific rules (simplified here)
  if (celebration1.rank === LiturgicalRank.SECOND_CLASS && celebration2.rank === LiturgicalRank.SECOND_CLASS) {
    // In a real implementation, this would use a table of precedence for Second Class feasts
    // For simplicity, we'll just use the first one
    return {
      primary: celebration1,
      commemorations: [celebration2]
    };
  }
  
  // Third Class feasts take precedence over Fourth Class
  if (celebration1.rank === LiturgicalRank.THIRD_CLASS && celebration2.rank === LiturgicalRank.FOURTH_CLASS) {
    return {
      primary: celebration1,
      commemorations: [celebration2]
    };
  }
  
  if (celebration2.rank === LiturgicalRank.THIRD_CLASS && celebration1.rank === LiturgicalRank.FOURTH_CLASS) {
    return {
      primary: celebration2,
      commemorations: [celebration1]
    };
  }
  
  // If both are Third Class, use more specific rules (simplified here)
  if (celebration1.rank === LiturgicalRank.THIRD_CLASS && celebration2.rank === LiturgicalRank.THIRD_CLASS) {
    // In a real implementation, this would use a table of precedence for Third Class feasts
    // For simplicity, we'll just use the first one
    return {
      primary: celebration1,
      commemorations: [celebration2]
    };
  }
  
  // Default case
  return {
    primary: celebration1,
    commemorations: [celebration2]
  };
}
```

### 5. Liturgical Day Calculation

Putting it all together, we can calculate the liturgical day for any given date:

```typescript
// web-app/src/services/calendar/liturgicalCalendar.ts

import { LiturgicalDay, LiturgicalColor, LiturgicalRank, Celebration, Season } from '../../models/calendar';
import { calculateEaster } from './easter';
import { calculateLiturgicalSeasons } from './seasons';
import { getSanctoralCelebration } from './sanctoral';
import { determinePrecedence } from './precedence';

/**
 * Get the liturgical day for a given date
 * 
 * @param date The date to get the liturgical day for
 * @returns The liturgical day information
 */
export function getLiturgicalDay(date: Date): LiturgicalDay {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Format date as YYYY-MM-DD
  const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Get the liturgical seasons for the year
  const seasons = calculateLiturgicalSeasons(year);
  
  // Determine the current season
  let currentSeason: Season | null = null;
  let seasonName = '';
  
  for (const [name, { start, end }] of Object.entries(seasons)) {
    if (date >= start && date <= end) {
      seasonName = name;
      break;
    }
  }
  
  // Get the temporal celebration (based on the season and day)
  let temporalCelebration: Celebration | null = null;
  
  // This would be a complex calculation based on the season and day
  // For simplicity, we'll just use a placeholder
  temporalCelebration = {
    id: 'temporal',
    name: 'Feria',
    rank: LiturgicalRank.FOURTH_CLASS,
    color: LiturgicalColor.GREEN,
    movable: true,
    cycle: 'temporal',
    properTexts: false
  };
  
  // Get the sanctoral celebration (based on the month and day)
  const sanctoralCelebration = getSanctoralCelebration(month, day);
  
  // Determine which celebration takes precedence
  let celebration: Celebration;
  let commemorations: Celebration[] = [];
  
  if (temporalCelebration && sanctoralCelebration) {
    const precedence = determinePrecedence(temporalCelebration, sanctoralCelebration);
    celebration = precedence.primary;
    commemorations = precedence.commemorations;
  } else if (temporalCelebration) {
    celebration = temporalCelebration;
  } else if (sanctoralCelebration) {
    celebration = sanctoralCelebration;
  } else {
    // Default celebration (should never happen)
    celebration = {
      id: 'default',
      name: 'Feria',
      rank: LiturgicalRank.FOURTH_CLASS,
      color: LiturgicalColor.GREEN,
      movable: true,
      cycle: 'temporal',
      properTexts: false
    };
  }
  
  // Create the liturgical day object
  const liturgicalDay: LiturgicalDay = {
    date: dateString,
    season: {
      id: seasonName,
      name: seasonName.charAt(0).toUpperCase() + seasonName.slice(1).replace(/([A-Z])/g, ' $1'),
      startDate: seasons[seasonName].start.toISOString().split('T')[0],
      endDate: seasons[seasonName].end.toISOString().split('T')[0],
      color: celebration.color
    },
    celebration: celebration.name,
    rank: celebration.rank,
    color: celebration.color,
    commemorations: commemorations.map(c => c.name),
    isHolyDay: celebration.rank === LiturgicalRank.FIRST_CLASS,
    isFeastDay: celebration.rank === LiturgicalRank.FIRST_CLASS || celebration.rank === LiturgicalRank.SECOND_CLASS
  };
  
  return liturgicalDay;
}
```

## Implementation Steps

1. **Create the Easter calculation service**: Implement the algorithm for calculating the date of Easter.
2. **Create the liturgical seasons service**: Calculate the start and end dates of each liturgical season based on Easter and fixed dates.
3. **Create the sanctoral cycle service**: Define the calendar of saints and other fixed-date celebrations.
4. **Create the precedence rules service**: Implement the rules for determining which celebration takes precedence when multiple coincide.
5. **Create the liturgical day calculation service**: Combine all the above to calculate the complete liturgical day information for any given date.
6. **Create the UI components**: Implement the calendar display and navigation components.
7. **Add caching**: Store calculated liturgical days in IndexedDB for offline access and performance.

## Testing

Testing the liturgical calendar implementation is crucial to ensure accuracy. Create tests for:

1. **Easter calculation**: Test the Easter calculation algorithm against known Easter dates.
2. **Season boundaries**: Test that the season boundaries are calculated correctly.
3. **Precedence rules**: Test that the precedence rules are applied correctly for various combinations of celebrations.
4. **Specific dates**: Test specific dates with known liturgical information to verify the calculation.

```typescript
// web-app/src/services/calendar/easter.test.ts

import { calculateEaster } from './easter';

describe('Easter calculation', () => {
  test('calculates Easter 2025 correctly', () => {
    const easter2025 = calculateEaster(2025);
    expect(easter2025.getFullYear()).toBe(2025);
    expect(easter2025.getMonth()).toBe(3); // April (0-indexed)
    expect(easter2025.getDate()).toBe(20);
  });
  
  test('calculates Easter 2024 correctly', () => {
    const easter2024 = calculateEaster(2024);
    expect(easter2024.getFullYear()).toBe(2024);
    expect(easter2024.getMonth()).toBe(2); // March (0-indexed)
    expect(easter2024.getDate()).toBe(31);
  });
  
  // Add more test cases for different years
});
```

## Resources

For implementing the liturgical calendar, the following resources are valuable:

1. **1962 Roman Missal**: The official liturgical book for the Extraordinary Form.
2. **Ordo**: The annual liturgical calendar published for the Extraordinary Form.
3. **Divinum Officium**: An existing implementation of the traditional liturgical calendar (https://github.com/DivinumOfficium/divinum-officium).
4. **Rubrics of the Roman Breviary and Missal**: The official rules for determining the liturgical calendar.

## Conclusion

Implementing the liturgical calendar for the Extraordinary Form is a complex task that requires careful attention to detail and a deep understanding of the liturgical rules. By breaking it down into smaller components and following this guide, you can create an accurate and reliable liturgical calendar service for the SanctissiMissa application.
