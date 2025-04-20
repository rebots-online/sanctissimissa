# Database Implementation Guide for SanctissiMissa

This guide provides detailed instructions for implementing the database layer of the SanctissiMissa web application.

## Overview

The application uses IndexedDB for client-side storage, with the `idb` library as a wrapper for easier interaction. The database schema is defined in TypeScript and includes stores for liturgical days, Mass texts, Divine Office texts, prayers, and user journal entries.

## Step 1: Database Schema Implementation

The database schema is defined in `web-app/src/services/database/db.ts`. This file should include:

1. TypeScript interfaces for the database schema
2. Functions for initializing and accessing the database
3. Error handling for database operations

```typescript
// web-app/src/services/database/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Database schema definition
 */
interface SanctissiMissaDB extends DBSchema {
  // Liturgical days store
  liturgical_days: {
    key: string; // ISO date string (YYYY-MM-DD)
    value: {
      date: string;
      season: string;
      celebration: string;
      rank: number;
      color: string;
      commemorations: string[];
      isHolyDay: boolean;
      isFeastDay: boolean;
    };
    indexes: {
      'by_season': string; // season
    };
  };
  
  // Mass texts store
  mass_texts: {
    key: string; // ID format: date_part (e.g., 2025-04-20_introit)
    value: {
      id: string;
      date: string;
      part: string; // introit, collect, epistle, gospel, etc.
      latin: string;
      english: string;
      rubrics?: string;
      notes?: string;
    };
    indexes: {
      'by_date': string; // date
      'by_part': string; // part
    };
  };
  
  // Office texts store
  office_texts: {
    key: string; // ID format: date_hour_part (e.g., 2025-04-20_vespers_magnificat)
    value: {
      id: string;
      date: string;
      hour: string; // matins, lauds, prime, terce, sext, none, vespers, compline
      part: string; // psalm, antiphon, reading, etc.
      latin: string;
      english: string;
      rubrics?: string;
      notes?: string;
    };
    indexes: {
      'by_date': string; // date
      'by_hour': string; // hour
      'by_date_hour': [string, string]; // [date, hour]
    };
  };
  
  // Prayers store
  prayers: {
    key: string; // ID of the prayer
    value: {
      id: string;
      name: string;
      category: string; // rosary, divine_mercy, stations, etc.
      latin: string;
      english: string;
      notes?: string;
    };
    indexes: {
      'by_category': string; // category
    };
  };
  
  // User journal entries store
  journal_entries: {
    key: string; // ID of the entry (UUID)
    value: {
      id: string;
      date: string;
      title: string;
      textReference?: {
        type: 'mass' | 'office' | 'prayer';
        id: string;
      };
      audioBlob?: Blob;
      transcription?: string;
      tags: string[];
      createdAt: number; // timestamp
      updatedAt: number; // timestamp
    };
    indexes: {
      'by_date': string; // date
      'by_reference': [string, string]; // [type, id]
      'by_tag': string; // tag
    };
  };
}

// Database name and version
const DB_NAME = 'sanctissimissa-db';
const DB_VERSION = 1;

// Database instance
let db: IDBPDatabase<SanctissiMissaDB> | null = null;

/**
 * Initialize the database
 * 
 * @returns Promise resolving to the database instance
 */
export async function initDatabase(): Promise<IDBPDatabase<SanctissiMissaDB>> {
  if (db) return db;
  
  db = await openDB<SanctissiMissaDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create object stores if they don't exist
      if (oldVersion < 1) {
        // Liturgical days store
        const liturgicalDaysStore = db.createObjectStore('liturgical_days', { keyPath: 'date' });
        liturgicalDaysStore.createIndex('by_season', 'season');
        
        // Mass texts store
        const massTextsStore = db.createObjectStore('mass_texts', { keyPath: 'id' });
        massTextsStore.createIndex('by_date', 'date');
        massTextsStore.createIndex('by_part', 'part');
        
        // Office texts store
        const officeTextsStore = db.createObjectStore('office_texts', { keyPath: 'id' });
        officeTextsStore.createIndex('by_date', 'date');
        officeTextsStore.createIndex('by_hour', 'hour');
        officeTextsStore.createIndex('by_date_hour', ['date', 'hour']);
        
        // Prayers store
        const prayersStore = db.createObjectStore('prayers', { keyPath: 'id' });
        prayersStore.createIndex('by_category', 'category');
        
        // Journal entries store
        const journalEntriesStore = db.createObjectStore('journal_entries', { keyPath: 'id' });
        journalEntriesStore.createIndex('by_date', 'date');
        journalEntriesStore.createIndex('by_reference', ['textReference.type', 'textReference.id']);
        journalEntriesStore.createIndex('by_tag', 'tags', { multiEntry: true });
      }
    }
  });
  
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get the database instance
 * 
 * @returns Promise resolving to the database instance
 */
export async function getDatabase(): Promise<IDBPDatabase<SanctissiMissaDB>> {
  if (!db) {
    return initDatabase();
  }
  return db;
}
```

## Step 2: Data Access Layer Implementation

Create a data access layer for each store in the database. These files should be placed in the `web-app/src/services/database/` directory.

