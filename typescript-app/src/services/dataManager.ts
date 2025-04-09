import { LiturgicalCalendar, LiturgicalDay } from './calendar';
import { LiturgicalTexts, MassProper, OfficeHourProper } from './texts';
import { PrerenderedContent } from './prerender';
import { addDays, format, parseISO } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceInfo } from './deviceInfo';

export class DataManager {
  private static instance: DataManager;
  private isInitialized = false;
  private isAdvancedPreloadEnabled = false;
  private preloadQueue: string[] = [];

  private constructor() {}

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  async initialize(): Promise<void> {
    console.log('[DEBUG] DataManager: Starting initialization.');
    if (this.isInitialized) {
      console.log('[DEBUG] DataManager: Already initialized.');
      return;
    }
    try {
      // Initialize pre-rendered content with detailed logging
      console.log('[DEBUG] DataManager: Initializing PrerenderedContent...');
      try {
        await PrerenderedContent.initialize();
        console.log('[DEBUG] DataManager: PrerenderedContent initialized successfully.');
      } catch (prerenderError) {
        console.error('[DEBUG] DataManager: PrerenderedContent initialization failed:', prerenderError);
        // Log the error but attempt to continue initialization
      }

      // Check device type for optimized preloading strategy
      const deviceState = deviceInfo.getDeviceInfo();
      console.log('[DEBUG] DataManager: Device Info:', deviceState);
      this.isAdvancedPreloadEnabled = deviceState.type === 'foldable' && deviceState.foldState === 'unfolded';
      console.log(`[DEBUG] DataManager: Advanced Preload Enabled: ${this.isAdvancedPreloadEnabled}`);
      
      // Configure preloading based on device capabilities
      console.log('[DEBUG] DataManager: Configuring for device capabilities...');
      this.configureForDeviceCapabilities();
      console.log('[DEBUG] DataManager: Device capabilities configured.');
      // Start background preloading
      console.log('[DEBUG] DataManager: Starting background preload...');
      this.startBackgroundPreload(); // This runs async, no await needed here
      console.log('[DEBUG] DataManager: Background preload initiated.');
      this.isInitialized = true;
      console.log('[DEBUG] DataManager: Initialization marked as complete.');
      
      // Set up fold state change listener for foldable devices
      if (deviceState.type === 'foldable') {
        console.log('[DEBUG] DataManager: Adding device state change listener.');
        deviceInfo.addListener(this.handleDeviceStateChange.bind(this));
      }
    } catch (error) {
      console.error('Failed to initialize DataManager:', error);
      console.error('[DEBUG] DataManager: Initialization failed catastrophically:', error);
      throw error; // Re-throw critical errors
    }
  }

  /**
   * Handle device state changes (mainly for foldable devices)
   */
  private handleDeviceStateChange(info: any): void {
    // Re-configure preloading when fold state changes
    if (info.type === 'foldable') {
      const wasAdvancedEnabled = this.isAdvancedPreloadEnabled;
      this.isAdvancedPreloadEnabled = info.foldState === 'unfolded';
      
      // If device was just unfolded, we can be more aggressive with preloading
      if (!wasAdvancedEnabled && this.isAdvancedPreloadEnabled) {
        this.configureForDeviceCapabilities();
        // Load more content in unfolded state
        this.preloadAdditionalContent();
      }
    }
  }
  
  /**
   * Configure preloading settings based on device capabilities
   */
  private configureForDeviceCapabilities(): void {
    // The foldable devices typically have better processors and more RAM
    // so we can be more aggressive with preloading when unfolded
    if (this.isAdvancedPreloadEnabled) {
      // Adjust PrerenderedContent settings for better performance
      PrerenderedContent.setConcurrencyLevel(3); // Allow more concurrent operations
      PrerenderedContent.setPrioritization(true); // Enable prioritization
    } else {
      // More conservative settings for regular devices or folded state
      PrerenderedContent.setConcurrencyLevel(1);
      PrerenderedContent.setPrioritization(false);
    }
  }
  
