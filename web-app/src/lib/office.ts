// Import the database functions
import * as db from '../services/database/sqlite';

// src/lib/office.ts
export async function loadOfficeText(dateStr: string, hour: string) {
  const id = `${dateStr}_${hour}`; // e.g., "2025-05-04_vespers"

  try {
    // Changed from "office_text" to "office_texts" to match the actual table name
    let row = db.querySingle(`SELECT * FROM office_texts WHERE id = ?`, [id]);

    // If no specific office text is found, fall back to an on-the-fly assembly
    if (!row) {
      // Fall back to an on-the-fly assembly
      row = await generateOfficeText(dateStr, hour);
    }

    return row;
  } catch (error) {
    console.error('Error loading office text:', error);
    throw error;
  }
}

// Function to generate office texts dynamically
export async function generateOfficeText(dateStr: string, hour: string) {
  // This function will be called if no pre-generated office text is found
  // It will assemble the office text from various components

  try {
    console.log(`Generating office text for ${dateStr} ${hour}`);

    // Get the liturgical day information
    const liturgicalDayQuery = `SELECT * FROM liturgical_days WHERE date = ?`;
    const liturgicalDay = await db.querySingle(liturgicalDayQuery, [dateStr]);

    if (!liturgicalDay) {
      console.warn(`No liturgical day found for ${dateStr}`);
      // Return a basic structure if no liturgical day is found
      return {
        id: `${dateStr}_${hour}`,
        hour,
        titleLatin: 'Dies non invenitur',
        titleEnglish: 'Day not found',
        generated: true
      };
    }

    console.log(`Found liturgical day: ${JSON.stringify(liturgicalDay)}`);

    // Get the psalms for this hour
    const psalmsQuery = `
      SELECT * FROM psalms
      WHERE office_id LIKE ?
      ORDER BY number
    `;
    const psalms = await db.query(psalmsQuery, [`%_${hour}`]);

    // Get the readings for this hour
    const readingsQuery = `
      SELECT * FROM readings
      WHERE office_id LIKE ?
      ORDER BY number
    `;
    const readings = await db.query(readingsQuery, [`%_${hour}`]);

    // Construct a complete office text
    return {
      id: `${dateStr}_${hour}`,
      hour,
      date: dateStr,
      titleLatin: `${capitalize(hour)} - ${liturgicalDay.celebration || liturgicalDay.season}`,
      titleEnglish: `${capitalize(hour)} - ${liturgicalDay.celebration || liturgicalDay.season}`,
      hymnLatin: 'Hymnus generatus',
      hymnEnglish: 'Generated Hymn',
      chapterLatin: 'Capitulum generatum',
      chapterEnglish: 'Generated Chapter',
      chapterReference: 'Gen 1:1',
      prayerLatin: 'Oratio generata',
      prayerEnglish: 'Generated Prayer',
      psalms: psalms || [],
      readings: readings || [],
      season: liturgicalDay.season,
      celebration: liturgicalDay.celebration,
      color: liturgicalDay.color,
      rank: liturgicalDay.rank,
      generated: true
    };
  } catch (error) {
    console.error('Error generating office text:', error);
    // Return a basic structure in case of error
    return {
      id: `${dateStr}_${hour}`,
      hour,
      titleLatin: 'Error generando',
      titleEnglish: 'Error generating',
      generated: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to capitalize the first letter of a string
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
