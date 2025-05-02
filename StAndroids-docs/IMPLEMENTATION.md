# Sanctissimissa: St. Android's Missal & Breviary - Implementation Details

## 1. Key Component Implementation

### 1.1 Calendar Service

```typescript
// src/services/calendar.ts
import { LiturgicalDay, LiturgicalSeason } from '../types/liturgical';
import { addDays, parseISO, format } from 'date-fns';

export class LiturgicalCalendar {
  // Static data for Easter dates
  private static readonly EASTER_DATES: Record<number, string> = {
    2025: '2025-04-20',
    2026: '2026-04-05',
    // Additional years...
  };

  // Calculate movable feasts based on Easter
  private static calculateMovableFeasts(year: number): Record<string, string> {
    const easterDate = parseISO(this.EASTER_DATES[year]);
    
    return {
      septuagesima: format(addDays(easterDate, -63), 'yyyy-MM-dd'),
      ashWednesday: format(addDays(easterDate, -46), 'yyyy-MM-dd'),
      // Additional feasts...
    };
  }

  // Determine liturgical season for a given date
  private static determineSeason(date: string, movableFeasts: Record<string, string>): LiturgicalSeason {
    const dateObj = parseISO(date);
    // Season determination logic...
    return LiturgicalSeason.TEMPUS_PER_ANNUM; // Default
  }

  // Get information about a specific liturgical day
  public static getDayInfo(date: string): LiturgicalDay {
    const year = parseISO(date).getFullYear();
    const movableFeasts = this.calculateMovableFeasts(year);
    const season = this.determineSeason(date, movableFeasts);
    
    // Additional logic to determine celebration, rank, etc.
    
    return {
      date,
      season,
      rank: 3, // Default rank
      color: 'green', // Default color
      allowsVigil: false,
      commemorations: []
    };
  }
}
```

### 1.2 Storage Adapter Interface

```typescript
// src/platforms/storage-adapter.ts
import { IStorageService } from '../types/services';
import { Platform } from 'react-native';

// Factory function to create the appropriate storage implementation
export function createStorageService(): IStorageService {
  if (Platform.OS === 'web') {
    return new WebStorageService();
  } else {
    return new NativeStorageService();
  }
}

// Native implementation using SQLite
class NativeStorageService implements IStorageService {
  private db: any;
  
  async initialize(): Promise<void> {
    const SQLite = require('react-native-sqlite-storage');
    this.db = await SQLite.openDatabase({
      name: 'liturgical_texts.db',
      location: 'default'
    });
    await this.createTables();
  }
  
  async executeQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            sql, 
            params,
            (_: any, results: any) => {
              resolve(results);
            },
            (error: any) => {
              reject(error);
            }
          );
        }
      );
    });
  }
  
  private async createTables(): Promise<void> {
    // SQL statements to create tables
    // ...
  }
  
  // Additional methods...
}

// Web implementation using IndexedDB
class WebStorageService implements IStorageService {
  private db: IDBDatabase | null = null;
  
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('liturgical_texts', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Create object stores (tables)
        // ...
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }
  
  async executeQuery(sql: string, params: any[] = []): Promise<any> {
    // Parse SQL and execute equivalent IndexedDB operations
    // This is a simplified example - actual implementation would need SQL parsing
    // ...
  }
  
  // Additional methods...
}
```

### 1.3 App Entry Points

#### Native Entry Point

```typescript
// index.js
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

#### Web Entry Point

```typescript
// index.web.js
import { AppRegistry } from 'react-native';
import App from './src/App';

// Register the app
AppRegistry.registerComponent('Sanctissimissa', () => App);

// Initialize web app
AppRegistry.runApplication('Sanctissimissa', {
  rootTag: document.getElementById('root')
});
```

### 1.4 Main App Component

```typescript
// src/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './store';
import AppNavigator from './navigation';
import { createStorageService } from './platforms/storage-adapter';
import { DataManager } from './services/data-manager';

// Initialize services
const storageService = createStorageService();
const dataManager = new DataManager(storageService);

