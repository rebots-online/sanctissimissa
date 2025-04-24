/**
 * Build SQLite Database Script
 *
 * This script creates a pre-populated SQLite database for the SanctissiMissa web application.
 * It imports liturgical data from reference files and saves the database as a file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse a Mass text file
 *
 * @param content The content of the flat text file
 * @param language The language of the text file ('latin' or 'english')
 * @returns Parsed Mass parts
 */
function parseMassText(content: string, language: 'latin' | 'english'): Record<string, any> {
  const sections: Record<string, string[]> = {};
  let currentSection = '';

  // Split the content by lines and process each line
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check if this is a section header
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.substring(1, line.length - 1);
      sections[currentSection] = [];
      continue;
    }

    // If we have a current section, add the line to it
    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  // Process each section into a more structured format
  const result: Record<string, any> = {
    language
  };

  // Process Officium (title)
  if (sections.Officium) {
    result.title = sections.Officium.join(' ');
  }

  // Process Rank
  if (sections.Rank) {
    result.rank = sections.Rank.join(' ');
  }

  // Process Rule
  if (sections.Rule) {
    result.rules = sections.Rule;
  }

  // Process Introitus
  if (sections.Introitus) {
    result.introit = {
      reference: sections.Introitus.find(line => line.startsWith('!'))?.substring(1) || '',
      text: sections.Introitus.filter(line => line.startsWith('v.')).map(line => line.substring(2).trim()).join('\n')
    };
  }

  // Process Oratio (Collect)
  if (sections.Oratio) {
    result.collect = {
      text: sections.Oratio.filter(line => !line.startsWith('$')).join('\n'),
      ending: sections.Oratio.find(line => line.startsWith('$'))?.substring(1) || ''
    };
  }

  // Process Lectio (Epistle)
  if (sections.Lectio) {
    result.epistle = {
      introduction: sections.Lectio[0] || '',
      reference: sections.Lectio.find(line => line.startsWith('!'))?.substring(1) || '',
      text: sections.Lectio.filter(line => !line.startsWith('!') && line !== sections.Lectio[0]).join('\n')
    };
  }

  // Process Graduale
  if (sections.Graduale) {
    result.gradual = {
      text: sections.Graduale.join('\n')
    };
  }

  // Process Sequentia
  if (sections.Sequentia) {
    result.sequence = {
      text: sections.Sequentia.filter(line => !line.startsWith('!')).join('\n'),
      rubric: sections.Sequentia.find(line => line.startsWith('!'))?.substring(1) || ''
    };
  }

  // Process Evangelium (Gospel)
  if (sections.Evangelium) {
    result.gospel = {
      introduction: sections.Evangelium[0] || '',
      reference: sections.Evangelium.find(line => line.startsWith('!'))?.substring(1) || '',
      text: sections.Evangelium.filter(line => !line.startsWith('!') && line !== sections.Evangelium[0]).join('\n')
    };
  }

  // Process Offertorium
  if (sections.Offertorium) {
    result.offertory = {
      reference: sections.Offertorium.find(line => line.startsWith('!'))?.substring(1) || '',
      text: sections.Offertorium.filter(line => !line.startsWith('!')).join('\n')
    };
  }

  // Process Secreta
  if (sections.Secreta) {
    result.secret = {
      text: sections.Secreta.filter(line => !line.startsWith('$')).join('\n'),
      ending: sections.Secreta.find(line => line.startsWith('$'))?.substring(1) || ''
    };
  }

  // Process Communio
  if (sections.Communio) {
    result.communion = {
      reference: sections.Communio.find(line => line.startsWith('!'))?.substring(1) || '',
      text: sections.Communio.filter(line => !line.startsWith('!')).join('\n')
    };
  }

  // Process Postcommunio
  if (sections.Postcommunio) {
    result.postcommunion = {
      text: sections.Postcommunio.filter(line => !line.startsWith('$')).join('\n'),
      ending: sections.Postcommunio.find(line => line.startsWith('$'))?.substring(1) || ''
    };
  }

  return result;
}

/**
 * Parse an Office text file
 *
 * @param content The content of the flat text file
 * @param language The language of the text file ('latin' or 'english')
 * @returns Parsed Office parts
 */
