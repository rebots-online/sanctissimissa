/**
 * SQLite Database Service
 *
 * This service provides access to the SQLite database using sql.js.
 * It handles database initialization, querying, and error handling.
 * Enhanced for offline use with data persistence between sessions.
 */

import type { Database } from 'sql.js';
import { openDB, IDBPDatabase } from 'idb';
import { initializeSql, createDatabase } from './sqlInitializer';

// Global database instance
let db: Database | null = null;
let isInitialized = false;
let idbDatabase: IDBPDatabase | null = null;

// Constants
const DB_NAME = 'sanctissimissa-db';
const DB_VERSION = 1;
const STORE_NAME = 'sqlite-data';
const DB_KEY = 'sqlite-db';

/**
 * Open the IndexedDB database
 *
 * @returns Promise that resolves to the IndexedDB database
 */
async function openIndexedDB(): Promise<IDBPDatabase> {
  if (idbDatabase) {
    return idbDatabase;
  }

  idbDatabase = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    }
  });

  return idbDatabase;
}

/**
 * Save the SQLite database to IndexedDB
 */
async function saveDatabaseToIndexedDB(): Promise<void> {
  if (!db) {
    console.error('Cannot save database: SQLite database not initialized');
    return;
  }

  try {
    // Export the database to a Uint8Array
    const data = db.export();

    // Open IndexedDB
    const idb = await openIndexedDB();

    // Save the data to IndexedDB
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    await tx.store.put(data, DB_KEY);
    await tx.done;

    console.log('Database saved to IndexedDB successfully');
  } catch (error) {
    console.error('Error saving database to IndexedDB:', error);
  }
}

/**
 * Load the SQLite database from IndexedDB
 *
 * @returns Promise that resolves to true if database was loaded, false otherwise
 */
async function loadDatabaseFromIndexedDB(): Promise<boolean> {
  try {
    // Open IndexedDB
    const idb = await openIndexedDB();

    // Get the data from IndexedDB
    const data = await idb.get(STORE_NAME, DB_KEY);

    if (data) {
      try {
        // Create a database from the data using our initializer
        db = await createDatabase(data);
        console.log('Database loaded from IndexedDB successfully');
        return true;
      } catch (dbError) {
        console.error('Error creating database from IndexedDB data:', dbError);
        return false;
      }
    }

    console.log('No database found in IndexedDB');
    return false;
  } catch (error) {
    console.error('Error loading database from IndexedDB:', error);
    return false;
  }
}

/**
 * Initialize the SQLite database
 *
 * @returns Promise that resolves when the database is initialized
 */
