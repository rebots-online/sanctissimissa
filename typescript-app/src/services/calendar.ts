import { addDays, addMonths, differenceInDays, getYear, setMonth, setDate, startOfYear, isSunday, parseISO } from 'date-fns';

export interface LiturgicalDay {
  date: string;
  season: LiturgicalSeason;
  celebration?: string;
  dayName?: string;  // Added this field for the Latin day name
  rank: LiturgicalRank;
  color: LiturgicalColor;
  allowsVigil: boolean;
  commemorations: string[];
}

export enum LiturgicalSeason {
  ADVENT = 'advent',
  CHRISTMASTIDE = 'christmastide',
  EPIPHANYTIDE = 'epiphanytide',
  SEPTUAGESIMA = 'septuagesima',
  LENT = 'lent',
  PASSIONTIDE = 'passiontide',
  EASTERTIDE = 'eastertide',
  PENTECOST = 'pentecost',
  TEMPUS_PER_ANNUM = 'tempus_per_annum'
}

export enum LiturgicalRank {
  FIRST_CLASS = 1,     // First Class Feasts
  SECOND_CLASS = 2,    // Second Class Feasts
  THIRD_CLASS = 3,     // Third Class Feasts
  FOURTH_CLASS = 4,    // Ferias and Simple Feasts
}

export enum LiturgicalColor {
  WHITE = 'white',
  RED = 'red',
  GREEN = 'green',
  VIOLET = 'violet',
  BLACK = 'black',
  ROSE = 'rose',
}

interface MovableFeast {
  name: string;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  allowsVigil: boolean;
}

type EasterDates = {
  [key: number]: string;
};

type MovableFeasts = {
  [key: number]: MovableFeast;
};

type FixedFeasts = {
  [key: string]: MovableFeast;
};

export class LiturgicalCalendar {
  // Static properties for Easter dates by year
  static readonly EASTER_DATES: EasterDates = {
    2024: '2024-03-31',
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
    2029: '2029-04-01',
    2030: '2030-04-21'
  };

  // Static properties for movable feasts relative to Easter
  static readonly MOVABLE_FEASTS: MovableFeasts = {
    0: { 
      name: 'Easter Sunday', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.WHITE, 
      allowsVigil: true 
    },
    [-46]: { 
      name: 'Ash Wednesday', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.VIOLET, 
      allowsVigil: false 
    },
    [-2]: { 
      name: 'Good Friday', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.BLACK, 
      allowsVigil: false 
    },
    [-1]: { 
      name: 'Holy Saturday', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.VIOLET, 
      allowsVigil: false 
    },
    49: { 
      name: 'Pentecost', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.RED, 
      allowsVigil: true 
    }
  };

  // Static properties for fixed feasts by month and day
  static readonly FIXED_FEASTS: FixedFeasts = {
    '12-25': { 
      name: 'Christmas', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.WHITE, 
      allowsVigil: true 
    },
    '01-01': { 
      name: 'Octave of Christmas', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.WHITE, 
      allowsVigil: true 
    },
    '01-06': { 
      name: 'Epiphany', 
      rank: LiturgicalRank.FIRST_CLASS, 
      color: LiturgicalColor.WHITE, 
      allowsVigil: true 
    }
  };

  // Determine the liturgical season based on date and days from Easter
  static determineSeason(date: Date, daysFromEaster: number): LiturgicalSeason {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    
    // Easter season
    if (daysFromEaster >= 0 && daysFromEaster < 49) {
      return LiturgicalSeason.EASTERTIDE;
    }
    
    // Lent and Passiontide
    if (daysFromEaster >= -46 && daysFromEaster < -14) {
      return LiturgicalSeason.LENT;
    }
    
    if (daysFromEaster >= -14 && daysFromEaster < 0) {
      return LiturgicalSeason.PASSIONTIDE;
    }
    
    // Advent (approximately 4 Sundays before Christmas)
    if (month === 12 && day <= 24) {
      return LiturgicalSeason.ADVENT;
    }
    
    // Christmastide (Christmas to Epiphany)
    if ((month === 12 && day >= 25) || (month === 1 && day < 6)) {
      return LiturgicalSeason.CHRISTMASTIDE;
    }
    
    // Epiphanytide (Epiphany to Septuagesima)
    if (month === 1 && day >= 6) {
      return LiturgicalSeason.EPIPHANYTIDE;
    }
    
    // Default to Tempus Per Annum (Ordinary Time)
    return LiturgicalSeason.TEMPUS_PER_ANNUM;
  }

