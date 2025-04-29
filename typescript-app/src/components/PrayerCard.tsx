/**
 * Prayer Card Component
 * 
 * A component for displaying an individual prayer with Latin and English text,
 * supporting foldable displays and pronunciation guides.
 */

import React from 'react';
import { View, StyleSheet, Text, ViewStyle, TextStyle, Pressable } from 'react-native';
import { LiturgicalText } from './LiturgicalText';
import { FoldableLayout } from './FoldableLayout';
import { useFoldableDevice } from '../hooks/useFoldableDevice';
import { useAppTheme } from '../hooks/useAppTheme';
import { Prayer } from '../shared/database/types';

interface PrayerCardProps {
  prayer: Prayer;
  showLatinOnly?: boolean;
  showEnglishOnly?: boolean;
  onPress?: () => void;
  expanded?: boolean;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({
  prayer,
  showLatinOnly = false,
  showEnglishOnly = false,
  onPress,
  expanded = false,
}) => {
  const { isUnfolded } = useFoldableDevice();
  const theme = useAppTheme();

  const titleContent = (
    <View style={styles.titleContainer}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {showEnglishOnly ? prayer.titleEnglish : prayer.titleLatin}
      </Text>
      {!showLatinOnly && !showEnglishOnly && (
        <Text style={[styles.titleSecondary, { color: theme.colors.textSecondary }]}>
          {showEnglishOnly ? prayer.titleLatin : prayer.titleEnglish}
        </Text>
      )}
    </View>
  );

  const collapsedContent = titleContent;

  const expandedContent = (
    <View>
      {titleContent}
      <View style={styles.contentContainer}>
        <LiturgicalText
          latin={showEnglishOnly ? '' : (prayer.textLatin || '')}
          english={showLatinOnly ? '' : (prayer.textEnglish || '')}
        />
        {prayer.pronunciation && !showEnglishOnly && (
          <View style={[styles.pronunciationContainer, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.pronunciationTitle, { color: theme.colors.textSecondary }]}>
              Pronunciation Guide
            </Text>
            <Text style={[styles.pronunciation, { color: theme.colors.text }]}>
              {prayer.pronunciation}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const showTwoColumn = isUnfolded && !showLatinOnly && !showEnglishOnly;

  const cardContent = (
    <FoldableLayout
      foldedContent={expanded ? expandedContent : collapsedContent}
      unfoldedContent={showTwoColumn ? expandedContent : (expanded ? expandedContent : collapsedContent)}
    />
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.colors.surface },
          pressed && { opacity: 0.8 }
        ]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {cardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  } as ViewStyle,
  titleContainer: {
    marginBottom: 8,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  } as TextStyle,
  titleSecondary: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  } as TextStyle,
  contentContainer: {
    marginTop: 12,
  } as ViewStyle,
  pronunciationContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 6,
  } as ViewStyle,
  pronunciationTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  } as TextStyle,
  pronunciation: {
    fontSize: 14,
    fontStyle: 'italic',
  } as TextStyle,
});

export default PrayerCard;