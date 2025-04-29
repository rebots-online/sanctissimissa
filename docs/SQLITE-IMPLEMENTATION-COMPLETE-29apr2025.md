# SQLite Implementation for SanctissiMissa

**Date:** April 29, 2025
**Author:** Roo

## Overview

This document describes the implementation of SQLite database support for the SanctissiMissa application. The implementation provides a consistent database interface that can be used across both web and mobile platforms.

## Architecture

The database implementation follows a layered architecture:

1. **Database Adapter Interface**: Defines a common interface for database operations
2. **SQLite Adapter**: Implements the database adapter interface for SQLite
3. **Database Service**: Provides a singleton instance of the database adapter
4. **Utility Functions**: Shared functions for database operations

### Key Components

- **DatabaseAdapter**: Interface that defines common database operations
- **SQLiteAdapter**: Implementation of the DatabaseAdapter interface for SQLite
- **Database Utilities**: Helper functions for database operations
  - Validators: Functions to validate data before database operations
  - Query Builders: Functions to generate SQL queries
  - Type Converters: Functions to convert between JavaScript and SQLite types
  - Formatters: Functions to format data for display

## Database Schema

The database schema includes the following tables:

1. **liturgical_days**: Stores information about liturgical days
   - id: Primary key
   - date: Date of the liturgical day
   - season: Liturgical season
   - celebration: Name of the celebration
   - rank: Rank of the celebration
   - color: Liturgical color

2. **mass_texts**: Stores texts for the Mass
   - id: Primary key
   - part: Part of the Mass
   - content: Text content
   - day_id: Foreign key to liturgical_days

3. **office_texts**: Stores texts for the Divine Office
   - id: Primary key
   - hour: Hour of the Divine Office
   - content: Text content
   - day_id: Foreign key to liturgical_days

4. **psalms**: Stores psalms for the Divine Office
   - id: Primary key
   - office_id: Foreign key to office_texts
   - number: Psalm number
   - content: Psalm text

5. **readings**: Stores readings for the Divine Office
   - id: Primary key
   - office_id: Foreign key to office_texts
   - number: Reading number
   - content: Reading text

6. **prayers**: Stores prayers
   - id: Primary key
   - category: Prayer category
   - title: Prayer title
   - content: Prayer text
   - latin_content: Latin version of the prayer

7. **journal_entries**: Stores user journal entries
   - id: Primary key
   - title: Entry title
   - content: Entry content
   - type: Entry type
   - date: Entry date
   - created_at: Creation timestamp
   - updated_at: Last update timestamp

## Implementation Details

### Database Adapter Interface

The DatabaseAdapter interface defines the following operations:

- **initialize()**: Initialize the database
- **query()**: Execute a SQL query
- **querySingle()**: Execute a SQL query and return a single result
- **execute()**: Execute a SQL statement that doesn't return results
- **beginTransaction()**: Begin a transaction
- **commitTransaction()**: Commit a transaction
- **rollbackTransaction()**: Rollback a transaction
- **close()**: Close the database connection
- **getAll()**: Get all records from a table
- **getById()**: Get a record by ID
- **insert()**: Insert a record
- **update()**: Update a record
- **delete()**: Delete a record
- **findBy()**: Find records by a field value

### SQLite Adapter

The SQLiteAdapter implements the DatabaseAdapter interface using the expo-sqlite library. It provides a consistent interface for database operations across platforms.

### Database Service

The database service provides a singleton instance of the SQLiteAdapter and handles database initialization.

### Utility Functions

The utility functions provide reusable functionality for database operations:

- **Validators**: Functions to validate data before database operations
- **Query Builders**: Functions to generate SQL queries
- **Type Converters**: Functions to convert between JavaScript and SQLite types
- **Formatters**: Functions to format data for display

## Usage Examples

### Initialize the Database

```typescript
import { initializeDatabase } from './services/database';

// Initialize the database
await initializeDatabase();
```

### Query Records

```typescript
import { databaseAdapter } from './services/database';

// Query all prayers
const prayers = await databaseAdapter.getAll('prayers');

// Query prayers by category
const rosaryPrayers = await databaseAdapter.findBy('prayers', 'category', 'rosary');

// Query with custom SQL
const result = await databaseAdapter.query('SELECT * FROM prayers WHERE category = ?', ['rosary']);
```

### Insert a Record

```typescript
import { databaseAdapter } from './services/database';

// Insert a prayer
const prayerId = await databaseAdapter.insert('prayers', {
  category: 'rosary',
  title: 'Hail Mary',
  content: 'Hail Mary, full of grace...',
  latin_content: 'Ave Maria, gratia plena...'
});
```

### Update a Record

```typescript
import { databaseAdapter } from './services/database';

// Update a prayer
await databaseAdapter.update('prayers', prayerId, {
  content: 'Hail Mary, full of grace, the Lord is with thee...'
});
```

### Delete a Record

```typescript
import { databaseAdapter } from './services/database';

// Delete a prayer
await databaseAdapter.delete('prayers', prayerId);
```

## Testing

The implementation includes unit tests for the SQLiteAdapter using Vitest. The tests mock the expo-sqlite library to test the adapter without a real database.

## Future Improvements

1. **Migration System**: Add support for database migrations
2. **Query Builder**: Enhance the query builder to support more complex queries
3. **Caching**: Add support for caching frequently accessed data
4. **Offline Sync**: Add support for offline data synchronization
5. **Encryption**: Add support for database encryption