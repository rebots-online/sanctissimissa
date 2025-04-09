// TextFileParser.ts
// (C)2025 Sanctissi-Missa Project under the guidance of the new 27Mar2025 Checklist
//
// This service provides basic file parsing logic for mass and office texts, conforming
// to our new import approach. It is referenced in the updated checklist tasks and will
// be integrated with LiturgicalTexts for batch imports, verification, etc.
//

import * as fs from 'expo-file-system'; // Will use expo-file-system for reading the file(s)

// Data structures for returning parsed results
// (We can refine or expand these types once we have real file format examples)
export interface MassTextRecord {
  part: string;
  latin: string;
  english: string;
}

export interface OfficeTextRecord {
  hour: string;
  part: string;
  latin: string;
  english: string;
}

export class TextFileParser {
  /**
   * Parse a text file containing Mass text data and produce a list of MassTextRecord objects.
   * Each line in the file might be expected to follow a format like:
   * part|latin-text|english-text
   */
  static async parseMassFile(fileUri: string): Promise<MassTextRecord[]> {
    const content = await fs.readAsStringAsync(fileUri, { encoding: 'utf8' });
    const lines = content.split('\n');
    const results: MassTextRecord[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        // skip empty lines or lines starting with # (comments)
        continue;
      }
      const parts = trimmed.split('|');
      if (parts.length < 3) {
        // Incomplete line: optionally throw error or skip
        // For now, skipping
        continue;
      }
      const [part, latin, english] = parts;
      results.push({
        part: part.trim(),
        latin: latin.trim(),
        english: english.trim(),
      });
    }

    return results;
  }

  /**
   * Parse a text file for office hour texts, returning OfficeTextRecord objects.
   * Format might be: hour|part|latin-text|english-text
   */
  static async parseOfficeFile(fileUri: string): Promise<OfficeTextRecord[]> {
    const content = await fs.readAsStringAsync(fileUri, { encoding: 'utf8' });
    const lines = content.split('\n');
    const results: OfficeTextRecord[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const parts = trimmed.split('|');
      if (parts.length < 4) {
        // Incomplete line: optionally throw error or skip
        continue;
      }
      const [hour, part, latin, english] = parts;
      results.push({
        hour: hour.trim(),
        part: part.trim(),
        latin: latin.trim(),
        english: english.trim(),
      });
    }

    return results;
  }

  /**
   * Validate file format by scanning lines. Could be refined for specifics
   */
  static validateFileFormat(content: string, type: 'mass' | 'office'): boolean {
    // Very naive approach: just checks that each line has at least 3 or 4 sections
    const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));
    for (const line of lines) {
      const parts = line.split('|');
      if (type === 'mass' && parts.length < 3) {
        return false;
      }
      if (type === 'office' && parts.length < 4) {
        return false;
      }
    }
    return true;
  }

  /**
   * Process or log parsing errors
   */
  static handleParsingErrors(errors: Error[]): void {
    // In a real implementation, we'd gather these and log or surface them in a UI
    for (const err of errors) {
      console.error('Parsing error:', err.message);
    }
  }
}