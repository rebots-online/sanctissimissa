/**
 * Office Screen
 * 
 * Displays the texts for the Divine Office of the day with support for
 * different hours and foldable displays.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  Switch,
  TouchableOpacity
} from 'react-native';
import { RootStackScreenProps, TabScreenProps } from '../navigation/types';
import { useAppTheme } from '../hooks/useAppTheme';
import { useFoldableDevice } from '../hooks/useFoldableDevice';
import OfficeTextSection from '../components/OfficeTextSection';
import { format } from 'date-fns';
import { getLiturgicalDay, getOfficeText } from '../services/liturgical';
import { LiturgicalDay, OfficeText } from '../shared/database/types';

type HourInfo = {
  id: string;
  name: string;
  latinName: string;
};

const OFFICE_HOURS: HourInfo[] = [
  { id: 'matins', name: 'Matins', latinName: 'Matutinum' },
  { id: 'lauds', name: 'Lauds', latinName: 'Laudes' },
  { id: 'prime', name: 'Prime', latinName: 'Prima' },
  { id: 'terce', name: 'Terce', latinName: 'Tertia' },
  { id: 'sext', name: 'Sext', latinName: 'Sexta' },
  { id: 'none', name: 'None', latinName: 'Nona' },
  { id: 'vespers', name: 'Vespers', latinName: 'Vesperae' },
  { id: 'compline', name: 'Compline', latinName: 'Completorium' },
];

type Props = {
  date?: string;
  hour?: string;
};

const OfficeScreenContent: React.FC<Props> = ({ date, hour: initialHour }) => {
  const theme = useAppTheme();
  const { isUnfolded } = useFoldableDevice();
  const [loading, setLoading] = useState(true);
  const [dayInfo, setDayInfo] = useState<LiturgicalDay | null>(null);
  const [officeText, setOfficeText] = useState<OfficeText | null>(null);
  const [selectedHour, setSelectedHour] = useState(initialHour || 'lauds');
  const [showLatinOnly, setShowLatinOnly] = useState(false);
  const [showEnglishOnly, setShowEnglishOnly] = useState(false);

  useEffect(() => {
    loadContent();
  }, [date, selectedHour]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const targetDate = date || formatDate(new Date());
      
      // Get liturgical day info
      const day = await getLiturgicalDay(targetDate);
      if (day) {
        setDayInfo(day);
        
        // Get office text for selected hour
        const office = await getOfficeText(`${day.id}_${selectedHour}`);
        if (office) {
          setOfficeText(office);
        }
      }
    } catch (error) {
      console.error('Failed to load Office content:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  const toggleLatinOnly = () => {
    setShowLatinOnly(!showLatinOnly);
    if (!showLatinOnly) {
      setShowEnglishOnly(false);
    }
  };

  const toggleEnglishOnly = () => {
    setShowEnglishOnly(!showEnglishOnly);
    if (!showEnglishOnly) {
      setShowLatinOnly(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!dayInfo) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.error, { color: theme.colors.error }]}>
          Failed to load Office content
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.celebration, { color: theme.colors.text }]}>
          {dayInfo.celebration}
        </Text>
        <Text style={[styles.season, { color: theme.colors.textSecondary }]}>
          {dayInfo.season}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {format(new Date(dayInfo.date), 'EEEE, MMMM d, yyyy')}
        </Text>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.hourSelector}
          contentContainerStyle={styles.hourSelectorContent}
        >
          {OFFICE_HOURS.map(hour => (
            <TouchableOpacity
              key={hour.id}
              onPress={() => setSelectedHour(hour.id)}
              style={[
                styles.hourButton,
                selectedHour === hour.id && {
                  backgroundColor: theme.colors.primary
                }
              ]}
            >
              <Text style={[
                styles.hourButtonText,
                { color: selectedHour === hour.id ? theme.colors.text : theme.colors.textSecondary }
              ]}>
                {hour.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.controls}>
          <View style={styles.controlItem}>
            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>
              Latin Only
            </Text>
            <Switch
              value={showLatinOnly}
              onValueChange={toggleLatinOnly}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
            />
          </View>
          
          <View style={styles.controlItem}>
            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>
              English Only
            </Text>
            <Switch
              value={showEnglishOnly}
              onValueChange={toggleEnglishOnly}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
            />
          </View>
        </View>
      </View>

      <ScrollView>
        {officeText ? (
          <>
            <OfficeTextSection
              title="Opening Verse"
              latin={officeText.titleLatin}
              english={officeText.titleEnglish}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
            />
            
            <OfficeTextSection
              title="Hymn"
              latin={officeText.hymnLatin}
              english={officeText.hymnEnglish}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
            />
            
            {officeText.psalms?.map((psalm, index) => (
              <OfficeTextSection
                key={psalm.id}
                title={`Psalm ${psalm.number}`}
                latin={psalm.textLatin}
                english={psalm.textEnglish}
                showLatinOnly={showLatinOnly}
                showEnglishOnly={showEnglishOnly}
              />
            ))}
            
            {officeText.readings?.map((reading, index) => (
              <OfficeTextSection
                key={reading.id}
                title={`Reading ${reading.number}`}
                latin={reading.textLatin}
                english={reading.textEnglish}
                showLatinOnly={showLatinOnly}
                showEnglishOnly={showEnglishOnly}
              />
            ))}
            
            <OfficeTextSection
              title="Prayer"
              latin={officeText.prayerLatin}
              english={officeText.prayerEnglish}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
            />
          </>
        ) : (
          <Text style={[styles.noContent, { color: theme.colors.textSecondary }]}>
            No content available for this hour
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

// Stack navigation version
export const OfficeScreen: React.FC<RootStackScreenProps<'Office'>> = ({ route }) => {
  return <OfficeScreenContent {...route.params} />;
};

// Tab navigation version
export const TabOfficeScreen: React.FC<TabScreenProps<'Office'>> = () => {
  return <OfficeScreenContent />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  } as ViewStyle,
  celebration: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  season: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  } as TextStyle,
  date: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  } as TextStyle,
  hourSelector: {
    marginVertical: 12,
  } as ViewStyle,
  hourSelectorContent: {
    paddingHorizontal: 8,
  } as ViewStyle,
  hourButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  } as ViewStyle,
  hourButtonText: {
    fontSize: 14,
    fontWeight: '500',
  } as TextStyle,
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  } as ViewStyle,
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  controlLabel: {
    fontSize: 14,
  } as TextStyle,
  error: {
    fontSize: 16,
    textAlign: 'center',
  } as TextStyle,
  noContent: {
    fontSize: 16,
    textAlign: 'center',
    padding: 24,
    fontStyle: 'italic',
  } as TextStyle,
});

export default OfficeScreen;