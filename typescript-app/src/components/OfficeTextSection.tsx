/**
 * Office Text Section Component
 * 
 * A component for rendering sections of the Divine Office with support
 * for psalms and readings in both Latin and English.
 */

import React from 'react';
import { View, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { LiturgicalText } from './LiturgicalText';
import { FoldableLayout } from './FoldableLayout';
import { useFoldableDevice } from '../hooks/useFoldableDevice';
import { useAppTheme } from '../hooks/useAppTheme';
import { Psalm, Reading } from '../shared/database/types';

interface OfficeTextSectionProps {
  title: string;
  latin?: string;
  english?: string;
  reference?: string;
  psalms?: Psalm[];
  readings?: Reading[];
  isRubric?: boolean;
  isResponse?: boolean;
  showLatinOnly?: boolean;
  showEnglishOnly?: boolean;
}

export const OfficeTextSection: React.FC<OfficeTextSectionProps> = ({
  title,
  latin,
  english,
  reference,
  psalms,
  readings,
  isRubric = false,
  isResponse = false,
  showLatinOnly = false,
  showEnglishOnly = false,
}) => {
  const { isUnfolded } = useFoldableDevice();
  const theme = useAppTheme();

  const renderPsalm = (psalm: Psalm, index: number) => (
    <View key={psalm.id} style={styles.psalmContainer}>
      <Text style={[styles.psalmNumber, { color: theme.colors.textSecondary }]}>
        Psalm {psalm.number}
      </Text>
      <LiturgicalText
        latin={showEnglishOnly ? '' : (psalm.textLatin || '')}
        english={showLatinOnly ? '' : (psalm.textEnglish || '')}
        isResponse={false}
      />
    </View>
  );

  const renderReading = (reading: Reading, index: number) => (
    <View key={reading.id} style={styles.readingContainer}>
      <Text style={[styles.readingNumber, { color: theme.colors.textSecondary }]}>
        Reading {reading.number}
      </Text>
      <LiturgicalText
        latin={showEnglishOnly ? '' : (reading.textLatin || '')}
        english={showLatinOnly ? '' : (reading.textEnglish || '')}
        isResponse={false}
      />
    </View>
  );

  // Single column view
  const singleColumnContent = (
    <View style={styles.singleColumn}>
      {(latin || english) && (
        <LiturgicalText
          latin={showEnglishOnly ? '' : (latin || '')}
          english={showLatinOnly ? '' : (english || '')}
          isRubric={isRubric}
          isResponse={isResponse}
        />
      )}
      
      {psalms?.map(renderPsalm)}
      {readings?.map(renderReading)}
      
      {reference && (
        <View style={[styles.reference, { backgroundColor: theme.colors.background }]}>
          <LiturgicalText
            latin={reference}
            english={reference}
            isRubric={true}
          />
        </View>
      )}
    </View>
  );

  // Two column view for unfolded state
  const twoColumnContent = (
    <View style={styles.twoColumn}>
      <View style={styles.latinColumn}>
        {latin && !showEnglishOnly && (
          <LiturgicalText
            latin={latin}
            english={''}
            isRubric={isRubric}
            isResponse={isResponse}
          />
        )}
        {psalms?.map(psalm => (
          <View key={`${psalm.id}-latin`} style={styles.psalmContainer}>
            <Text style={[styles.psalmNumber, { color: theme.colors.textSecondary }]}>
              Psalm {psalm.number}
            </Text>
            <LiturgicalText
              latin={psalm.textLatin || ''}
              english={''}
              isResponse={false}
            />
          </View>
        ))}
        {readings?.map(reading => (
          <View key={`${reading.id}-latin`} style={styles.readingContainer}>
            <Text style={[styles.readingNumber, { color: theme.colors.textSecondary }]}>
              Reading {reading.number}
            </Text>
            <LiturgicalText
              latin={reading.textLatin || ''}
              english={''}
              isResponse={false}
            />
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.englishColumn}>
        {english && !showLatinOnly && (
          <LiturgicalText
            latin={''}
            english={english}
            isRubric={isRubric}
            isResponse={isResponse}
          />
        )}
        {psalms?.map(psalm => (
          <View key={`${psalm.id}-english`} style={styles.psalmContainer}>
            <Text style={[styles.psalmNumber, { color: theme.colors.textSecondary }]}>
              Psalm {psalm.number}
            </Text>
            <LiturgicalText
              latin={''}
              english={psalm.textEnglish || ''}
              isResponse={false}
            />
          </View>
        ))}
        {readings?.map(reading => (
          <View key={`${reading.id}-english`} style={styles.readingContainer}>
            <Text style={[styles.readingNumber, { color: theme.colors.textSecondary }]}>
              Reading {reading.number}
            </Text>
            <LiturgicalText
              latin={''}
              english={reading.textEnglish || ''}
              isResponse={false}
            />
          </View>
        ))}
      </View>

      {reference && (
        <View style={[styles.reference, styles.twoColumnReference, { backgroundColor: theme.colors.background }]}>
          <LiturgicalText
            latin={reference}
            english={reference}
            isRubric={true}
          />
        </View>
      )}
    </View>
  );

  // Determine which content to show based on device state and language preferences
  const showTwoColumn = isUnfolded && !showLatinOnly && !showEnglishOnly;

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.surface }
    ]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      <FoldableLayout
        foldedContent={singleColumnContent}
        unfoldedContent={showTwoColumn ? twoColumnContent : singleColumnContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  } as TextStyle,
  singleColumn: {
    padding: 16,
  } as ViewStyle,
  twoColumn: {
    flexDirection: 'row',
    padding: 16,
  } as ViewStyle,
  latinColumn: {
    flex: 1,
  } as ViewStyle,
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  } as ViewStyle,
  englishColumn: {
    flex: 1,
  } as ViewStyle,
  psalmContainer: {
    marginVertical: 8,
  } as ViewStyle,
  psalmNumber: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  } as TextStyle,
  readingContainer: {
    marginVertical: 8,
  } as ViewStyle,
  readingNumber: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  } as TextStyle,
  reference: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  } as ViewStyle,
  twoColumnReference: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
  } as ViewStyle,
});

export default OfficeTextSection;