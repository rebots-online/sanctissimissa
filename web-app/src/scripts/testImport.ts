/**
 * Test script for importing liturgical texts
 * 
 * This script tests the import process for liturgical texts by calling the import functions
 * and logging the results. It can be run from the command line using:
 * 
 * npx ts-node src/scripts/testImport.ts
 */

import { initDatabase } from '../services/database/db';
import { importAllData } from '../services/import/dataImport';

async function testImport() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    console.log('Starting import process...');
    await importAllData();
    
    console.log('Import process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during import process:', error);
    process.exit(1);
  }
}

// Run the test
testImport();
