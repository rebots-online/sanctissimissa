import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { RootStackScreenProps, TabScreenProps } from '../navigation/types';
import { useAppTheme } from '../hooks/useAppTheme';
import { dataManager } from '../services/dataManager';
import { OfficeHourProper } from '../services/texts';
import { LiturgicalDay } from '../services/calendar';

type StackProps = RootStackScreenProps<'Office'>;
type TabProps = TabScreenProps<'Office'>;

// Component that handles both stack and tab navigation props
const OfficeScreenContent: React.FC<{
  type?: string;
  date?: string;
}> = ({ type = 'Lauds', date }) => {
  const theme = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [proper, setProper] = useState<OfficeHourProper | null>(null);
  const [dayInfo, setDayInfo] = useState<LiturgicalDay | null>(null);

  useEffect(() => {
    loadContent();
  }, [type, date]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const [officeProper, info] = await Promise.all([
        dataManager.getOfficeHour(type, date),
        dataManager.getDayInfo(date)
      ]);
      setProper(officeProper);
      setDayInfo(info);
    } catch (error) {
      console.error('Failed to load Office content:', error);
    } finally {
      setLoading(false);
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
          Failed to load Office content
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.celebration, { color: theme.colors.text }]}>
          {type}
        </Text>
        <Text style={[styles.season, { color: theme.colors.textSecondary }]}>
          {dayInfo.celebration || dayInfo.season.replace('_', ' ').toUpperCase()}
        </Text>
      </View>

      {proper.antiphons.map((antiphon, index) => (
        <View key={`antiphon-${index}`} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            ANTIPHON {index + 1}
          </Text>
          <Text style={[styles.latin, { color: theme.colors.text }]}>{antiphon.latin}</Text>
          <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{antiphon.english}</Text>
        </View>
      ))}

      {proper.psalms.map((psalm, index) => (
        <View key={`psalm-${index}`} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            PSALM {index + 1}
          </Text>
          <Text style={[styles.latin, { color: theme.colors.text }]}>{psalm.latin}</Text>
          <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{psalm.english}</Text>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>CHAPTER</Text>
        <Text style={[styles.latin, { color: theme.colors.text }]}>{proper.chapter.latin}</Text>
        <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{proper.chapter.english}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>HYMN</Text>
        <Text style={[styles.latin, { color: theme.colors.text }]}>{proper.hymn.latin}</Text>
        <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{proper.hymn.english}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>VERSICLE</Text>
        <Text style={[styles.latin, { color: theme.colors.text }]}>{proper.versicle.latin}</Text>
        <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{proper.versicle.english}</Text>
      </View>

      {proper.benedictus && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>BENEDICTUS</Text>
          <Text style={[styles.latin, { color: theme.colors.text }]}>{proper.benedictus.latin}</Text>
          <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{proper.benedictus.english}</Text>
        </View>
      )}

      {proper.magnificat && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>MAGNIFICAT</Text>
          <Text style={[styles.latin, { color: theme.colors.text }]}>{proper.magnificat.latin}</Text>
          <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{proper.magnificat.english}</Text>
        </View>
      )}

      {proper.nunc && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>NUNC DIMITTIS</Text>
          <Text style={[styles.latin, { color: theme.colors.text }]}>{proper.nunc.latin}</Text>
          <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{proper.nunc.english}</Text>
        </View>
      )}

      <View style={[styles.section, styles.lastSection]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>COLLECT</Text>
        <Text style={[styles.latin, { color: theme.colors.text }]}>{proper.collect.latin}</Text>
        <Text style={[styles.english, { color: theme.colors.textSecondary }]}>{proper.collect.english}</Text>
      </View>
    </ScrollView>
  );
};

// Stack navigation version
export const OfficeScreen: React.FC<StackProps> = ({ route }) => {
  return <OfficeScreenContent {...route.params} />;
};

// Tab navigation version
export const TabOfficeScreen: React.FC<TabProps> = () => {
  return <OfficeScreenContent />;
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
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  lastSection: {
    borderBottomWidth: 0,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  latin: {
    fontSize: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  english: {
    fontSize: 16,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default OfficeScreen;