/**
 * Copy Reference Files Script
 *
 * This script copies all necessary files from the original Divinum Officium repository
 * to our reference directory for use in building the SQLite database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination paths
const SOURCE_PATH = '/tmp/divinum-officium/web/www';
const DEST_PATH = path.join(__dirname, '../../sanctissimissa-reference/web/www');

/**
 * Copy directory recursively
 *
 * @param src Source directory
 * @param dest Destination directory
 */
function copyDirectory(src: string, dest: string): void {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Get all files and directories in the source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main function to copy reference files
 */
function copyReferenceFiles(): void {
  try {
    console.log('Copying reference files...');

    // Check if the source directory exists
    if (!fs.existsSync(SOURCE_PATH)) {
      console.error(`Source directory ${SOURCE_PATH} does not exist.`);
      console.log('Cloning the repository...');

      execSync('git clone https://github.com/DivinumOfficium/divinum-officium.git /tmp/divinum-officium', {
        stdio: 'inherit'
      });

      if (!fs.existsSync(SOURCE_PATH)) {
        console.error('Failed to clone the repository.');
        process.exit(1);
      }
    }

    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(DEST_PATH)) {
      fs.mkdirSync(DEST_PATH, { recursive: true });
    }

    // Copy the missa directory
    const missaSrc = path.join(SOURCE_PATH, 'missa');
    const missaDest = path.join(DEST_PATH, 'missa');

    console.log(`Copying missa files from ${missaSrc} to ${missaDest}...`);
    copyDirectory(missaSrc, missaDest);

    // Copy the horas directory
    const horasSrc = path.join(SOURCE_PATH, 'horas');
    const horasDest = path.join(DEST_PATH, 'horas');

    console.log(`Copying horas files from ${horasSrc} to ${horasDest}...`);
    copyDirectory(horasSrc, horasDest);

    console.log('Reference files copied successfully.');
  } catch (error) {
    console.error('Error copying reference files:', error);
    process.exit(1);
  }
}

// Run the script
copyReferenceFiles();
