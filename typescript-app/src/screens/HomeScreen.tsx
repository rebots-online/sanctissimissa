import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { format } from 'date-fns';
import { useAppTheme } from '../hooks/useAppTheme';
import { dataManager } from '../services/dataManager';
import { LiturgicalDay } from '../services/calendar';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenProps } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = TabScreenProps<'Home'>;
type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC<Props> = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [dayInfo, setDayInfo] = React.useState<LiturgicalDay | null>(null);
  const deviceInfo = useDeviceInfo();
  const { width } = useWindowDimensions();

  React.useEffect(() => {
    loadDayInfo();
  }, []);

  const loadDayInfo = async () => {
    try {
      const info = await dataManager.getDayInfo();
      setDayInfo(info);
    } catch (error) {
      console.error('Failed to load day info:', error);
    }
  };

  const formatDate = (date: string = new Date().toISOString()) => {
    return format(new Date(date), 'EEEE, MMMM d, yyyy');
  };

  const navigateToOffice = (type: string) => {
    navigation.navigate('Office', { type, date: new Date().toISOString().split('T')[0] });
  };

  const navigateToMass = () => {
    navigation.navigate('Mass', { date: new Date().toISOString().split('T')[0] });
  };

  if (!dayInfo) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loading, { color: theme.colors.text }]}>
          Loading...
        </Text>
      </View>
    );
  }

  // Navigate to device debug screen
  const navigateToDeviceDebug = () => {
    navigation.navigate('DeviceDebug');
  };

  // Calculate adaptive styles based on device fold state
  const getGridItemWidth = () => {
    // Use numeric values instead of percentages for better TypeScript compatibility
    if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
      // 4-column grid on unfolded devices with better spacing
      return width * 0.22;
    } else {
      // 2-column grid on folded or regular devices
      return width * 0.46;
    }
  };

  const getFontSizeMultiplier = () => {
    if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
      return 1.2; // 20% larger on unfolded displays
    }
    return 1.0;
  };

  // Create adaptive styles based on device info
  const adaptiveStyles = {
    gridItem: {
      width: getGridItemWidth(),
      aspectRatio: deviceInfo.isUnfolded ? 1.2 : 1,
      margin: deviceInfo.isUnfolded ? 8 : 4,
    },
    container: {
      paddingHorizontal: deviceInfo.isUnfolded ? 24 : 16,
    },
    grid: {
      justifyContent: deviceInfo.isUnfolded ? 'space-around' as const : 'space-between' as const,
      marginHorizontal: deviceInfo.isUnfolded ? -8 : 0,
    },
    fontSize: {
      date: 14 * getFontSizeMultiplier(),
      celebration: 24 * getFontSizeMultiplier(),
      season: 16 * getFontSizeMultiplier(),
      sectionTitle: 18 * getFontSizeMultiplier(),
      gridItemText: 16 * getFontSizeMultiplier(),
      massButtonText: 18 * getFontSizeMultiplier(),
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={adaptiveStyles.container}
    >
      <View style={[styles.header, deviceInfo.isUnfolded && { paddingVertical: 24 }]}>
        <Text style={[styles.date, { 
          color: theme.colors.textSecondary,
          fontSize: adaptiveStyles.fontSize.date
        }]}>
          {formatDate()}
        </Text>
        <Text style={[styles.celebration, { 
          color: theme.colors.text,
          fontSize: adaptiveStyles.fontSize.celebration  
        }]}>
          {dayInfo.celebration || 'Feria'}
        </Text>
        <Text style={[styles.season, { 
          color: theme.colors.textSecondary,
          fontSize: adaptiveStyles.fontSize.season 
        }]}>
          {dayInfo.season.replace('_', ' ').toUpperCase()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { 
          color: theme.colors.text,
          fontSize: adaptiveStyles.fontSize.sectionTitle
        }]}>
          DIVINE OFFICE
        </Text>
        <View style={[styles.grid, adaptiveStyles.grid]}>
          {['Matins', 'Lauds', 'Prime', 'Terce', 'Sext', 'None', 'Vespers', 'Compline'].map((hour) => (
            <TouchableOpacity
              key={hour}
              style={[
                styles.gridItem, 
                adaptiveStyles.gridItem,
                { backgroundColor: theme.colors.surface }
              ]}
              onPress={() => navigateToOffice(hour)}
            >
              <Ionicons 
                name="book-outline" 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text style={[styles.gridItemText, { 
                color: theme.colors.text,
                fontSize: adaptiveStyles.fontSize.gridItemText 
              }]}>
                {hour}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { 
          color: theme.colors.text,
          fontSize: adaptiveStyles.fontSize.sectionTitle
        }]}>
          HOLY MASS
        </Text>
        <TouchableOpacity
          style={[
            styles.massButton, 
            { 
              backgroundColor: theme.colors.surface,
              padding: deviceInfo.isUnfolded ? 32 : 24
            }
          ]}
          onPress={navigateToMass}
        >
          <Ionicons 
            name="heart-outline" 
            size={24} 
            color={theme.colors.primary} 
          />
          <Text style={[styles.massButtonText, { 
            color: theme.colors.text,
            fontSize: adaptiveStyles.fontSize.massButtonText 
          }]}>
            Mass of the Day
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Button - Only visible on development builds */}
      {__DEV__ && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: theme.colors.secondary }
            ]}
            onPress={navigateToDeviceDebug}
          >
            <Ionicons
              name="bug-outline"
              size={18}
              color="#fff"
            />
            <Text style={styles.debugButtonText}>
              Device Debug
            </Text>
            {deviceInfo.isFoldable && (
              <View style={styles.deviceBadge}>
                <Text style={styles.deviceBadgeText}>
                  {deviceInfo.isUnfolded ? 'Unfolded' : 'Folded'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  date: {
    fontSize: 14,
    marginBottom: 8,
  },
  celebration: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  season: {
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemText: {
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  massButton: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  massButtonText: {
    fontSize: 18,
    marginLeft: 12,
  },
  debugButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  debugButtonText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  deviceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  deviceBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  loading: {
    flex: 1,
    textAlign: 'center',
    marginTop: 24,
  },
});

export default HomeScreen;