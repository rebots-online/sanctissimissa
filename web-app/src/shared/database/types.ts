/**
 * Shared Database Types
 * 
 * This file contains type definitions for the SQLite database schema
 * that can be shared between web and mobile applications.
 */

import { DbValue } from './utils';

/**
 * Base interface for all database entities
 */
export interface DbEntity extends Record<string, DbValue> {
  id: string;
}

/**
 * Liturgical day information
 */
export interface LiturgicalDay extends DbEntity {
  date: string;
  season: string;
  celebration: string;
  rank: number;
  color: string;
  isHolyDay: boolean;
  isFeastDay: boolean;
  massProper?: string;
  commemorations?: string[];
  [key: string]: DbValue;
}

/**
 * Mass text parts
 */
export interface MassText extends DbEntity {
  id: string;
  part: 'proper' | 'ordinary';
  titleLatin?: string;
  titleEnglish?: string;
  introitLatin?: string;
  introitEnglish?: string;
  introitReference?: string;
  collectLatin?: string;
  collectEnglish?: string;
  epistleLatin?: string;
  epistleEnglish?: string;
  epistleReference?: string;
  gradualLatin?: string;
  gradualEnglish?: string;
  sequenceLatin?: string;
  sequenceEnglish?: string;
  sequenceRubric?: string;
  gospelLatin?: string;
  gospelEnglish?: string;
  gospelReference?: string;
  offertoryLatin?: string;
  offertoryEnglish?: string;
  offertoryReference?: string;
  secretLatin?: string;
  secretEnglish?: string;
  communionLatin?: string;
  communionEnglish?: string;
  communionReference?: string;
  postcommunionLatin?: string;
  postcommunionEnglish?: string;
  [key: string]: DbValue;
}

/**
 * Office text parts
 */
export interface OfficeText extends DbEntity {
  id: string;
  hour: string;
  titleLatin?: string;
  titleEnglish?: string;
  hymnLatin?: string;
  hymnEnglish?: string;
  chapterLatin?: string;
  chapterEnglish?: string;
  chapterReference?: string;
  prayerLatin?: string;
  prayerEnglish?: string;
  psalms?: Psalm[];
  readings?: Reading[];
  [key: string]: DbValue;
}

/**
 * Psalm information
 */
export interface Psalm extends DbEntity {
  id: string;
  officeId: string;
  number: number;
  titleLatin?: string;
  titleEnglish?: string;
  textLatin?: string;
  textEnglish?: string;
  [key: string]: DbValue;
}

/**
 * Reading information
 */
export interface Reading extends DbEntity {
  id: string;
  officeId: string;
  number: number;
  textLatin?: string;
  textEnglish?: string;
  [key: string]: DbValue;
}

/**
 * Prayer information
 */
export interface Prayer extends DbEntity {
  id: string;
  category: string;
  titleLatin?: string;
  titleEnglish?: string;
  textLatin?: string;
  textEnglish?: string;
  tags?: string[];
  [key: string]: DbValue;
}

/**
 * Journal entry
 */
export interface JournalEntry extends DbEntity {
  id: string;
  title: string;
  content?: string;
  type: string;
  date: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  audioBlob?: Blob;
  positionX?: number;
  positionY?: number;
  [key: string]: DbValue;
}

/**
 * Database schema type mapping
 */
export interface DatabaseSchema {
  liturgical_days: LiturgicalDay;
  mass_texts: MassText;
  office_texts: OfficeText;
  psalms: Psalm;
  readings: Reading;
  prayers: Prayer;
  journal_entries: JournalEntry;
}

/**
 * Table names type
 */
export type TableName = keyof DatabaseSchema;