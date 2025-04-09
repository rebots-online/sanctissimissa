import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { RootStackScreenProps, TabScreenProps } from '../navigation/types';
import { useAppTheme } from '../hooks/useAppTheme';
import { dataManager } from '../services/dataManager';
import { MassProper } from '../services/texts';
import { LiturgicalDay } from '../services/calendar';
import AccordionSection from '../components/AccordionSection';
import { format } from 'date-fns';

type StackProps = RootStackScreenProps<'Mass'>;
type TabProps = TabScreenProps<'Mass'>;

interface MassSection {
  id: keyof MassProper;
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

// Component that handles both stack and tab navigation props
const MassScreenContent: React.FC<{
  date?: string;
}> = ({ date }) => {
  const theme = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [proper, setProper] = useState<MassProper | null>(null);
  const [dayInfo, setDayInfo] = useState<LiturgicalDay | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isVigil, setIsVigil] = useState(false);

  useEffect(() => {
    loadContent();
  }, [date]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const [massProper, info] = await Promise.all([
        dataManager.getMassProper(date),
        dataManager.getDayInfo(date)
      ]);
      setProper(massProper);
      setDayInfo(info);
    } catch (error) {
      console.error('Failed to load Mass content:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSection(expandedSection === sectionName ? null : sectionName);
  };

  const formatDate = (dateStr?: string) => {
    const dateObj = dateStr ? new Date(dateStr) : new Date();
    return format(dateObj, 'EEEE, MMMM d, yyyy');
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
          {dayInfo.season.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {formatDate(date)}
        </Text>
        {dayInfo.allowsVigil && (
          <View style={styles.vigilToggle}>
            <Text style={[styles.vigilText, { color: theme.colors.textSecondary }]}>
              Vigil Mass
            </Text>
            <Switch
              value={isVigil}
              onValueChange={setIsVigil}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
            />
          </View>
        )}
      </View>

      {MASS_SECTIONS.map(section => {
        const content = proper[section.id];
        if (!content && section.optional) return null;
        
        return (
          <AccordionSection
            key={section.id}
            title={section.title}
            latin={content?.latin || ''}
            english={content?.english || ''}
            isExpanded={expandedSection === section.id}
            onPress={() => toggleSection(section.id)}
          />
        );
      })}
    </ScrollView>
  );
};

// Stack navigation version
export const MassScreen: React.FC<StackProps> = ({ route }) => {
  return <MassScreenContent {...route.params} />;
};

// Tab navigation version
export const TabMassScreen: React.FC<TabProps> = () => {
  return <MassScreenContent />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  vigilToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  vigilText: {
    fontSize: 14,
    marginRight: 8,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MassScreen;