  /**
   * Preload additional content when device is unfolded
   */
  private preloadAdditionalContent(): void {
    // When unfolded, users are more likely to browse more content
    // so preload more aggressively
    const today = new Date();
    
    // Add next 2 months of Sundays and major feasts to preload queue
    for (let i = 1; i <= 60; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Only preload Sundays and major feasts to avoid excessive preloading
      try {
        const dayInfo = LiturgicalCalendar.getDayInfo(dateStr);
        if (
          format(parseISO(dateStr), 'EEEE') === 'Sunday' ||
          (dayInfo.rank && dayInfo.rank <= 3)  // Major feast days have lower rank numbers
        ) {
          if (!this.preloadQueue.includes(dateStr)) {
            this.preloadQueue.push(dateStr);
          }
        }
      } catch (error) {
        console.error('Error checking day for preloading:', error);
      }
    }
    
    // Process the queue with higher priority
    this.processPreloadQueue(true);
  }

  private async startBackgroundPreload(): Promise<void> {
    // Preload strategy varies based on device capabilities
    const today = new Date();
    const preloadDays = this.isAdvancedPreloadEnabled ? 35 : 28; // 5 weeks vs 4 weeks
    const interval = this.isAdvancedPreloadEnabled ? 3 : 7; // More granular for advanced devices
    
    for (let i = interval; i <= preloadDays; i += interval) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!this.preloadQueue.includes(dateStr)) {
        this.preloadQueue.push(dateStr);
      }
    }

    this.processPreloadQueue();
  }

  private async processPreloadQueue(highPriority: boolean = false): Promise<void> {
    // Clone and clear the queue to avoid processing items multiple times
    // if this method is called concurrently
    const queueCopy = [...this.preloadQueue];
    this.preloadQueue = [];
    
    const delay = this.isAdvancedPreloadEnabled ? 500 : 1000; // Less delay for powerful devices
    
    for (const date of queueCopy) {
      try {
        // For both priority levels, we now use prerenderWeek since prerenderDay is properly
        // exposed in the updated PrerenderedContent class
        await PrerenderedContent.prerenderWeek(date);
        
        // Wait between operations to avoid overwhelming the device
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Check if device state has changed (e.g., folded back)
        // and abort if we're no longer in advanced mode but were processing
        // a high priority queue
        if (highPriority && !this.isAdvancedPreloadEnabled) {
          console.log('Device folded, pausing advanced preloading');
          break;
        }
      } catch (error) {
        console.error('Failed to prerender content:', error);
      }
    }
  }

  async getMassProper(date: string = format(new Date(), 'yyyy-MM-dd')): Promise<MassProper> {
    try {
      // Try to get pre-rendered content first
      try {
        const prerendered = await PrerenderedContent.getDay(date);
        if (prerendered?.mass) {
          return prerendered.mass as unknown as MassProper;
        }
      } catch (error) {
        console.error('Error retrieving prerendered content:', error);
        // Continue to fallback method
      }

      // If not pre-rendered or error occurred, generate on demand
      const dayInfo = LiturgicalCalendar.getDayInfo(date);
      return await LiturgicalTexts.getMassProper(dayInfo);
    } catch (error) {
      console.error('Failed to get Mass proper:', error);
      throw error;
    }
  }

  async getOfficeHour(hour: string, date: string = format(new Date(), 'yyyy-MM-dd')): Promise<OfficeHourProper> {
    try {
      // Try to get pre-rendered content first
      try {
        const prerendered = await PrerenderedContent.getDay(date);
        if (prerendered?.office) {
          return prerendered.office[hour.toLowerCase() as keyof typeof prerendered.office] as unknown as OfficeHourProper;
        }
      } catch (error) {
        console.error('Error retrieving prerendered office content:', error);
        // Continue to fallback method
      }

      // If not pre-rendered or error occurred, generate on demand
      const dayInfo = LiturgicalCalendar.getDayInfo(date);
      return await LiturgicalTexts.getOfficeHour(dayInfo, hour);
    } catch (error) {
      console.error('Failed to get Office hour:', error);
      throw error;
    }
  }

  async getDayInfo(date: string = format(new Date(), 'yyyy-MM-dd')): Promise<LiturgicalDay> {
    try {
      // Try to get pre-rendered content first
      try {
        const prerendered = await PrerenderedContent.getDay(date);
        if (prerendered?.metadata) {
          return {
            date,
            ...prerendered.metadata,
          } as LiturgicalDay;
        }
      } catch (error) {
        console.error('Error retrieving prerendered day info:', error);
        // Continue to fallback method
      }

      // If not pre-rendered or error occurred, generate on demand
      return LiturgicalCalendar.getDayInfo(date);
    } catch (error) {
      console.error('Failed to get day info:', error);
      throw error;
    }
  }

  async preloadDate(date: string): Promise<void> {
    if (!this.preloadQueue.includes(date)) {
      this.preloadQueue.push(date);
      
      // For foldable devices in unfolded state, also preload the surrounding dates
      if (this.isAdvancedPreloadEnabled) {
        const dateObj = parseISO(date);
        for (let i = -3; i <= 3; i++) {
          if (i === 0) continue; // Skip the original date
          const adjacentDate = format(addDays(dateObj, i), 'yyyy-MM-dd');
          if (!this.preloadQueue.includes(adjacentDate)) {
            this.preloadQueue.push(adjacentDate);
          }
        }
      }
      
      this.processPreloadQueue();
    }
  }

  async clearCache(type: 'all' | 'old' = 'all'): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let cacheKeys = keys.filter(key =>
        key.startsWith('@sanctissimissa:prerendered:')
      );
      
      // If clearing only old cache, keep recent and important dates
      if (type === 'old' && cacheKeys.length > 0) {
        const today = new Date();
        const recentCutoff = format(addDays(today, -14), 'yyyy-MM-dd');
        const futureCutoff = format(addDays(today, 14), 'yyyy-MM-dd');
        
        // Keep recent and near future dates, plus Sundays and major feasts
        cacheKeys = cacheKeys.filter(key => {
          // Extract date from key format '@sanctissimissa:prerendered:YYYY-MM-DD'
          const keyParts = key.split(':');
          if (keyParts.length < 3) return true; // Keep keys we don't understand
          
          const dateStr = keyParts[2];
          if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return true; // Keep if not a date format
          
          // Keep if within our recent window
          if (dateStr >= recentCutoff && dateStr <= futureCutoff) return false;
          
          // Check if it's a Sunday or major feast
          try {
            const dateSunday = format(parseISO(dateStr), 'EEEE') === 'Sunday';
            const dayInfo = LiturgicalCalendar.getDayInfo(dateStr);
            const isMajorFeast = dayInfo.rank && dayInfo.rank <= 3;
            
            // Keep Sundays and major feasts
            if (dateSunday || isMajorFeast) return false;
          } catch (error) {
            console.error('Error checking date importance:', error);
          }
          
          // Remove if not caught by any keep rule
          return true;
        });
      }
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      return;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      // Don't throw error, just log it
    }
  }

  async getStorageUsage(): Promise<{totalBytes: number, itemCount: number}> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key =>
        key.startsWith('@sanctissimissa:prerendered:')
      );
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            // Each character in a string is 2 bytes in JavaScript
            totalSize += value.length * 2;
          }
        } catch (error) {
          console.error(`Error measuring size of ${key}:`, error);
        }
      }
      
      return {
        totalBytes: totalSize,
        itemCount: cacheKeys.length
      };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return { totalBytes: 0, itemCount: 0 };
    }
  }
  
  /**
   * Optimize storage for the current device state
   * For foldable devices, we use different strategies based on fold state
   */
  async optimizeStorage(): Promise<void> {
    const deviceState = deviceInfo.getDeviceInfo();
    
    try {
      const usage = await this.getStorageUsage();
      const MAX_STORAGE_MB = 50; // 50MB threshold
      
      // If we're using too much storage, clean up
      if (usage.totalBytes > MAX_STORAGE_MB * 1024 * 1024) {
        if (deviceState.type === 'foldable' && deviceState.foldState === 'unfolded') {
          // In unfolded state, keep more data but clean old cache
          await this.clearCache('old');
        } else {
          // In folded state or on regular devices, be more aggressive
          await this.clearCache('all');
        }
      }
    } catch (error) {
      console.error('Failed to optimize storage:', error);
    }
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance();