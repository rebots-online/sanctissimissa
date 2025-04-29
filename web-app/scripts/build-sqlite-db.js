/**
 * Build SQLite Database Script
 * 
 * This script creates a new SQLite database file for the SanctissiMissa application
 * using the schema defined in src/shared/database/schema.sql.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const DB_FILENAME = 'sanctissimissa.sqlite';
const SCHEMA_PATH = path.join(__dirname, '../src/shared/database/schema.sql');
const OUTPUT_PATH = path.join(__dirname, '../public', DB_FILENAME);

/**
 * Create a new SQLite database
 */
async function createDatabase() {
  console.log('Creating SQLite database...');
  
  // Read the schema file
  console.log(`Reading schema from ${SCHEMA_PATH}`);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  
  // Create the database directory if it doesn't exist
  const dbDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dbDir)) {
    console.log(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Delete the existing database file if it exists
  if (fs.existsSync(OUTPUT_PATH)) {
    console.log(`Removing existing database: ${OUTPUT_PATH}`);
    fs.unlinkSync(OUTPUT_PATH);
  }
  
  // Create a new database
  console.log(`Creating new database: ${OUTPUT_PATH}`);
  const db = new sqlite3.Database(OUTPUT_PATH);
  
  // Create the schema
  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('Schema created successfully');
      
      // Insert sample data
      insertSampleData(db)
        .then(() => {
          // Close the database
          db.close((err) => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log('Database created successfully');
            resolve();
          });
        })
        .catch(reject);
    });
  });
}

/**
 * Insert sample data into the database
 * 
 * @param {sqlite3.Database} db Database connection
 */
async function insertSampleData(db) {
  console.log('Inserting sample data...');
  
  return new Promise((resolve, reject) => {
    // Begin a transaction
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Insert sample liturgical days
      const liturgicalDays = [
        {
          date: '2025-04-20',
          season: 'Easter',
          celebration: 'Easter Sunday',
          rank: 1,
          color: 'white',
          is_holy_day: 1,
          is_feast_day: 1,
          mass_proper: 'easter',
          commemorations: JSON.stringify([])
        },
        {
          date: '2025-04-21',
          season: 'Easter',
          celebration: 'Easter Monday',
          rank: 2,
          color: 'white',
          is_holy_day: 0,
          is_feast_day: 1,
          mass_proper: 'easter_monday',
          commemorations: JSON.stringify([])
        },
        {
          date: '2025-04-22',
          season: 'Easter',
          celebration: 'Easter Tuesday',
          rank: 2,
          color: 'white',
          is_holy_day: 0,
          is_feast_day: 1,
          mass_proper: 'easter_tuesday',
          commemorations: JSON.stringify([])
        }
      ];
      
      // Insert liturgical days
      const liturgicalDayStmt = db.prepare(
        'INSERT INTO liturgical_days (date, season, celebration, rank, color, is_holy_day, is_feast_day, mass_proper, commemorations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      
      for (const day of liturgicalDays) {
        liturgicalDayStmt.run(
          day.date,
          day.season,
          day.celebration,
          day.rank,
          day.color,
          day.is_holy_day,
          day.is_feast_day,
          day.mass_proper,
          day.commemorations
        );
      }
      
      liturgicalDayStmt.finalize();
      
      // Insert sample prayers
      const prayers = [
        {
          id: '1',
          category: 'Marian',
          title_latin: 'Ave Maria',
          title_english: 'Hail Mary',
          text_latin: 'Ave Maria, gratia plena, Dominus tecum. Benedicta tu in mulieribus, et benedictus fructus ventris tui, Iesus. Sancta Maria, Mater Dei, ora pro nobis peccatoribus, nunc, et in hora mortis nostrae. Amen.',
          text_english: 'Hail Mary, full of grace, the Lord is with thee. Blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.',
          tags: JSON.stringify(['marian', 'traditional', 'rosary'])
        },
        {
          id: '2',
          category: 'Lord\'s Prayer',
          title_latin: 'Pater Noster',
          title_english: 'Our Father',
          text_latin: 'Pater noster, qui es in caelis, sanctificetur nomen tuum. Adveniat regnum tuum. Fiat voluntas tua, sicut in caelo et in terra. Panem nostrum quotidianum da nobis hodie, et dimitte nobis debita nostra sicut et nos dimittimus debitoribus nostris. Et ne nos inducas in tentationem, sed libera nos a malo. Amen.',
          text_english: 'Our Father, who art in heaven, hallowed be thy name. Thy kingdom come. Thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us. And lead us not into temptation, but deliver us from evil. Amen.',
          tags: JSON.stringify(['traditional', 'mass'])
        },
        {
          id: '3',
          category: 'Eucharistic',
          title_latin: 'Tantum Ergo',
          title_english: 'Down in Adoration Falling',
          text_latin: 'Tantum ergo Sacramentum Veneremur cernui: Et antiquum documentum Novo cedat ritui: Praestet fides supplementum Sensuum defectui. Genitori, Genitoque Laus et iubilatio, Salus, honor, virtus quoque Sit et benedictio: Procedenti ab utroque Compar sit laudatio. Amen.',
          text_english: 'Down in adoration falling, Lo! the sacred Host we hail, Lo! o\'er ancient forms departing Newer rites of grace prevail; Faith for all defects supplying, Where the feeble senses fail. To the everlasting Father, And the Son Who reigns on high With the Holy Ghost proceeding Forth from each eternally, Be salvation, honor, blessing, Might and endless majesty. Amen.',
          tags: JSON.stringify(['eucharistic', 'benediction'])
        }
      ];
      
      // Insert prayers
      const prayerStmt = db.prepare(
        'INSERT INTO prayers (id, category, title_latin, title_english, text_latin, text_english, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      
      for (const prayer of prayers) {
        prayerStmt.run(
          prayer.id,
          prayer.category,
          prayer.title_latin,
          prayer.title_english,
          prayer.text_latin,
          prayer.text_english,
          prayer.tags
        );
      }
      
      prayerStmt.finalize();
      
      // Commit the transaction
      db.run('COMMIT', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('Sample data inserted successfully');
        resolve();
      });
    });
  });
}

// Run the script
createDatabase()
  .then(() => {
    console.log('Database build completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error building database:', err);
    process.exit(1);
  });