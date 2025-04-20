# SanctissiMissa Architecture

## Overview

SanctissiMissa is a web-first implementation of a traditional Catholic liturgical app focusing on the Extraordinary Form. The application is built using modern web technologies and follows a component-based architecture.

## Technology Stack

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Client-side Storage**: IndexedDB (via idb library)
- **PWA Support**: Planned for offline functionality

## Project Structure

```
sanctissimissa/
├── web-app/                  # Web application root
│   ├── public/               # Static assets
│   ├── src/                  # Source code
│   │   ├── assets/           # Images, fonts, etc.
│   │   ├── components/       # React components
│   │   │   ├── calendar/     # Calendar-related components
│   │   │   ├── mass/         # Mass-related components
│   │   │   ├── office/       # Divine Office components
│   │   │   ├── prayers/      # Prayer components
│   │   │   └── shared/       # Shared/common components
│   │   ├── models/           # TypeScript interfaces/types
│   │   ├── pages/            # Page components
│   │   ├── services/         # Business logic and data services
│   │   │   ├── calendar/     # Calendar calculation services
│   │   │   ├── database/     # IndexedDB database services
│   │   │   ├── import/       # Data import services
│   │   │   └── audio/        # Audio recording services
│   │   ├── App.tsx           # Main application component
│   │   ├── main.tsx          # Application entry point
│   │   └── index.css         # Global styles
│   ├── package.json          # Dependencies and scripts
│   └── tsconfig.json         # TypeScript configuration
└── ARCHITECTURE.md           # This file
```

## Database Schema

The application uses IndexedDB for client-side storage with the following object stores:

### Liturgical Days Store

Stores information about liturgical days in the calendar.

```typescript
interface LiturgicalDay {
  date: string;            // ISO date string (YYYY-MM-DD)
  season: string;          // e.g., "Advent", "Lent", "Easter", etc.
  celebration: string;     // e.g., "Easter Sunday", "Ash Wednesday", etc.
  rank: number;            // Rank of the celebration (1-4)
  color: string;           // Liturgical color
  commemorations: string[]; // Additional commemorations
  isHolyDay: boolean;      // Whether it's a Holy Day of Obligation
  isFeastDay: boolean;     // Whether it's a Feast Day
}
```

### Mass Texts Store

Stores the texts for the Mass for each liturgical day.

```typescript
interface MassText {
  id: string;              // ID format: date_part (e.g., 2025-04-20_introit)
  date: string;            // ISO date string (YYYY-MM-DD)
  part: string;            // introit, collect, epistle, gospel, etc.
  latin: string;           // Latin text
  english: string;         // English translation
  rubrics?: string;        // Rubrics/instructions
  notes?: string;          // Additional notes
}
```

### Office Texts Store

Stores the texts for the Divine Office for each liturgical day.

```typescript
interface OfficeText {
  id: string;              // ID format: date_hour_part (e.g., 2025-04-20_vespers_magnificat)
  date: string;            // ISO date string (YYYY-MM-DD)
  hour: string;            // matins, lauds, prime, terce, sext, none, vespers, compline
  part: string;            // psalm, antiphon, reading, etc.
  latin: string;           // Latin text
  english: string;         // English translation
  rubrics?: string;        // Rubrics/instructions
  notes?: string;          // Additional notes
}
```

### Prayers Store

Stores various Catholic prayers.

```typescript
interface Prayer {
  id: string;              // ID of the prayer
  name: string;            // Name of the prayer
  category: string;        // rosary, divine_mercy, stations, etc.
  latin: string;           // Latin text
  english: string;         // English translation
  notes?: string;          // Additional notes
}
```

### Journal Entries Store

Stores user journal entries.

```typescript
interface JournalEntry {
  id: string;              // ID of the entry (UUID)
  date: string;            // ISO date string (YYYY-MM-DD)
  title: string;           // Title of the entry
  textReference?: {        // Reference to a liturgical text
    type: 'mass' | 'office' | 'prayer';
    id: string;            // ID of the referenced text
  };
  audioBlob?: Blob;        // Audio recording
  transcription?: string;  // Transcription of the audio
  tags: string[];          // Tags for categorization
  createdAt: number;       // Creation timestamp
  updatedAt: number;       // Last update timestamp
}
```

## Data Flow

1. **Calendar Calculation**:
   - Calculate liturgical days based on Easter date and other fixed dates
   - Store calculated days in the liturgical_days store

2. **Data Import**:
   - Import liturgical texts from JSON files or API
   - Store texts in the appropriate stores (mass_texts, office_texts, prayers)

3. **User Interface**:
   - Retrieve data from IndexedDB stores
   - Display data in the appropriate components
   - Allow user interaction (navigation, recording, etc.)

4. **User Data**:
   - Store user journal entries in the journal_entries store
   - Support audio recording and storage

## Implementation Plan

1. **Phase 1: Core Infrastructure**
   - Set up project structure and dependencies
   - Implement database schema and services
   - Create basic UI components and routing

2. **Phase 2: Liturgical Calendar**
   - Implement Easter date calculation
   - Calculate liturgical seasons and days
   - Create calendar UI

3. **Phase 3: Liturgical Texts**
   - Import and store Mass texts
   - Import and store Divine Office texts
   - Create text display components

4. **Phase 4: User Features**
   - Implement prayer texts
   - Add journal functionality
   - Add audio recording

5. **Phase 5: Enhancements**
   - Add offline support (PWA)
   - Implement settings and preferences
   - Add Altar Server resources

## Next Steps

The immediate next steps in the implementation are:

1. Complete the database service implementation
2. Create the data import service
3. Implement the Mass texts display component
4. Implement the Divine Office texts display component

## Technical Challenges

1. **Calendar Calculation**: Accurately calculating the liturgical calendar, especially for the Extraordinary Form which has different rules than the Ordinary Form.

2. **Data Storage**: Efficiently storing and retrieving liturgical texts while keeping the application responsive.

3. **Offline Support**: Ensuring all necessary data is available offline through proper caching strategies.

4. **Audio Recording**: Implementing browser-compatible audio recording with proper storage and playback.

5. **Multilingual Support**: Supporting both Latin and English texts with proper formatting and typography.
