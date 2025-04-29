/**
 * Shared Database Utilities
 *
 * This file contains utility functions for working with SQLite databases
 * that can be shared between web and mobile applications.
 */

import { TableName, DatabaseSchema } from './types';

/**
 * Type for generic database values
 */
export type DbValue = string | number | boolean | null | object | unknown[] | undefined;

/**
 * Type for SQLite-compatible values (excludes undefined)
 */
export type SqlValue = string | number | boolean | null | Uint8Array;

/**
 * Convert a JavaScript object to a SQLite-compatible format
 *
 * @param obj Object to convert
 * @returns SQLite-compatible object
 */
export function toSqliteFormat(obj: Record<string, DbValue>): Record<string, DbValue> {
  const result: Record<string, DbValue> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    if (value === undefined || value === null) {
      result[snakeKey] = null;
    } else if (typeof value === 'boolean') {
      // SQLite doesn't have boolean type, use 0/1 integers
      result[snakeKey] = value ? 1 : 0;
    } else if (Array.isArray(value) || typeof value === 'object') {
      // Serialize arrays and objects to JSON strings
      result[snakeKey] = JSON.stringify(value);
    } else {
      result[snakeKey] = value;
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
export function fromSqliteFormat<T extends Record<string, DbValue>>(row: Record<string, DbValue>): T {
  const result: Record<string, DbValue> = {};
  
  for (const [key, value] of Object.entries(row)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    if (value === null) {
      result[camelKey] = null;
    } else if (typeof value === 'number' && (key.startsWith('is_') || key.endsWith('_flag'))) {
      // Convert 0/1 integers to booleans for fields that look like booleans
      result[camelKey] = value === 1;
    } else if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      // Try to parse JSON strings
      try {
        result[camelKey] = JSON.parse(value);
      } catch {
        result[camelKey] = value;
      }
    } else {
      result[camelKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Generate a SQL INSERT statement for a table
 *
 * @param tableName Name of the table
 * @param data Object containing the data to insert
 * @returns SQL INSERT statement and parameters
 */
export function generateInsertStatement<T extends TableName>(
  tableName: T,
  data: Partial<DatabaseSchema[T]>
): { sql: string; params: DbValue[] } {
  const sqliteData = toSqliteFormat(data as Record<string, DbValue>);
  const columns = Object.keys(sqliteData);
  const placeholders = columns.map(() => '?').join(', ');
  const values = Object.values(sqliteData);
  
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  return { sql, params: values };
}

/**
 * Generate a SQL UPDATE statement for a table
 *
 * @param tableName Name of the table
 * @param data Object containing the data to update
 * @param whereClause WHERE clause for the update
 * @param whereParams Parameters for the WHERE clause
 * @returns SQL UPDATE statement and parameters
 */
export function generateUpdateStatement<T extends TableName>(
  tableName: T,
  data: Partial<DatabaseSchema[T]>,
  whereClause: string,
  whereParams: DbValue[] = []
): { sql: string; params: DbValue[] } {
  const sqliteData = toSqliteFormat(data as Record<string, DbValue>);
  const setClause = Object.keys(sqliteData).map(key => `${key} = ?`).join(', ');
  const values = Object.values(sqliteData);
  
  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
  
  return { sql, params: [...values, ...whereParams] };
}

/**
 * Generate a SQL SELECT statement for a table
 *
 * @param tableName Name of the table
 * @param columns Columns to select (defaults to all)
 * @param whereClause WHERE clause for the select
 * @param whereParams Parameters for the WHERE clause
 * @param orderBy ORDER BY clause
 * @param limit LIMIT clause
 * @param offset OFFSET clause
 * @returns SQL SELECT statement and parameters
 */
export function generateSelectStatement<T extends TableName>(
  tableName: T,
  columns: string[] = ['*'],
  whereClause?: string,
  whereParams: DbValue[] = [],
  orderBy?: string,
  limit?: number,
  offset?: number
): { sql: string; params: DbValue[] } {
  let sql = `SELECT ${columns.join(', ')} FROM ${tableName}`;
  
  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }
  
  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }
  
  if (limit !== undefined) {
    sql += ` LIMIT ${limit}`;
  }
  
  if (offset !== undefined) {
    sql += ` OFFSET ${offset}`;
  }
  
  return { sql, params: whereParams };
}

/**
 * Generate a SQL DELETE statement for a table
 *
 * @param tableName Name of the table
 * @param whereClause WHERE clause for the delete
 * @param whereParams Parameters for the WHERE clause
 * @returns SQL DELETE statement and parameters
 */
export function generateDeleteStatement<T extends TableName>(
  tableName: T,
  whereClause: string,
  whereParams: DbValue[] = []
): { sql: string; params: DbValue[] } {
  const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
  
  return { sql, params: whereParams };
}

/**
 * Generate a UUID for database records
 * 
 * @returns UUID string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format a date as YYYY-MM-DD for SQLite
 * 
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDateForSqlite(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse a SQLite date string to a Date object
 * 
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object
 */
export function parseSqliteDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}