export async function initSqliteDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('Initializing SQLite database...');

    // Initialize SQL.js using our Promise-based initializer
    await initializeSql();
    console.log('SQL.js initialized successfully');

    // Try to load the database from IndexedDB first
    const loadedFromIndexedDB = await loadDatabaseFromIndexedDB();

    if (loadedFromIndexedDB) {
      isInitialized = true;
      console.log('Database loaded from IndexedDB successfully');
      return;
    }

    // If not found in IndexedDB, fetch from network
    console.log('Database not found in IndexedDB, fetching from network...');

    try {
      // Try different paths for the database file
      const dbPaths = [
        './sanctissimissa.sqlite',
        '/sanctissimissa.sqlite',
        'sanctissimissa.sqlite'
      ];

      let response = null;
      let dbPath = '';

      for (const path of dbPaths) {
        console.log(`Trying to fetch database from: ${path}`);
        try {
          response = await fetch(path);
          if (response.ok) {
            dbPath = path;
            break;
          }
        } catch (error) {
          console.error(`Error fetching from ${path}:`, error);
        }
      }

      if (!response || !response.ok) {
        console.error(`Failed to fetch database from any path`);
        throw new Error(`Failed to fetch database from any path`);
      }

      console.log(`Database file fetched successfully from ${dbPath}`);

      const arrayBuffer = await response.arrayBuffer();
      const uInt8Array = new Uint8Array(arrayBuffer);

      // Create a database from the file using our initializer
      db = await createDatabase(uInt8Array);

      // Save the database to IndexedDB for offline use
      await saveDatabaseToIndexedDB();

      isInitialized = true;
      console.log('SQLite database initialized and saved to IndexedDB');
    } catch (fetchError) {
      console.error('Error fetching database file:', fetchError);

      // Create an empty database as fallback
      console.log('Creating empty database as fallback...');
      db = await createDatabase();

      // Create the schema
      db.exec(`
        -- Liturgical days table
        CREATE TABLE IF NOT EXISTS liturgical_days (
          date TEXT PRIMARY KEY,
          season TEXT NOT NULL,
          celebration TEXT NOT NULL,
          rank INTEGER NOT NULL,
          color TEXT NOT NULL,
          is_holy_day BOOLEAN NOT NULL DEFAULT 0,
          is_feast_day BOOLEAN NOT NULL DEFAULT 0,
          mass_proper TEXT,
          commemorations TEXT
        );

        -- Mass texts table
        CREATE TABLE IF NOT EXISTS mass_texts (
          id TEXT PRIMARY KEY,
          part TEXT NOT NULL,
          title_latin TEXT,
          title_english TEXT,
          introit_latin TEXT,
          introit_english TEXT,
          introit_reference TEXT,
          collect_latin TEXT,
          collect_english TEXT,
          epistle_latin TEXT,
          epistle_english TEXT,
          epistle_reference TEXT,
          gradual_latin TEXT,
          gradual_english TEXT,
          sequence_latin TEXT,
          sequence_english TEXT,
          sequence_rubric TEXT,
          gospel_latin TEXT,
          gospel_english TEXT,
          gospel_reference TEXT,
          offertory_latin TEXT,
          offertory_english TEXT,
          offertory_reference TEXT,
          secret_latin TEXT,
          secret_english TEXT,
          communion_latin TEXT,
          communion_english TEXT,
          communion_reference TEXT,
          postcommunion_latin TEXT,
          postcommunion_english TEXT
        );

        -- Office texts table
        CREATE TABLE IF NOT EXISTS office_texts (
          id TEXT PRIMARY KEY,
          hour TEXT NOT NULL,
          title_latin TEXT,
          title_english TEXT,
          hymn_latin TEXT,
          hymn_english TEXT,
          chapter_latin TEXT,
          chapter_english TEXT,
          chapter_reference TEXT,
          prayer_latin TEXT,
          prayer_english TEXT
        );

        -- Psalms table
        CREATE TABLE IF NOT EXISTS psalms (
          id TEXT PRIMARY KEY,
          office_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          title_latin TEXT,
          title_english TEXT,
          text_latin TEXT,
          text_english TEXT,
          FOREIGN KEY (office_id) REFERENCES office_texts (id)
        );

        -- Readings table
        CREATE TABLE IF NOT EXISTS readings (
          id TEXT PRIMARY KEY,
          office_id TEXT NOT NULL,
          number INTEGER NOT NULL,
          text_latin TEXT,
          text_english TEXT,
          FOREIGN KEY (office_id) REFERENCES office_texts (id)
        );

        -- Prayers table
        CREATE TABLE IF NOT EXISTS prayers (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          title_latin TEXT,
          title_english TEXT,
          text_latin TEXT,
          text_english TEXT,
          tags TEXT
        );

        -- Journal entries table
        CREATE TABLE IF NOT EXISTS journal_entries (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          type TEXT NOT NULL,
          date TEXT NOT NULL,
          tags TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          audio_blob BLOB,
          position_x REAL,
          position_y REAL
        );
      `);

      // Insert sample data
      db.exec(`
        INSERT INTO liturgical_days (
          date, season, celebration, rank, color, is_holy_day, is_feast_day, mass_proper, commemorations
        ) VALUES (
          '2025-04-20', 'easter', 'Easter Sunday', 1, 'white', 1, 1, 'easter_sunday', '[]'
        );

        INSERT INTO mass_texts (
          id, part, title_latin, title_english,
          introit_latin, introit_english, introit_reference,
          collect_latin, collect_english,
          epistle_latin, epistle_english, epistle_reference,
          gradual_latin, gradual_english,
          gospel_latin, gospel_english, gospel_reference,
          offertory_latin, offertory_english,
          secret_latin, secret_english,
          communion_latin, communion_english,
          postcommunion_latin, postcommunion_english
        ) VALUES (
          'easter_sunday', 'proper', 'Dominica Resurrectionis', 'Easter Sunday',
          'Resurrexi, et adhuc tecum sum, alleluia', 'I have risen, and I am with you still, alleluia.', 'Ps 138:18,5-6',
          'Deus, qui hodierna die per Unigenitum tuum aeternitatis nobis aditum devicta morte reserasti', 'O God, who on this day, through your Only Begotten Son, have conquered death and unlocked for us the path to eternity',
          'Fratres: Expurgate vetus fermentum', 'Brethren: Purge out the old leaven', '1 Cor 5:7-8',
          'Haec dies, quam fecit Dominus: exsultemus et laetemur in ea', 'This is the day the Lord has made; let us rejoice and be glad in it.',
          'In illo tempore: Maria Magdalene, et Maria Jacobi, et Salome emerunt aromata', 'At that time: Mary Magdalene, and Mary the mother of James, and Salome, bought sweet spices', 'Mark 16:1-7',
          'Terra tremuit, et quievit, dum resurgeret in judicio Deus', 'The earth trembled and was still when God arose in judgment',
          'Suscipe, quaesumus, Domine, preces populi tui cum oblationibus hostiarum', 'Accept, we pray, O Lord, the prayers of your people with the sacrificial offerings',
          'Pascha nostrum immolatus est Christus, alleluia', 'Christ our Passover has been sacrificed, alleluia',
          'Spiritum nobis, Domine, tuae caritatis infunde', 'Pour out on us, O Lord, the Spirit of your love'
        );
      `);

      // Save the empty database to IndexedDB
      await saveDatabaseToIndexedDB();

      isInitialized = true;
      console.log('Empty database created, initialized with sample data, and saved to IndexedDB');
    }
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
}

