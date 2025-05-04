/**
 * Import Liturgical Seasons Script
 *
 * This script imports liturgical seasons into the SQLite database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { LiturgicalColor } from '../src/models/calendar';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the SQLite database
const DB_PATH = path.join(__dirname, '../public/sanctissimissa.sqlite');

/**
 * Import liturgical seasons into the database
 */
async function importLiturgicalSeasons(): Promise<void> {
  try {
    console.log('Importing liturgical seasons...');
    
    // Initialize SQL.js
    const SQL = await initSqlJs();
    
    // Read the database file
    const dbBuffer = fs.readFileSync(DB_PATH);
    
    // Create a database instance from the existing file
    const db = new SQL.Database(dbBuffer);
    
    // Define the liturgical seasons
    const seasons = [
      {
        id: 'advent',
        name: 'Advent',
        color: LiturgicalColor.PURPLE,
        description: 'The season of preparation for the Nativity of Our Lord'
      },
      {
        id: 'christmas',
        name: 'Christmastide',
        color: LiturgicalColor.WHITE,
        description: 'The season celebrating the birth of Christ'
      },
      {
        id: 'epiphany',
        name: 'Epiphanytide',
        color: LiturgicalColor.WHITE,
        description: 'The season celebrating the manifestation of Christ to the Gentiles'
      },
      {
        id: 'septuagesima',
        name: 'Septuagesima',
        color: LiturgicalColor.PURPLE,
        description: 'The pre-Lenten season of preparation'
      },
      {
        id: 'lent',
        name: 'Lent',
        color: LiturgicalColor.PURPLE,
        description: 'The penitential season preparing for Easter'
      },
      {
        id: 'passiontide',
        name: 'Passiontide',
        color: LiturgicalColor.PURPLE,
        description: 'The final two weeks of Lent focusing on Christ\'s Passion'
      },
      {
        id: 'easter',
        name: 'Eastertide',
        color: LiturgicalColor.WHITE,
        description: 'The joyful season celebrating Christ\'s Resurrection'
      },
      {
        id: 'pentecost',
        name: 'Pentecost',
        color: LiturgicalColor.RED,
        description: 'The octave of Pentecost celebrating the descent of the Holy Spirit'
      },
      {
        id: 'tempus_per_annum',
        name: 'Time after Pentecost',
        color: LiturgicalColor.GREEN,
        description: 'The season representing the life of the Church under the guidance of the Holy Spirit'
      }
    ];
    
    // Clear existing data
    db.exec('DELETE FROM liturgical_seasons');
    
    // Insert the seasons
    for (const season of seasons) {
      db.exec(`
        INSERT INTO liturgical_seasons (id, name, color, description)
        VALUES (
          '${season.id}',
          '${season.name}',
          '${season.color}',
          '${season.description}'
        )
      `);
    }
    
    // Log import success
    console.log(`Imported ${seasons.length} liturgical seasons`);
    
    // Save the updated database to a file
    const data = db.export();
    const buffer = Buffer.from(data);
    
    // Write the updated database to the original file
    fs.writeFileSync(DB_PATH, buffer);
    
    console.log('Liturgical seasons imported successfully');
  } catch (error) {
    console.error('Error importing liturgical seasons:', error);
    process.exit(1);
  }
}

// Run the script
importLiturgicalSeasons();
