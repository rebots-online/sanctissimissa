/**
 * Mass texts import service
 * 
 * This service provides functions for importing Mass texts from pre-processed JSON files
 * into the IndexedDB database.
 */

import { getDatabase } from '../database/db';

/**
 * Interface for Mass text parts
 */
interface MassPart {
  text: string;
  reference?: string;
  rubric?: string;
  ending?: string;
  introduction?: string;
}

/**
 * Interface for Mass proper
 */
interface MassProper {
  id: string;
  date: string;
  part: string;
  title: { latin: string; english: string };
  introit: { latin: MassPart; english: MassPart };
  collect: { latin: MassPart; english: MassPart };
  epistle: { latin: MassPart; english: MassPart };
  gradual: { latin: MassPart; english: MassPart };
  gospel: { latin: MassPart; english: MassPart };
  offertory: { latin: MassPart; english: MassPart };
  secret: { latin: MassPart; english: MassPart };
  communion: { latin: MassPart; english: MassPart };
  postcommunion: { latin: MassPart; english: MassPart };
  sequence?: { latin: MassPart; english: MassPart };
  category?: string;
  day?: string;
}

/**
 * Interface for Mass ordinary
 */
interface MassOrdinary {
  id: string;
  date: string;
  part: string;
  kyrie: { latin: string; english: string };
  gloria: { latin: string; english: string };
  credo: { latin: string; english: string };
  sanctus: { latin: string; english: string };
  agnus: { latin: string; english: string };
  ite: { latin: string; english: string };
}

/**
 * Parse a flat text file for Mass texts
 * 
 * @param content The content of the flat text file
 * @param language The language of the text file ('latin' or 'english')
 * @returns Parsed Mass parts
 */
