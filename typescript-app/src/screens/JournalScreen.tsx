/**
 * Journal Screen
 * 
 * Displays and manages journal entries with support for text and audio entries,
 * and a spatial mode for organizing entries.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Switch
} from 'react-native';
import { RootStackScreenProps, TabScreenProps } from '../navigation/types';
import { useAppTheme } from '../hooks/useAppTheme';
import { useFoldableDevice } from '../hooks/useFoldableDevice';
import JournalEntry from '../components/JournalEntry';
import { MaterialIcons } from '@expo/vector-icons';
import { JournalEntry as JournalEntryType } from '../types/journal';
import { getAllJournalEntries, saveJournalEntry, deleteJournalEntry } from '../services/journal';

type Props = {
  id?: string;
};

const JournalScreenContent: React.FC<Props> = ({ id }) => {
  const theme = useAppTheme();
  const { isUnfolded } = useFoldableDevice();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntryType[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [spatialMode, setSpatialMode] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const journalEntries = await getAllJournalEntries();
      setEntries(journalEntries);
    } catch (error) {
      console.error('Failed to load journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (entry: JournalEntryType) => {
    try {
      await saveJournalEntry(entry);
      setEditingEntry(null);
      await loadEntries();
    } catch (error) {
      console.error('Failed to save journal entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJournalEntry(id);
      await loadEntries();
    } catch (error) {
      console.error('Failed to delete journal entry:', error);
    }
  };

  const createNewEntry = () => {
    const newEntry: JournalEntryType = {
      id: `entry_${Date.now()}`,
      title: '',
      content: '',
      type: 'text',
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEntries([newEntry, ...entries]);
    setEditingEntry(newEntry.id);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Journal
        </Text>
        <View style={styles.controls}>
          <View style={styles.controlItem}>
            <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>
              Spatial Mode
            </Text>
            <Switch
              value={spatialMode}
              onValueChange={setSpatialMode}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
            />
          </View>
          <TouchableOpacity
            onPress={createNewEntry}
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.background} />
          </TouchableOpacity>
        </View>
      </View>

      {spatialMode ? (
        <View style={styles.spatialContainer}>
          {entries.map(entry => (
            <JournalEntry
              key={entry.id}
              entry={entry}
              isEditing={editingEntry === entry.id}
              onSave={handleSave}
              onDelete={() => handleDelete(entry.id)}
              onPress={() => setEditingEntry(entry.id)}
              spatialMode={true}
            />
          ))}
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {entries.map(entry => (
            <JournalEntry
              key={entry.id}
              entry={entry}
              isEditing={editingEntry === entry.id}
              onSave={handleSave}
              onDelete={() => handleDelete(entry.id)}
              onPress={() => setEditingEntry(entry.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// Stack navigation version
export const JournalScreen: React.FC<RootStackScreenProps<'Journal'>> = ({ route }) => {
  return <JournalScreenContent {...route.params} />;
};

// Tab navigation version
export const TabJournalScreen: React.FC<TabScreenProps<'Journal'>> = () => {
  return <JournalScreenContent />;
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  } as TextStyle,
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  controlLabel: {
    fontSize: 14,
  } as TextStyle,
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  spatialContainer: {
    flex: 1,
    position: 'relative',
  } as ViewStyle,
});

export default JournalScreen;