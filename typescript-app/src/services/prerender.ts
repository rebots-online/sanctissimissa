import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, parseISO } from 'date-fns';
import { LiturgicalCalendar } from './calendar';
import { LiturgicalTexts } from './texts';

interface PrerenderedDay {
  metadata: {
    season: string;
    celebration?: string;
    rank: number;
    color: string;
    allowsVigil: boolean;
    commemorations: string[];
  };
  mass: unknown;
  office: {
    lauds?: unknown;
    prime?: unknown;
    terce?: unknown;
    sext?: unknown;
    none?: unknown;
    vespers?: unknown;
    compline?: unknown;
  };
}

export class PrerenderedContent {
  private static STORAGE_PREFIX = '@sanctissimissa:prerendered:';
  private static HOURS = ['lauds', 'prime', 'terce', 'sext', 'none', 'vespers', 'compline'];
  private static concurrencyLevel = 1;
  private static prioritizationEnabled = false;

  /**
   * Set the maximum number of concurrent operations
   */
  static setConcurrencyLevel(level: number): void {
    this.concurrencyLevel = Math.max(1, Math.min(5, level)); // Limit between 1-5
  }
  
  /**
   * Enable or disable prioritization of content prerendering
   */
  static setPrioritization(enabled: boolean): void {
    this.prioritizationEnabled = enabled;
  }

  static async initialize(): Promise<void> {
    try {
      // Check if today is prerendered
      const today = format(new Date(), 'yyyy-MM-dd');
      const content = await this.getDay(today);
      
      if (!content) {
        // Prerender today and tomorrow
        await this.prerenderWeek(today);
      }
    } catch (error) {
      console.error('Failed to initialize PrerenderedContent:', error);
      // Don't throw error, just log it
    }
  }

  static async getDay(date: string): Promise<PrerenderedDay | null> {
    try {
      const key = `${this.STORAGE_PREFIX}${date}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get prerendered day:', error);
      return null; // Return null instead of throwing error
    }
  }

  static async prerenderWeek(startDate: string): Promise<void> {
    try {
      const date = parseISO(startDate);
      
      // Prerender 7 days starting from the given date
      // Use concurrency level to control parallel operations
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < 7; i++) {
        const currentDate = format(addDays(date, i), 'yyyy-MM-dd');
        
        // If prioritization is enabled, prioritize weekend days and major feasts
        if (this.prioritizationEnabled) {
          const dateObj = addDays(date, i);
          const weekday = format(dateObj, 'EEEE');
          const isWeekend = weekday === 'Sunday' || weekday === 'Saturday';
          
          try {
            const dayInfo = LiturgicalCalendar.getDayInfo(currentDate);
            const isMajorFeast = dayInfo.rank && dayInfo.rank <= 3;
            
            // Process high priority days first (weekends and major feasts)
            if (isWeekend || isMajorFeast) {
              // High priority - process immediately
              await this.prerenderDay(currentDate);
              continue;
            }
          } catch (error) {
            console.error('Error checking day priority:', error);
          }
        }
        
        // For regular days or when prioritization is disabled:
        // Add to promises array for controlled concurrency
        const promise = this.prerenderDay(currentDate)
          .catch(dayError => {
            console.error(`Failed to prerender day ${i+1} of week:`, dayError);
          });
        
        promises.push(promise);
        
        // Process in batches based on concurrency level
        if (promises.length >= this.concurrencyLevel) {
          await Promise.all(promises);
          promises.length = 0; // Clear the array
        }
      }
      
      // Process any remaining promises
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Failed to prerender week:', error);
      // Don't throw error, just log it
    }
  }

  static async prerenderDay(date: string): Promise<void> {
    try {
      const key = `${this.STORAGE_PREFIX}${date}`;
      
      // Check if already prerendered
      try {
        const existing = await AsyncStorage.getItem(key);
        if (existing) return;
      } catch (storageError) {
        console.error('Error checking existing prerendered content:', storageError);
        // Continue anyway to try generating the content
      }

      // Get day info
      const dayInfo = LiturgicalCalendar.getDayInfo(date);
      
      // Prerender mass
      const mass = await LiturgicalTexts.getMassProper(dayInfo);
      
      // Prerender office hours
      const office: PrerenderedDay['office'] = {};
      
      // Use controlled concurrency for office hours
      const hourPromises: Promise<void>[] = [];
      
      for (const hour of this.HOURS) {
        const hourPromise = (async () => {
          try {
            const hourContent = await LiturgicalTexts.getOfficeHour(dayInfo, hour);
            office[hour as keyof PrerenderedDay['office']] = hourContent;
          } catch (hourError) {
            console.error(`Failed to prerender ${hour} office:`, hourError);
            // Don't fail the entire operation for one hour
          }
        })();
        
        hourPromises.push(hourPromise);
        
        // Process in batches if concurrency is enabled
        if (this.concurrencyLevel > 1 && hourPromises.length >= this.concurrencyLevel) {
          await Promise.all(hourPromises);
          hourPromises.length = 0;
        }
      }
      
      // Process any remaining hour promises
      if (hourPromises.length > 0) {
        await Promise.all(hourPromises);
      }

      // Store prerendered content
      const content: PrerenderedDay = {
        metadata: {
          season: dayInfo.season,
          celebration: dayInfo.celebration,
          rank: dayInfo.rank,
          color: dayInfo.color,
          allowsVigil: dayInfo.allowsVigil,
          commemorations: dayInfo.commemorations,
        },
        mass,
        office,
      };

      try {
        await AsyncStorage.setItem(key, JSON.stringify(content));
      } catch (saveError) {
        console.error('Failed to save prerendered content:', saveError);
        // Don't throw, just log the error
      }
    } catch (error) {
      console.error('Failed to prerender day:', error);
      // Don't throw error, just log it
    }
  }

  static async clearOldContent(): Promise<void> {
    try {
      let keys;
      try {
        keys = await AsyncStorage.getAllKeys();
      } catch (getKeysError) {
        console.error('Failed to get AsyncStorage keys:', getKeysError);
        return; // Exit early if we can't get keys
      }
      
      const prerenderedKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      // Keep only last 2 weeks of content
      const twoWeeksAgo = format(addDays(new Date(), -14), 'yyyy-MM-dd');
      
      const keysToRemove = prerenderedKeys.filter(key => {
        const date = key.replace(this.STORAGE_PREFIX, '');
        return date < twoWeeksAgo;
      });

      if (keysToRemove.length > 0) {
        try {
          await AsyncStorage.multiRemove(keysToRemove);
        } catch (removeError) {
          console.error('Failed to remove old keys:', removeError);
          // Don't throw, just log the error
        }
      }
    } catch (error) {
      console.error('Failed to clear old content:', error);
      // Don't throw error, just log it
    }
  }
}