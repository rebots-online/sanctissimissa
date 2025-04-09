import React, { createContext, useContext, useState, useCallback } from 'react';
import { dataManager } from '../services/dataManager';
import { glossary } from '../services/glossary';

interface SearchResult {
  type: 'text' | 'term';
  title: string;
  latin?: string;
  english?: string;
  definition?: string;
  section?: string;
  date?: string;
}

interface SearchContextData {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  searchText: (query: string) => Promise<void>;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextData>({
  query: '',
  results: [],
  isSearching: false,
  searchText: async () => {},
  clearSearch: () => {},
});

export const useSearch = () => useContext(SearchContext);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchText = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setQuery('');
      setResults([]);
      return;
    }

    setQuery(searchQuery);
    setIsSearching(true);

    try {
      // Search glossary terms
      const termResults: SearchResult[] = glossary
        .searchTerms(searchQuery)
        .map(term => {
          const entry = glossary.getEntry(term);
          return {
            type: 'term',
            title: term,
            definition: entry?.definition,
          };
        });

      // Search liturgical texts
      // TODO: Implement full-text search in SQLite
      // For now, just search prerendered content
      const today = new Date();
      const prerenderedResults: SearchResult[] = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateString = date.toISOString().split('T')[0];

        const dayInfo = await dataManager.getDayInfo(dateString);
        const massProper = await dataManager.getMassProper(dateString);
        const officeHours = ['lauds', 'prime', 'terce', 'sext', 'none', 'vespers', 'compline'];

        // Search mass texts
        Object.entries(massProper).forEach(([part, text]) => {
          if (
            text.latin.toLowerCase().includes(searchQuery.toLowerCase()) ||
            text.english.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            prerenderedResults.push({
              type: 'text',
              title: `${dayInfo.celebration || 'Mass'} - ${part}`,
              latin: text.latin,
              english: text.english,
              section: 'Mass',
              date: dateString,
            });
          }
        });

        // Search office texts
        for (const hour of officeHours) {
          const officeTexts = await dataManager.getOfficeHour(hour, dateString);
          
          // Search each part of the office hour
          Object.entries(officeTexts).forEach(([part, text]) => {
            if (Array.isArray(text)) {
              // Handle arrays (antiphons, psalms)
              text.forEach((item, index) => {
                if (
                  item.latin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.english.toLowerCase().includes(searchQuery.toLowerCase())
                ) {
                  prerenderedResults.push({
                    type: 'text',
                    title: `${dayInfo.celebration || hour} - ${part} ${index + 1}`,
                    latin: item.latin,
                    english: item.english,
                    section: hour,
                    date: dateString,
                  });
                }
              });
            } else if (text) {
              // Handle single texts
              if (
                text.latin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                text.english.toLowerCase().includes(searchQuery.toLowerCase())
              ) {
                prerenderedResults.push({
                  type: 'text',
                  title: `${dayInfo.celebration || hour} - ${part}`,
                  latin: text.latin,
                  english: text.english,
                  section: hour,
                  date: dateString,
                });
              }
            }
          });
        }
      }

      setResults([...termResults, ...prerenderedResults]);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        query,
        results,
        isSearching,
        searchText,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};