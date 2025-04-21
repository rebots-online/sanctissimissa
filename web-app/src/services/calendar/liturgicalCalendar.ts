/**
 * Liturgical Calendar Service
 * 
 * This service provides functions for working with the traditional
 * liturgical calendar according to the 1962 Roman Missal.
 */

import { calculateEaster, daysFromEaster } from './easter';
import { 
  LiturgicalDay, 
  LiturgicalSeason, 
  LiturgicalColor, 
  LiturgicalRank,
  Season
} from '../../models/calendar';

/**
 * Definitions of liturgical seasons with their calculation methods
 */
const LITURGICAL_SEASONS: Season[] = [
  {
    id: 'advent',
    name: 'Advent',
    color: LiturgicalColor.PURPLE,
    startCalculation: (year: number) => {
      // Advent starts on the Sunday closest to the feast of St. Andrew (Nov 30)
      // which is the Sunday between Nov 27 and Dec 3
      const christmas = new Date(year, 11, 25); // December 25
      const christmasDayOfWeek = christmas.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate the 4th Sunday of Advent (the Sunday before Christmas)
      const fourthSundayOfAdvent = new Date(year, 11, 25 - ((christmasDayOfWeek + 7) % 7));
      
      // Calculate the 1st Sunday of Advent (3 Sundays before the 4th Sunday)
      const firstSundayOfAdvent = new Date(fourthSundayOfAdvent);
      firstSundayOfAdvent.setDate(fourthSundayOfAdvent.getDate() - 21);
      
      return firstSundayOfAdvent;
    },
    endCalculation: (year: number) => {
      // Advent ends on December 24
      return new Date(year, 11, 24, 23, 59, 59);
    }
  },
  {
    id: 'christmas',
    name: 'Christmastide',
    color: LiturgicalColor.WHITE,
    startCalculation: (year: number) => {
      // Christmas season starts on December 25
      return new Date(year, 11, 25);
    },
    endCalculation: (year: number) => {
      // Christmas season ends on January 13 (Octave of the Epiphany)
      return new Date(year + 1, 0, 13, 23, 59, 59);
    }
  },
  {
    id: 'epiphany',
    name: 'Time after Epiphany',
    color: LiturgicalColor.GREEN,
    startCalculation: (year: number) => {
      // Time after Epiphany starts on January 14
      return new Date(year, 0, 14);
    },
    endCalculation: (year: number) => {
      // Ends the day before Septuagesima Sunday
      const easter = calculateEaster(year);
      const septuagesima = new Date(easter);
      septuagesima.setDate(easter.getDate() - 63); // 9 weeks before Easter
      septuagesima.setDate(septuagesima.getDate() - 1); // Day before Septuagesima
      return septuagesima;
    }
  },
  {
    id: 'septuagesima',
    name: 'Septuagesima',
    color: LiturgicalColor.PURPLE,
    startCalculation: (year: number) => {
      // Septuagesima Sunday is 9 weeks (63 days) before Easter
      const easter = calculateEaster(year);
      const septuagesima = new Date(easter);
      septuagesima.setDate(easter.getDate() - 63);
      return septuagesima;
    },
    endCalculation: (year: number) => {
      // Ends on Shrove Tuesday (day before Ash Wednesday)
      const easter = calculateEaster(year);
      const ashWednesday = new Date(easter);
      ashWednesday.setDate(easter.getDate() - 46); // 46 days before Easter
      const shroveTuesday = new Date(ashWednesday);
      shroveTuesday.setDate(ashWednesday.getDate() - 1);
      return shroveTuesday;
    }
  },
  {
    id: 'lent',
    name: 'Lent',
    color: LiturgicalColor.PURPLE,
    startCalculation: (year: number) => {
      // Lent starts on Ash Wednesday (46 days before Easter)
      const easter = calculateEaster(year);
      const ashWednesday = new Date(easter);
      ashWednesday.setDate(easter.getDate() - 46);
      return ashWednesday;
    },
    endCalculation: (year: number) => {
      // Lent ends on the Saturday before Passion Sunday
      const easter = calculateEaster(year);
      const passionSunday = new Date(easter);
      passionSunday.setDate(easter.getDate() - 14); // 2 weeks before Easter
      const saturday = new Date(passionSunday);
      saturday.setDate(passionSunday.getDate() - 1);
      return saturday;
    }
  },
  {
    id: 'passion',
    name: 'Passiontide',
    color: LiturgicalColor.PURPLE,
    startCalculation: (year: number) => {
      // Passiontide starts on Passion Sunday (2 weeks before Easter)
      const easter = calculateEaster(year);
      const passionSunday = new Date(easter);
      passionSunday.setDate(easter.getDate() - 14);
      return passionSunday;
    },
    endCalculation: (year: number) => {
      // Passiontide ends on Holy Saturday
      const easter = calculateEaster(year);
      const holySaturday = new Date(easter);
      holySaturday.setDate(easter.getDate() - 1);
      return holySaturday;
    }
  },
  {
    id: 'easter',
    name: 'Eastertide',
    color: LiturgicalColor.WHITE,
    startCalculation: (year: number) => {
      // Easter season starts on Easter Sunday
      return calculateEaster(year);
    },
    endCalculation: (year: number) => {
      // Easter season ends on the Saturday after Pentecost
      const easter = calculateEaster(year);
      const pentecost = new Date(easter);
      pentecost.setDate(easter.getDate() + 49); // 7 weeks after Easter
      const saturdayAfterPentecost = new Date(pentecost);
      saturdayAfterPentecost.setDate(pentecost.getDate() + 6);
      return saturdayAfterPentecost;
    }
  },
  {
    id: 'pentecost',
    name: 'Time after Pentecost',
    color: LiturgicalColor.GREEN,
    startCalculation: (year: number) => {
      // Time after Pentecost starts on Trinity Sunday
      const easter = calculateEaster(year);
      const trinitySunday = new Date(easter);
      trinitySunday.setDate(easter.getDate() + 56); // 8 weeks after Easter
      return trinitySunday;
    },
    endCalculation: (year: number) => {
      // Time after Pentecost ends on the Saturday before the 1st Sunday of Advent
      const christmas = new Date(year, 11, 25); // December 25
      const christmasDayOfWeek = christmas.getDay();
      const fourthSundayOfAdvent = new Date(year, 11, 25 - ((christmasDayOfWeek + 7) % 7));
      const firstSundayOfAdvent = new Date(fourthSundayOfAdvent);
      firstSundayOfAdvent.setDate(fourthSundayOfAdvent.getDate() - 21);
      const saturdayBeforeAdvent = new Date(firstSundayOfAdvent);
      saturdayBeforeAdvent.setDate(firstSundayOfAdvent.getDate() - 1);
      return saturdayBeforeAdvent;
    }
  }
];

/**
 * Get the liturgical season for a given date
 * 
 * @param date The date to get the liturgical season for
 * @returns The liturgical season
 */
export function getLiturgicalSeason(date: Date): LiturgicalSeason {
  const year = date.getFullYear();
  
  // Find the season that contains the given date
  for (const season of LITURGICAL_SEASONS) {
    const start = season.startCalculation(year);
    const end = season.endCalculation(year);
    
    if (date >= start && date <= end) {
      return {
        id: season.id,
        name: season.name,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        color: season.color
      };
    }
  }
  
  // If we're here, we might be in the previous year's liturgical season
  // (e.g., Advent or Christmas that started in the previous year)
  for (const season of LITURGICAL_SEASONS) {
    const start = season.startCalculation(year - 1);
    const end = season.endCalculation(year - 1);
    
    if (date >= start && date <= end) {
      return {
        id: season.id,
        name: season.name,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        color: season.color
      };
    }
  }
  
  // Default fallback (should never happen with proper season definitions)
  throw new Error(`Could not determine liturgical season for date: ${date.toISOString()}`);
}

/**
 * Get the liturgical day for a given date
 * 
 * @param date The date to get the liturgical day for
 * @returns The liturgical day
 */
export function getLiturgicalDay(date: Date): LiturgicalDay {
  const season = getLiturgicalSeason(date);
  const year = date.getFullYear();
  const easter = calculateEaster(year);
  const daysFromEasterSunday = daysFromEaster(date);
  
  // Default values
  let celebration = '';
  let rank = LiturgicalRank.FOURTH_CLASS;
  let color = season.color;
  let isHolyDay = false;
  let isFeastDay = false;
  const commemorations: string[] = [];
  
  // Determine the celebration based on the liturgical season and date
  switch (season.id) {
    case 'advent':
      // Handle Advent season
      if (date.getDay() === 0) {
        // Sunday of Advent
        const christmas = new Date(year, 11, 25);
        const sundaysBefore = Math.ceil((christmas.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
        celebration = `${sundaysBefore} Sunday of Advent`;
        rank = LiturgicalRank.FIRST_CLASS;
      } else {
        // Weekday of Advent
        celebration = `Feria of Advent`;
        rank = LiturgicalRank.THIRD_CLASS;
      }
      break;
      
    case 'christmas':
      // Handle Christmas season
      if (date.getMonth() === 11 && date.getDate() === 25) {
        celebration = 'Nativity of Our Lord';
        rank = LiturgicalRank.FIRST_CLASS;
        isHolyDay = true;
        isFeastDay = true;
      } else if (date.getMonth() === 0 && date.getDate() === 1) {
        celebration = 'Octave Day of the Nativity';
        rank = LiturgicalRank.FIRST_CLASS;
        isHolyDay = true;
      } else if (date.getMonth() === 0 && date.getDate() === 6) {
        celebration = 'Epiphany of Our Lord';
        rank = LiturgicalRank.FIRST_CLASS;
        isHolyDay = true;
        isFeastDay = true;
      } else {
        celebration = 'Christmas Feria';
        rank = LiturgicalRank.SECOND_CLASS;
      }
      break;
      
    case 'septuagesima':
      // Handle Septuagesima season
      if (date.getDay() === 0) {
        // Determine which Sunday
        if (daysFromEasterSunday === -63) {
          celebration = 'Septuagesima Sunday';
        } else if (daysFromEasterSunday === -56) {
          celebration = 'Sexagesima Sunday';
        } else if (daysFromEasterSunday === -49) {
          celebration = 'Quinquagesima Sunday';
        }
        rank = LiturgicalRank.SECOND_CLASS;
      } else {
        celebration = 'Feria';
        rank = LiturgicalRank.FOURTH_CLASS;
      }
      break;
      
    case 'lent':
      // Handle Lent season
      if (daysFromEasterSunday === -46) {
        celebration = 'Ash Wednesday';
        rank = LiturgicalRank.FIRST_CLASS;
      } else if (date.getDay() === 0) {
        // Sundays of Lent
        const firstSundayOfLent = new Date(season.startDate);
        const diffMs = date.getTime() - firstSundayOfLent.getTime();
        const sundayNumber = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
        celebration = `${sundayNumber} Sunday of Lent`;
        rank = LiturgicalRank.FIRST_CLASS;
      } else {
        celebration = 'Feria of Lent';
        rank = LiturgicalRank.THIRD_CLASS;
      }
      break;
      
    case 'passion':
      // Handle Passiontide
      if (date.getDay() === 0 && daysFromEasterSunday === -14) {
        celebration = 'Passion Sunday';
        rank = LiturgicalRank.FIRST_CLASS;
      } else if (date.getDay() === 0 && daysFromEasterSunday === -7) {
        celebration = 'Palm Sunday';
        rank = LiturgicalRank.FIRST_CLASS;
      } else if (daysFromEasterSunday === -3) {
        celebration = 'Holy Thursday';
        rank = LiturgicalRank.FIRST_CLASS;
      } else if (daysFromEasterSunday === -2) {
        celebration = 'Good Friday';
        rank = LiturgicalRank.FIRST_CLASS;
        color = LiturgicalColor.BLACK;
      } else if (daysFromEasterSunday === -1) {
        celebration = 'Holy Saturday';
        rank = LiturgicalRank.FIRST_CLASS;
      } else if (daysFromEasterSunday >= -6 && daysFromEasterSunday <= -4) {
        // Monday, Tuesday, Wednesday of Holy Week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        celebration = `${dayNames[date.getDay()]} of Holy Week`;
        rank = LiturgicalRank.FIRST_CLASS;
      } else {
        celebration = 'Feria of Passiontide';
        rank = LiturgicalRank.THIRD_CLASS;
      }
      break;
      
    case 'easter':
      // Handle Easter season
      if (daysFromEasterSunday === 0) {
        celebration = 'Easter Sunday';
        rank = LiturgicalRank.FIRST_CLASS;
        isHolyDay = true;
        isFeastDay = true;
      } else if (daysFromEasterSunday <= 7) {
        // Easter Octave
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        celebration = `${dayNames[date.getDay()]} in the Octave of Easter`;
        rank = LiturgicalRank.FIRST_CLASS;
      } else if (date.getDay() === 0) {
        // Sundays after Easter
        const sundayNumber = Math.floor(daysFromEasterSunday / 7) + 1;
        celebration = `${sundayNumber} Sunday after Easter`;
        rank = LiturgicalRank.FIRST_CLASS;
      } else if (daysFromEasterSunday === 39) {
        celebration = 'Ascension Thursday';
        rank = LiturgicalRank.FIRST_CLASS;
        isHolyDay = true;
        isFeastDay = true;
      } else if (daysFromEasterSunday === 49) {
        celebration = 'Pentecost Sunday';
        rank = LiturgicalRank.FIRST_CLASS;
        isHolyDay = true;
        isFeastDay = true;
        color = LiturgicalColor.RED;
      } else {
        celebration = 'Feria of Eastertide';
        rank = LiturgicalRank.FOURTH_CLASS;
      }
      break;
      
    case 'pentecost':
      // Handle Time after Pentecost
      if (daysFromEasterSunday === 56) {
        celebration = 'Trinity Sunday';
        rank = LiturgicalRank.FIRST_CLASS;
        isFeastDay = true;
      } else if (daysFromEasterSunday === 60) {
        celebration = 'Corpus Christi';
        rank = LiturgicalRank.FIRST_CLASS;
        isFeastDay = true;
      } else if (date.getDay() === 0) {
        // Sundays after Pentecost
        const pentecostDate = new Date(easter);
        pentecostDate.setDate(easter.getDate() + 49);
        const sundaysSincePentecost = Math.floor((date.getTime() - pentecostDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        celebration = `${sundaysSincePentecost} Sunday after Pentecost`;
        rank = LiturgicalRank.SECOND_CLASS;
      } else {
        celebration = 'Feria';
        rank = LiturgicalRank.FOURTH_CLASS;
      }
      break;
  }
  
  // Return the liturgical day
  return {
    date: date.toISOString().split('T')[0], // YYYY-MM-DD format
    season,
    celebration,
    rank,
    color,
    commemorations,
    isHolyDay,
    isFeastDay
  };
}
