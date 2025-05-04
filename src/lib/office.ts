import async from 'async';
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

  // For now, return a basic structure
  return {
    id: `${dateStr}_${hour}`,
    hour,
    // Add other fields as needed
  };
}
