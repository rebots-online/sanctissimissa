/**
 * Database Service for Mobile
 * 
 * This file exports the database service for the mobile application.
 * It uses the MobileSQLiteAdapter to provide database functionality
 * compatible with the DatabaseAdapter interface.
 */

import { MobileSQLiteAdapter } from './sqlite-adapter';
import { DatabaseAdapter } from '../../shared/database/adapter';
import * as FileSystem from 'expo-file-system';

// Database file location in app documents directory
const DB_FILENAME = 'sanctissimissa.db';
const DB_PATH = `${FileSystem.documentDirectory}${DB_FILENAME}`;

// Create a singleton instance of the MobileSQLiteAdapter
const sqliteAdapter = new MobileSQLiteAdapter(DB_FILENAME);

// Track initialization state
let isInitialized = false;

/**
 * Initialize the database
 * 
 * This function:
 * 1. Checks if the database file exists in the documents directory
 * 2. If not, copies it from the app bundle
 * 3. Initializes the SQLite adapter
 */
async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // Check if database exists in documents directory
    const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
    
    if (!fileInfo.exists) {
      // Copy database from app bundle
      const bundleAsset = require('../../assets/sanctissimissa.db');
      await FileSystem.downloadAsync(
        bundleAsset,
        DB_PATH
      );
      console.log('Database copied from bundle to documents directory');
    }

    // Initialize the adapter
    await sqliteAdapter.initialize();
    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Get the database adapter instance
 * Ensures the database is initialized before returning the adapter
 */
async function getDatabaseAdapter(): Promise<DatabaseAdapter> {
  await initializeDatabase();
  return sqliteAdapter;
}

// Export the database adapter and initialization functions
export { getDatabaseAdapter, initializeDatabase, MobileSQLiteAdapter };

// Export a default singleton instance (will be initialized on first use)
export default sqliteAdapter;