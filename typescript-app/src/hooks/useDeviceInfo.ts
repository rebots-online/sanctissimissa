import { useState, useEffect } from 'react';
import { deviceInfo, DeviceType, FoldState } from '../services/deviceInfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DeviceInfo {
  type: DeviceType;
  manufacturer?: string;
  model?: string;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  foldState: FoldState;
}

export function useDeviceInfo() {
  const [info, setInfo] = useState<DeviceInfo>(deviceInfo.getDeviceInfo());
  const [debugMode, setDebugMode] = useState<boolean>(false);

  useEffect(() => {
    // Check if debug mode is enabled
    AsyncStorage.getItem('@sanctissimissa:debugMode')
      .then((value: string | null) => {
        setDebugMode(value === 'true');
      })
      .catch((error: Error) => {
        console.error('Error checking debug mode:', error);
      });

    // Subscribe to device info changes
    const unsubscribe = deviceInfo.addListener((newInfo) => {
      setInfo(newInfo);
      
      // Log fold state changes in debug mode
      if (debugMode) {
        console.log('[DeviceInfo] State updated:', {
          type: newInfo.type,
          foldState: newInfo.foldState,
          dimensions: `${newInfo.screenWidth}x${newInfo.screenHeight}`,
          orientation: newInfo.isLandscape ? 'landscape' : 'portrait'
        });
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [debugMode]);

  return {
    ...info,
    isFoldable: info.type === 'foldable',
    isPhone: info.type === 'phone',
    isTablet: info.type === 'tablet',
    isFolded: info.foldState === 'folded',
    isUnfolded: info.foldState === 'unfolded',
    
    // Additional utility functions for debugging
    debugInfo: debugMode ? {
      deviceType: info.type,
      manufacturer: info.manufacturer,
      model: info.model,
      dimensions: `${info.screenWidth}x${info.screenHeight}`,
      orientation: info.isLandscape ? 'landscape' : 'portrait',
      foldState: info.foldState,
      isDebugMode: debugMode
    } : undefined,
    
    // Enable debug mode
    enableDebugMode: async () => {
      try {
        await AsyncStorage.setItem('@sanctissimissa:debugMode', 'true');
        setDebugMode(true);
        console.log('[DeviceInfo] Debug mode enabled');
      } catch (error) {
        console.error('Error enabling debug mode:', error);
      }
    },
    
    // Disable debug mode
    disableDebugMode: async () => {
      try {
        await AsyncStorage.setItem('@sanctissimissa:debugMode', 'false');
        setDebugMode(false);
        console.log('[DeviceInfo] Debug mode disabled');
      } catch (error) {
        console.error('Error disabling debug mode:', error);
      }
    }
  };
}