### Liturgical Days Data Access

```typescript
// web-app/src/services/database/liturgicalDaysDb.ts
import { getDatabase } from './db';

export interface LiturgicalDay {
  date: string;
  season: string;
  celebration: string;
  rank: number;
  color: string;
  commemorations: string[];
  isHolyDay: boolean;
  isFeastDay: boolean;
}

/**
 * Get a liturgical day by date
 * 
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Promise resolving to the liturgical day or undefined if not found
 */
export async function getLiturgicalDay(date: string): Promise<LiturgicalDay | undefined> {
  const db = await getDatabase();
  return db.get('liturgical_days', date);
}

/**
 * Get liturgical days by season
 * 
 * @param season Season name
 * @returns Promise resolving to an array of liturgical days
 */
export async function getLiturgicalDaysBySeason(season: string): Promise<LiturgicalDay[]> {
  const db = await getDatabase();
  return db.getAllFromIndex('liturgical_days', 'by_season', season);
}

/**
 * Add or update a liturgical day
 * 
 * @param liturgicalDay Liturgical day to add or update
 * @returns Promise resolving to the key of the added/updated liturgical day
 */
export async function saveLiturgicalDay(liturgicalDay: LiturgicalDay): Promise<string> {
  const db = await getDatabase();
  return db.put('liturgical_days', liturgicalDay);
}

/**
 * Delete a liturgical day
 * 
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Promise resolving when the liturgical day is deleted
 */
export async function deleteLiturgicalDay(date: string): Promise<void> {
  const db = await getDatabase();
  return db.delete('liturgical_days', date);
}
```

### Mass Texts Data Access

```typescript
// web-app/src/services/database/massTextsDb.ts
import { getDatabase } from './db';

export interface MassText {
  id: string;
  date: string;
  part: string;
  latin: string;
  english: string;
  rubrics?: string;
  notes?: string;
}

/**
 * Get a mass text by ID
 * 
 * @param id ID of the mass text
 * @returns Promise resolving to the mass text or undefined if not found
 */
export async function getMassText(id: string): Promise<MassText | undefined> {
  const db = await getDatabase();
  return db.get('mass_texts', id);
}

/**
 * Get mass texts by date
 * 
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Promise resolving to an array of mass texts
 */
export async function getMassTextsByDate(date: string): Promise<MassText[]> {
  const db = await getDatabase();
  return db.getAllFromIndex('mass_texts', 'by_date', date);
}

/**
 * Get mass texts by part
 * 
 * @param part Part name (e.g., 'introit', 'collect', etc.)
 * @returns Promise resolving to an array of mass texts
 */
export async function getMassTextsByPart(part: string): Promise<MassText[]> {
  const db = await getDatabase();
  return db.getAllFromIndex('mass_texts', 'by_part', part);
}

/**
 * Add or update a mass text
 * 
 * @param massText Mass text to add or update
 * @returns Promise resolving to the key of the added/updated mass text
 */
export async function saveMassText(massText: MassText): Promise<string> {
  const db = await getDatabase();
  return db.put('mass_texts', massText);
}

/**
 * Delete a mass text
 * 
 * @param id ID of the mass text
 * @returns Promise resolving when the mass text is deleted
 */
export async function deleteMassText(id: string): Promise<void> {
  const db = await getDatabase();
  return db.delete('mass_texts', id);
}
```

## Step 3: Data Import Service Implementation

Create a service for importing liturgical data into the database. This service should handle fetching data from external sources (JSON files, APIs, etc.) and storing it in the database.

```typescript
// web-app/src/services/import/dataImport.ts
import { saveLiturgicalDay, LiturgicalDay } from '../database/liturgicalDaysDb';
import { saveMassText, MassText } from '../database/massTextsDb';
// Import other data access functions as needed

/**
 * Import liturgical days data
 * 
 * @param data Array of liturgical days to import
 * @returns Promise resolving when all data is imported
 */
export async function importLiturgicalDays(data: LiturgicalDay[]): Promise<void> {
  for (const liturgicalDay of data) {
    await saveLiturgicalDay(liturgicalDay);
  }
}

/**
 * Import mass texts data
 * 
 * @param data Array of mass texts to import
 * @returns Promise resolving when all data is imported
 */
export async function importMassTexts(data: MassText[]): Promise<void> {
  for (const massText of data) {
    await saveMassText(massText);
  }
}

/**
 * Import data from a JSON file
 * 
 * @param url URL of the JSON file
 * @param importFunction Function to use for importing the data
 * @returns Promise resolving when the data is imported
 */
export async function importDataFromJson<T>(url: string, importFunction: (data: T[]) => Promise<void>): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
    }
    
    const data = await response.json();
    await importFunction(data);
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

/**
 * Import all liturgical data
 * 
 * @returns Promise resolving when all data is imported
 */
export async function importAllData(): Promise<void> {
  try {
    // Import liturgical days
    await importDataFromJson<LiturgicalDay>('/data/liturgical-days.json', importLiturgicalDays);
    
    // Import mass texts
    await importDataFromJson<MassText>('/data/mass-texts.json', importMassTexts);
    
    // Import other data as needed
    
    console.log('All data imported successfully');
  } catch (error) {
    console.error('Error importing all data:', error);
    throw error;
  }
}
```

