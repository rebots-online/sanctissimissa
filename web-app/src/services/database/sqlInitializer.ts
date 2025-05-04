/**
 * SQL.js Initializer
 * 
 * This module provides a Promise-based initializer for SQL.js.
 * It handles loading the WebAssembly file and initializing the SQL.js library.
 */

import initSqlJs, { Database } from 'sql.js';

// Global reference to the initialized SQL module
let SQL: any = null;
let initializationPromise: Promise<any> | null = null;

/**
 * Initialize SQL.js with the WebAssembly file
 * 
 * @returns Promise that resolves to the SQL module
 */
export async function initializeSql(): Promise<any> {
  // If already initialized, return the SQL module
  if (SQL) {
    return SQL;
  }

  // If initialization is in progress, return the promise
  if (initializationPromise) {
    return initializationPromise;
  }

  console.log('Initializing SQL.js...');

  // Create the initialization promise
  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      // Initialize SQL.js with the WebAssembly file
      // The file should be in the public directory
      SQL = await initSqlJs({
        locateFile: (file) => `/sql-wasm.wasm`
      });
      
      console.log('SQL.js initialized successfully');
      resolve(SQL);
    } catch (error) {
      console.error('Failed to initialize SQL.js:', error);
      reject(error);
    }
  });

  return initializationPromise;
}

/**
 * Create a new SQL.js database
 * 
 * @param data Optional binary data to load into the database
 * @returns Promise that resolves to a new Database instance
 */
export async function createDatabase(data?: Uint8Array): Promise<Database> {
  const SQL = await initializeSql();
  
  try {
    // Create a new database with the provided data or an empty database
    const db = new SQL.Database(data);
    return db;
  } catch (error) {
    console.error('Failed to create database:', error);
    throw error;
  }
}

/**
 * Check if SQL.js is initialized
 * 
 * @returns True if SQL.js is initialized, false otherwise
 */
export function isSqlInitialized(): boolean {
  return SQL !== null;
}
