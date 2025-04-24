# SQLite Implementation Plan for SanctissiMissa

This document outlines the plan for implementing SQLite as the data storage solution for the SanctissiMissa web application.

## Background

Currently, the application uses IndexedDB for data storage and requires a runtime import process to populate the database with liturgical data from reference files. This approach has several drawbacks:

1. It requires reference files to be available at runtime
2. The import process can be slow and may fail if reference files are missing or inaccessible
3. It adds complexity to the application startup process
4. It requires error handling and retry mechanisms for failed imports

## Proposed Solution

We will switch to SQLite for data storage and package a pre-populated SQLite database with the application. This approach has several advantages:

1. Eliminates the need for runtime data import
2. Eliminates the dependency on reference files at runtime
3. Provides a more robust and reliable data storage solution
4. Potentially improves performance for data access
5. Simplifies the application startup process

## Implementation Plan

### 1. Add SQLite Dependencies

```bash
cd web-app
npm install sql.js
npm install @types/sql.js --save-dev
```

[sql.js](https://github.com/sql-js/sql.js/) is a JavaScript SQL database engine that uses WebAssembly to run SQLite in the browser.

### 2. Create SQLite Database Schema

Create a schema that matches our data model:

```sql
-- Liturgical days
CREATE TABLE liturgical_days (
  date TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  celebration TEXT NOT NULL,
  rank INTEGER NOT NULL,
  color TEXT NOT NULL,
  is_holy_day BOOLEAN NOT NULL DEFAULT 0,
  is_feast_day BOOLEAN NOT NULL DEFAULT 0,
  mass_proper TEXT
);

-- Mass texts
CREATE TABLE mass_texts (
  id TEXT PRIMARY KEY,
  part TEXT NOT NULL,
  title_latin TEXT,
  title_english TEXT,
  introit_latin TEXT,
  introit_english TEXT,
  introit_reference TEXT,
  collect_latin TEXT,
  collect_english TEXT,
  epistle_latin TEXT,
  epistle_english TEXT,
  epistle_reference TEXT,
  gradual_latin TEXT,
  gradual_english TEXT,
  sequence_latin TEXT,
  sequence_english TEXT,
  sequence_rubric TEXT,
  gospel_latin TEXT,
  gospel_english TEXT,
  gospel_reference TEXT,
  offertory_latin TEXT,
  offertory_english TEXT,
  offertory_reference TEXT,
  secret_latin TEXT,
  secret_english TEXT,
  communion_latin TEXT,
  communion_english TEXT,
  communion_reference TEXT,
  postcommunion_latin TEXT,
  postcommunion_english TEXT
);

-- Office texts
CREATE TABLE office_texts (
  id TEXT PRIMARY KEY,
  hour TEXT NOT NULL,
  title_latin TEXT,
  title_english TEXT,
  hymn_latin TEXT,
  hymn_english TEXT,
  chapter_latin TEXT,
  chapter_english TEXT,
  chapter_reference TEXT,
  prayer_latin TEXT,
  prayer_english TEXT
);

-- Psalms
CREATE TABLE psalms (
  id TEXT PRIMARY KEY,
  office_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  title_latin TEXT,
  title_english TEXT,
  text_latin TEXT,
  text_english TEXT,
  FOREIGN KEY (office_id) REFERENCES office_texts(id)
);

-- Readings
CREATE TABLE readings (
  id TEXT PRIMARY KEY,
  office_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  text_latin TEXT,
  text_english TEXT,
  FOREIGN KEY (office_id) REFERENCES office_texts(id)
);

-- Journal entries
CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  position_x REAL,
  position_y REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Journal entry tags
CREATE TABLE journal_entry_tags (
  entry_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag),
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id)
);
```

### 3. Create Import Script

Create a Node.js script that:

1. Creates a new SQLite database
2. Imports liturgical data from reference files
3. Saves the populated database as a file

This script will be run during the build process to generate the pre-populated database.

### 4. Implement SQLite Data Access Service

Create a service that:

1. Loads the pre-populated SQLite database
2. Provides methods for querying and updating data
3. Handles database initialization and error recovery

### 5. Update Application to Use SQLite

Update all components that currently use IndexedDB to use the new SQLite data access service instead.

### 6. Package Pre-populated SQLite Database

Update the build process to:

1. Run the import script to generate the pre-populated database
2. Include the database file in the build output
3. Configure the application to load the database file at startup

### 7. Testing and Verification

1. Test the SQLite implementation with various data sets
2. Verify that all application features work correctly with SQLite
3. Measure performance compared to the IndexedDB implementation
4. Test the application on various browsers and devices

## Timeline

- Day 1: Add dependencies, create schema, and implement import script
- Day 2: Implement data access service and update application
- Day 3: Package database with application and test
- Day 4: Fix any issues and finalize implementation

## Resources

- [sql.js Documentation](https://github.com/sql-js/sql.js/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [WebAssembly Documentation](https://webassembly.org/docs/)
