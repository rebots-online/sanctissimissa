/**
 * Liturgical types for SanctissiMissa
 */

import { DbValue } from '../shared/database/utils';

/**
 * Liturgical day
 */
export interface LiturgicalDay {
  id: string;
  date: string;
  season: string;
  celebration: string;
  rank: number;
  color: string;
  isHolyDay?: boolean;
  isFeastDay?: boolean;
  [key: string]: DbValue;
}

/**
 * Mass text
 */
export interface MassText {
  id: string;
  part: string;
  content: string;
  dayId: string;
  contentLatin?: string;
  [key: string]: DbValue;
}

/**
 * Office text
 */
export interface OfficeText {
  id: string;
  hour: string;
  content: string;
  dayId: string;
  contentLatin?: string;
  psalms?: Psalm[];
  readings?: Reading[];
  [key: string]: DbValue;
}

/**
 * Psalm
 */
export interface Psalm {
  id: string;
  officeId: string;
  number: number;
  content: string;
  contentLatin?: string;
  [key: string]: DbValue;
}

/**
 * Reading
 */
export interface Reading {
  id: string;
  officeId: string;
  number: number;
  content: string;
  contentLatin?: string;
  [key: string]: DbValue;
}

/**
 * Prayer
 */
export interface Prayer {
  id: string;
  category: string;
  title: string;
  titleLatin?: string;
  content: string;
  contentLatin?: string;
  [key: string]: DbValue;
}