/**
 * Data Import Script
 * 
 * This script imports liturgical data into the IndexedDB database during the build process.
 * It should be run before building the application for production.
 */

// Use Node.js file system to read flat files
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths
const REFERENCE_PATH = path.resolve(__dirname, '../../sanctissimissa-reference/web/www');
const OUTPUT_PATH = path.resolve(__dirname, '../public/data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

// Create mass directory
const MASS_OUTPUT_PATH = path.join(OUTPUT_PATH, 'mass');
if (!fs.existsSync(MASS_OUTPUT_PATH)) {
  fs.mkdirSync(MASS_OUTPUT_PATH, { recursive: true });
}

// Create office directory
const OFFICE_OUTPUT_PATH = path.join(OUTPUT_PATH, 'office');
if (!fs.existsSync(OFFICE_OUTPUT_PATH)) {
  fs.mkdirSync(OFFICE_OUTPUT_PATH, { recursive: true });
}

// Create prayers directory
const PRAYERS_OUTPUT_PATH = path.join(OUTPUT_PATH, 'prayers');
if (!fs.existsSync(PRAYERS_OUTPUT_PATH)) {
  fs.mkdirSync(PRAYERS_OUTPUT_PATH, { recursive: true });
}

/**
 * Process Mass text file
 * @param {string} filePath Path to the text file
 * @returns {Object} Parsed Mass text
 */
function processMassText(filePath) {
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
 * Import Mass texts
 */
function importMassTexts() {
  console.log('Importing Mass texts...');
  
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
    const latinSections = processMassText(mass.latinPath);
    
    // Process English text
    const englishSections = processMassText(mass.englishPath);
    
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
 * Import Office texts
 */
function importOfficeTexts() {
  console.log('Importing Office texts...');
  // Collect all .txt files under horas/Latin and horas/English
  const horasLatinDir = path.join(REFERENCE_PATH, 'horas/Latin');
  const horasEnglishDir = path.join(REFERENCE_PATH, 'horas/English');
  const outputDir = OFFICE_OUTPUT_PATH;
  function importHorasDir(langDir, lang) {
    if (!fs.existsSync(langDir)) return;
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.txt'));
    files.forEach(file => {
      const filePath = path.join(langDir, file);
      const sections = processMassText(filePath);
      const outputFile = path.join(outputDir, `${file.replace('.txt','')}.${lang}.json`);
      fs.writeFileSync(outputFile, JSON.stringify({ id: file.replace('.txt',''), lang, sections }, null, 2));
      console.log(`Saved ${outputFile}`);
    });
  }
  importHorasDir(horasLatinDir, 'latin');
  importHorasDir(horasEnglishDir, 'english');
}

/**
 * Import Prayers
 */
function importPrayers() {
  console.log('Importing Prayers...');
  // Add sparse placeholder prayers and Rosary instructions
  const prayers = [
    { id: 'pater_noster', title: 'Pater Noster (Our Father)', text: 'Pater noster, qui es in caelis, sanctificetur nomen tuum...'},
    { id: 'ave_maria', title: 'Ave Maria (Hail Mary)', text: 'Ave Maria, gratia plena, Dominus tecum...'},
    { id: 'gloria_patri', title: 'Gloria Patri (Glory Be)', text: 'Gloria Patri, et Filio, et Spiritui Sancto...'},
    { id: 'doxology', title: 'Doxology', text: 'Per omnia saecula saeculorum. Amen.'},
    { id: 'hail_holy_queen', title: 'Salve Regina (Hail Holy Queen)', text: 'Salve Regina, mater misericordiæ...'},
    { id: 'rosary_instructions', title: 'Rosary Instructions', text: 'Pray the Rosary: Begin with the Sign of the Cross, then the Apostles’ Creed, 1 Our Father, 3 Hail Marys, 1 Glory Be. For each decade: 1 Our Father, 10 Hail Marys, 1 Glory Be, Fatima Prayer. Announce the Mystery for the season (Joyful, Sorrowful, Glorious, Luminous). End with Hail Holy Queen.'}
  ];
  prayers.forEach(prayer => {
    const outputFile = path.join(PRAYERS_OUTPUT_PATH, `${prayer.id}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(prayer, null, 2));
    console.log(`Saved ${outputFile}`);
  });
}

/**
 * Main function
 */
function main() {
  console.log('Starting data import...');
  
  // Import Mass texts
  importMassTexts();
  
  // Import Office texts
  importOfficeTexts();
  
  // Import Prayers
  importPrayers();
  
  console.log('Data import complete!');
}

// Run the main function
main();
