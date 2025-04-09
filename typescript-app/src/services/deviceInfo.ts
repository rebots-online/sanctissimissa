import { Dimensions, Platform, ScaledSize } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storing device information
const DEVICE_INFO_KEY = '@sanctissimissa:deviceInfo';
const FOLD_STATE_KEY = '@sanctissimissa:foldState';

export type DeviceType = 'phone' | 'tablet' | 'foldable';
export type FoldState = 'folded' | 'unfolded' | 'unknown';

interface DeviceInfo {
  type: DeviceType;
  manufacturer?: string;
  model?: string;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  foldState: FoldState;
}

export class DeviceInfoService {
  private static instance: DeviceInfoService;
  private deviceInfo: DeviceInfo | null = null;
  private listeners: Array<(info: DeviceInfo) => void> = [];
  private foldableDetectionRules = {
    models: ['SM-F9', 'SM-W', 'SM-F7'], // Samsung Z Fold series prefixes
  };

  private constructor() {
    // Initialize device info asynchronously
    this.initializeDeviceInfo();

    // Listen for dimension changes (which happen during fold/unfold)
    Dimensions.addEventListener('change', ({ window }) => {
      this.updateDeviceInfo(window).catch(error => {
        console.error('Error updating device info after dimension change:', error);
      });
    });
  }
  
  /**
   * Initialize device info asynchronously
   */
  private async initializeDeviceInfo(): Promise<void> {
    try {
      await this.updateDeviceInfo(Dimensions.get('window'));
    } catch (error) {
      console.error('Error initializing device info:', error);
    }
  }

  static getInstance(): DeviceInfoService {
    if (!DeviceInfoService.instance) {
      DeviceInfoService.instance = new DeviceInfoService();
    }
    return DeviceInfoService.instance;
  }

  /**
   * Update device information based on current dimensions
   */
  private async updateDeviceInfo(window: ScaledSize): Promise<void> {
    const { width, height } = window;
    const isLandscape = width > height;
    
    // Default device info
    const newInfo: DeviceInfo = {
      type: 'phone',
      screenWidth: width,
      screenHeight: height,
      isLandscape,
      foldState: 'unknown',
    };
    
    // Check for test overrides (useful for development and testing)
    try {
      // Check for device type override
      const deviceTypeOverride = await AsyncStorage.getItem('@sanctissimissa:deviceTypeOverride');
      if (deviceTypeOverride === 'foldable' || deviceTypeOverride === 'phone' || deviceTypeOverride === 'tablet') {
        newInfo.type = deviceTypeOverride;
      }
      
      // Check for fold state override
      const foldStateOverride = await AsyncStorage.getItem('@sanctissimissa:foldStateOverride');
      if (foldStateOverride === 'folded' || foldStateOverride === 'unfolded') {
        newInfo.foldState = foldStateOverride;
      }
    } catch (error) {
      console.error('Error checking test overrides:', error);
      // Continue with normal detection if override check fails
    }

    // Determine device type based on screen size
    if (Math.max(width, height) >= 900) {
      newInfo.type = 'tablet';
    } else if (Math.max(width, height) >= 500) {
      newInfo.type = 'phone';
    }

    // Try to detect if it's a foldable device
    if (Platform.OS === 'android') {
      try {
        // Check if device model matches known foldable models
        if (Platform.constants && Platform.constants.Model) {
          const model = Platform.constants.Model;
          newInfo.model = model;
          
          // Check if model matches any known foldable prefixes
          const isFoldable = this.foldableDetectionRules.models.some(
            prefix => model.startsWith(prefix)
          );
          
          if (isFoldable) {
            newInfo.type = 'foldable';
            
            // Detect fold state based on dimensions
            // For Z Fold, typical folded width is around 700-800px, unfolded is 1400-1500px
            if (width > 1200) {
              newInfo.foldState = 'unfolded';
            } else {
              newInfo.foldState = 'folded';
            }
          }
        }
        
        // Get manufacturer if available
        if (Platform.constants && Platform.constants.Manufacturer) {
          newInfo.manufacturer = Platform.constants.Manufacturer;
        }
      } catch (error) {
        console.error('Error checking device model:', error);
      }
    }

    // Update stored info
    this.deviceInfo = newInfo;
    
    // Save to AsyncStorage for persistence
    this.persistDeviceInfo(newInfo);
    
    // Notify listeners
    this.notifyListeners();
    
    // Return early if we're using overrides
    if (newInfo.type === 'foldable' &&
        (newInfo.foldState === 'folded' || newInfo.foldState === 'unfolded')) {
      console.log(`[DeviceInfo] Using overrides - Type: ${newInfo.type}, State: ${newInfo.foldState}`);
      return;
    }
  }

  /**
   * Save device info to AsyncStorage
   */
  private async persistDeviceInfo(info: DeviceInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(info));
      
      // Store fold state separately for quick access
      if (info.type === 'foldable') {
        await AsyncStorage.setItem(FOLD_STATE_KEY, info.foldState);
      }
    } catch (error) {
      console.error('Failed to persist device info:', error);
    }
  }

  /**
   * Notify all listeners of device info change
   */
  private notifyListeners(): void {
    if (this.deviceInfo) {
      this.listeners.forEach(listener => {
        try {
          listener(this.deviceInfo!);
        } catch (error) {
          console.error('Error in device info listener:', error);
        }
      });
    }
  }

  /**
   * Get current device information
   */
  getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      // Default info if not initialized yet
      return {
        type: 'phone',
        screenWidth: Dimensions.get('window').width,
        screenHeight: Dimensions.get('window').height,
        isLandscape: Dimensions.get('window').width > Dimensions.get('window').height,
        foldState: 'unknown',
      };
    }
    
    return this.deviceInfo;
  }

  /**
   * Check if device is a foldable
   */
  isFoldableDevice(): boolean {
    return this.deviceInfo?.type === 'foldable';
  }

  /**
   * Get current fold state
   */
  getFoldState(): FoldState {
    return this.deviceInfo?.foldState || 'unknown';
  }

  /**
   * Add a listener for device info changes
   */
  addListener(callback: (info: DeviceInfo) => void): () => void {
    this.listeners.push(callback);
    
    // If we already have device info, notify immediately
    if (this.deviceInfo) {
      try {
        callback(this.deviceInfo);
      } catch (error) {
        console.error('Error in device info listener during registration:', error);
      }
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  /**
   * Load previously persisted device info
   */
  async loadPersistedInfo(): Promise<void> {
    try {
      const storedInfo = await AsyncStorage.getItem(DEVICE_INFO_KEY);
      if (storedInfo) {
        const parsedInfo = JSON.parse(storedInfo);
        // Only use stored values for non-dynamic properties
        if (this.deviceInfo) {
          this.deviceInfo = {
            ...parsedInfo,
            // Always use current dimensions
            screenWidth: this.deviceInfo.screenWidth,
            screenHeight: this.deviceInfo.screenHeight,
            isLandscape: this.deviceInfo.isLandscape,
          };
        }
      }
    } catch (error) {
      console.error('Failed to load persisted device info:', error);
    }
  }
}

// Export singleton instance
export const deviceInfo = DeviceInfoService.getInstance();