import fs from 'fs';
import path from 'path';
import pkg from 'sqlite3';
const { verbose } = pkg;
const sqlite3 = verbose();
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the SQLite database
const DB_PATH = path.join(__dirname, '../public/sanctissimissa.sqlite');

/**
 * Add a view for office_text (singular) that maps to office_texts (plural)
 */
async function addOfficeTextView() {
  return new Promise((resolve, reject) => {
    console.log(`Adding office_text view to database at ${DB_PATH}`);
    
    // Open the database
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      console.log('Database opened successfully');
      
      // Create a view that maps office_text to office_texts
      db.run(`
        CREATE VIEW IF NOT EXISTS office_text AS
        SELECT 
          id,
          hour,
          title_latin,
          title_english,
          hymn_latin AS body,
          hymn_english,
          chapter_latin,
          chapter_english,
          chapter_reference,
          prayer_latin,
          prayer_english
        FROM office_texts
      `, (err) => {
        if (err) {
          console.error('Error creating view:', err);
          reject(err);
          return;
        }
        
        console.log('office_text view created successfully');
        
        // Close the database
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
            return;
          }
          
          console.log('Database closed successfully');
          resolve();
        });
      });
    });
  });
}

// Run the script
addOfficeTextView()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
