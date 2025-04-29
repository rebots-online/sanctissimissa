import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { JournalEntry as JournalEntryType } from '../types/journal';

export interface JournalEntryProps {
  entry: JournalEntryType;
  isEditing?: boolean;
  spatialMode?: boolean;
  onPress?: () => void;
  onSave?: (entry: JournalEntryType) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  style?: StyleSheet.NamedStyles<any>;
  testID?: string;
}

const JournalEntry: React.FC<JournalEntryProps> = ({
  entry,
  isEditing = false,
  spatialMode = false,
  onPress,
  onSave,
  onDelete,
  style,
  testID = 'journal-entry'
}) => {
  const handlePress = () => {
    if (!isEditing && onPress) {
      onPress();
    }
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <View testID={`${testID}-edit-container`}>
          {/* Edit mode UI implementation */}
        </View>
      );
    }

    return (
      <TouchableOpacity 
        onPress={handlePress}
        testID={testID}
        style={[styles.container, spatialMode && styles.spatialContainer, style]}
      >
        <View testID={`${testID}-content`}>
          <Text testID={`${testID}-title`} numberOfLines={1} style={styles.title}>
            {entry.title}
          </Text>
          <Text testID={`${testID}-content`} style={styles.content}>
            {entry.content}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spatialContainer: {
    position: 'absolute',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default JournalEntry;