function parseOfficeText(content: string, language: 'latin' | 'english'): Record<string, any> {
  const sections: Record<string, string[]> = {};
  let currentSection = '';

  // Split the content by lines and process each line
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check if this is a section header
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.substring(1, line.length - 1);
      sections[currentSection] = [];
      continue;
    }

    // If we have a current section, add the line to it
    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  // Process each section into a more structured format
  const result: Record<string, any> = {
    language
  };

  // Process Name
  if (sections.Name) {
    result.title = sections.Name.join(' ');
  }

  // Process Hymnus (Hymn)
  if (sections.Hymnus) {
    result.hymn = {
      text: sections.Hymnus.join('\n')
    };
  }

  // Process Psalmi (Psalms)
  if (sections.Psalmi) {
    result.psalms = sections.Psalmi.map(line => {
      const parts = line.split('=');
      return {
        number: parseInt(parts[0]?.trim() || '0', 10),
        title: parts[1]?.trim() || '',
        text: '' // Will be populated from separate psalm files
      };
    });
  }

  // Process Capitulum (Chapter)
  if (sections.Capitulum) {
    result.chapter = {
      reference: sections.Capitulum.find(line => line.startsWith('!'))?.substring(1) || '',
      text: sections.Capitulum.filter(line => !line.startsWith('!')).join('\n')
    };
  }

  // Process Lectio (Readings)
  if (sections.Lectio) {
    result.readings = [];
    let currentReading: any = null;

    for (const line of sections.Lectio) {
      if (line.startsWith('#')) {
        // New reading
        if (currentReading) {
          result.readings.push(currentReading);
        }
        currentReading = {
          number: parseInt(line.substring(1).trim(), 10),
          text: ''
        };
      } else if (currentReading) {
        currentReading.text += line + '\n';
      }
    }

    if (currentReading) {
      result.readings.push(currentReading);
    }
  }

  // Process Oratio (Prayer)
  if (sections.Oratio) {
    result.prayer = {
      text: sections.Oratio.filter(line => !line.startsWith('$')).join('\n'),
      ending: sections.Oratio.find(line => line.startsWith('$'))?.substring(1) || ''
    };
  }

  return result;
}

/**
 * Fetch text content from a file
 *
 * @param path Path to the file
 * @returns Promise resolving to the file content
 */
