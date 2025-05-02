# Sanctissimissa: St. Android's Missal & Breviary - Database Schema

This document outlines the database schema for the Sanctissimissa application, designed to be compatible with both SQLite (for native platforms) and IndexedDB (for web platforms).

## Core Tables

### 1. calendar_days

Stores information about each day in the liturgical calendar.

```sql
CREATE TABLE IF NOT EXISTS calendar_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- Format: YYYY-MM-DD
  season TEXT NOT NULL,              -- Liturgical season (e.g., 'advent', 'lent')
  celebration TEXT,                  -- Name of the feast or celebration
  rank INTEGER NOT NULL,             -- Liturgical rank (1-4, with 1 being highest)
  color TEXT NOT NULL,               -- Liturgical color (e.g., 'green', 'red')
  allows_vigil INTEGER NOT NULL,     -- Boolean (0/1) whether day allows vigil Mass
  commemorations TEXT,               -- JSON array of commemorations
  day_name TEXT,                     -- Latin name of the day
  UNIQUE(date)
);
```

### 2. mass_texts

Stores the texts for the Mass, with both Latin and English translations.

```sql
CREATE TABLE IF NOT EXISTS mass_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season TEXT NOT NULL,              -- Liturgical season
  celebration TEXT,                  -- Specific celebration or feast
  part TEXT NOT NULL,                -- Part of the Mass (e.g., 'introit', 'collect')
  latin TEXT NOT NULL,               -- Latin text
  english TEXT NOT NULL,             -- English translation
  is_rubric INTEGER DEFAULT 0,       -- Boolean (0/1) whether text is a rubric
  is_response INTEGER DEFAULT 0,     -- Boolean (0/1) whether text is a response
  UNIQUE(season, celebration, part)
);
```

### 3. office_texts

Stores the texts for the Divine Office hours.

```sql
CREATE TABLE IF NOT EXISTS office_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season TEXT NOT NULL,              -- Liturgical season
  celebration TEXT,                  -- Specific celebration or feast
  hour TEXT NOT NULL,                -- Office hour (e.g., 'matins', 'lauds')
  part TEXT NOT NULL,                -- Part of the hour (e.g., 'hymn', 'antiphon')
  latin TEXT NOT NULL,               -- Latin text
  english TEXT NOT NULL,             -- English translation
  is_rubric INTEGER DEFAULT 0,       -- Boolean (0/1) whether text is a rubric
  is_response INTEGER DEFAULT 0,     -- Boolean (0/1) whether text is a response
  sequence INTEGER DEFAULT 0,        -- Order within the hour
  UNIQUE(season, celebration, hour, part, sequence)
);
```

### 4. glossary

Stores definitions and pronunciations for Latin terms.

```sql
CREATE TABLE IF NOT EXISTS glossary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,                -- Latin term
  definition TEXT NOT NULL,          -- English definition
  pronunciation TEXT,                -- Pronunciation guide
  category TEXT NOT NULL,            -- Category (e.g., 'liturgical', 'theological')
  UNIQUE(term)
);
```

### 5. bookmarks

Stores user bookmarks for quick access.

```sql
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                -- Type ('mass' or 'office')
  date TEXT NOT NULL,                -- Format: YYYY-MM-DD
  hour TEXT,                         -- Office hour (if type is 'office')
  title TEXT NOT NULL,               -- Display title
  created_at TEXT NOT NULL,          -- Creation timestamp
  UNIQUE(type, date, hour)
);
```

### 6. settings

Stores user preferences and settings.

```sql
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,                 -- Setting key
  value TEXT NOT NULL,               -- Setting value
  UNIQUE(key)
);
```

## Supporting Tables

### 7. movable_feasts

Stores the dates of movable feasts for each year.

```sql
CREATE TABLE IF NOT EXISTS movable_feasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,             -- Calendar year
  feast_name TEXT NOT NULL,          -- Name of the feast (e.g., 'easter', 'ascension')
  date TEXT NOT NULL,                -- Format: YYYY-MM-DD
  UNIQUE(year, feast_name)
);
```

### 8. fixed_feasts