function App() {
  useEffect(() => {
    // Initialize data on app start
    const initializeApp = async () => {
      try {
        await dataManager.initialize();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
```

## 2. Type Definitions

### 2.1 Base Types

```typescript
// src/types/liturgical.ts
export interface LiturgicalDay {
  date: string;
  season: LiturgicalSeason;
  celebration?: string;
  rank: number;
  color: string;
  allowsVigil: boolean;
  commemorations: string[];
}

export enum LiturgicalSeason {
  ADVENT = 'advent',
  CHRISTMASTIDE = 'christmastide',
  EPIPHANYTIDE = 'epiphanytide',
  SEPTUAGESIMA = 'septuagesima',
  LENT = 'lent',
  PASSIONTIDE = 'passiontide',
  EASTERTIDE = 'eastertide',
  PENTECOST = 'pentecost',
  TEMPUS_PER_ANNUM = 'tempus_per_annum'
}

export interface BilingualText {
  latin: string;
  english: string;
  isRubric?: boolean;
  isResponse?: boolean;
}

export interface MassProper {
  introit: BilingualText;
  collect: BilingualText;
  epistle: BilingualText;
  gradual: BilingualText;
  alleluia?: BilingualText;
  tract?: BilingualText;
  gospel: BilingualText;
  offertory: BilingualText;
  secret: BilingualText;
  communion: BilingualText;
  postcommunion: BilingualText;
}

export interface OfficeHourProper {
  invitatory?: BilingualText;
  hymn: BilingualText;
  antiphons: BilingualText[];
  psalms: BilingualText[];
  lessons: BilingualText[];
  responsories: BilingualText[];
  prayers: BilingualText[];
}
```

### 2.2 Service Interfaces

```typescript
// src/types/services.ts
export interface IStorageService {
  initialize(): Promise<void>;
  executeQuery(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface IFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  listDirectory(path: string): Promise<string[]>;
  createDirectory(path: string): Promise<void>;
}

export interface IDeviceInfo {
  getDeviceType(): string;
  getScreenDimensions(): { width: number; height: number };
  isFoldable(): boolean;
  getFoldState(): 'folded' | 'unfolded' | 'unknown';
  getOrientation(): 'portrait' | 'landscape';
  getPlatform(): string;
}
```

## 3. Component Examples

### 3.1 Liturgical Text Component

```typescript
// src/components/LiturgicalText.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BilingualText } from '../types/liturgical';
import { useAppTheme } from '../hooks/useAppTheme';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

interface Props {
  text: BilingualText;
  onTermPress?: (term: string) => void;
}

export const LiturgicalText: React.FC<Props> = ({ text, onTermPress }) => {
  const theme = useAppTheme();
  const deviceInfo = useDeviceInfo();
  
  // Calculate adaptive styles based on device
  const getFontSize = () => {
    const baseFontSize = 16;
    if (deviceInfo.isFoldable() && deviceInfo.getFoldState() === 'unfolded') {
      return baseFontSize * 1.2; // 20% larger on unfolded devices
    }
    return baseFontSize;
  };
  
  // Handle term press for educational layer
  const handleTermPress = (term: string) => {
    if (onTermPress) {
      onTermPress(term);
    }
  };
  
  // Render Latin text with term detection
  const renderLatinText = () => {
    // Simple implementation - in a real app, would parse and detect terms
    return (
      <Text 
        style={[
          styles.latinText, 
          { 
            color: theme.colors.text,
            fontSize: getFontSize(),
            fontStyle: text.isRubric ? 'italic' : 'normal',
            fontWeight: text.isResponse ? 'bold' : 'normal'
          }
        ]}
      >
        {text.latin}
      </Text>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderLatinText()}
      <Text 
        style={[
          styles.englishText, 
          { 
            color: theme.colors.textSecondary,
            fontSize: getFontSize() * 0.9,
            fontStyle: text.isRubric ? 'italic' : 'normal',
            fontWeight: text.isResponse ? 'bold' : 'normal'
          }
        ]}
      >
        {text.english}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  latinText: {
    marginBottom: 4,
  },
  englishText: {
    marginBottom: 8,
  },
});
```

### 3.2 Home Screen Component

```typescript
// src/screens/HomeScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import { fetchCurrentDay } from '../store/slices/calendarSlice';
import { useAppTheme } from '../hooks/useAppTheme';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useAppTheme();
  const deviceInfo = useDeviceInfo();
  
  const { currentDay, loading, error } = useSelector((state) => state.calendar);
  
  useEffect(() => {
    dispatch(fetchCurrentDay());
  }, [dispatch]);
  
  const navigateToOffice = (hour: string) => {
    navigation.navigate('Office', { hour });
  };
  
  const navigateToMass = () => {
    navigation.navigate('Mass');
  };
  
  // Calculate adaptive styles based on device
  const getAdaptiveStyles = () => {
    const isUnfolded = deviceInfo.isFoldable() && deviceInfo.getFoldState() === 'unfolded';
    const isLandscape = deviceInfo.getOrientation() === 'landscape';
    
    return {
      container: {
        padding: isUnfolded ? 24 : 16,
      },
      grid: {
        flexDirection: (isUnfolded || isLandscape) ? 'row' : 'column',
        flexWrap: 'wrap',
      },
      gridItem: {
        width: (isUnfolded || isLandscape) ? '30%' : '100%',
        marginBottom: 16,
        marginRight: (isUnfolded || isLandscape) ? 16 : 0,
      },
    };
  };
  
  const adaptiveStyles = getAdaptiveStyles();
  
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>Error: {error}</Text>
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={adaptiveStyles.container}
    >
      <View style={styles.header}>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Text>
        <Text style={[styles.celebration, { color: theme.colors.text }]}>
          {currentDay?.celebration || 'Feria'}
        </Text>
        <Text style={[styles.season, { color: theme.colors.textSecondary }]}>
          {currentDay?.season.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          DIVINE OFFICE
        </Text>
        <View style={[styles.grid, adaptiveStyles.grid]}>
          {['Matins', 'Lauds', 'Prime', 'Terce', 'Sext', 'None', 'Vespers', 'Compline'].map((hour) => (
            <TouchableOpacity
              key={hour}
              style={[
                styles.gridItem, 
                adaptiveStyles.gridItem,
                { backgroundColor: theme.colors.surface }
              ]}
              onPress={() => navigateToOffice(hour)}
            >
              <Text style={[styles.gridItemText, { color: theme.colors.text }]}>
                {hour}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          HOLY MASS
        </Text>
        <TouchableOpacity
          style={[
            styles.massButton, 
            { backgroundColor: theme.colors.surface }
          ]}
          onPress={navigateToMass}
        >
          <Text style={[styles.massButtonText, { color: theme.colors.text }]}>
            Mass of the Day
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  date: {
    fontSize: 16,
    marginBottom: 4,
  },
  celebration: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  season: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'column',
  },
  gridItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  gridItemText: {
    fontSize: 16,
  },
  massButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  massButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

## 4. Redux Store Implementation

### 4.1 Store Configuration

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import calendarReducer from './slices/calendarSlice';
import textsReducer from './slices/textsSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    calendar: calendarReducer,
    texts: textsReducer,
    settings: settingsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 4.2 Calendar Slice Example

```typescript
// src/store/slices/calendarSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import { LiturgicalCalendar } from '../../services/calendar';
import { LiturgicalDay } from '../../types/liturgical';

interface CalendarState {
  currentDay: LiturgicalDay | null;
  selectedDate: string;
  loading: boolean;
  error: string | null;
}

const initialState: CalendarState = {
  currentDay: null,
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  loading: false,
  error: null,
};

export const fetchCurrentDay = createAsyncThunk(
  'calendar/fetchCurrentDay',
  async (_, { getState }) => {
    const { selectedDate } = (getState() as any).calendar;
    return LiturgicalCalendar.getDayInfo(selectedDate);
  }
);

export const selectDate = createAsyncThunk(
  'calendar/selectDate',
  async (date: string, { dispatch }) => {
    dispatch(setSelectedDate(date));
    return LiturgicalCalendar.getDayInfo(date);
  }
);

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentDay.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentDay.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDay = action.payload;
      })
      .addCase(fetchCurrentDay.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch day info';
      })
      .addCase(selectDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(selectDate.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDay = action.payload;
      })
      .addCase(selectDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to select date';
      });
  },
});

export const { setSelectedDate } = calendarSlice.actions;
export default calendarSlice.reducer;
```

## 5. Platform-Specific Adapters

### 5.1 Device Info Adapter

```typescript
// src/platforms/device-info-adapter.ts
import { Platform, Dimensions } from 'react-native';
import { IDeviceInfo } from '../types/services';

// Factory function to create the appropriate device info implementation
export function createDeviceInfoService(): IDeviceInfo {
  if (Platform.OS === 'web') {
    return new WebDeviceInfo();
  } else {
    return new NativeDeviceInfo();
  }
}

// Native implementation
class NativeDeviceInfo implements IDeviceInfo {
  private deviceInfo: any;
  
  constructor() {
    this.deviceInfo = require('react-native-device-info');
  }
  
  getDeviceType(): string {
    return this.deviceInfo.getDeviceType();
  }
  
  getScreenDimensions(): { width: number; height: number } {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  }
  
  isFoldable(): boolean {
    // This would need a more sophisticated implementation
    // based on device model detection
    const model = this.deviceInfo.getModel();
    return model.includes('Fold') || model.includes('Flip');
  }
  
  getFoldState(): 'folded' | 'unfolded' | 'unknown' {
    if (!this.isFoldable()) {
      return 'unknown';
    }
    
    // This would need a more sophisticated implementation
    // possibly using native modules to detect fold state
    const { width } = this.getScreenDimensions();
    return width > 700 ? 'unfolded' : 'folded';
  }
  
  getOrientation(): 'portrait' | 'landscape' {
    const { width, height } = this.getScreenDimensions();
    return width > height ? 'landscape' : 'portrait';
  }
  
  getPlatform(): string {
    return Platform.OS;
  }
}

// Web implementation
class WebDeviceInfo implements IDeviceInfo {
  getDeviceType(): string {
    // Use media queries to determine device type
    if (window.matchMedia('(max-width: 480px)').matches) {
      return 'phone';
    } else if (window.matchMedia('(max-width: 1024px)').matches) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
  
  getScreenDimensions(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  
  isFoldable(): boolean {
    // Check for foldable device APIs
    return 'screen' in window && 'foldingFeature' in (window as any).screen;
  }
  
  getFoldState(): 'folded' | 'unfolded' | 'unknown' {
    if (!this.isFoldable()) {
      return 'unknown';
    }
    
    // This would use the Window Segments API for foldables
    // Simplified implementation
    return 'unknown';
  }
  
  getOrientation(): 'portrait' | 'landscape' {
    const { width, height } = this.getScreenDimensions();
    return width > height ? 'landscape' : 'portrait';
  }
  
  getPlatform(): string {
    return 'web';
  }
}
```

### 5.2 File System Adapter

```typescript
// src/platforms/file-system-adapter.ts
import { Platform } from 'react-native';
import { IFileSystem } from '../types/services';

// Factory function to create the appropriate file system implementation
export function createFileSystemService(): IFileSystem {
  if (Platform.OS === 'web') {
    return new WebFileSystem();
  } else {
    return new NativeFileSystem();
  }
}

// Native implementation
class NativeFileSystem implements IFileSystem {
  private fs: any;
  
  constructor() {
    this.fs = require('react-native-fs');
  }
  
  async readFile(path: string): Promise<string> {
    return this.fs.readFile(path, 'utf8');
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    return this.fs.writeFile(path, content, 'utf8');
  }
  
  async deleteFile(path: string): Promise<void> {
    return this.fs.unlink(path);
  }
  
  async fileExists(path: string): Promise<boolean> {
    return this.fs.exists(path);
  }
  
  async listDirectory(path: string): Promise<string[]> {
    const items = await this.fs.readDir(path);
    return items.map(item => item.name);
  }
  
  async createDirectory(path: string): Promise<void> {
    return this.fs.mkdir(path);
  }
}

// Web implementation
class WebFileSystem implements IFileSystem {
  private storage: Storage;
  
  constructor() {
    this.storage = localStorage;
  }
  
  async readFile(path: string): Promise<string> {
    const content = this.storage.getItem(path);
    if (content === null) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    this.storage.setItem(path, content);
  }
  
  async deleteFile(path: string): Promise<void> {
    this.storage.removeItem(path);
  }
  
  async fileExists(path: string): Promise<boolean> {
    return this.storage.getItem(path) !== null;
  }
  
  async listDirectory(path: string): Promise<string[]> {
    const prefix = path.endsWith('/') ? path : `${path}/`;
    const files: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        files.push(key.substring(prefix.length));
      }
    }
    
    return files;
  }
  
  async createDirectory(path: string): Promise<void> {
    // No-op for web storage as directories are implicit
  }
}
```
