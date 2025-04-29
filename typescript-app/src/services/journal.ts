/**
 * Journal Service
 * 
 * This service provides access to journal entries through the mobile database adapter.
 * It handles both text entries and audio recordings.
 */

import { getDatabaseAdapter } from './database';
import { JournalEntry, JournalEntryType } from '../types/journal';
import * as FileSystem from 'expo-file-system';

// Directory for storing audio recordings
const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;

/**
 * Get all journal entries
 * @returns Promise resolving to array of journal entries
 */
export const getAllJournalEntries = async (): Promise<JournalEntry[]> => {
  try {
    const db = await getDatabaseAdapter();
    const result = await db.query<JournalEntry>(
      'SELECT * FROM journal_entries ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting journal entries:', error);
    throw error;
  }
};

/**
 * Get journal entries by date
 * @param date Date in YYYY-MM-DD format
 * @returns Promise resolving to array of journal entries
 */
export const getJournalEntriesByDate = async (date: string): Promise<JournalEntry[]> => {
  try {
    const db = await getDatabaseAdapter();
    return await db.findBy('journal_entries', 'date', date);
  } catch (error) {
    console.error('Error getting journal entries by date:', error);
    throw error;
  }
};

/**
 * Save a journal entry
 * @param entry Journal entry to save
 * @param audioUri Optional URI of audio recording
 * @returns Promise resolving to success status
 */
export const saveJournalEntry = async (
  entry: JournalEntry,
  audioUri?: string
): Promise<boolean> => {
  try {
    const db = await getDatabaseAdapter();
    const timestamp = Date.now();

    // Ensure audio directory exists
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });

    // If there's an audio recording, save it to the file system
    if (audioUri) {
      const audioFileName = `${entry.id}.m4a`;
      const audioPath = `${AUDIO_DIR}${audioFileName}`;
      
      // Copy audio file to app's document directory
      await FileSystem.copyAsync({
        from: audioUri,
        to: audioPath
      });
      
      // Update entry with audio file path
      entry.audioPath = audioPath;
      entry.type = entry.content ? JournalEntryType.MIXED : JournalEntryType.AUDIO;
    } else {
      entry.type = JournalEntryType.TEXT;
    }

    // Check if entry exists
    const existingEntry = await db.getById('journal_entries', entry.id);
    
    if (existingEntry) {
      // Update existing entry
      await db.update('journal_entries', entry.id, {
        ...entry,
        updatedAt: timestamp
      });
    } else {
      // Insert new entry
      await db.insert('journal_entries', {
        ...entry,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving journal entry:', error);
    throw error;
  }
};

/**
 * Delete a journal entry
 * @param id Journal entry ID
 * @returns Promise resolving to success status
 */
export const deleteJournalEntry = async (id: string): Promise<boolean> => {
  try {
    const db = await getDatabaseAdapter();
    
    // Get entry to check for audio file
    const entry = await db.getById('journal_entries', id);
    
    if (entry?.audioPath) {
      // Delete audio file if it exists
      try {
        await FileSystem.deleteAsync(entry.audioPath);
      } catch (error) {
        console.warn('Error deleting audio file:', error);
        // Continue with entry deletion even if audio file deletion fails
      }
    }
    
    // Delete the entry from the database
    await db.delete('journal_entries', id);
    return true;
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    throw error;
  }
};

/**
 * Get audio recording for a journal entry
 * @param id Journal entry ID
 * @returns Promise resolving to audio file URI or null if no audio exists
 */
export const getJournalEntryAudio = async (id: string): Promise<string | null> => {
  try {
    const db = await getDatabaseAdapter();
    const entry = await db.getById('journal_entries', id);
    
    if (entry?.audioPath) {
      const audioInfo = await FileSystem.getInfoAsync(entry.audioPath);
      
      if (audioInfo.exists) {
        return entry.audioPath;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting journal entry audio:', error);
    throw error;
  }
};