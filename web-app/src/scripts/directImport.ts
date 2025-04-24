/**
 * Direct Import Script
 *
 * This script directly imports liturgical texts from flat files into IndexedDB.
 * It should be run during development and build processes to ensure the database
 * is properly populated before the application is used.
 */

import { initDatabase, getDatabase } from '../services/database/db';
import { importLiturgicalCalendar } from '../services/import/calendarImport';
import { MassProper, MassOrdinary } from '../models/MassTexts';
import { OfficeHour } from '../models/OfficeTexts';

/**
 * Parse a Mass text file
 *
 * @param content The content of the flat text file
 * @param language The language of the text file ('latin' or 'english')
 * @returns Parsed Mass parts
 */
function parseMassText(content: string, language: 'latin' | 'english'): Record<string, unknown> {
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
function parseOfficeText(content: string, language: 'latin' | 'english'): Record<string, unknown> {
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
        number: parts[0]?.trim() || '',
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
          number: line.substring(1).trim(),
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
/**
 * Fetch text content from a file
 *
 * @param path Path to the file
 * @returns Promise resolving to the file content
 */
async function fetchTextContent(path: string): Promise<string> {
  try {
    console.log(`Attempting to fetch: ${path}`);

    // Use a timeout to avoid hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(path, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch from ${path}: ${response.statusText}`);
    }

    const text = await response.text();
    console.log(`Successfully fetched ${path} (${text.length} bytes)`);
    return text;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    throw new Error(`Failed to fetch ${path}: ${error.message}`);
  }
}

/**
 * Import Mass proper for a specific liturgical day
 *
 * @param liturgicalDayId The ID of the liturgical day (e.g., 'easter_sunday')
 * @param latinPath Path to the Latin text file
 * @param englishPath Path to the English text file
 * @returns Promise resolving when the proper is imported
 */
async function importMassProper(
  liturgicalDayId: string,
  latinPath: string,
  englishPath: string
): Promise<void> {
  try {
    // Fetch the Latin text
    const latinText = await fetchTextContent(latinPath);
    if (!latinText) {
      throw new Error(`Failed to fetch Latin text from ${latinPath}`);
    }

    // Fetch the English text
    const englishText = await fetchTextContent(englishPath);
    if (!englishText) {
      throw new Error(`Failed to fetch English text from ${englishPath}`);
    }

    // Parse the texts
    const latinParts = parseMassText(latinText, 'latin');
    const englishParts = parseMassText(englishText, 'english');

    // Create a proper object for the database
    const proper: MassProper = {
      id: `proper_${liturgicalDayId}`,
      date: new Date().toISOString(),
      part: 'proper',
      title: {
        latin: latinParts.title || '',
        english: englishParts.title || ''
      },
      introit: {
        latin: latinParts.introit?.text || '',
        english: englishParts.introit?.text || '',
        reference: latinParts.introit?.reference || englishParts.introit?.reference || ''
      },
      collect: {
        latin: latinParts.collect?.text || '',
        english: englishParts.collect?.text || ''
      },
      epistle: {
        latin: latinParts.epistle?.text || '',
        english: englishParts.epistle?.text || '',
        reference: latinParts.epistle?.reference || englishParts.epistle?.reference || ''
      },
      gradual: {
        latin: latinParts.gradual?.text || '',
        english: englishParts.gradual?.text || ''
      },
      sequence: latinParts.sequence ? {
        latin: latinParts.sequence?.text || '',
        english: englishParts.sequence?.text || '',
        rubric: latinParts.sequence?.rubric || englishParts.sequence?.rubric || ''
      } : undefined,
      gospel: {
        latin: latinParts.gospel?.text || '',
        english: englishParts.gospel?.text || '',
        reference: latinParts.gospel?.reference || englishParts.gospel?.reference || ''
      },
      offertory: {
        latin: latinParts.offertory?.text || '',
        english: englishParts.offertory?.text || '',
        reference: latinParts.offertory?.reference || englishParts.offertory?.reference || ''
      },
      secret: {
        latin: latinParts.secret?.text || '',
        english: englishParts.secret?.text || ''
      },
      communion: {
        latin: latinParts.communion?.text || '',
        english: englishParts.communion?.text || '',
        reference: latinParts.communion?.reference || englishParts.communion?.reference || ''
      },
      postcommunion: {
        latin: latinParts.postcommunion?.text || '',
        english: englishParts.postcommunion?.text || ''
      }
    };

    // Save to the database
    const db = await getDatabase();
    await db.put('mass_texts', proper);

    console.log(`Imported Mass proper for ${liturgicalDayId}`);
  } catch (error: any) {
    console.error(`Error importing Mass proper for ${liturgicalDayId}:`, error);
    throw error;
  }
}

/**
 * Import Mass ordinary
 *
 * @param latinPath Path to the Latin text file
 * @param englishPath Path to the English text file
 * @returns Promise resolving when the ordinary is imported
 */
async function importMassOrdinary(
  latinPath: string,
  englishPath: string
): Promise<void> {
  try {
    // Fetch the Latin text
    const latinText = await fetchTextContent(latinPath);
    if (!latinText) {
      throw new Error(`Failed to fetch Latin text from ${latinPath}`);
    }

    // Fetch the English text
    const englishText = await fetchTextContent(englishPath);
    if (!englishText) {
      throw new Error(`Failed to fetch English text from ${englishPath}`);
    }

    // Parse the texts
    const latinParts = parseMassText(latinText, 'latin');
    const englishParts = parseMassText(englishText, 'english');

    // Create an ordinary object for the database
    const ordinary: MassOrdinary = {
      id: 'ordinary_default',
      date: new Date().toISOString(),
      part: 'ordinary',
      kyrie: {
        latin: latinParts.kyrie?.text || 'Kyrie eleison.\nChriste eleison.\nKyrie eleison.',
        english: englishParts.kyrie?.text || 'Lord, have mercy.\nChrist, have mercy.\nLord, have mercy.'
      },
      gloria: {
        latin: latinParts.gloria?.text || 'Gloria in excelsis Deo...',
        english: englishParts.gloria?.text || 'Glory to God in the highest...'
      },
      credo: {
        latin: latinParts.credo?.text || 'Credo in unum Deum...',
        english: englishParts.credo?.text || 'I believe in one God...'
      },
      sanctus: {
        latin: latinParts.sanctus?.text || 'Sanctus, Sanctus, Sanctus...',
        english: englishParts.sanctus?.text || 'Holy, Holy, Holy...'
      },
      agnus: {
        latin: latinParts.agnus?.text || 'Agnus Dei, qui tollis peccata mundi...',
        english: englishParts.agnus?.text || 'Lamb of God, who takes away the sins of the world...'
      },
      ite: {
        latin: latinParts.ite?.text || 'Ite, missa est.',
        english: englishParts.ite?.text || 'Go, the Mass is ended.'
      }
    };

    // Save to the database
    const db = await getDatabase();
    await db.put('mass_texts', ordinary);

    console.log('Imported Mass ordinary');
  } catch (error: any) {
    console.error('Error importing Mass ordinary:', error);
    throw error;
  }
}

/**
 * Import Office hour for a specific liturgical day
 *
 * @param hourId The ID of the hour (e.g., 'matins', 'lauds')
 * @param liturgicalDayId The ID of the liturgical day (e.g., 'easter_sunday')
 * @param latinPath Path to the Latin text file
 * @param englishPath Path to the English text file
 * @returns Promise resolving when the hour is imported
 */
async function importOfficeHour(
  hourId: string,
  liturgicalDayId: string,
  latinPath: string,
  englishPath: string
): Promise<void> {
  try {
    // Fetch the Latin text
    const latinText = await fetchTextContent(latinPath);
    if (!latinText) {
      throw new Error(`Failed to fetch Latin text from ${latinPath}`);
    }

    // Fetch the English text
    const englishText = await fetchTextContent(englishPath);
    if (!englishText) {
      throw new Error(`Failed to fetch English text from ${englishPath}`);
    }

    // Parse the texts
    const latinParts = parseOfficeText(latinText, 'latin');
    const englishParts = parseOfficeText(englishText, 'english');

    // Create an hour object for the database
    const hour: OfficeHour = {
      id: `${liturgicalDayId}_${hourId}`,
      date: new Date().toISOString(),
      hour: hourId,
      title: {
        latin: latinParts.title || hourId,
        english: englishParts.title || hourId
      },
      hymn: latinParts.hymn ? {
        latin: latinParts.hymn?.text || '',
        english: englishParts.hymn?.text || ''
      } : undefined,
      psalms: (latinParts.psalms || []).map((psalm: any, index: number) => ({
        number: psalm.number,
        title: {
          latin: psalm.title,
          english: englishParts.psalms?.[index]?.title || ''
        },
        text: {
          latin: psalm.text,
          english: englishParts.psalms?.[index]?.text || ''
        }
      })),
      chapter: latinParts.chapter ? {
        latin: latinParts.chapter?.text || '',
        english: englishParts.chapter?.text || '',
        reference: latinParts.chapter?.reference || englishParts.chapter?.reference || ''
      } : undefined,
      readings: (latinParts.readings || []).map((reading: any, index: number) => ({
        number: reading.number,
        text: {
          latin: reading.text,
          english: englishParts.readings?.[index]?.text || ''
        }
      })),
      prayer: latinParts.prayer ? {
        latin: latinParts.prayer?.text || '',
        english: englishParts.prayer?.text || ''
      } : undefined
    };

    // Save to the database
    const db = await getDatabase();
    await db.put('office_texts', hour);

    console.log(`Imported Office hour ${hourId} for ${liturgicalDayId}`);
  } catch (error) {
    console.error(`Error importing Office hour ${hourId} for ${liturgicalDayId}:`, error);
    throw error;
  }
}

/**
 * Import all canonical hours for Easter Sunday
 *
 * @returns Promise resolving when all hours are imported
 */
async function importEasterSundayOffice(): Promise<void> {
  const basePath = '/sanctissimissa-reference/web/www/horas';
  const liturgicalDayId = 'easter_sunday';

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

  // Import each hour
  for (const hour of hours) {
    await importOfficeHour(
      hour.id,
      liturgicalDayId,
      `${basePath}/Latin/Tempora/Pasc0-0/${hour.latinFile}.txt`,
      `${basePath}/English/Tempora/Pasc0-0/${hour.englishFile}.txt`
    );
  }
}

/**
 * Import Easter Sunday Mass texts
 *
 * @returns Promise resolving when the Easter Sunday Mass texts are imported
 */
async function importEasterSundayMass(): Promise<void> {
  const basePath = '/sanctissimissa-reference/web/www/missa';

  // Import the proper
  await importMassProper(
    'easter_sunday',
    `${basePath}/Latin/Tempora/Pasc0-0.txt`,
    `${basePath}/English/Tempora/Pasc0-0.txt`
  );

  // Import the ordinary
  await importMassOrdinary(
    `${basePath}/Latin/Ordo/Ordo.txt`,
    `${basePath}/English/Ordo/Ordo.txt`
  );

  // Link the proper to the liturgical day
  const db = await getDatabase();
  const easterSunday = await db.get('liturgical_days', '2025-04-20');

  if (easterSunday) {
    // Update the liturgical day with a reference to the proper
    easterSunday.massProper = 'easter_sunday';
    await db.put('liturgical_days', easterSunday);
  }
}

/**
 * Directly import all liturgical data
 *
 * @returns Promise resolving when all data is imported
 */
/**
 * Directly import all liturgical data
 * In development mode, this can fall back to creating mock data if reference files are unavailable
 *
 * @returns Promise resolving when all data is imported
 */
export async function directImport(): Promise<void> {
  try {
    console.log('Starting direct import of liturgical data...');

    // Initialize the database
    await initDatabase();
    console.log('Database initialized');

    // Try to import the real data first
    try {
      // Import liturgical calendar
      await importLiturgicalCalendar(2025, 2025);
      console.log('Liturgical calendar imported');

      // Import Easter Sunday Mass
      await importEasterSundayMass();
      console.log('Easter Sunday Mass imported');

      // Import Easter Sunday Office
      await importEasterSundayOffice();
      console.log('Easter Sunday Office imported');

      console.log('Direct import completed successfully!');
      return;
    } catch (importError) {
      console.warn('Could not import real data from reference files:', importError);
      console.warn('Falling back to development mode with mock data...');

      // For development purposes, create some mock data
      await createMockData();
      console.log('Mock data created for development');
    }
  } catch (error) {
    console.error('Error during direct import:', error);
    throw error;
  }
}

/**
 * Create mock data for development when reference files aren't available
 */
async function createMockData(): Promise<void> {
  const db = await getDatabase();

  // Create a sample liturgical day (Easter Sunday 2025)
  const easterSunday = {
    date: '2025-04-20',
    season: 'easter',
    celebration: 'Easter Sunday',
    rank: 1,
    color: 'white',
    commemorations: [],
    isHolyDay: true,
    isFeastDay: true,
    massProper: 'easter_sunday' // We'll add this property
  };

  // Create a sample Mass proper
  const easterMassProper = {
    id: 'easter_sunday',
    title: 'Easter Sunday',
    rank: 'Easter Sunday',
    language: 'english',
    type: 'proper',
    introit: { text: 'I have risen, and I am with you still, alleluia.' },
    collect: { text: 'O God, who on this day, through your Only Begotten Son, have conquered death and unlocked for us the path to eternity, grant, we pray, that we who keep the solemnity of the Lords Resurrection may, through the renewal brought by your Spirit, rise up in the light of life.' },
    epistle: {
      reference: '1 Cor 5:7-8',
      text: 'Brethren: Christ, our paschal lamb, has been sacrificed. Let us then feast with joy in the Lord.'
    },
    gradual: { text: 'This is the day the Lord has made; let us rejoice and be glad in it.' },
    gospel: {
      reference: 'John 20:1-9',
      text: 'On the first day of the week, Mary of Magdala came to the tomb early in the morning, while it was still dark, and saw the stone removed from the tomb.'
    },
    offertory: { text: 'The earth trembled and was still when God arose in judgment, alleluia.' },
    communion: { text: 'Christ our Passover has been sacrificed, alleluia; therefore let us keep the feast with the unleavened bread of purity and truth, alleluia, alleluia, alleluia.' }
  };

  // Create a sample Office hour
  const laudsOffice = {
    id: 'lauds_easter_sunday',
    title: 'Lauds of Easter Sunday',
    date: '2025-04-20',
    hour: 'lauds',
    language: 'english',
    type: 'office',
    antiphons: [
      { text: 'The angel of the Lord came down from heaven and said to the women: The One whom you seek has risen, as he said, alleluia.' },
      { text: 'And behold, there was a great earthquake: for an angel of the Lord descended from heaven, alleluia.' }
    ],
    psalms: [
      { number: 92, text: 'The Lord is king, with majesty enrobed. The Lord has robed himself with might; he has girded himself with power.' },
      { number: 99, text: 'Cry out with joy to the Lord, all the earth. Serve the Lord with gladness. Come before him, singing for joy.' },
      { number: 62, text: 'O God, you are my God, for you I long; for you my soul is thirsting. My body pines for you like a dry, weary land without water.' }
    ],
    hymn: { text: 'The dawn was purpling over the sky, with alleluias the air was ringing, the world exulting was triumphing, and hell was groaning and trembling.' },
    reading: { text: 'Christ is risen from the dead, the first fruits of those who have fallen asleep.' }
  };

  // Save the sample data to the database
  await db.put('liturgical_days', easterSunday);
  await db.put('mass_texts', easterMassProper);
  await db.put('office_texts', laudsOffice);

  console.log('Sample liturgical data created for development');
}

// Execute the direct import if this script is run directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('DOMContentLoaded', () => {
    console.log('Running direct import in browser...');
    directImport().catch(error => {
      console.error('Direct import failed:', error);
    });
  });
} else {
  // Node.js environment (for build scripts)
  directImport().catch(error => {
    console.error('Direct import failed:', error);
    process.exit(1);
  });
}