export function parseMassText(content: string, language: 'latin' | 'english'): Record<string, any> {
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
 * Import Mass proper for a specific liturgical day
 * 
 * @param liturgicalDayId The ID of the liturgical day (e.g., 'easter_sunday')
 * @param latinPath Path to the Latin text file
 * @param englishPath Path to the English text file
 * @returns Promise resolving when the proper is imported
 */
export async function importMassProper(
  liturgicalDayId: string,
  latinPath: string,
  englishPath: string
): Promise<void> {
  try {
    // Fetch the Latin text
    const latinResponse = await fetch(latinPath);
    if (!latinResponse.ok) {
      throw new Error(`Failed to fetch Latin text from ${latinPath}: ${latinResponse.statusText}`);
    }
    const latinText = await latinResponse.text();
    
    // Fetch the English text
    const englishResponse = await fetch(englishPath);
    if (!englishResponse.ok) {
      throw new Error(`Failed to fetch English text from ${englishPath}: ${englishResponse.statusText}`);
    }
    const englishText = await englishResponse.text();
    
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
  } catch (error) {
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
export async function importMassOrdinary(
  latinPath: string,
  englishPath: string
): Promise<void> {
  try {
    // Fetch the Latin text
    const latinResponse = await fetch(latinPath);
    if (!latinResponse.ok) {
      throw new Error(`Failed to fetch Latin text from ${latinPath}: ${latinResponse.statusText}`);
    }
    const latinText = await latinResponse.text();
    
    // Fetch the English text
    const englishResponse = await fetch(englishPath);
    if (!englishResponse.ok) {
      throw new Error(`Failed to fetch English text from ${englishPath}: ${englishResponse.statusText}`);
    }
    const englishText = await englishResponse.text();
    
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
  } catch (error) {
    console.error('Error importing Mass ordinary:', error);
    throw error;
  }
}

/**
 * Import Easter Sunday Mass texts
 * 
 * @returns Promise resolving when the Easter Sunday Mass texts are imported
 */
export async function importEasterSundayMass(): Promise<void> {
  const basePath = '/reference/web/www/missa';
  
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
 * Import Mass texts for today
 * 
 * @returns Promise resolving when the Mass texts for today are imported
 */
export async function importTodayMass(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  try {
    // Get the liturgical day for today
    const db = await getDatabase();
    const liturgicalDay = await db.get('liturgical_days', today);
    
    if (!liturgicalDay) {
      console.warn(`No liturgical day found for today (${today}). Importing Easter Sunday as fallback.`);
      await importEasterSundayMass();
      return;
    }
    
    // Determine the proper file path based on the liturgical day
    // This is a simplified version - in a real implementation, you would need more complex logic
    // to determine the proper file path based on the liturgical calendar
    const season = liturgicalDay.season.toLowerCase();
    const celebration = liturgicalDay.celebration.toLowerCase().replace(/\s+/g, '_');
    
    let properPath = '';
    if (season === 'easter' && celebration === 'easter_sunday') {
      properPath = 'Pasc0-0';
    } else {
      // Default to Easter Sunday for this example
      properPath = 'Pasc0-0';
    }
    
    // Import the proper
    await importMassProper(
      celebration || 'easter_sunday',
      `/reference/web/www/missa/Latin/Tempora/${properPath}.txt`,
      `/reference/web/www/missa/English/Tempora/${properPath}.txt`
    );
    
    // Import the ordinary
    await importMassOrdinary(
      '/reference/web/www/missa/Latin/Ordo/Ordo.txt',
      '/reference/web/www/missa/English/Ordo/Ordo.txt'
    );
    
    // Link the proper to the liturgical day
    liturgicalDay.massProper = celebration || 'easter_sunday';
    await db.put('liturgical_days', liturgicalDay);
    
    console.log(`Imported Mass texts for today (${today})`);
  } catch (error) {
    console.error(`Error importing Mass texts for today (${today}):`, error);
    // Fall back to Easter Sunday
    await importEasterSundayMass();
  }
}

/**
 * Import all Mass texts from pre-processed JSON files
 * 
 * @returns Promise resolving when all Mass texts are imported
 */
export async function importMassTexts(): Promise<void> {
  try {
    console.log('Importing all Mass texts from JSON files...');
    const db = await getDatabase();
    
    // Fetch the Mass propers JSON file
    const propersResponse = await fetch('/data/mass-propers.json');
    if (!propersResponse.ok) {
      throw new Error(`Failed to fetch Mass propers: ${propersResponse.statusText}`);
    }
    
    const massPropers = await propersResponse.json();
    console.log(`Found ${massPropers.length} Mass propers to import`);
    
    // Import Mass propers
    let importedPropers = 0;
    for (const proper of massPropers) {
      // Format the proper for IndexedDB schema
      const formattedProper = {
        id: proper.id,
        date: proper.date || new Date().toISOString(),
        part: proper.part || 'proper',
        // Add all the proper parts as separate fields
        title: proper.title || { latin: '', english: '' },
        introit: proper.introit || { latin: '', english: '' },
        collect: proper.collect || { latin: '', english: '' },
        epistle: proper.epistle || { latin: '', english: '' },
        gradual: proper.gradual || { latin: '', english: '' },
        gospel: proper.gospel || { latin: '', english: '' },
        offertory: proper.offertory || { latin: '', english: '' },
        secret: proper.secret || { latin: '', english: '' },
        communion: proper.communion || { latin: '', english: '' },
        postcommunion: proper.postcommunion || { latin: '', english: '' },
        // Add sequence if it exists
        sequence: proper.sequence,
        // Add category and day if they exist
        category: proper.category,
        day: proper.day
      };
      
      await db.put('mass_texts', formattedProper);
      importedPropers++;
      
      if (importedPropers % 20 === 0) {
        console.log(`Imported ${importedPropers} Mass propers so far...`);
      }
    }
    
    console.log(`Successfully imported ${importedPropers} Mass propers`);
    
    // Fetch the Mass ordinary JSON file
    const ordinaryResponse = await fetch('/data/mass-ordinary.json');
    if (!ordinaryResponse.ok) {
      throw new Error(`Failed to fetch Mass ordinary: ${ordinaryResponse.statusText}`);
    }
    
    const massOrdinary = await ordinaryResponse.json();
    console.log('Found Mass ordinary to import');
    
    // Format the ordinary for IndexedDB schema
    const formattedOrdinary = {
      id: massOrdinary.id || 'ordinary_default',
      date: massOrdinary.date || new Date().toISOString(),
      part: massOrdinary.part || 'ordinary',
      // Add all the ordinary parts
      kyrie: massOrdinary.kyrie || { latin: 'Kyrie eleison', english: 'Lord have mercy' },
      gloria: massOrdinary.gloria || { latin: 'Gloria in excelsis Deo', english: 'Glory to God in the highest' },
      credo: massOrdinary.credo || { latin: 'Credo in unum Deum', english: 'I believe in one God' },
      sanctus: massOrdinary.sanctus || { latin: 'Sanctus, Sanctus, Sanctus', english: 'Holy, Holy, Holy' },
      agnus: massOrdinary.agnus || { latin: 'Agnus Dei', english: 'Lamb of God' },
      ite: massOrdinary.ite || { latin: 'Ite, missa est', english: 'Go, the Mass is ended' }
    };
    
    await db.put('mass_texts', formattedOrdinary);
    console.log('Mass ordinary imported successfully');
    
    // Add default settings
    const defaultSettings = {
      id: 'settings',
      date: new Date().toISOString(),
      part: 'settings',
      language: 'latin',
      showRubrics: true,
      showTranslations: true,
      fontSize: 'medium'
    };
    
    await db.put('mass_texts', defaultSettings);
    console.log('Default settings imported successfully');
    
    return;
  } catch (error) {
    console.error('Error importing Mass texts:', error);
    throw error;
  }
}

/**
 * Import all Office texts from pre-processed JSON files
 * 
 * @returns Promise resolving when all Office texts are imported
 */
export async function importOfficeTexts(): Promise<void> {
  try {
    console.log('Importing all Office texts from JSON files...');
    const db = await getDatabase();
    
    // Fetch the Office texts JSON file
    const response = await fetch('/data/office-texts.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch Office texts: ${response.statusText}`);
    }
    
    const officeTexts = await response.json();
    console.log(`Found ${officeTexts.length} Office hours to import`);
    
    // Import Office hours
    let imported = 0;
    for (const hour of officeTexts) {
      // Format the office hour for IndexedDB schema
      const formattedHour = {
        id: hour.id,
        date: hour.date || new Date().toISOString(),
        hour: hour.hour,
        // Add all the hour parts
        title: hour.title || { latin: '', english: '' },
        category: hour.category || '',
        day: hour.day || '',
        // Add specific parts
        hymn: hour.hymn || { latin: '', english: '' },
        chapter: hour.chapter || { latin: '', english: '' },
        prayer: hour.prayer || { latin: '', english: '' },
        // Add arrays of parts
        psalms: hour.psalms || [],
        readings: hour.readings || [],
        antiphons: hour.antiphons || [],
        responsories: hour.responsories || [],
        benedictions: hour.benedictions || [],
        // Add part field required by schema
        part: hour.hour || 'unknown'
      };
      
      await db.put('office_texts', formattedHour);
      imported++;
      
      if (imported % 20 === 0) {
        console.log(`Imported ${imported} Office hours so far...`);
      }
    }
    
    console.log(`Successfully imported ${imported} Office hours`);
    return imported;
  } catch (error) {
    console.error('Error importing Office texts:', error);
    throw error;
  }
}
