/**
 * Liturgical calendar models for SanctissiMissa
 */

/**
 * Represents a day in the liturgical calendar
 */
export interface LiturgicalDay {
  date: string;
  season: LiturgicalSeason;
  celebration: string;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  commemorations: string[];
  isHolyDay: boolean;
  isFeastDay: boolean;
}

/**
 * Represents a season in the liturgical year
 */
export interface LiturgicalSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color: LiturgicalColor;
}

/**
 * Liturgical colors used in the Roman Rite
 */
export enum LiturgicalColor {
  WHITE = 'white',
  RED = 'red',
  GREEN = 'green',
  PURPLE = 'purple',
  ROSE = 'rose',
  BLACK = 'black',
  GOLD = 'gold',
}

/**
 * Ranks of liturgical celebrations according to the 1962 calendar
 */
export enum LiturgicalRank {
  FIRST_CLASS = 1,
  SECOND_CLASS = 2,
  THIRD_CLASS = 3,
  FOURTH_CLASS = 4,
  COMMEMORATION = 5,
}

/**
 * Types of liturgical cycles
 */
export enum LiturgicalCycle {
  TEMPORAL = 'temporal',
  SANCTORAL = 'sanctoral',
}

/**
 * Represents a specific liturgical celebration
 */
export interface Celebration {
  id: string;
  name: string;
  rank: LiturgicalRank;
  color: LiturgicalColor;
  date?: string; // For fixed date celebrations
  movable: boolean;
  cycle: LiturgicalCycle;
  properTexts: boolean;
  commonTexts?: string;
}

/**
 * Represents a liturgical season with its specific characteristics
 */
export interface Season {
  id: string;
  name: string;
  color: LiturgicalColor;
  startCalculation: (year: number) => Date;
  endCalculation: (year: number) => Date;
}
