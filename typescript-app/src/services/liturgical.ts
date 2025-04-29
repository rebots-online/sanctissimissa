/**
 * Liturgical Service
 * 
 * This service provides access to liturgical data through the mobile database adapter.
 */

import { getDatabaseAdapter } from './database';
import { LiturgicalDay, MassText, OfficeText, Prayer, Psalm, Reading } from '../shared/database/types';

/**
 * Get liturgical day information for a specific date
 * @param date Date in YYYY-MM-DD format
 * @returns Promise resolving to liturgical day information
 */
export const getLiturgicalDay = async (date: string): Promise<LiturgicalDay | null> => {
  try {
    const db = await getDatabaseAdapter();
    return await db.querySingle<LiturgicalDay>(
      'SELECT * FROM liturgical_days WHERE date = ?',
      [date]
    );
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
    
    const db = await getDatabaseAdapter();
    const result = await db.query<LiturgicalDay>(
      'SELECT * FROM liturgical_days WHERE date LIKE ?',
      [datePattern]
    );
    return result.rows;
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
    const db = await getDatabaseAdapter();
    return await db.getById('mass_texts', id);
  } catch (error) {
    console.error('Error getting Mass text:', error);
    throw error;
  }
};

/**
 * Get Office text for a specific ID
 * @param id Office text ID
 * @returns Promise resolving to Office text with psalms and readings
 */
export const getOfficeText = async (id: string): Promise<OfficeText | null> => {
  try {
    const db = await getDatabaseAdapter();
    const officeText = await db.getById('office_texts', id);
    
    if (officeText) {
      // Get psalms for this office
      const psalmsResult = await db.query<Psalm>(
        'SELECT * FROM psalms WHERE office_id = ? ORDER BY number',
        [id]
      );
      
      // Get readings for this office
      const readingsResult = await db.query<Reading>(
        'SELECT * FROM readings WHERE office_id = ? ORDER BY number',
        [id]
      );
      
      // Add psalms and readings to the office text
      return {
        ...officeText,
        psalms: psalmsResult.rows,
        readings: readingsResult.rows
      };
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
    const db = await getDatabaseAdapter();
    const result = await db.query<Prayer>(
      'SELECT * FROM prayers ORDER BY category, title_english'
    );
    return result.rows;
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
    const db = await getDatabaseAdapter();
    return await db.findBy('prayers', 'category', category);
  } catch (error) {
    console.error('Error getting prayers by category:', error);
    throw error;
  }
};