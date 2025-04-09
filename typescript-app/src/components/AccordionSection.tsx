import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { LiturgicalText } from './LiturgicalText';
import { glossary } from '../services/glossary';

interface Props {
  title: string;
  latin: string;
  english: string;
  isExpanded: boolean;
  isRubric?: boolean;
  isResponse?: boolean;
  onPress: () => void;
}

const AccordionSection: React.FC<Props> = ({
  title,
  latin,
  english,
  isExpanded,
  isRubric = false,
  isResponse = false,
  onPress,
}) => {
  const theme = useAppTheme();

  React.useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isExpanded]);

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.content}>
          <LiturgicalText
            latin={latin}
            english={english}
            isRubric={isRubric}
            isResponse={isResponse}
            glossary={Object.fromEntries(
              glossary.getAllTerms().map(term => [
                term,
                glossary.getDefinition(term) || '',
              ])
            )}
            pronunciation={Object.fromEntries(
              glossary.getAllTerms().map(term => [
                term,
                glossary.getPronunciation(term) || '',
              ])
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
});

export default AccordionSection;