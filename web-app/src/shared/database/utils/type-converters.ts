/**
 * Type Converters
 *
 * This file contains utility functions for converting between JavaScript and SQLite data types.
 */

// Using a simple UUID implementation to avoid dependency issues
import { formatArrayForSqlite, formatBooleanForSqlite, parseSqliteBoolean } from './formatters';

/**
 * Database value types
 */
export type DbValue = string | number | boolean | null | undefined | string[] | number[] | boolean[] | Record<string, unknown>;

/**
 * SQLite compatible value types
 */
export type SqlValue = string | number | null;

/**
 * Generate a UUID
 *
 * @returns UUID string
 */
export function generateUUID(): string {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Convert a JavaScript value to a SQLite-compatible format
 * 
 * @param value JavaScript value
 * @returns SQLite-compatible value
 */
export function toSqliteFormat(value: DbValue): SqlValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return formatBooleanForSqlite(value);
  }

  if (Array.isArray(value)) {
    return formatArrayForSqlite(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Convert a JavaScript object to a SQLite-compatible format
 * 
 * @param obj JavaScript object
 * @returns Object with SQLite-compatible values
 */
export function objectToSqliteFormat<T extends Record<string, DbValue>>(obj: T): Record<string, SqlValue> {
  const result: Record<string, SqlValue> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      result[key] = toSqliteFormat(value);
    }
  }

  return result;
}

/**
 * Convert a SQLite row to a JavaScript object
 *
 * @param row SQLite row
 * @returns JavaScript object
 */
export function fromSqliteFormat<T extends Record<string, DbValue>>(row: Record<string, unknown>): T {
  const result: Record<string, DbValue> = {};

  // Convert snake_case column names to camelCase property names
  const snakeToCamel = (str: string) =>
    str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      const camelKey = snakeToCamel(key);
      
      // Handle null values
      if (value === null) {
        result[camelKey] = null;
        continue;
      }
      
      // Try to parse JSON strings (arrays and objects)
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          result[camelKey] = JSON.parse(value) as DbValue;
          continue;
        } catch {
          // Not valid JSON, treat as a regular string
        }
      }
      
      // Handle boolean values (stored as 0 or 1)
      if (typeof value === 'number' && (value === 0 || value === 1) &&
          (camelKey.startsWith('is') || camelKey.includes('Is') || camelKey.includes('Has'))) {
        result[camelKey] = parseSqliteBoolean(value);
        continue;
      }
      
      // Use the value as is
      result[camelKey] = value as DbValue;
    }
  }

  return result as T;
}