/**
 * Journal types for SanctissiMissa
 */

import { DbValue } from '../shared/database/utils';

/**
 * Journal entry
 */
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'audio';
  date: string;
  createdAt: number;
  updatedAt: number;
  audioBlob?: Blob;
  tags?: string[];
  [key: string]: DbValue;
}

/**
 * Journal entry filter options
 */
export interface JournalEntryFilter {
  startDate?: string;
  endDate?: string;
  type?: 'text' | 'audio';
  searchTerm?: string;
  tags?: string[];
}

/**
 * Journal entry sort options
 */
export enum JournalEntrySortBy {
  DATE_ASC = 'date_asc',
  DATE_DESC = 'date_desc',
  TITLE_ASC = 'title_asc',
  TITLE_DESC = 'title_desc',
  CREATED_ASC = 'created_asc',
  CREATED_DESC = 'created_desc',
  UPDATED_ASC = 'updated_asc',
  UPDATED_DESC = 'updated_desc'
}