## Step 4: Database Initialization in the Application

Initialize the database when the application starts by adding the following code to the `web-app/src/main.tsx` file:

```typescript
// web-app/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initDatabase } from './services/database/db';

// Initialize the database
initDatabase().then(() => {
  console.log('Database initialized');
}).catch((error) => {
  console.error('Error initializing database:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Step 5: Create Sample Data Files

Create sample JSON files for testing the data import functionality. These files should be placed in the `web-app/public/data/` directory.

### Sample Liturgical Days Data

```json
// web-app/public/data/liturgical-days.json
[
  {
    "date": "2025-04-20",
    "season": "Easter",
    "celebration": "Easter Sunday",
    "rank": 1,
    "color": "white",
    "commemorations": [],
    "isHolyDay": true,
    "isFeastDay": true
  },
  {
    "date": "2025-04-21",
    "season": "Easter",
    "celebration": "Easter Monday",
    "rank": 2,
    "color": "white",
    "commemorations": [],
    "isHolyDay": false,
    "isFeastDay": true
  }
]
```

### Sample Mass Texts Data

```json
// web-app/public/data/mass-texts.json
[
  {
    "id": "2025-04-20_introit",
    "date": "2025-04-20",
    "part": "introit",
    "latin": "Resurrexi, et adhuc tecum sum, alleluia: posuisti super me manum tuam, alleluia: mirabilis facta est scientia tua, alleluia, alleluia.",
    "english": "I am risen, and I am always with you, alleluia; you have placed your hand upon me, alleluia; your wisdom has been shown to be most wonderful, alleluia, alleluia.",
    "rubrics": "The priest approaches the altar and makes the sign of the cross."
  },
  {
    "id": "2025-04-20_collect",
    "date": "2025-04-20",
    "part": "collect",
    "latin": "Deus, qui hodierna die per Unigenitum tuum aeternitatis nobis aditum, devicta morte, reserasti: vota nostra, quae praeveniendo aspiras, etiam adjuvando prosequere.",
    "english": "O God, who on this day, through your Only Begotten Son, have conquered death and unlocked for us the path to eternity, grant, we pray, that we who keep the solemnity of the Lord's Resurrection may, through the renewal brought by your Spirit, rise up in the light of life.",
    "rubrics": "The priest extends his hands and says the collect."
  }
]
```

## Step 6: Testing the Database Implementation

Create a simple component for testing the database implementation:

```typescript
// web-app/src/components/database/DatabaseTest.tsx
import React, { useState, useEffect } from 'react';
import { initDatabase } from '../../services/database/db';
import { getLiturgicalDay } from '../../services/database/liturgicalDaysDb';
import { getMassTextsByDate } from '../../services/database/massTextsDb';
import { importAllData } from '../../services/import/dataImport';

const DatabaseTest: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  const [imported, setImported] = useState(false);
  const [liturgicalDay, setLiturgicalDay] = useState<any>(null);
  const [massTexts, setMassTexts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the database
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setInitialized(true);
      } catch (error) {
        setError(`Error initializing database: ${error}`);
      }
    };
    
    init();
  }, []);
  
  // Import data
  const handleImport = async () => {
    try {
      await importAllData();
      setImported(true);
    } catch (error) {
      setError(`Error importing data: ${error}`);
    }
  };
  
  // Test retrieving data
  const handleTest = async () => {
    try {
      const day = await getLiturgicalDay('2025-04-20');
      setLiturgicalDay(day);
      
      const texts = await getMassTextsByDate('2025-04-20');
      setMassTexts(texts);
    } catch (error) {
      setError(`Error retrieving data: ${error}`);
    }
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Database Test</h2>
      
      <div className="mb-4">
        <p>Database initialized: {initialized ? 'Yes' : 'No'}</p>
        <p>Data imported: {imported ? 'Yes' : 'No'}</p>
      </div>
      
      <div className="mb-4">
        <button 
          onClick={handleImport}
          className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
          disabled={!initialized || imported}
        >
          Import Data
        </button>
        
        <button 
          onClick={handleTest}
          className="px-4 py-2 bg-green-500 text-white rounded"
          disabled={!imported}
        >
          Test Retrieval
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded mb-4">
          {error}
        </div>
      )}
      
      {liturgicalDay && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Liturgical Day</h3>
          <pre className="p-4 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(liturgicalDay, null, 2)}
          </pre>
        </div>
      )}
      
      {massTexts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Mass Texts</h3>
          <pre className="p-4 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(massTexts, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;
```

Add a route for the database test component in `web-app/src/App.tsx`:

```tsx
// Add to the imports
import DatabaseTest from './components/database/DatabaseTest';

// Add to the routes
<Route path="/database-test" element={<DatabaseTest />} />
```

## Next Steps

After implementing the database layer, the next steps are:

1. Create the Mass texts display component
2. Create the Divine Office texts display component
3. Implement the prayer texts component
4. Add user journal functionality

These components will use the database services to retrieve and display the liturgical texts and allow users to interact with them.
