/**
 * Update SQLite Database Schema Script
 *
 * This script updates the SQLite database with the enhanced schema for the
 * flexible liturgical calendar implementation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the SQLite database
const DB_PATH = path.join(__dirname, '../public/sanctissimissa.sqlite');

// Path to the enhanced schema SQL file
const SCHEMA_PATH = path.join(__dirname, '../src/shared/database/enhanced-schema.sql');

/**
 * Update the SQLite database schema
 */
async function updateSqliteSchema(): Promise<void> {
  try {
    console.log('Updating SQLite database schema...');
    
    // Initialize SQL.js
    const SQL = await initSqlJs();
    
    // Read the database file
    const dbBuffer = fs.readFileSync(DB_PATH);
    
    // Create a database instance from the existing file
    const db = new SQL.Database(dbBuffer);
    
    // Read the enhanced schema SQL file
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    // Execute the schema SQL
    db.exec(schemaSql);
    
    // Save the updated database to a file
    const data = db.export();
    const buffer = Buffer.from(data);
    
    // Create a backup of the original database
    const backupPath = `${DB_PATH}.backup.${Date.now()}`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Created backup of original database at ${backupPath}`);
    
    // Write the updated database to the original file
    fs.writeFileSync(DB_PATH, buffer);
    
    console.log('SQLite database schema updated successfully');
  } catch (error) {
    console.error('Error updating SQLite database schema:', error);
    process.exit(1);
  }
}

// Run the script
updateSqliteSchema();
