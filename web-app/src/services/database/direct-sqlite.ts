/**
 * Direct SQLite Database Service
 *
 * This service provides a direct implementation of the SQLite database service
 * using sql.js. It handles database initialization, querying, and error handling.
 */

// Import from our sqlInitializer
import type { Database } from 'sql.js';
import { initializeSql, createDatabase } from './sqlInitializer';

// Global database instance
let db: Database | null = null;
let isInitialized = false;

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
    console.log('Initializing direct SQLite database...');

    // Initialize SQL.js using our Promise-based initializer
    await initializeSql();

    // Create an empty database
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
        office_proper TEXT,
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
        prayer_english TEXT,
        antiphons TEXT,
        psalms TEXT,
        readings TEXT
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

    isInitialized = true;
    console.log('SQLite database initialized with sample data');
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
 * Get mass texts for a specific ID
 *
 * @param id Mass texts ID
 * @returns Mass texts or null if not found
 */
export function getMassTexts(id: string): any | null {
  return querySingle(
    'SELECT * FROM mass_texts WHERE id = ?',
    [id]
  );
}

/**
 * Get mass texts for a specific date
 *
 * @param date Date in YYYY-MM-DD format
 * @returns Mass texts or null if not found
 */
export function getMassTextsByDate(date: string): any | null {
  const liturgicalDay = getLiturgicalDay(date);
  if (!liturgicalDay || !liturgicalDay.mass_proper) {
    return null;
  }

  return getMassTexts(liturgicalDay.mass_proper);
}
