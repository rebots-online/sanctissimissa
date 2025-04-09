import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LiturgicalDay } from '../services/calendar';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useAppTheme } from '../hooks/useAppTheme';

interface DayInfoProps {
  dayInfo: LiturgicalDay;
  latin?: never;
  english?: never;
  isRubric?: never;
  isResponse?: never;
  glossary?: never;
  pronunciation?: never;
}

interface TextProps {
  dayInfo?: never;
  latin: string;
  english: string;
  isRubric?: boolean;
  isResponse?: boolean;
  glossary?: Record<string, string>;
  pronunciation?: Record<string, string>;
}

type Props = DayInfoProps | TextProps;

export const LiturgicalText: React.FC<Props> = (props) => {
  const deviceInfo = useDeviceInfo();
  const { width } = useWindowDimensions();
  const theme = useAppTheme();

  // Calculate font size multiplier based on fold state
  const getFontSizeMultiplier = () => {
    if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
      return 1.25; // 25% larger font on unfolded displays
    }
    return 1.0;
  };

  // Calculate optimal line length for readability
  const getOptimalWidth = () => {
    if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
      // For unfolded devices, use a two-column layout with optimal reading width
      return width > 1000 ? width * 0.45 : width * 0.92;
    }
    // For folded or regular devices, use full width with margins
    return width * 0.92;
  };

  // Dynamic styles based on fold state
  const dynamicStyles = {
    container: {
      padding: deviceInfo.isUnfolded ? 16 : 10,
      width: getOptimalWidth(),
      alignSelf: 'center',
    },
    fontSize: {
      celebration: 18 * getFontSizeMultiplier(),
      latinName: 16 * getFontSizeMultiplier(),
      classRank: 14 * getFontSizeMultiplier(),
      season: 14 * getFontSizeMultiplier(),
      latinText: 16 * getFontSizeMultiplier(),
      englishText: 14 * getFontSizeMultiplier(),
    },
    spacing: {
      lineHeight: deviceInfo.isUnfolded ? 1.5 : 1.3,
      paragraphSpacing: deviceInfo.isUnfolded ? 16 : 12,
    }
  };

  // Check if we're rendering a day info or text content
  if ('dayInfo' in props && props.dayInfo) {
    const { dayInfo } = props;
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        {dayInfo.celebration && (
          <Text style={[
            styles.celebration, 
            { 
              fontSize: dynamicStyles.fontSize.celebration,
              color: theme.colors.text
            }
          ]}>
            {dayInfo.celebration}
          </Text>
        )}
        {dayInfo.dayName && (
          <Text style={[
            styles.latinName, 
            { 
              fontSize: dynamicStyles.fontSize.latinName,
              color: theme.colors.textSecondary,
              lineHeight: dynamicStyles.fontSize.latinName * dynamicStyles.spacing.lineHeight
            }
          ]}>
            {dayInfo.dayName}
          </Text>
        )}
        <Text style={[
          styles.classRank, 
          { 
            fontSize: dynamicStyles.fontSize.classRank,
            color: theme.colors.textSecondary
          }
        ]}>
          {dayInfo.rank === 1 && 'I classis'}
          {dayInfo.rank === 2 && 'II classis'}
          {dayInfo.rank === 3 && 'III classis'}
          {dayInfo.rank === 4 && 'IV classis'}
        </Text>
        <Text style={[
          styles.season, 
          { 
            fontSize: dynamicStyles.fontSize.season,
            color: theme.colors.textSecondary
          }
        ]}>
          {dayInfo.season}
        </Text>
      </View>
    );
  } else {
    // Text content rendering
    const { latin, english, isRubric = false, isResponse = false } = props;
    
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <Text style={[
          styles.latinText,
          { 
            fontSize: dynamicStyles.fontSize.latinText,
            lineHeight: dynamicStyles.fontSize.latinText * dynamicStyles.spacing.lineHeight,
            marginBottom: dynamicStyles.spacing.paragraphSpacing,
            color: theme.colors.text
          },
          isRubric && [styles.rubric, { color: '#990000' }],
          isResponse && styles.response
        ]}>
          {latin}
        </Text>
        <Text style={[
          styles.englishText,
          { 
            fontSize: dynamicStyles.fontSize.englishText,
            lineHeight: dynamicStyles.fontSize.englishText * dynamicStyles.spacing.lineHeight,
            color: theme.colors.textSecondary
          },
          isRubric && [styles.rubric, { color: '#990000' }],
          isResponse && styles.response
        ]}>
          {english}
        </Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  // Day info styles
  celebration: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  latinName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 5,
  },
  classRank: {
    fontSize: 14,
    color: '#888',
    marginBottom: 3,
  },
  season: {
    fontSize: 14,
    color: '#888',
  },
  // Text content styles
  latinText: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  englishText: {
    fontSize: 14,
    color: '#444',
  },
  rubric: {
    color: '#990000',
    fontStyle: 'normal',
  },
  response: {
    fontWeight: 'bold',
  },
});
