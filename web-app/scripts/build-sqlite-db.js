import fs from 'fs';
import path from 'path';
import pkg from 'sqlite3';
const { verbose } = pkg;
const sqlite3 = verbose();
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DB_PATH = path.join(__dirname, '../public/sanctissimissa.sqlite');
const DEST_DB_PATH = path.join(__dirname, '../dist/sanctissimissa.sqlite');
const WASM_SOURCE = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
const WASM_DEST = path.join(__dirname, '../dist/sql-wasm.wasm');

async function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

async function copyDatabase() {
  try {
    // Ensure the destination directory exists
    await ensureDirectoryExists(DEST_DB_PATH);

    // Check if source database exists
    if (!fs.existsSync(SOURCE_DB_PATH)) {
      console.error('Error: Source database not found at:', SOURCE_DB_PATH);
      process.exit(1);
    }

    // Copy the database file
    fs.copyFileSync(SOURCE_DB_PATH, DEST_DB_PATH);
    console.log('Database copied successfully to:', DEST_DB_PATH);

    // Copy WASM file
    if (fs.existsSync(WASM_SOURCE)) {
      fs.copyFileSync(WASM_SOURCE, WASM_DEST);
      console.log('WASM file copied successfully');
    } else {
      console.error('Warning: WASM file not found at:', WASM_SOURCE);
    }

    // Verify the database
    const db = new sqlite3.Database(DEST_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
      }
    });

    db.get('SELECT count(*) as count FROM sqlite_master', [], (err, row) => {
      if (err) {
        console.error('Error verifying database:', err);
        process.exit(1);
      }
      console.log('Database verified - tables found:', row.count);
      db.close();
    });

  } catch (error) {
    console.error('Error during build process:', error);
    process.exit(1);
  }
}

// Execute the build process
copyDatabase().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});