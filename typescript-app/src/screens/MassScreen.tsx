/**
 * Mass Screen
 * 
 * Displays the texts for the Mass of the day with support for
 * foldable displays and different viewing modes.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Switch,
  StyleSheet,
  Text,
  ViewStyle
} from 'react-native';
import { RootStackScreenProps, TabScreenProps } from '../navigation/types';
import { useFoldableDevice } from '../hooks/useFoldableDevice';
import { useAppTheme } from '../hooks/useAppTheme';
import MassTextSection from '../components/MassTextSection';
import { format } from 'date-fns';
import { getLiturgicalDay, getMassText } from '../services/liturgical';
import { LiturgicalDay, MassText } from '../shared/database/types';

interface MassSection {
  id: string;
  title: string;
  optional?: boolean;
}

const MASS_SECTIONS: MassSection[] = [
  { id: 'introit', title: 'INTROIT' },
  { id: 'collect', title: 'COLLECT' },
  { id: 'epistle', title: 'EPISTLE' },
  { id: 'gradual', title: 'GRADUAL' },
  { id: 'alleluia', title: 'ALLELUIA', optional: true },
  { id: 'tract', title: 'TRACT', optional: true },
  { id: 'gospel', title: 'GOSPEL' },
  { id: 'offertory', title: 'OFFERTORY' },
  { id: 'secret', title: 'SECRET' },
  { id: 'communion', title: 'COMMUNION' },
  { id: 'postcommunion', title: 'POST COMMUNION' },
];

type Props = {
  date?: string;
};

const MassScreenContent: React.FC<Props> = ({ date }) => {
  const theme = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [proper, setProper] = useState<MassText | null>(null);
  const [dayInfo, setDayInfo] = useState<LiturgicalDay | null>(null);
  const [showLatinOnly, setShowLatinOnly] = useState(false);
  const [showEnglishOnly, setShowEnglishOnly] = useState(false);
  const [isVigil, setIsVigil] = useState(false);

  useEffect(() => {
    loadContent();
  }, [date]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const targetDate = date || formatDate(new Date());
      
      // Get liturgical day info
      const day = await getLiturgicalDay(targetDate);
      if (day) {
        setDayInfo(day);
        
        if (day.massProper) {
          // Get mass text
          const massText = await getMassText(day.massProper);
          if (massText) {
            setProper(massText);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load Mass content:', error);
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

  if (!proper || !dayInfo) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.error, { color: theme.colors.error }]}>
          Failed to load Mass content
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

      {MASS_SECTIONS.map(section => {
        // Skip optional sections if not present
        if (section.optional && !proper[section.id]) {
          return null;
        }

        return (
          <MassTextSection
            key={section.id}
            title={section.title}
            latin={showEnglishOnly ? undefined : proper[`${section.id}Latin`]}
            english={showLatinOnly ? undefined : proper[`${section.id}English`]}
            reference={proper[`${section.id}Reference`]}
            showLatinOnly={showLatinOnly}
            showEnglishOnly={showEnglishOnly}
          />
        );
      })}
    </ScrollView>
  );
};

// Stack navigation version
export const MassScreen: React.FC<RootStackScreenProps<'Mass'>> = ({ route }) => {
  return <MassScreenContent {...route.params} />;
};

// Tab navigation version
export const TabMassScreen: React.FC<TabScreenProps<'Mass'>> = () => {
  return <MassScreenContent />;
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
  } as ViewStyle,
  season: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  } as ViewStyle,
  date: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  } as ViewStyle,
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  } as ViewStyle,
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  controlLabel: {
    fontSize: 14,
  } as ViewStyle,
  error: {
    fontSize: 16,
    textAlign: 'center',
  } as ViewStyle,
});

export default MassScreen;