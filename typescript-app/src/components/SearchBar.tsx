import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Text,
  ActivityIndicator,
  Keyboard,
  ListRenderItemInfo,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSearch } from '../contexts/SearchContext';
import { LiturgicalText } from './LiturgicalText';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

type SearchBarNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SearchResultProps {
  type: 'text' | 'term';
  title: string;
  latin?: string;
  english?: string;
  definition?: string;
  section?: string;
  date?: string;
}

const DEBOUNCE_MS = 300;

export const SearchBar: React.FC = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<SearchBarNavigationProp>();
  const { query, results, isSearching, searchText, clearSearch } = useSearch();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const [localQuery, setLocalQuery] = useState('');
  const deviceInfo = useDeviceInfo();
  const { width } = useWindowDimensions();

  // Calculate adaptive styles based on device fold state
  const getFontSizeMultiplier = () => {
    if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
      return 1.2; // 20% larger on unfolded displays
    }
    return 1.0;
  };

  const getModalWidth = () => {
    if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
      // Use a narrower modal on unfolded devices for better readability
      return width * 0.8;
    }
    return width;
  };

  // Dynamic styles based on device fold state
  const dynamicStyles = {
    container: {
      padding: deviceInfo.isUnfolded ? 20 : 16,
    },
    searchBar: {
      padding: deviceInfo.isUnfolded ? 16 : 12,
      borderRadius: deviceInfo.isUnfolded ? 12 : 8,
    },
    modalContent: {
      width: getModalWidth(),
      alignSelf: 'center' as const, // Type assertion to fix TypeScript error
    },
    searchHeader: {
      padding: deviceInfo.isUnfolded ? 20 : 16,
      gap: deviceInfo.isUnfolded ? 16 : 12,
    },
    fontSize: {
      placeholder: 16 * getFontSizeMultiplier(),
      input: 16 * getFontSizeMultiplier(),
      resultTitle: 16 * getFontSizeMultiplier(),
      resultDefinition: 14 * getFontSizeMultiplier(),
      resultDate: 12 * getFontSizeMultiplier(),
      noResultsText: 16 * getFontSizeMultiplier(),
    },
    iconSize: deviceInfo.isUnfolded ? 28 : 24,
    touchableArea: deviceInfo.isUnfolded ? 48 : 40,
    resultItem: {
      padding: deviceInfo.isUnfolded ? 20 : 16,
      marginBottom: deviceInfo.isUnfolded ? 12 : 8,
      borderRadius: deviceInfo.isUnfolded ? 12 : 8,
    }
  };

  const handleSearch = useCallback((text: string) => {
    setLocalQuery(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchText(text);
    }, DEBOUNCE_MS);
  }, [searchText]);

  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
  };

  const handleResultPress = (result: SearchResultProps) => {
    if (result.type === 'text' && result.date && result.section) {
      // Navigate to the specific text
      if (result.section.toLowerCase() === 'mass') {
        navigation.navigate('Mass', { date: result.date });
      } else {
        navigation.navigate('Office', { type: result.section, date: result.date });
      }
    }
    setIsModalVisible(false);
    Keyboard.dismiss();
  };

  const renderSearchResult = ({ item }: ListRenderItemInfo<SearchResultProps>) => (
    <TouchableOpacity
      style={[
        styles.resultItem, 
        dynamicStyles.resultItem,
        { backgroundColor: theme.colors.surface }
      ]}
      onPress={() => handleResultPress(item)}
    >
      <Text style={[
        styles.resultTitle, 
        { 
          color: theme.colors.text,
          fontSize: dynamicStyles.fontSize.resultTitle 
        }
      ]}>
        {item.title}
      </Text>
      {item.type === 'term' && item.definition && (
        <Text style={[
          styles.resultDefinition, 
          { 
            color: theme.colors.textSecondary,
            fontSize: dynamicStyles.fontSize.resultDefinition 
          }
        ]}>
          {item.definition}
        </Text>
      )}
      {item.type === 'text' && item.latin && item.english && (
        <View style={styles.textPreview}>
          <LiturgicalText
            latin={item.latin}
            english={item.english}
            isRubric={false}
            isResponse={false}
          />
        </View>
      )}
      {item.date && (
        <Text style={[
          styles.resultDate, 
          { 
            color: theme.colors.textSecondary,
            fontSize: dynamicStyles.fontSize.resultDate 
          }
        ]}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Adjust the number of columns based on fold state
  const getNumColumns = () => {
    if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
      return 2; // Use two columns for results in unfolded mode
    }
    return 1; // Single column in folded mode
  };

  // Calculate key extractor with column count in mind
  const keyExtractor = (item: SearchResultProps, index: number) => 
    `${item.type}-${item.title}-${index}`;

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <TouchableOpacity
        style={[
          styles.searchBar, 
          dynamicStyles.searchBar,
          { backgroundColor: theme.colors.surface }
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons 
          name="search" 
          size={deviceInfo.isUnfolded ? 24 : 20} 
          color={theme.colors.text} 
        />
        <Text style={[
          styles.placeholder, 
          { 
            color: theme.colors.textSecondary,
            fontSize: dynamicStyles.fontSize.placeholder 
          }
        ]}>
          Search texts and terms...
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.background,
            width: getModalWidth(),
            alignSelf: 'center' as const
          }
        ]}>
          <View style={[
            styles.searchHeader, 
            dynamicStyles.searchHeader,
            { backgroundColor: theme.colors.surface }
          ]}>
            <TouchableOpacity 
              style={{
                width: dynamicStyles.touchableArea,
                height: dynamicStyles.touchableArea,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons
                name="arrow-back"
                size={dynamicStyles.iconSize}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.input, 
                { 
                  color: theme.colors.text,
                  fontSize: dynamicStyles.fontSize.input,
                  padding: deviceInfo.isUnfolded ? 12 : 8,
                }
              ]}
              placeholder="Search texts and terms..."
              placeholderTextColor={theme.colors.textSecondary}
              value={localQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {localQuery ? (
              <TouchableOpacity 
                style={{
                  width: dynamicStyles.touchableArea,
                  height: dynamicStyles.touchableArea,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleClear}
              >
                <Ionicons 
                  name="close-circle" 
                  size={dynamicStyles.iconSize} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {isSearching ? (
            <ActivityIndicator 
              style={styles.loading} 
              size={deviceInfo.isUnfolded ? "large" : "small"}
              color={theme.colors.primary} 
            />
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={renderSearchResult}
              keyExtractor={keyExtractor}
              contentContainerStyle={[
                styles.resultsList,
                { padding: deviceInfo.isUnfolded ? 20 : 16 }
              ]}
              key={deviceInfo.isUnfolded ? 'two-column' : 'one-column'}
              numColumns={getNumColumns()}
              columnWrapperStyle={getNumColumns() > 1 ? { justifyContent: 'space-between' } : undefined}
            />
          ) : localQuery ? (
            <View style={styles.noResults}>
              <Text style={[
                styles.noResultsText, 
                { 
                  color: theme.colors.textSecondary,
                  fontSize: dynamicStyles.fontSize.noResultsText 
                }
              ]}>
                No results found
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  placeholder: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  loading: {
    padding: 20,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultDefinition: {
    fontSize: 14,
    marginBottom: 8,
  },
  textPreview: {
    marginVertical: 8,
  },
  resultDate: {
    fontSize: 12,
    marginTop: 4,
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
  },
});