/**
 * Mass Text Section Component
 * 
 * A component for rendering a section of Mass text with proper formatting
 * and support for foldable displays.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LiturgicalText } from './LiturgicalText';
import { FoldableLayout } from './FoldableLayout';
import { useFoldableDevice } from '../hooks/useFoldableDevice';
import { useAppTheme } from '../hooks/useAppTheme';

interface MassTextSectionProps {
  title: string;
  latin?: string;
  english?: string;
  reference?: string;
  isRubric?: boolean;
  isResponse?: boolean;
  showLatinOnly?: boolean;
  showEnglishOnly?: boolean;
}

export const MassTextSection: React.FC<MassTextSectionProps> = ({
  title,
  latin,
  english,
  reference,
  isRubric = false,
  isResponse = false,
  showLatinOnly = false,
  showEnglishOnly = false,
}) => {
  const { isUnfolded, layoutMode } = useFoldableDevice();
  const theme = useAppTheme();

  // Single column view
  const singleColumnContent = (
    <View style={styles.singleColumn}>
      <LiturgicalText
        latin={latin || ''}
        english={english || ''}
        isRubric={isRubric}
        isResponse={isResponse}
      />
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
        <LiturgicalText
          latin={latin || ''}
          english={''}
          isRubric={isRubric}
          isResponse={isResponse}
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.englishColumn}>
        <LiturgicalText
          latin={''}
          english={english || ''}
          isRubric={isRubric}
          isResponse={isResponse}
        />
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

export default MassTextSection;