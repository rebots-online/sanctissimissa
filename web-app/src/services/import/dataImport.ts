import { getDatabase } from '../database/db';
import { LiturgicalDay } from '../../models/calendar';
import { importLiturgicalCalendar } from './calendarImport';

/**
 * Import liturgical days data
 * 
 * @param data Array of liturgical days to import
 * @returns Promise resolving when all data is imported
 */
export async function importLiturgicalDays(data: LiturgicalDay[]): Promise<void> {
  const db = await getDatabase();
  for (const liturgicalDay of data) {
    await db.put('liturgical_days', liturgicalDay);
  }
}

/**
 * Import data from a JSON file
 * 
 * @param url URL of the JSON file
 * @param importFunction Function to use for importing the data
 * @returns Promise resolving when the data is imported
 */
export async function importDataFromJson<T>(url: string, importFunction: (data: T[]) => Promise<void>): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
    }
    
    const data = await response.json();
    await importFunction(data);
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

/**
 * Import all liturgical data
 * 
 * @returns Promise resolving when all data is imported
 */
export async function importAllData(): Promise<void> {
  try {
    // 1️⃣ Pre-populate the full EF calendar for current year:
    await importLiturgicalCalendar(new Date().getFullYear(), new Date().getFullYear());
    
    // 2️⃣ Override JSON (optional) for special cases:
    await importDataFromJson<LiturgicalDay>(
      '/data/liturgical-days-overrides.json',
      importLiturgicalDays
    );
    
    // Import other data as needed
    // TODO: Add imports for mass texts, office texts, prayers, etc.
    
    console.log('All data imported successfully');
  } catch (error) {
    console.error('Error importing all data:', error);
    throw error;
  }
}
