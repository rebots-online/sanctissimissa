/**
 * Journal Types for Mobile
 * 
 * These types extend the base database types with mobile-specific adjustments.
 */

import { DbEntity } from '../shared/database/types';

/**
 * Journal entry for mobile
 * - Uses string path for audio instead of Blob
 * - Includes positioning for spatial journal interface
 */
export interface JournalEntry extends DbEntity {
  title: string;
  content?: string;
  type: string;
  date: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  audioPath?: string;  // Path to audio file instead of Blob
  positionX?: number;
  positionY?: number;
  [key: string]: any;
}

/**
 * Journal entry type identifiers
 */
export enum JournalEntryType {
  TEXT = 'text',
  AUDIO = 'audio',
  MIXED = 'mixed'
}