/**
 * Get the SQLite database instance
 *
 * @returns The SQLite database instance
 * @throws Error if the database is not initialized
 */
export function getSqliteDatabase(): Database {
  if (!db) {
    console.error('SQLite database not initialized. Current state:', { isInitialized, db });
    throw new Error('SQLite database not initialized');
  }

  return db;
}

/**
 * Execute a query and return the results
 *
 * @param sql SQL query to execute
 * @param params Parameters for the query
 * @returns Array of results
 * @throws Error if the database is not initialized
 */
export function query<T>(sql: string, params: any[] = []): T[] {
  if (!db) {
    throw new Error('SQLite database not initialized');
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }

    stmt.free();
    return results;
  } catch (error) {
    console.error(`Error executing query: ${sql}`, error);
    throw error;
  }
}

/**
 * Execute a query and return a single result
 *
 * @param sql SQL query to execute
 * @param params Parameters for the query
 * @returns Single result or null if no results
 * @throws Error if the database is not initialized
 */
export function querySingle<T>(sql: string, params: any[] = []): T | null {
  const results = query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute a query that doesn't return results
 *
 * @param sql SQL query to execute
 * @param params Parameters for the query
 * @throws Error if the database is not initialized
 */
export function execute(sql: string, params: any[] = []): void {
  if (!db) {
    throw new Error('SQLite database not initialized');
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  } catch (error) {
    console.error(`Error executing statement: ${sql}`, error);
    throw error;
  }
}

/**
 * Close the database connection
 */
export function closeSqliteDatabase(): void {
  if (db) {
    db.close();
    db = null;
    isInitialized = false;
    console.log('SQLite database connection closed');
  }
}

/**
 * Get the liturgical day for a specific date
 *
 * @param date Date in YYYY-MM-DD format
 * @returns Liturgical day or null if not found
 */
export function getLiturgicalDay(date: string): any | null {
  return querySingle(
    'SELECT * FROM liturgical_days WHERE date = ?',
    [date]
  );
}

/**
 * Get all liturgical days
 *
 * @returns Array of liturgical days
 */
export function getAllLiturgicalDays(): any[] {
  return query('SELECT * FROM liturgical_days ORDER BY date');
}

/**
 * Get mass texts for a specific ID
 *
 * @param id Mass text ID
 * @returns Mass text or null if not found
 */
export function getMassText(id: string): any | null {
  return querySingle(
    'SELECT * FROM mass_texts WHERE id = ?',
    [id]
  );
}

/**
 * Get office text for a specific ID
 *
 * @param id Office text ID
 * @returns Office text or null if not found
 */
export function getOfficeText(id: string): any | null {
  const officeText = querySingle(
    'SELECT * FROM office_texts WHERE id = ?',
    [id]
  );

  if (!officeText) {
    return null;
  }

  // Get psalms for this office
  const psalms = query(
    'SELECT * FROM psalms WHERE office_id = ? ORDER BY number',
    [id]
  );

  // Get readings for this office
  const readings = query(
    'SELECT * FROM readings WHERE office_id = ? ORDER BY number',
    [id]
  );

  return {
    ...officeText,
    psalms,
    readings
  };
}

/**
 * Get all prayers
 *
 * @returns Array of prayers
 */
export function getAllPrayers(): any[] {
  return query('SELECT * FROM prayers ORDER BY category, title_english');
}

/**
 * Get prayers by category
 *
 * @param category Prayer category
 * @returns Array of prayers in the category
 */
export function getPrayersByCategory(category: string): any[] {
  return query(
    'SELECT * FROM prayers WHERE category = ? ORDER BY title_english',
    [category]
  );
}

/**
 * Get all journal entries
 *
 * @returns Array of journal entries
 */
export function getAllJournalEntries(): any[] {
  return query('SELECT * FROM journal_entries ORDER BY created_at DESC');
}

/**
 * Get a journal entry by ID
 *
 * @param id Journal entry ID
 * @returns Journal entry or null if not found
 */
export function getJournalEntry(id: string): any | null {
  return querySingle(
    'SELECT * FROM journal_entries WHERE id = ?',
    [id]
  );
}

/**
 * Save a journal entry
 *
 * @param entry Journal entry to save
 */
export async function saveJournalEntry(entry: any): Promise<void> {
  // Check if the entry already exists
  const existingEntry = querySingle(
    'SELECT id FROM journal_entries WHERE id = ?',
    [entry.id]
  );

  if (existingEntry) {
    // Update existing entry
    execute(
      `UPDATE journal_entries SET
        title = ?,
        content = ?,
        type = ?,
        date = ?,
        tags = ?,
        updated_at = ?,
        audio_blob = ?,
        position_x = ?,
        position_y = ?
      WHERE id = ?`,
      [
        entry.title,
        entry.content,
        entry.type,
        entry.date,
        entry.tags ? JSON.stringify(entry.tags) : null,
        Date.now(),
        entry.audioBlob,
        entry.position?.x,
        entry.position?.y,
        entry.id
      ]
    );
  } else {
    // Insert new entry
    execute(
      `INSERT INTO journal_entries (
        id, title, content, type, date, tags, created_at, updated_at, audio_blob, position_x, position_y
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.title,
        entry.content,
        entry.type,
        entry.date,
        entry.tags ? JSON.stringify(entry.tags) : null,
        entry.createdAt || Date.now(),
        entry.updatedAt || Date.now(),
        entry.audioBlob,
        entry.position?.x,
        entry.position?.y
      ]
    );
  }

  // Save the updated database to IndexedDB
  try {
    await saveDatabaseToIndexedDB();
    console.log('Database saved to IndexedDB after journal entry update');
  } catch (error) {
    console.error('Error saving database to IndexedDB after journal entry update:', error);
  }
}

/**
 * Delete a journal entry
 *
 * @param id Journal entry ID
 */
export function deleteJournalEntry(id: string): void {
  execute('DELETE FROM journal_entries WHERE id = ?', [id]);
}