Stores information about fixed feasts in the liturgical calendar.

```sql
CREATE TABLE IF NOT EXISTS fixed_feasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,            -- Month (1-12)
  day INTEGER NOT NULL,              -- Day (1-31)
  celebration TEXT NOT NULL,         -- Name of the feast
  rank INTEGER NOT NULL,             -- Liturgical rank
  color TEXT NOT NULL,               -- Liturgical color
  UNIQUE(month, day, celebration)
);
```

### 9. voice_notes

Stores user voice notes and reflections.

```sql
CREATE TABLE IF NOT EXISTS voice_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- Format: YYYY-MM-DD
  type TEXT NOT NULL,                -- Type ('mass' or 'office')
  hour TEXT,                         -- Office hour (if type is 'office')
  title TEXT NOT NULL,               -- Note title
  file_path TEXT NOT NULL,           -- Path to audio file
  duration INTEGER NOT NULL,         -- Duration in seconds
  created_at TEXT NOT NULL,          -- Creation timestamp
  transcription TEXT                 -- Optional transcription
);
```

## Indexes

To optimize query performance, the following indexes should be created:

```sql
-- calendar_days indexes
CREATE INDEX IF NOT EXISTS idx_calendar_days_date ON calendar_days(date);
CREATE INDEX IF NOT EXISTS idx_calendar_days_season ON calendar_days(season);
CREATE INDEX IF NOT EXISTS idx_calendar_days_celebration ON calendar_days(celebration);

-- mass_texts indexes
CREATE INDEX IF NOT EXISTS idx_mass_texts_season ON mass_texts(season);
CREATE INDEX IF NOT EXISTS idx_mass_texts_celebration ON mass_texts(celebration);
CREATE INDEX IF NOT EXISTS idx_mass_texts_part ON mass_texts(part);

-- office_texts indexes
CREATE INDEX IF NOT EXISTS idx_office_texts_season ON office_texts(season);
CREATE INDEX IF NOT EXISTS idx_office_texts_celebration ON office_texts(celebration);
CREATE INDEX IF NOT EXISTS idx_office_texts_hour ON office_texts(hour);
CREATE INDEX IF NOT EXISTS idx_office_texts_part ON office_texts(part);

-- glossary indexes
CREATE INDEX IF NOT EXISTS idx_glossary_term ON glossary(term);
CREATE INDEX IF NOT EXISTS idx_glossary_category ON glossary(category);

-- bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON bookmarks(type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_date ON bookmarks(date);

-- voice_notes indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_date ON voice_notes(date);
CREATE INDEX IF NOT EXISTS idx_voice_notes_type ON voice_notes(type);
```

## Web Implementation Notes

For the web implementation using IndexedDB:

1. Each table will be implemented as an object store
2. Primary keys will use auto-increment
3. Indexes will be created to match the SQL indexes
4. Unique constraints will be implemented using unique indexes

Example IndexedDB initialization code:

```javascript
const request = indexedDB.open('sanctissimissa', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  
  // Create calendar_days store
  const calendarStore = db.createObjectStore('calendar_days', { keyPath: 'id', autoIncrement: true });
  calendarStore.createIndex('date', 'date', { unique: true });
  calendarStore.createIndex('season', 'season', { unique: false });
  calendarStore.createIndex('celebration', 'celebration', { unique: false });
  
  // Create mass_texts store
  const massTextsStore = db.createObjectStore('mass_texts', { keyPath: 'id', autoIncrement: true });
  massTextsStore.createIndex('season', 'season', { unique: false });
  massTextsStore.createIndex('celebration', 'celebration', { unique: false });
  massTextsStore.createIndex('part', 'part', { unique: false });
  massTextsStore.createIndex('unique_mass_text', ['season', 'celebration', 'part'], { unique: true });
  
  // Additional stores and indexes...
};
```

## Data Migration Strategy

To migrate data from the existing SQLite database to the new schema:

1. Extract data from the original database
2. Transform to match the new schema
3. Load into the new database

This process will be implemented in the `src/services/migration.ts` module, with platform-specific adapters for accessing the source data.