  // Get the liturgical color for a season
  static getSeasonalColor(season: LiturgicalSeason): LiturgicalColor {
    switch (season) {
      case LiturgicalSeason.ADVENT:
      case LiturgicalSeason.LENT:
      case LiturgicalSeason.PASSIONTIDE:
        return LiturgicalColor.VIOLET;
      case LiturgicalSeason.CHRISTMASTIDE:
      case LiturgicalSeason.EPIPHANYTIDE:
      case LiturgicalSeason.EASTERTIDE:
        return LiturgicalColor.WHITE;
      case LiturgicalSeason.PENTECOST:
        return LiturgicalColor.RED;
      default:
        return LiturgicalColor.GREEN;
    }
  }

  // Get the name for Sundays in a particular season
  static getSeasonalSundayName(season: LiturgicalSeason): string {
    switch (season) {
      case LiturgicalSeason.ADVENT:
        return 'Advent';
      case LiturgicalSeason.LENT:
        return 'Lent';
      case LiturgicalSeason.PASSIONTIDE:
        return 'Passion';
      case LiturgicalSeason.EASTERTIDE:
        return 'Easter';
      case LiturgicalSeason.PENTECOST:
        return 'Pentecost';
      default:
        return 'Ordinary';
    }
  }

  private static getLatinDayName(date: Date, season: LiturgicalSeason, daysFromEaster: number): string {
    const weekday = date.getDay();
    const weekdayNames = [
      'Dominica',    // Sunday
      'Feria Secunda', // Monday
      'Feria Tertia',  // Tuesday
      'Feria Quarta',  // Wednesday
      'Feria Quinta',  // Thursday
      'Feria Sexta',   // Friday
      'Sabbato'        // Saturday
    ];

    let prefix = weekdayNames[weekday];
    let suffix = '';

    switch (season) {
      case LiturgicalSeason.PASSIONTIDE:
        suffix = 'infra Hebdomadam Passionis';
        break;
      case LiturgicalSeason.LENT:
        const lentWeek = Math.floor((daysFromEaster + 46) / 7) + 1;
        suffix = `in Quadragesima ~ Hebdomada ${this.toRomanNumeral(lentWeek)}`;
        break;
      // Add more cases as needed
    }

    return `${prefix} ${suffix}`.trim();
  }

  private static toRomanNumeral(num: number): string {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return romanNumerals[num - 1] || num.toString();
  }

  public static getDayInfo(date: string): LiturgicalDay {
    const dateObj = parseISO(date);
    const year = getYear(dateObj);
    const monthDay = date.slice(5);

    const easterDate = this.EASTER_DATES[year];
    if (!easterDate) {
      throw new Error(`Easter date not available for year ${year}`);
    }

    const daysFromEaster = differenceInDays(dateObj, parseISO(easterDate));
    const movableFeast = this.MOVABLE_FEASTS[daysFromEaster];
    const fixedFeast = this.FIXED_FEASTS[monthDay];
    const season = this.determineSeason(dateObj, daysFromEaster);
    let color = this.getSeasonalColor(season);
    let rank = LiturgicalRank.FOURTH_CLASS;
    let celebration = undefined;
    let allowsVigil = false;
    let commemorations: string[] = [];

    // Generate the Latin day name
    const dayName = this.getLatinDayName(dateObj, season, daysFromEaster);

    if (movableFeast) {
      celebration = movableFeast.name;
      rank = movableFeast.rank;
      color = movableFeast.color;
      allowsVigil = movableFeast.allowsVigil;
    } else if (fixedFeast) {
      celebration = fixedFeast.name;
      rank = fixedFeast.rank;
      color = fixedFeast.color;
      allowsVigil = fixedFeast.allowsVigil;
    }

    if (isSunday(dateObj) && !celebration) {
      celebration = `${this.getSeasonalSundayName(season)} Sunday`;
      rank = LiturgicalRank.SECOND_CLASS;
      allowsVigil = true;
    }

    return {
      date,
      season,
      celebration,
      dayName,  // Include the Latin day name
      rank,
      color,
      allowsVigil,
      commemorations,
    };
  }
}
