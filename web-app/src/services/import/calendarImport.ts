import { getDatabase } from '../database/db';
import { getLiturgicalDay } from '../calendar/liturgicalCalendar';
import type { LiturgicalDay as DayRecord } from '../../models/calendar';

/**
 * Generate and import every liturgical day between startYear and endYear (inclusive).
 * Stores each day in the 'liturgical_days' IndexedDB store.
 *
 * @param startYear first calendar year to import (e.g. 2025)
 * @param endYear last calendar year to import (e.g. 2026)
 */
export async function importLiturgicalCalendar(
  startYear: number,
  endYear: number
): Promise<void> {
  const db = await getDatabase();

  for (let year = startYear; year <= endYear; year++) {
    let cursor = new Date(year, 0, 1);
    while (cursor.getFullYear() === year) {
      const entry: DayRecord = getLiturgicalDay(cursor);
      await db.put('liturgical_days', entry);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
}