function fetchTextContent(path: string): string {
  try {
    console.log(`Reading file: ${path}`);
    return fs.readFileSync(path, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${path}:`, error);
    throw error;
  }
}

// Path to reference files
const REFERENCE_PATH = path.join(__dirname, '../../sanctissimissa-reference/web/www');
// Output path for the SQLite database
const OUTPUT_PATH = path.join(__dirname, '../public/sanctissimissa.sqlite');

/**
 * Create the database schema
 *
 * @param db SQLite database
 */
function createSchema(db: any): void {
  console.log('Creating database schema...');

  db.exec(`
    -- Liturgical days table
    CREATE TABLE liturgical_days (
      date TEXT PRIMARY KEY,
      season TEXT NOT NULL,
      celebration TEXT NOT NULL,
      rank INTEGER NOT NULL,
      color TEXT NOT NULL,
      is_holy_day BOOLEAN NOT NULL DEFAULT 0,
      is_feast_day BOOLEAN NOT NULL DEFAULT 0,
      mass_proper TEXT,
      commemorations TEXT
    );

    -- Mass texts table
    CREATE TABLE mass_texts (
      id TEXT PRIMARY KEY,
      part TEXT NOT NULL,
      title_latin TEXT,
      title_english TEXT,
      introit_latin TEXT,
      introit_english TEXT,
      introit_reference TEXT,
      collect_latin TEXT,
      collect_english TEXT,
      epistle_latin TEXT,
      epistle_english TEXT,
      epistle_reference TEXT,
      gradual_latin TEXT,
      gradual_english TEXT,
      sequence_latin TEXT,
      sequence_english TEXT,
      sequence_rubric TEXT,
      gospel_latin TEXT,
      gospel_english TEXT,
      gospel_reference TEXT,
      offertory_latin TEXT,
      offertory_english TEXT,
      offertory_reference TEXT,
      secret_latin TEXT,
      secret_english TEXT,
      communion_latin TEXT,
      communion_english TEXT,
      communion_reference TEXT,
      postcommunion_latin TEXT,
      postcommunion_english TEXT
    );

    -- Office texts table
    CREATE TABLE office_texts (
      id TEXT PRIMARY KEY,
      hour TEXT NOT NULL,
      title_latin TEXT,
      title_english TEXT,
      hymn_latin TEXT,
      hymn_english TEXT,
      chapter_latin TEXT,
      chapter_english TEXT,
      chapter_reference TEXT,
      prayer_latin TEXT,
      prayer_english TEXT
    );

    -- Psalms table
    CREATE TABLE psalms (
      id TEXT PRIMARY KEY,
      office_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      title_latin TEXT,
      title_english TEXT,
      text_latin TEXT,
      text_english TEXT,
      FOREIGN KEY (office_id) REFERENCES office_texts (id)
    );

    -- Readings table
    CREATE TABLE readings (
      id TEXT PRIMARY KEY,
      office_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      text_latin TEXT,
      text_english TEXT,
      FOREIGN KEY (office_id) REFERENCES office_texts (id)
    );

    -- Prayers table
    CREATE TABLE prayers (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title_latin TEXT,
      title_english TEXT,
      text_latin TEXT,
      text_english TEXT,
      tags TEXT
    );

    -- Journal entries table
    CREATE TABLE journal_entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      tags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      audio_blob BLOB,
      position_x REAL,
      position_y REAL
    );
  `);

  console.log('Database schema created successfully');
}

/**
 * Calculate Easter Sunday date for a given year
 *
 * @param year Year to calculate Easter for
 * @returns Date object for Easter Sunday
 */
function calculateEaster(year: number): Date {
  // Algorithm from Butcher's Ecclesiastical Calendar
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Format a date as YYYY-MM-DD
 *
 * @param date Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to a date
 *
 * @param date Base date
 * @param days Number of days to add
 * @returns New date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Import liturgical calendar data
 *
 * @param db SQLite database
 */
function importLiturgicalCalendar(db: any): void {
  console.log('Importing liturgical calendar...');

  // Calculate Easter Sunday for 2025
  const easterSunday2025 = calculateEaster(2025);
  const easterDate2025 = formatDate(easterSunday2025);

  // Define liturgical days
  const liturgicalDays = [
    // Easter Sunday
    {
      date: easterDate2025,
      season: 'easter',
      celebration: 'Easter Sunday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_easter_sunday',
      commemorations: '[]'
    },

    // Easter Week (Octave of Easter)
    {
      date: formatDate(addDays(easterSunday2025, 1)),
      season: 'easter',
      celebration: 'Easter Monday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_easter_monday',
      commemorations: '[]'
    },
    {
      date: formatDate(addDays(easterSunday2025, 2)),
      season: 'easter',
      celebration: 'Easter Tuesday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_easter_tuesday',
      commemorations: '[]'
    },
    {
      date: formatDate(addDays(easterSunday2025, 3)),
      season: 'easter',
      celebration: 'Easter Wednesday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_easter_wednesday',
      commemorations: '[]'
    },
    {
      date: formatDate(addDays(easterSunday2025, 4)),
      season: 'easter',
      celebration: 'Easter Thursday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_easter_thursday',
      commemorations: '[]'
    },
    {
      date: formatDate(addDays(easterSunday2025, 5)),
      season: 'easter',
      celebration: 'Easter Friday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_easter_friday',
      commemorations: '[]'
    },
    {
      date: formatDate(addDays(easterSunday2025, 6)),
      season: 'easter',
      celebration: 'Easter Saturday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_easter_saturday',
      commemorations: '[]'
    },

    // Low Sunday (Dominica in Albis)
    {
      date: formatDate(addDays(easterSunday2025, 7)),
      season: 'easter',
      celebration: 'Low Sunday',
      rank: 2,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_low_sunday',
      commemorations: '[]'
    },

    // Second Sunday after Easter
    {
      date: formatDate(addDays(easterSunday2025, 14)),
      season: 'easter',
      celebration: 'Second Sunday after Easter',
      rank: 2,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_easter_2nd_sunday',
      commemorations: '[]'
    },

    // Third Sunday after Easter
    {
      date: formatDate(addDays(easterSunday2025, 21)),
      season: 'easter',
      celebration: 'Third Sunday after Easter',
      rank: 2,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_easter_3rd_sunday',
      commemorations: '[]'
    },

    // Fourth Sunday after Easter
    {
      date: formatDate(addDays(easterSunday2025, 28)),
      season: 'easter',
      celebration: 'Fourth Sunday after Easter',
      rank: 2,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_easter_4th_sunday',
      commemorations: '[]'
    },

    // Fifth Sunday after Easter
    {
      date: formatDate(addDays(easterSunday2025, 35)),
      season: 'easter',
      celebration: 'Fifth Sunday after Easter',
      rank: 2,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_easter_5th_sunday',
      commemorations: '[]'
    },

    // Ascension Thursday
    {
      date: formatDate(addDays(easterSunday2025, 39)),
      season: 'easter',
      celebration: 'Ascension of Our Lord',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_ascension',
      commemorations: '[]'
    },

    // Sunday after Ascension
    {
      date: formatDate(addDays(easterSunday2025, 42)),
      season: 'easter',
      celebration: 'Sunday after Ascension',
      rank: 2,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_sunday_after_ascension',
      commemorations: '[]'
    },

    // Pentecost Sunday
    {
      date: formatDate(addDays(easterSunday2025, 49)),
      season: 'pentecost',
      celebration: 'Pentecost Sunday',
      rank: 1,
      color: 'red',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_pentecost',
      commemorations: '[]'
    },

    // Trinity Sunday
    {
      date: formatDate(addDays(easterSunday2025, 56)),
      season: 'time_after_pentecost',
      celebration: 'Trinity Sunday',
      rank: 1,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_trinity_sunday',
      commemorations: '[]'
    },

    // Corpus Christi
    {
      date: formatDate(addDays(easterSunday2025, 60)),
      season: 'time_after_pentecost',
      celebration: 'Corpus Christi',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_corpus_christi',
      commemorations: '[]'
    },

    // Sacred Heart of Jesus
    {
      date: formatDate(addDays(easterSunday2025, 68)),
      season: 'time_after_pentecost',
      celebration: 'Sacred Heart of Jesus',
      rank: 1,
      color: 'white',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_sacred_heart',
      commemorations: '[]'
    },

    // Christmas
    {
      date: '2025-12-25',
      season: 'christmas',
      celebration: 'Nativity of Our Lord',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_christmas',
      commemorations: '[]'
    },

    // Epiphany
    {
      date: '2025-01-06',
      season: 'epiphany',
      celebration: 'Epiphany of Our Lord',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_epiphany',
      commemorations: '[]'
    },

    // Ash Wednesday
    {
      date: formatDate(addDays(easterSunday2025, -46)),
      season: 'lent',
      celebration: 'Ash Wednesday',
      rank: 1,
      color: 'purple',
      is_holy_day: 0,
      is_feast_day: 0,
      mass_proper: 'proper_ash_wednesday',
      commemorations: '[]'
    },

    // Palm Sunday
    {
      date: formatDate(addDays(easterSunday2025, -7)),
      season: 'holy_week',
      celebration: 'Palm Sunday',
      rank: 1,
      color: 'purple',
      is_holy_day: 0,
      is_feast_day: 1,
      mass_proper: 'proper_palm_sunday',
      commemorations: '[]'
    },

    // Holy Thursday
    {
      date: formatDate(addDays(easterSunday2025, -3)),
      season: 'holy_week',
      celebration: 'Holy Thursday',
      rank: 1,
      color: 'white',
      is_holy_day: 1,
      is_feast_day: 1,
      mass_proper: 'proper_holy_thursday',
      commemorations: '[]'
    },

    // Good Friday
    {
      date: formatDate(addDays(easterSunday2025, -2)),
      season: 'holy_week',
      celebration: 'Good Friday',
      rank: 1,
      color: 'black',
      is_holy_day: 1,
      is_feast_day: 0,
      mass_proper: 'proper_good_friday',
      commemorations: '[]'
    },

    // Holy Saturday
    {
      date: formatDate(addDays(easterSunday2025, -1)),
      season: 'holy_week',
      celebration: 'Holy Saturday',
      rank: 1,
      color: 'purple',
      is_holy_day: 1,
      is_feast_day: 0,
      mass_proper: 'proper_holy_saturday',
      commemorations: '[]'
    }
  ];

  // Insert all liturgical days
  for (const day of liturgicalDays) {
    db.exec(`
      INSERT INTO liturgical_days (
        date, season, celebration, rank, color, is_holy_day, is_feast_day, mass_proper, commemorations
      ) VALUES (
        '${day.date}',
        '${day.season}',
        '${day.celebration}',
        ${day.rank},
        '${day.color}',
        ${day.is_holy_day},
        ${day.is_feast_day},
        '${day.mass_proper}',
        '${day.commemorations}'
      )
    `);
  }

  console.log(`Imported ${liturgicalDays.length} liturgical days successfully`);
}

/**
 * Import Easter Sunday Mass texts
 *
 * @param db SQLite database
 */
function importEasterSundayMass(db: any): void {
  console.log('Importing Easter Sunday Mass texts...');

  try {
    // Paths to Mass text files
    const latinPath = path.join(REFERENCE_PATH, 'missa/Latin/Tempora/Pasc0-0.txt');
    const englishPath = path.join(REFERENCE_PATH, 'missa/English/Tempora/Pasc0-0.txt');

    // Check if the files exist
    if (!fs.existsSync(latinPath) || !fs.existsSync(englishPath)) {
      console.warn('Mass text files not found, using mock data');

      // Insert mock data
      db.exec(`
        INSERT INTO mass_texts (
          id, part, title_latin, title_english,
          introit_latin, introit_english, introit_reference,
          collect_latin, collect_english,
          epistle_latin, epistle_english, epistle_reference,
          gradual_latin, gradual_english,
          gospel_latin, gospel_english, gospel_reference,
          offertory_latin, offertory_english,
          secret_latin, secret_english,
          communion_latin, communion_english,
          postcommunion_latin, postcommunion_english
        ) VALUES (
          'easter_sunday', 'proper', 'Dominica Resurrectionis', 'Easter Sunday',
          'Resurrexi, et adhuc tecum sum, alleluia', 'I have risen, and I am with you still, alleluia.', 'Ps 138:18,5-6',
          'Deus, qui hodierna die per Unigenitum tuum aeternitatis nobis aditum devicta morte reserasti', 'O God, who on this day, through your Only Begotten Son, have conquered death and unlocked for us the path to eternity',
          'Fratres: Expurgate vetus fermentum', 'Brethren: Purge out the old leaven', '1 Cor 5:7-8',
          'Haec dies, quam fecit Dominus: exsultemus et laetemur in ea', 'This is the day the Lord has made; let us rejoice and be glad in it.',
          'In illo tempore: Maria Magdalene, et Maria Jacobi, et Salome emerunt aromata', 'At that time: Mary Magdalene, and Mary the mother of James, and Salome, bought sweet spices', 'Mark 16:1-7',
          'Terra tremuit, et quievit, dum resurgeret in judicio Deus', 'The earth trembled and was still when God arose in judgment',
          'Suscipe, quaesumus, Domine, preces populi tui cum oblationibus hostiarum', 'Accept, we pray, O Lord, the prayers of your people with the sacrificial offerings',
          'Pascha nostrum immolatus est Christus, alleluia', 'Christ our Passover has been sacrificed, alleluia',
          'Spiritum nobis, Domine, tuae caritatis infunde', 'Pour out on us, O Lord, the Spirit of your love'
        )
      `);

      // Also insert the ordinary
      db.exec(`
        INSERT INTO mass_texts (
          id, part, title_latin, title_english,
          introit_latin, introit_english,
          collect_latin, collect_english,
          epistle_latin, epistle_english,
          gradual_latin, gradual_english,
          gospel_latin, gospel_english,
          offertory_latin, offertory_english,
          secret_latin, secret_english,
          communion_latin, communion_english,
          postcommunion_latin, postcommunion_english
        ) VALUES (
          'ordinary_default', 'ordinary', 'Ordo Missae', 'Order of Mass',
          '', '',
          '', '',
          '', '',
          '', '',
          '', '',
          '', '',
          '', '',
          '', '',
          '', ''
        )
      `);

      return;
    }

    // Read the files
    const latinText = fetchTextContent(latinPath);
    const englishText = fetchTextContent(englishPath);

    // Parse the texts
    const latinParts = parseMassText(latinText, 'latin');
    const englishParts = parseMassText(englishText, 'english');

    // Insert the proper
    db.exec(`
      INSERT INTO mass_texts (
        id, part, title_latin, title_english,
        introit_latin, introit_english, introit_reference,
        collect_latin, collect_english,
        epistle_latin, epistle_english, epistle_reference,
        gradual_latin, gradual_english,
        sequence_latin, sequence_english, sequence_rubric,
        gospel_latin, gospel_english, gospel_reference,
        offertory_latin, offertory_english, offertory_reference,
        secret_latin, secret_english,
        communion_latin, communion_english, communion_reference,
        postcommunion_latin, postcommunion_english
      ) VALUES (
        'proper_easter_sunday', 'proper',
        '${latinParts.title || ''}', '${englishParts.title || ''}',
        '${latinParts.introit?.text || ''}', '${englishParts.introit?.text || ''}', '${latinParts.introit?.reference || englishParts.introit?.reference || ''}',
        '${latinParts.collect?.text || ''}', '${englishParts.collect?.text || ''}',
        '${latinParts.epistle?.text || ''}', '${englishParts.epistle?.text || ''}', '${latinParts.epistle?.reference || englishParts.epistle?.reference || ''}',
        '${latinParts.gradual?.text || ''}', '${englishParts.gradual?.text || ''}',
        '${latinParts.sequence?.text || ''}', '${englishParts.sequence?.text || ''}', '${latinParts.sequence?.rubric || englishParts.sequence?.rubric || ''}',
        '${latinParts.gospel?.text || ''}', '${englishParts.gospel?.text || ''}', '${latinParts.gospel?.reference || englishParts.gospel?.reference || ''}',
        '${latinParts.offertory?.text || ''}', '${englishParts.offertory?.text || ''}', '${latinParts.offertory?.reference || englishParts.offertory?.reference || ''}',
        '${latinParts.secret?.text || ''}', '${englishParts.secret?.text || ''}',
        '${latinParts.communion?.text || ''}', '${englishParts.communion?.text || ''}', '${latinParts.communion?.reference || englishParts.communion?.reference || ''}',
        '${latinParts.postcommunion?.text || ''}', '${englishParts.postcommunion?.text || ''}'
      )
    `);

    // Also import the ordinary
    const latinOrdoPath = path.join(REFERENCE_PATH, 'missa/Latin/Ordo/Ordo.txt');
    const englishOrdoPath = path.join(REFERENCE_PATH, 'missa/English/Ordo/Ordo.txt');

    if (fs.existsSync(latinOrdoPath) && fs.existsSync(englishOrdoPath)) {
      const latinOrdoText = fetchTextContent(latinOrdoPath);
      const englishOrdoText = fetchTextContent(englishOrdoPath);

      const latinOrdoParts = parseMassText(latinOrdoText, 'latin');
      const englishOrdoParts = parseMassText(englishOrdoText, 'english');

      db.exec(`
        INSERT INTO mass_texts (
          id, part, title_latin, title_english,
          introit_latin, introit_english,
          collect_latin, collect_english,
          epistle_latin, epistle_english,
          gradual_latin, gradual_english,
          gospel_latin, gospel_english,
          offertory_latin, offertory_english,
          secret_latin, secret_english,
          communion_latin, communion_english,
          postcommunion_latin, postcommunion_english
        ) VALUES (
          'ordinary_default', 'ordinary', 'Ordo Missae', 'Order of Mass',
          '${latinOrdoParts.kyrie?.text || ''}', '${englishOrdoParts.kyrie?.text || ''}',
          '${latinOrdoParts.gloria?.text || ''}', '${englishOrdoParts.gloria?.text || ''}',
          '${latinOrdoParts.credo?.text || ''}', '${englishOrdoParts.credo?.text || ''}',
          '', '',
          '', '',
          '', '',
          '${latinOrdoParts.sanctus?.text || ''}', '${englishOrdoParts.sanctus?.text || ''}',
          '${latinOrdoParts.agnus?.text || ''}', '${englishOrdoParts.agnus?.text || ''}',
          '${latinOrdoParts.ite?.text || ''}', '${englishOrdoParts.ite?.text || ''}'
        )
      `);
    } else {
      console.warn('Ordinary text files not found, using mock data');

      db.exec(`
        INSERT INTO mass_texts (
          id, part, title_latin, title_english,
          introit_latin, introit_english,
          collect_latin, collect_english,
          epistle_latin, epistle_english,
          gradual_latin, gradual_english,
          gospel_latin, gospel_english,
          offertory_latin, offertory_english,
          secret_latin, secret_english,
          communion_latin, communion_english,
          postcommunion_latin, postcommunion_english
        ) VALUES (
          'ordinary_default', 'ordinary', 'Ordo Missae', 'Order of Mass',
          'Kyrie eleison. Christe eleison. Kyrie eleison.', 'Lord, have mercy. Christ, have mercy. Lord, have mercy.',
          'Gloria in excelsis Deo...', 'Glory to God in the highest...',
          'Credo in unum Deum...', 'I believe in one God...',
          '', '',
          '', '',
          '', '',
          'Sanctus, Sanctus, Sanctus...', 'Holy, Holy, Holy...',
          'Agnus Dei, qui tollis peccata mundi...', 'Lamb of God, who takes away the sins of the world...',
          'Ite, missa est.', 'Go, the Mass is ended.'
        )
      `);
    }

    console.log('Easter Sunday Mass texts imported successfully');
  } catch (error) {
    console.error('Error importing Easter Sunday Mass texts:', error);
    throw error;
  }
}

/**
 * Import Easter Sunday Office texts
 *
 * @param db SQLite database
 */
function importEasterSundayOffice(db: any): void {
  console.log('Importing Easter Sunday Office texts...');

  try {
    // Define all canonical hours
    const hours = [
      { id: 'matins', latinFile: 'Matutinum', englishFile: 'Matins' },
      { id: 'lauds', latinFile: 'Laudes', englishFile: 'Lauds' },
      { id: 'prime', latinFile: 'Prima', englishFile: 'Prime' },
      { id: 'terce', latinFile: 'Tertia', englishFile: 'Terce' },
      { id: 'sext', latinFile: 'Sexta', englishFile: 'Sext' },
      { id: 'none', latinFile: 'Nona', englishFile: 'None' },
      { id: 'vespers', latinFile: 'Vespera', englishFile: 'Vespers' },
      { id: 'compline', latinFile: 'Completorium', englishFile: 'Compline' }
    ];

    // Check if the horas directory exists
    const horasPath = path.join(REFERENCE_PATH, 'horas');
    if (!fs.existsSync(horasPath)) {
      console.warn('Office text files not found, using mock data');

      // Insert mock data for Lauds
      db.exec(`
        INSERT INTO office_texts (
          id, hour, title_latin, title_english,
          hymn_latin, hymn_english,
          chapter_latin, chapter_english, chapter_reference,
          prayer_latin, prayer_english
        ) VALUES (
          'easter_sunday_lauds', 'lauds', 'Ad Laudes', 'Lauds',
          'Aurora caelum purpurat, Aether resultat laudibus', 'The dawn was purpling over the sky, with alleluias the air was ringing',
          'Christus resurgens ex mortuis iam non moritur', 'Christ, rising again from the dead, dieth now no more', 'Rom 6:9',
          'Deus, qui hodierna die per Unigenitum tuum aeternitatis nobis aditum devicta morte reserasti', 'O God, who on this day, through your Only Begotten Son, have conquered death and unlocked for us the path to eternity'
        )
      `);

      // Insert mock psalms for Lauds
      db.exec(`
        INSERT INTO psalms (
          id, office_id, number, title_latin, title_english, text_latin, text_english
        ) VALUES
        ('psalm_92_lauds', 'easter_sunday_lauds', 92, 'Psalmus 92', 'Psalm 92', 'Dominus regnavit, decorem indutus est', 'The Lord reigns, he is robed in majesty'),
        ('psalm_99_lauds', 'easter_sunday_lauds', 99, 'Psalmus 99', 'Psalm 99', 'Jubilate Deo, omnis terra', 'Make a joyful noise to the Lord, all the earth'),
        ('psalm_62_lauds', 'easter_sunday_lauds', 62, 'Psalmus 62', 'Psalm 62', 'Deus, Deus meus, ad te de luce vigilo', 'O God, you are my God, earnestly I seek you')
      `);

      // Insert mock readings for Lauds
      db.exec(`
        INSERT INTO readings (
          id, office_id, number, text_latin, text_english
        ) VALUES
        ('reading_1_lauds', 'easter_sunday_lauds', 1, 'Christus resurgens ex mortuis, primitiae dormientium', 'Christ is risen from the dead, the first fruits of those who have fallen asleep')
      `);

      return;
    }

    // Import each hour
    for (const hour of hours) {
      const latinPath = path.join(horasPath, `Latin/Tempora/Pasc0-0/${hour.latinFile}.txt`);
      const englishPath = path.join(horasPath, `English/Tempora/Pasc0-0/${hour.englishFile}.txt`);

      if (!fs.existsSync(latinPath) || !fs.existsSync(englishPath)) {
        console.warn(`Office text files for ${hour.id} not found, skipping`);
        continue;
      }

      const latinText = fetchTextContent(latinPath);
      const englishText = fetchTextContent(englishPath);

      const latinParts = parseOfficeText(latinText, 'latin');
      const englishParts = parseOfficeText(englishText, 'english');

      // Insert the office hour
      db.exec(`
        INSERT INTO office_texts (
          id, hour, title_latin, title_english,
          hymn_latin, hymn_english,
          chapter_latin, chapter_english, chapter_reference,
          prayer_latin, prayer_english
        ) VALUES (
          'easter_sunday_${hour.id}', '${hour.id}',
          '${latinParts.title || hour.id}', '${englishParts.title || hour.id}',
          '${latinParts.hymn?.text || ''}', '${englishParts.hymn?.text || ''}',
          '${latinParts.chapter?.text || ''}', '${englishParts.chapter?.text || ''}', '${latinParts.chapter?.reference || englishParts.chapter?.reference || ''}',
          '${latinParts.prayer?.text || ''}', '${englishParts.prayer?.text || ''}'
        )
      `);

      // Insert psalms
      if (latinParts.psalms && latinParts.psalms.length > 0) {
        for (let i = 0; i < latinParts.psalms.length; i++) {
          const psalm = latinParts.psalms[i];
          const englishPsalm = englishParts.psalms?.[i] || {};

          db.exec(`
            INSERT INTO psalms (
              id, office_id, number, title_latin, title_english, text_latin, text_english
            ) VALUES (
              'psalm_${psalm.number}_${hour.id}', 'easter_sunday_${hour.id}', ${psalm.number},
              '${psalm.title || ''}', '${englishPsalm.title || ''}',
              '${psalm.text || ''}', '${englishPsalm.text || ''}'
            )
          `);
        }
      }

      // Insert readings
      if (latinParts.readings && latinParts.readings.length > 0) {
        for (let i = 0; i < latinParts.readings.length; i++) {
          const reading = latinParts.readings[i];
          const englishReading = englishParts.readings?.[i] || {};

          db.exec(`
            INSERT INTO readings (
              id, office_id, number, text_latin, text_english
            ) VALUES (
              'reading_${i + 1}_${hour.id}', 'easter_sunday_${hour.id}', ${i + 1},
              '${reading.text || ''}', '${englishReading.text || ''}'
            )
          `);
        }
      }
    }

    console.log('Easter Sunday Office texts imported successfully');
  } catch (error) {
    console.error('Error importing Easter Sunday Office texts:', error);
    throw error;
  }
}

/**
 * Main function to build the SQLite database
 */
async function buildSqliteDb(): Promise<void> {
  try {
    console.log('Building SQLite database...');

    // Initialize SQL.js
    const SQL = await initSqlJs();

    // Create a new database
    const db = new SQL.Database();

    // Create the schema
    createSchema(db);

    // Import liturgical data
    importLiturgicalCalendar(db);
    importEasterSundayMass(db);
    importEasterSundayOffice(db);

    // Save the database to a file
    const data = db.export();
    const buffer = Buffer.from(data);

    // Create the output directory if it doesn't exist
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the database to a file
    fs.writeFileSync(OUTPUT_PATH, buffer);

    console.log(`SQLite database built successfully and saved to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error building SQLite database:', error);
    process.exit(1);
  }
}

// Run the script
buildSqliteDb();
