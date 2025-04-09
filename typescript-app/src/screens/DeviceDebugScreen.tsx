import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  ActivityIndicator 
} from 'react-native';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useAppTheme } from '../hooks/useAppTheme';
import { FoldStateTester } from '../utils/foldStateTester';
import { dataManager } from '../services/dataManager';
import { RootStackScreenProps } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = RootStackScreenProps<'DeviceDebug'>;

const DeviceDebugScreen: React.FC<Props> = () => {
  const deviceInfo = useDeviceInfo();
  const theme = useAppTheme();
  
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<{totalBytes: number, itemCount: number} | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testModeEnabled, setTestModeEnabled] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if test mode is enabled
    checkTestMode();
    
    // Get initial storage info
    getStorageInfo();
  }, []);
  
  const checkTestMode = async () => {
    try {
      const value = await AsyncStorage.getItem('@sanctissimissa:testMode');
      setTestModeEnabled(value === 'true');
    } catch (error) {
      console.error('Error checking test mode:', error);
    }
  };
  
  const toggleTestMode = async () => {
    try {
      await AsyncStorage.setItem('@sanctissimissa:testMode', testModeEnabled ? 'false' : 'true');
      setTestModeEnabled(!testModeEnabled);
    } catch (error) {
      console.error('Error toggling test mode:', error);
    }
  };
  
  const simulateFoldState = async (state: 'folded' | 'unfolded') => {
    setIsLoading(true);
    try {
      await FoldStateTester.simulateFoldStateChange(state);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay to let changes propagate
      await runDiagnostics();
    } catch (error) {
      console.error('Error simulating fold state:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const simulateDeviceType = async (type: 'phone' | 'tablet' | 'foldable') => {
    setIsLoading(true);
    try {
      await FoldStateTester.simulateDeviceType(type);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay to let changes propagate
      await runDiagnostics();
    } catch (error) {
      console.error('Error simulating device type:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const clearOverrides = async () => {
    setIsLoading(true);
    try {
      await FoldStateTester.clearOverrides();
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay to let changes propagate
      await runDiagnostics();
    } catch (error) {
      console.error('Error clearing overrides:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const result = await FoldStateTester.runDiagnostics();
      setDiagnosticsResult(result);
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStorageInfo = async () => {
    try {
      const info = await dataManager.getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error getting storage info:', error);
    }
  };
  
  const clearCache = async (type: 'all' | 'old') => {
    setIsLoading(true);
    try {
      await dataManager.clearCache(type);
      await getStorageInfo();
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testPreloading = async () => {
    setIsLoading(true);
    try {
      // Test the preloading mechanism by loading content for the next few days
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      // Format the dates as YYYY-MM-DD
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      // Preload both dates
      await dataManager.preloadDate(tomorrowStr);
      await dataManager.preloadDate(nextWeekStr);
      
      // Update storage info to see the effects
      await getStorageInfo();
      
      // Show a success message (would be better with a toast or similar)
      alert('Preloading test initiated successfully');
    } catch (error) {
      console.error('Error testing preloading:', error);
      alert('Error testing preloading');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format bytes into human-readable form
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Device Debug</Text>
      
      {isLoading && (
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
          style={styles.loading} 
        />
      )}
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Device Information</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardText, { color: theme.colors.text }]}>
            Type: {deviceInfo.type}
          </Text>
          <Text style={[styles.cardText, { color: theme.colors.text }]}>
            Foldable: {deviceInfo.isFoldable ? 'Yes' : 'No'}
          </Text>
          <Text style={[styles.cardText, { color: theme.colors.text }]}>
            Fold State: {deviceInfo.foldState}
          </Text>
          <Text style={[styles.cardText, { color: theme.colors.text }]}>
            Screen: {deviceInfo.screenWidth}x{deviceInfo.screenHeight}
          </Text>
          <Text style={[styles.cardText, { color: theme.colors.text }]}>
            Orientation: {deviceInfo.isLandscape ? 'Landscape' : 'Portrait'}
          </Text>
          {deviceInfo.manufacturer && (
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Manufacturer: {deviceInfo.manufacturer}
            </Text>
          )}
          {deviceInfo.model && (
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Model: {deviceInfo.model}
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={runDiagnostics}
        >
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>
            Run Diagnostics
          </Text>
        </TouchableOpacity>
      </View>
      
      {diagnosticsResult && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Diagnostics Result</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Device Type: {diagnosticsResult.actualDeviceInfo.type}
            </Text>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Fold State: {diagnosticsResult.actualDeviceInfo.foldState}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>Overrides:</Text>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Device Type Override: {diagnosticsResult.overrides.deviceType || 'None'}
            </Text>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Fold State Override: {diagnosticsResult.overrides.foldState || 'None'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>Preloading:</Text>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Concurrency Level: {diagnosticsResult.preloadingStatus.concurrencyLevel}
            </Text>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Advanced Preload: {diagnosticsResult.preloadingStatus.isAdvancedPreloadEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Test Controls</Text>
        
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.switchContainer}>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Test Mode
            </Text>
            <Switch
              value={testModeEnabled}
              onValueChange={toggleTestMode}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
            />
          </View>
          <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
            When enabled, allows simulating different device states for testing
          </Text>
        </View>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.buttonHalf, { backgroundColor: theme.colors.primary }]}
            onPress={() => simulateFoldState('folded')}
            disabled={!testModeEnabled}
          >
            <Text style={[styles.buttonText, { color: '#ffffff' }]}>
              Simulate Folded
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonHalf, { backgroundColor: theme.colors.primary }]}
            onPress={() => simulateFoldState('unfolded')}
            disabled={!testModeEnabled}
          >
            <Text style={[styles.buttonText, { color: '#ffffff' }]}>
              Simulate Unfolded
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.buttonThird, { backgroundColor: theme.colors.primary }]}
            onPress={() => simulateDeviceType('phone')}
            disabled={!testModeEnabled}
          >
            <Text style={[styles.buttonText, { color: '#ffffff' }]}>
              Phone
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonThird, { backgroundColor: theme.colors.primary }]}
            onPress={() => simulateDeviceType('tablet')}
            disabled={!testModeEnabled}
          >
            <Text style={[styles.buttonText, { color: '#ffffff' }]}>
              Tablet
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonThird, { backgroundColor: theme.colors.primary }]}
            onPress={() => simulateDeviceType('foldable')}
            disabled={!testModeEnabled}
          >
            <Text style={[styles.buttonText, { color: '#ffffff' }]}>
              Foldable
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.error }]}
          onPress={clearOverrides}
          disabled={!testModeEnabled}
        >
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>
            Clear Overrides
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preloading Tests</Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={testPreloading}
        >
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>
            Test Preloading
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.cardDescription, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          Tests preloading mechanism by loading content for tomorrow and next week
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Storage</Text>
        
        {storageInfo && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Used: {formatBytes(storageInfo.totalBytes)}
            </Text>
            <Text style={[styles.cardText, { color: theme.colors.text }]}>
              Items: {storageInfo.itemCount}
            </Text>
          </View>
        )}
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.buttonHalf, { backgroundColor: theme.colors.error }]}
            onPress={() => clearCache('all')}
          >
            <Text style={[styles.buttonText, { color: '#ffffff' }]}>
              Clear All Cache
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonHalf, { backgroundColor: theme.colors.warning }]}
            onPress={() => clearCache('old')}
          >
            <Text style={[styles.buttonText, { color: '#000' }]}>
              Clear Old Cache
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.secondary, marginTop: 8 }]}
          onPress={getStorageInfo}
        >
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>
            Refresh Storage Info
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  buttonHalf: {
    width: '48%',
  },
  buttonThird: {
    width: '32%',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default DeviceDebugScreen;