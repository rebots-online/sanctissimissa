/**
 * Direct Liturgical Service
 *
 * This service provides direct access to liturgical data using the direct SQLite implementation.
 */

import { 
  initSqliteDatabase, 
  getLiturgicalDay as getSqliteLiturgicalDay,
  getMassTexts
} from './direct-sqlite';
import { LiturgicalDay, MassText } from '../../types/liturgical';

// Initialize the database
let isInitialized = false;

/**
 * Initialize the liturgical service
 */
export async function initLiturgicalService(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await initSqliteDatabase();
    isInitialized = true;
    console.log('Liturgical service initialized');
  } catch (error) {
    console.error('Error initializing liturgical service:', error);
    throw error;
  }
}

/**
 * Get liturgical day information for a specific date
 *
 * @param date Date in YYYY-MM-DD format
 * @returns Promise resolving to liturgical day information
 */
export async function getLiturgicalDay(date: string): Promise<LiturgicalDay | null> {
  await initLiturgicalService();

  try {
    const day = getSqliteLiturgicalDay(date);
    
    if (!day) {
      return null;
    }

    // Map the SQLite result to our LiturgicalDay type
    return {
      date: day.date,
      season: day.season,
      celebration: day.celebration,
      rank: day.rank,
      color: day.color,
      isHolyDay: Boolean(day.is_holy_day),
      isFeastDay: Boolean(day.is_feast_day),
      massProper: day.mass_proper,
      commemorations: day.commemorations ? JSON.parse(day.commemorations) : []
    };
  } catch (error) {
    console.error(`Error getting liturgical day for ${date}:`, error);
    throw error;
  }
}

/**
 * Get mass text for a specific ID
 *
 * @param id Mass text ID
 * @returns Promise resolving to mass text
 */
export async function getMassText(id: string): Promise<MassText | null> {
  await initLiturgicalService();

  try {
    const text = getMassTexts(id);
    
    if (!text) {
      return null;
    }

    // Map the SQLite result to our MassText type
    return {
      id: text.id,
      part: text.part,
      titleLatin: text.title_latin,
      titleEnglish: text.title_english,
      introitLatin: text.introit_latin,
      introitEnglish: text.introit_english,
      introitReference: text.introit_reference,
      collectLatin: text.collect_latin,
      collectEnglish: text.collect_english,
      epistleLatin: text.epistle_latin,
      epistleEnglish: text.epistle_english,
      epistleReference: text.epistle_reference,
      gradualLatin: text.gradual_latin,
      gradualEnglish: text.gradual_english,
      sequenceLatin: text.sequence_latin,
      sequenceEnglish: text.sequence_english,
      sequenceRubric: text.sequence_rubric,
      gospelLatin: text.gospel_latin,
      gospelEnglish: text.gospel_english,
      gospelReference: text.gospel_reference,
      offertoryLatin: text.offertory_latin,
      offertoryEnglish: text.offertory_english,
      offertoryReference: text.offertory_reference,
      secretLatin: text.secret_latin,
      secretEnglish: text.secret_english,
      communionLatin: text.communion_latin,
      communionEnglish: text.communion_english,
      communionReference: text.communion_reference,
      postcommunionLatin: text.postcommunion_latin,
      postcommunionEnglish: text.postcommunion_english
    };
  } catch (error) {
    console.error(`Error getting mass text for ${id}:`, error);
    throw error;
  }
}
