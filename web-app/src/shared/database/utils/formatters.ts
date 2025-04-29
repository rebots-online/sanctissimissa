/**
 * Database Formatters
 * 
 * This file contains utility functions for formatting data for the database.
 */

/**
 * Format a date for SQLite (ISO format: YYYY-MM-DD)
 * 
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDateForSqlite(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse a SQLite date string into a Date object
 * 
 * @param dateStr SQLite date string (YYYY-MM-DD)
 * @returns Date object
 */
export function parseSqliteDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * Format a timestamp for SQLite (Unix timestamp in milliseconds)
 * 
 * @param date Date to format
 * @returns Unix timestamp
 */
export function formatTimestampForSqlite(date: Date): number {
  return date.getTime();
}

/**
 * Parse a SQLite timestamp into a Date object
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @returns Date object
 */
export function parseSqliteTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Format a boolean for SQLite (0 or 1)
 * 
 * @param value Boolean value
 * @returns 0 or 1
 */
export function formatBooleanForSqlite(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Parse a SQLite boolean (0 or 1) into a boolean
 * 
 * @param value SQLite boolean (0 or 1)
 * @returns Boolean value
 */
export function parseSqliteBoolean(value: number): boolean {
  return value === 1;
}

/**
 * Format an array for SQLite (JSON string)
 *
 * @param array Array to format
 * @returns JSON string
 */
export function formatArrayForSqlite<T>(array: T[] | string[] | number[] | boolean[]): string {
  return JSON.stringify(array);
}

/**
 * Parse a SQLite array (JSON string) into an array
 * 
 * @param jsonStr JSON string
 * @returns Array
 */
export function parseSqliteArray<T>(jsonStr: string): T[] {
  if (!jsonStr) {
    return [];
  }
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error parsing SQLite array:', error);
    return [];
  }
}

/**
 * Format an object for SQLite (JSON string)
 * 
 * @param obj Object to format
 * @returns JSON string
 */
export function formatObjectForSqlite<T>(obj: T): string {
  return JSON.stringify(obj);
}

/**
 * Parse a SQLite object (JSON string) into an object
 * 
 * @param jsonStr JSON string
 * @returns Object
 */
export function parseSqliteObject<T>(jsonStr: string): T | null {
  if (!jsonStr) {
    return null;
  }
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error parsing SQLite object:', error);
    return null;
  }
}