/**
 * Database service for SanctissiMissa
 * 
 * This service provides functions for working with the IndexedDB database
 * that stores liturgical texts and user data.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Database schema definition
 */
interface SanctissiMissaDB extends DBSchema {
  // Liturgical days store
  liturgical_days: {
    key: string; // ISO date string (YYYY-MM-DD)
    value: {
      date: string;
      season: string;
      celebration: string;
      rank: number;
      color: string;
      commemorations: string[];
      isHolyDay: boolean;
      isFeastDay: boolean;
    };
    indexes: {
      'by_season': string; // season
    };
  };
  
  // Mass texts store
  mass_texts: {
    key: string; // ID format: date_part (e.g., 2025-04-20_introit)
    value: {
      id: string;
      date: string;
      part: string; // introit, collect, epistle, gospel, etc.
      latin: string;
      english: string;
      rubrics?: string;
      notes?: string;
    };
    indexes: {
      'by_date': string; // date
      'by_part': string; // part
    };
  };
  
  // Office texts store
  office_texts: {
    key: string; // ID format: date_hour_part (e.g., 2025-04-20_vespers_magnificat)
    value: {
      id: string;
      date: string;
      hour: string; // matins, lauds, prime, terce, sext, none, vespers, compline
      part: string; // psalm, antiphon, reading, etc.
      latin: string;
      english: string;
      rubrics?: string;
      notes?: string;
    };
    indexes: {
      'by_date': string; // date
      'by_hour': string; // hour
      'by_date_hour': [string, string]; // [date, hour]
    };
  };
  
  // Prayers store
  prayers: {
    key: string; // ID of the prayer
    value: {
      id: string;
      name: string;
      category: string; // rosary, divine_mercy, stations, etc.
      latin: string;
      english: string;
      notes?: string;
    };
    indexes: {
      'by_category': string; // category
    };
  };
  
  // User journal entries store
  journal_entries: {
    key: string; // ID of the entry (UUID)
    value: {
      id: string;
      date: string;
      title: string;
      textReference?: {
        type: 'mass' | 'office' | 'prayer';
        id: string;
      };
      audioBlob?: Blob;
      transcription?: string;
      tags: string[];
      createdAt: number; // timestamp
      updatedAt: number; // timestamp
    };
    indexes: {
      'by_date': string; // date
      'by_reference': [string, string]; // [type, id]
      'by_tag': string; // tag
    };
  };
}

// Database name and version
const DB_NAME = 'sanctissimissa-db';
const DB_VERSION = 1;

// Database instance
let db: IDBPDatabase<SanctissiMissaDB> | null = null;

/**
 * Initialize the database
 * 
 * @returns Promise resolving to the database instance
 */
export async function initDatabase(): Promise<IDBPDatabase<SanctissiMissaDB>> {
  if (db) return db;
  
  db = await openDB<SanctissiMissaDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Create object stores if they don't exist
      if (oldVersion < 1) {
        // Liturgical days store
        const liturgicalDaysStore = db.createObjectStore('liturgical_days', { keyPath: 'date' });
        liturgicalDaysStore.createIndex('by_season', 'season');
        
        // Mass texts store
        const massTextsStore = db.createObjectStore('mass_texts', { keyPath: 'id' });
        massTextsStore.createIndex('by_date', 'date');
        massTextsStore.createIndex('by_part', 'part');
        
        // Office texts store
        const officeTextsStore = db.createObjectStore('office_texts', { keyPath: 'id' });
        officeTextsStore.createIndex('by_date', 'date');
        officeTextsStore.createIndex('by_hour', 'hour');
        officeTextsStore.createIndex('by_date_hour', ['date', 'hour']);
        
        // Prayers store
        const prayersStore = db.createObjectStore('prayers', { keyPath: 'id' });
        prayersStore.createIndex('by_category', 'category');
        
        // Journal entries store
        const journalEntriesStore = db.createObjectStore('journal_entries', { keyPath: 'id' });
        journalEntriesStore.createIndex('by_date', 'date');
        journalEntriesStore.createIndex('by_reference', ['textReference.type', 'textReference.id']);
        journalEntriesStore.createIndex('by_tag', 'tags', { multiEntry: true });
      }
    }
  });
  
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get the database instance
 * 
 * @returns Promise resolving to the database instance
 */
export async function getDatabase(): Promise<IDBPDatabase<SanctissiMissaDB>> {
  if (!db) {
    return initDatabase();
  }
  return db;
}
