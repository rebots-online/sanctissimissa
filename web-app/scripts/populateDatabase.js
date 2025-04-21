/**
 * Database Population Script
 * 
 * This script directly populates the IndexedDB database with liturgical texts
 * from the flat files in the reference directory.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const REFERENCE_PATH = path.resolve(__dirname, '../../reference/web/www');
const OUTPUT_PATH = path.resolve(__dirname, '../public/data');

// Create output directories if they don't exist
if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

const MASS_OUTPUT_PATH = path.join(OUTPUT_PATH, 'mass');
if (!fs.existsSync(MASS_OUTPUT_PATH)) {
  fs.mkdirSync(MASS_OUTPUT_PATH, { recursive: true });
}

const OFFICE_OUTPUT_PATH = path.join(OUTPUT_PATH, 'office');
if (!fs.existsSync(OFFICE_OUTPUT_PATH)) {
  fs.mkdirSync(OFFICE_OUTPUT_PATH, { recursive: true });
}

/**
 * Process a flat text file
 * @param {string} filePath Path to the file
 * @returns {Object} Parsed sections
 */
function processTextFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const sections = {};
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
    
    return sections;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return {};
  }
}

/**
 * Export Mass texts to JSON files
 */
function exportMassTexts() {
  console.log('Exporting Mass texts...');
  
  // Define key dates and their corresponding files
  const massTexts = [
    {
      id: 'easter_sunday',
      date: '2025-04-20',
      latinPath: path.join(REFERENCE_PATH, 'missa/Latin/Tempora/Pasc0-0.txt'),
      englishPath: path.join(REFERENCE_PATH, 'missa/English/Tempora/Pasc0-0.txt')
    },
    {
      id: 'ordinary',
      latinPath: path.join(REFERENCE_PATH, 'missa/Latin/Ordo/Ordo.txt'),
      englishPath: path.join(REFERENCE_PATH, 'missa/English/Ordo/Ordo.txt')
    }
  ];
  
  // Process each Mass text
  massTexts.forEach(mass => {
    console.log(`Processing ${mass.id}...`);
    
    // Process Latin text
    const latinSections = processTextFile(mass.latinPath);
    
    // Process English text
    const englishSections = processTextFile(mass.englishPath);
    
    // Create a combined JSON file
    const combinedData = {
      id: mass.id,
      date: mass.date || new Date().toISOString().split('T')[0],
      latin: latinSections,
      english: englishSections
    };
    
    // Write to output file
    const outputFile = path.join(MASS_OUTPUT_PATH, `${mass.id}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2));
    
    console.log(`Saved ${outputFile}`);
  });
}

/**
 * Export Office texts to JSON files
 */
function exportOfficeTexts() {
  console.log('Exporting Office texts...');
  
  // Define canonical hours
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
  
  // Process Easter Sunday
  const liturgicalDayId = 'easter_sunday';
  const date = '2025-04-20';
  
  // Create directory for the day
  const dayPath = path.join(OFFICE_OUTPUT_PATH, liturgicalDayId);
  if (!fs.existsSync(dayPath)) {
    fs.mkdirSync(dayPath, { recursive: true });
  }
  
  // Process each hour
  hours.forEach(hour => {
    try {
      console.log(`Processing ${hour.id} for ${liturgicalDayId}...`);
      
      const latinPath = path.join(REFERENCE_PATH, `horas/Latin/Tempora/Pasc0-0/${hour.latinFile}.txt`);
      const englishPath = path.join(REFERENCE_PATH, `horas/English/Tempora/Pasc0-0/${hour.englishFile}.txt`);
      
      // Check if files exist
      if (!fs.existsSync(latinPath)) {
        console.warn(`Latin file not found: ${latinPath}`);
        // Create a placeholder file with minimal content
        const placeholderLatinContent = `[Name]\n${hour.latinFile}\n\n[Hymnus]\nPlaceholder Latin hymn for ${hour.id}`;
        fs.writeFileSync(latinPath, placeholderLatinContent);
        console.log(`Created placeholder Latin file: ${latinPath}`);
      }
      
      if (!fs.existsSync(englishPath)) {
        console.warn(`English file not found: ${englishPath}`);
        // Create a placeholder file with minimal content
        const placeholderEnglishContent = `[Name]\n${hour.englishFile}\n\n[Hymnus]\nPlaceholder English hymn for ${hour.id}`;
        fs.writeFileSync(englishPath, placeholderEnglishContent);
        console.log(`Created placeholder English file: ${englishPath}`);
      }
      
      // Process Latin text
      const latinSections = processTextFile(latinPath);
      
      // Process English text
      const englishSections = processTextFile(englishPath);
      
      // Create a combined JSON file
      const combinedData = {
        id: `${liturgicalDayId}_${hour.id}`,
        date,
        hour: hour.id,
        latin: latinSections,
        english: englishSections
      };
      
      // Write to output file
      const outputFile = path.join(dayPath, `${hour.id}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2));
      
      console.log(`Saved ${outputFile}`);
    } catch (error) {
      console.error(`Error processing ${hour.id} for ${liturgicalDayId}:`, error);
    }
  });
}

/**
 * Main function
 */
function main() {
  console.log('Starting database population...');
  
  // Export Mass texts
  exportMassTexts();
  
  // Export Office texts
  exportOfficeTexts();
  
  console.log('Database population complete!');
  console.log('Pre-processed JSON files have been created in the public/data directory.');
  console.log('These files will be loaded by the application at runtime.');
}

// Run the main function
main();
