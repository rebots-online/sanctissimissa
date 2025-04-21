import { getDatabase } from '../database/db';
import { LiturgicalDay } from '../../models/calendar';
import { importLiturgicalCalendar } from './calendarImport';
import { importMassTexts, importOfficeTexts } from './massTextsImport';

/**
 * Import liturgical days data
 * 
 * @param data Array of liturgical days to import
 * @returns Promise resolving when all data is imported
 */
export async function importLiturgicalDays(data: LiturgicalDay[]): Promise<void> {
  const db = await getDatabase();
  for (const liturgicalDay of data) {
    // Flatten season to string for IndexedDB store schema
    const liturgicalDayRecord = {
      ...liturgicalDay,
      season: liturgicalDay.season.name,
    } as const;
    await db.put('liturgical_days', liturgicalDayRecord);
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
    console.log('Starting import of all liturgical data...');
    
    // 1️⃣ Pre-populate the full EF calendar for current year:
    console.log('Importing liturgical calendar...');
    await importLiturgicalCalendar(new Date().getFullYear(), new Date().getFullYear());
    
    // 2️⃣ Override JSON (optional) for special cases:
    console.log('Importing liturgical day overrides...');
    await importDataFromJson<LiturgicalDay>(
      '/data/liturgical-days-overrides.json',
      importLiturgicalDays
    );
    
    // 3️⃣ Import all Mass texts:
    console.log('Importing all Mass texts...');
    await importMassTexts();
    
    // 4️⃣ Import all Office texts:
    console.log('Importing all Office texts...');
    await importOfficeTexts();
    
    // 5️⃣ Import additional resources if needed
    // TODO: Add imports for prayers, etc.
    
    console.log('All liturgical data imported successfully');
    return;
  } catch (error) {
    console.error('Error importing all data:', error);
    throw error;
  }
}
