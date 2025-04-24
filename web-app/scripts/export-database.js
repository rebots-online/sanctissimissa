/**
 * Database Export Script
 * 
 * This script:
 * 1. Initializes the database with all necessary data
 * 2. Exports the IndexedDB database to a JSON file
 * 3. Creates a pre-populated database that can be loaded directly
 */

// Need to add browser-like environment for IndexedDB in Node.js
// Using fake-indexeddb for Node.js environment
const { IndexedDB, IDBKeyRange } = require('fake-indexeddb');
global.indexedDB = IndexedDB;
global.IDBKeyRange = IDBKeyRange;

// Import the database module
const { initDatabase, getDatabase } = require('../src/services/database/db');
const fs = require('fs');
const path = require('path');

// Import direct import functions
const { directImport } = require('../src/scripts/directImport');

async function exportDatabase() {
  try {
    console.log('Initializing and populating database...');
    
    // Initialize and populate the database
    await initDatabase();
    
    // Import all data
    await directImport();
    
    // Get the database
    const db = await getDatabase();
    
    // Export each store to JSON
    const allData = {};
    const storeNames = Array.from(db.objectStoreNames || []);
    
    for (const storeName of storeNames) {
      console.log(`Exporting data from ${storeName}...`);
      allData[storeName] = await db.getAll(storeName);
      console.log(`- ${allData[storeName].length} records exported`);
    }
    
    // Write the database export file
    const exportDir = path.join(__dirname, '../public/data');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const exportPath = path.join(exportDir, 'preloaded-db.json');
    fs.writeFileSync(exportPath, JSON.stringify(allData, null, 2));
    
    console.log(`Database export complete: ${exportPath}`);
    
    // Also write a minified version for production
    const minExportPath = path.join(exportDir, 'preloaded-db.min.json');
    fs.writeFileSync(minExportPath, JSON.stringify(allData));
    console.log(`Minified database export: ${minExportPath}`);
    
    return allData;
  } catch (error) {
    console.error('Error exporting database:', error);
    process.exit(1);
  }
}

// Run the export
exportDatabase().then(() => {
  console.log('Database export completed successfully.');
  process.exit(0);
});
