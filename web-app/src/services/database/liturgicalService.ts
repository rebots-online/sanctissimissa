import { SQLiteAdapter } from './sqlite-adapter';
import { LiturgicalDay, MassText, OfficeText, Prayer } from '../../types/liturgical';
import { JournalEntry } from '../../types/journal';
import { Psalm, Reading } from '../../types/liturgical';

// Create an instance of the SQLite adapter
const sqliteAdapter = new SQLiteAdapter('sanctissimissa.sqlite');

/**
 * Get liturgical day information for a specific date
 * @param date Date in YYYY-MM-DD format
 * @returns Promise resolving to liturgical day information
 */
export const getLiturgicalDay = async (date: string): Promise<LiturgicalDay | null> => {
  try {
    const query = `SELECT * FROM liturgical_days WHERE date = ?`;
    const result = await sqliteAdapter.executeQuery(query, [date]);
    
    if (result && result.length > 0) {
      return result[0] as unknown as LiturgicalDay;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting liturgical day:', error);
    throw error;
  }
};

/**
 * Get liturgical days for a specific month
 * @param year Year (e.g., 2025)
 * @param month Month (1-12)
 * @returns Promise resolving to array of liturgical days
 */
export const getLiturgicalDaysForMonth = async (year: number, month: number): Promise<LiturgicalDay[]> => {
  try {
    // Format month as MM
    const monthStr = month.toString().padStart(2, '0');
    
    // Create date pattern for the month (e.g., '2025-04-%')
    const datePattern = `${year}-${monthStr}-%`;
    
    const query = `SELECT * FROM liturgical_days WHERE date LIKE ?`;
    const result = await sqliteAdapter.executeQuery(query, [datePattern]);
    
    if (result && result.length > 0) {
      return result as unknown as LiturgicalDay[];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting liturgical days for month:', error);
    throw error;
  }
};

/**
 * Get Mass text for a specific ID
 * @param id Mass text ID
 * @returns Promise resolving to Mass text
 */
export const getMassText = async (id: string): Promise<MassText | null> => {
  try {
    const query = `SELECT * FROM mass_texts WHERE id = ?`;
    const result = await sqliteAdapter.executeQuery(query, [id]);
    
    if (result && result.length > 0) {
      return result[0] as unknown as MassText;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Mass text:', error);
    throw error;
  }
};

/**
 * Get Office text for a specific ID
 * @param id Office text ID
 * @returns Promise resolving to Office text
 */
export const getOfficeText = async (id: string): Promise<OfficeText | null> => {
  try {
    const query = `SELECT * FROM office_texts WHERE id = ?`;
    const result = await sqliteAdapter.executeQuery(query, [id]);
    
    if (result && result.length > 0) {
      const officeText = result[0] as unknown as OfficeText;
      
      // Get psalms for this office
      const psalmsQuery = `SELECT * FROM psalms WHERE office_id = ? ORDER BY number`;
      const psalms = await sqliteAdapter.executeQuery<Psalm>(psalmsQuery, [id]);
      
      // Get readings for this office
      const readingsQuery = `SELECT * FROM readings WHERE office_id = ? ORDER BY number`;
      const readings = await sqliteAdapter.executeQuery<Reading>(readingsQuery, [id]);
      
      // Add psalms and readings to the office text
      if (psalms && psalms.length > 0) {
        officeText.psalms = psalms;
      }
      
      if (readings && readings.length > 0) {
        officeText.readings = readings;
      }
      
      return officeText;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Office text:', error);
    throw error;
  }
};

/**
 * Get all prayers
 * @returns Promise resolving to array of prayers
 */
export const getAllPrayers = async (): Promise<Prayer[]> => {
  try {
    const query = `SELECT * FROM prayers ORDER BY category, title_english`;
    const result = await sqliteAdapter.executeQuery(query);
    
    if (result && result.length > 0) {
      return result as unknown as Prayer[];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting all prayers:', error);
    throw error;
  }
};

/**
 * Get prayers by category
 * @param category Prayer category
 * @returns Promise resolving to array of prayers
 */
export const getPrayersByCategory = async (category: string): Promise<Prayer[]> => {
  try {
    const query = `SELECT * FROM prayers WHERE category = ? ORDER BY title_english`;
    const result = await sqliteAdapter.executeQuery(query, [category]);
    
    if (result && result.length > 0) {
      return result as unknown as Prayer[];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting prayers by category:', error);
    throw error;
  }
};

/**
 * Get all journal entries
 * @returns Promise resolving to array of journal entries
 */
export const getAllJournalEntries = async (): Promise<JournalEntry[]> => {
  try {
    const query = `SELECT * FROM journal_entries ORDER BY created_at DESC`;
    const result = await sqliteAdapter.executeQuery(query);
    
    if (result && result.length > 0) {
      return result as unknown as JournalEntry[];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting journal entries:', error);
    throw error;
  }
};

/**
 * Save a journal entry
 * @param entry Journal entry to save
 * @returns Promise resolving to success status
 */
export const saveJournalEntry = async (entry: JournalEntry): Promise<boolean> => {
  try {
    // Check if entry exists
    const checkQuery = `SELECT id FROM journal_entries WHERE id = ?`;
    const existingEntry = await sqliteAdapter.executeQuery(checkQuery, [entry.id]);
    
    if (existingEntry && existingEntry.length > 0) {
      // Update existing entry
      const updateQuery = `
        UPDATE journal_entries 
        SET title = ?, content = ?, type = ?, date = ?, updated_at = ?
        WHERE id = ?
      `;
      
      await sqliteAdapter.executeQuery(updateQuery, [
        entry.title,
        entry.content,
        entry.type,
        entry.date,
        Date.now(),
        entry.id
      ]);
    } else {
      // Insert new entry
      const insertQuery = `
        INSERT INTO journal_entries (id, title, content, type, date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await sqliteAdapter.executeQuery(insertQuery, [
        entry.id,
        entry.title,
        entry.content,
        entry.type,
        entry.date,
        entry.createdAt,
        entry.updatedAt
      ]);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving journal entry:', error);
    throw error;
  }
};