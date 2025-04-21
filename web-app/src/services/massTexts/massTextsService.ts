import { getDatabase } from '../database/db';
import { MassDay, MassOrdinary, MassProper, MassSettings } from '../../models/MassTexts';

// Define extended liturgical day type to match our database structure
type LiturgicalDayDB = {
  id: string;
  date: string;
  season: string;
  celebration: string;
  rank: number;
  color: string;
  commemorations: string[];
  isHolyDay: boolean;
  isFeastDay: boolean;
  title_latin: string;
  title_english: string;
  description?: string;
  description_latin?: string;
  description_english?: string;
  week?: string;
  day?: string;
};

/**
 * Service for retrieving and managing Mass texts
 */
export class MassTextsService {
  private static instance: MassTextsService;
  private defaultSettings: MassSettings = {
    language: 'latin',
    showRubrics: true,
    showTranslations: true,
    fontSize: 'medium'
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): MassTextsService {
    if (!MassTextsService.instance) {
      MassTextsService.instance = new MassTextsService();
    }
    return MassTextsService.instance;
  }

  /**
   * Get Mass texts for a specific date
   * @param date ISO date string
   */
  public async getMassForDate(date: string): Promise<MassDay | null> {
    try {
      const db = await getDatabase();
      
      // First, get the liturgical day information for this date
      const liturgicalDay = await db.get('liturgical_days', date) as LiturgicalDayDB;
      if (!liturgicalDay) {
        throw new Error(`No liturgical day found for date: ${date}`);
      }

      // Get the proper texts for this liturgical day
      const proper = await this.getProperForDay(liturgicalDay.id);
      
      // Get the readings for this day
      const readings = {
        epistle: proper.epistle,
        gospel: proper.gospel
      };

      // Construct the complete MassDay object
      const massDay: MassDay = {
        id: liturgicalDay.id,
        date,
        title: {
          latin: liturgicalDay.title_latin || '',
          english: liturgicalDay.title_english || ''
        },
        description: liturgicalDay.description ? {
          latin: liturgicalDay.description_latin || '',
          english: liturgicalDay.description_english || ''
        } : { latin: '', english: '' }, // Provide empty strings instead of undefined
        liturgicalDay: {
          season: liturgicalDay.season,
          week: liturgicalDay.week || '',
          day: liturgicalDay.day || '',
          rank: liturgicalDay.rank,
          color: liturgicalDay.color as MassDay['liturgicalDay']['color']
        },
        proper,
        readings,
        // We'll load the ordinary separately as it's the same for most days
        commemorations: await this.getCommemorations(date)
      };

      return massDay;
    } catch (error) {
      console.error('Error getting Mass for date:', error);
      return null;
    }
  }

  /**
   * Get the ordinary parts of the Mass
   */
  public async getOrdinary(): Promise<MassOrdinary> {
    try {
      const db = await getDatabase();
      const ordinary = await db.get('mass_texts', 'ordinary_default');
      
      if (!ordinary) {
        throw new Error('Mass ordinary not found in database');
      }
      
      return ordinary as unknown as MassOrdinary;
    } catch (error) {
      console.error('Error getting Mass ordinary:', error);
      // Return a placeholder if we can't load from DB
      throw error;
    }
  }

  /**
   * Get proper texts for a specific liturgical day
   * @param liturgicalDayId The ID of the liturgical day
   */
  private async getProperForDay(liturgicalDayId: string): Promise<MassProper> {
    try {
      const db = await getDatabase();
      const proper = await db.get('mass_texts', `proper_${liturgicalDayId}`);
      
      if (!proper) {
        throw new Error(`Mass proper not found for liturgical day: ${liturgicalDayId}`);
      }
      
      return proper as unknown as MassProper;
    } catch (error) {
      console.error('Error getting Mass proper:', error);
      throw error;
    }
  }

  /**
   * Get commemorations for a specific date (if any)
   * @param date ISO date string
   */
  private async getCommemorations(date: string): Promise<MassDay['commemorations']> {
    try {
      const db = await getDatabase();
      const commemorations = await db.getAll('mass_texts', `commemoration_${date}`);
      
      if (!commemorations || commemorations.length === 0) {
        return undefined;
      }
      
      return commemorations as unknown as MassDay['commemorations'];
    } catch (error) {
      console.error('Error getting commemorations:', error);
      return undefined;
    }
  }

  /**
   * Get user settings for Mass display
   */
  public async getSettings(): Promise<MassSettings> {
    try {
      const db = await getDatabase();
      const settings = await db.get('mass_texts', 'settings');
      
      if (!settings) {
        // If no settings found, save and return defaults
        await this.saveSettings(this.defaultSettings);
        return this.defaultSettings;
      }
      
      return settings as unknown as MassSettings;
    } catch (error) {
      console.error('Error getting Mass settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Save user settings for Mass display
   */
  public async saveSettings(settings: MassSettings): Promise<void> {
    try {
      const db = await getDatabase();
      // Create a compatible object for the database schema
      const settingsForDB = {
        id: 'settings',
        date: new Date().toISOString(),
        part: 'settings',
        latin: JSON.stringify(settings),
        english: JSON.stringify(settings),
        ...settings // Include the settings properties directly as well
      };
      await db.put('mass_texts', settingsForDB);
    } catch (error) {
      console.error('Error saving Mass settings:', error);
    }
  }
}
