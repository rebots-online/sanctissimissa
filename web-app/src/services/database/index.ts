/**
 * Database Service
 * 
 * This file exports the database service for the web application.
 */

import { SQLiteAdapter } from './sqlite-adapter';
import { DatabaseAdapter } from '../../shared/database';

// Create a singleton instance of the SQLiteAdapter
const sqliteAdapter = new SQLiteAdapter('sanctissimissa.db');

// Initialize the database
let isInitialized = false;
async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }
  
  try {
    await sqliteAdapter.initialize();
    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export the database adapter
export const databaseAdapter: DatabaseAdapter = sqliteAdapter;

// Export the initialize function
export { initializeDatabase };

// Export the SQLiteAdapter class for testing
export { SQLiteAdapter };