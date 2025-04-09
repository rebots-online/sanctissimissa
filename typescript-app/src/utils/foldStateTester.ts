import { deviceInfo, DeviceType, FoldState } from '../services/deviceInfo';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility for testing fold state detection and related optimizations
 * This will allow us to simulate fold state changes during development and testing
 */
export class FoldStateTester {
  private static readonly FOLD_STATE_OVERRIDE_KEY = '@sanctissimissa:foldStateOverride';
  private static readonly DEVICE_TYPE_OVERRIDE_KEY = '@sanctissimissa:deviceTypeOverride';
  private static emitter = new NativeEventEmitter();

  /**
   * Simulate a fold state change for testing purposes
   * @param newState The fold state to simulate ('folded' or 'unfolded')
   */
  static async simulateFoldStateChange(newState: FoldState): Promise<void> {
    try {
      // Store the simulated state
      await AsyncStorage.setItem(this.FOLD_STATE_OVERRIDE_KEY, newState);
      
      // Emit a dimensions change event to trigger the deviceInfo update
      // Note: This is a simulated event, not a real dimension change
      if (Platform.OS === 'android') {
        this.emitter.emit('didUpdateDimensions', {
          window: {
            width: newState === 'unfolded' ? 1400 : 800,
            height: 900,
            scale: 1,
            fontScale: 1,
          },
          screen: {
            width: newState === 'unfolded' ? 1400 : 800,
            height: 900,
            scale: 1,
            fontScale: 1,
          },
        });
      }
      
      // Log the state change for debugging
      console.log(`[FoldStateTester] Simulated fold state change to: ${newState}`);
    } catch (error) {
      console.error('Failed to simulate fold state change:', error);
    }
  }

  /**
   * Override device type for testing (make a regular device behave like a foldable)
   * @param deviceType The device type to simulate
   */
  static async simulateDeviceType(deviceType: DeviceType): Promise<void> {
    try {
      await AsyncStorage.setItem(this.DEVICE_TYPE_OVERRIDE_KEY, deviceType);
      console.log(`[FoldStateTester] Simulated device type: ${deviceType}`);
    } catch (error) {
      console.error('Failed to simulate device type:', error);
    }
  }

  /**
   * Get current fold state override (if any)
   */
  static async getFoldStateOverride(): Promise<FoldState | null> {
    try {
      const state = await AsyncStorage.getItem(this.FOLD_STATE_OVERRIDE_KEY);
      return state as FoldState | null;
    } catch (error) {
      console.error('Failed to get fold state override:', error);
      return null;
    }
  }

  /**
   * Get current device type override (if any)
   */
  static async getDeviceTypeOverride(): Promise<DeviceType | null> {
    try {
      const type = await AsyncStorage.getItem(this.DEVICE_TYPE_OVERRIDE_KEY);
      return type as DeviceType | null;
    } catch (error) {
      console.error('Failed to get device type override:', error);
      return null;
    }
  }

  /**
   * Clear all overrides and return to normal device detection
   */
  static async clearOverrides(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.FOLD_STATE_OVERRIDE_KEY,
        this.DEVICE_TYPE_OVERRIDE_KEY
      ]);
      console.log('[FoldStateTester] Cleared all overrides');
    } catch (error) {
      console.error('Failed to clear overrides:', error);
    }
  }

  /**
   * Run diagnostics on fold state detection and related services
   * Returns detailed information about current device detection
   */
  static async runDiagnostics(): Promise<{
    actualDeviceInfo: any;
    overrides: {
      deviceType: DeviceType | null;
      foldState: FoldState | null;
    };
    preloadingStatus: {
      concurrencyLevel: number;
      isAdvancedPreloadEnabled: boolean;
    }
  }> {
    try {
      // Get actual device info
      const actualDeviceInfo = deviceInfo.getDeviceInfo();
      
      // Get overrides
      const deviceTypeOverride = await this.getDeviceTypeOverride();
      const foldStateOverride = await this.getFoldStateOverride();
      
      // Get preloading status
      // Note: These are private properties, so we need to use reflection or other methods
      // This is a simplification for the test utility
      const preloadingStatus = {
        concurrencyLevel: 1, // Default value, will be updated in the integration
        isAdvancedPreloadEnabled: actualDeviceInfo.type === 'foldable' && 
                                  actualDeviceInfo.foldState === 'unfolded'
      };
      
      return {
        actualDeviceInfo,
        overrides: {
          deviceType: deviceTypeOverride,
          foldState: foldStateOverride
        },
        preloadingStatus
      };
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
      throw error;
    }
  }
}