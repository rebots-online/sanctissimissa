/**
 * Prayer Screen
 * 
 * Displays a list of prayers organized by category with search functionality
 * and language preferences.
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
  TextInput,
  SectionList,
  TouchableOpacity,
  SectionListData
} from 'react-native';
import { RootStackScreenProps, TabScreenProps } from '../navigation/types';
import { useAppTheme } from '../hooks/useAppTheme';
import { useFoldableDevice } from '../hooks/useFoldableDevice';
import PrayerCard from '../components/PrayerCard';
import { getAllPrayers, getPrayersByCategory } from '../services/liturgical';
import { Prayer } from '../shared/database/types';

type Props = {
  category?: string;
};

interface PrayerSection {
  title: string;
  data: Prayer[];
}

const PrayerScreenContent: React.FC<Props> = ({ category: initialCategory }) => {
  const theme = useAppTheme();
  const { isUnfolded } = useFoldableDevice();
  const [loading, setLoading] = useState(true);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLatinOnly, setShowLatinOnly] = useState(false);
  const [showEnglishOnly, setShowEnglishOnly] = useState(false);
  const [expandedPrayerId, setExpandedPrayerId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);

  useEffect(() => {
    loadPrayers();
  }, [selectedCategory]);

  const loadPrayers = async () => {
    try {
      setLoading(true);
      const result = selectedCategory 
        ? await getPrayersByCategory(selectedCategory)
        : await getAllPrayers();
      setPrayers(result);
    } catch (error) {
      console.error('Failed to load prayers:', error);
    } finally {
      setLoading(false);
    }
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

  const filterPrayers = (items: Prayer[]): Prayer[] => {
    if (!searchQuery) return items;

    return items.filter(prayer => {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      return searchTerms.every(term => 
        (prayer.titleLatin?.toLowerCase().includes(term) ||
        prayer.titleEnglish?.toLowerCase().includes(term) ||
        prayer.textLatin?.toLowerCase().includes(term) ||
        prayer.textEnglish?.toLowerCase().includes(term) ||
        prayer.category.toLowerCase().includes(term))
      );
    });
  };

  const organizePrayersByCategory = (items: Prayer[]): PrayerSection[] => {
    const categories = new Map<string, Prayer[]>();
    
    items.forEach(prayer => {
      const category = categories.get(prayer.category) || [];
      category.push(prayer);
      categories.set(prayer.category, category);
    });

    return Array.from(categories.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const filteredPrayers = filterPrayers(prayers);
  const sections = organizePrayersByCategory(filteredPrayers);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border
          }]}
          placeholder="Search prayers..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

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

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <PrayerCard
            prayer={item}
            showLatinOnly={showLatinOnly}
            showEnglishOnly={showEnglishOnly}
            expanded={expandedPrayerId === item.id}
            onPress={() => setExpandedPrayerId(
              expandedPrayerId === item.id ? null : item.id
            )}
          />
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={true}
      />
    </View>
  );
};

// Stack navigation version
export const PrayerScreen: React.FC<RootStackScreenProps<'Prayer'>> = ({ route }) => {
  return <PrayerScreenContent {...route.params} />;
};

// Tab navigation version
export const TabPrayerScreen: React.FC<TabScreenProps<'Prayer'>> = () => {
  return <PrayerScreenContent />;
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
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
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
  } as TextStyle,
  sectionHeader: {
    padding: 12,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  } as TextStyle,
  listContent: {
    paddingBottom: 16,
  } as ViewStyle,
});

export default PrayerScreen;