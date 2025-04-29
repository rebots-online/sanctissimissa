/**
 * Query Builders
 * 
 * This file contains utility functions for building SQL queries.
 */

import { TableName, DatabaseSchema } from '../types';
import { DbValue } from './type-converters';

/**
 * Generate a SQL INSERT statement
 * 
 * @param tableName Table name
 * @param data Record data
 * @returns SQL statement and parameters
 */
export function generateInsertStatement<T extends TableName>(
  tableName: T,
  data: Partial<DatabaseSchema[T]>
): { sql: string; params: DbValue[] } {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: DbValue[] = [];

  // Convert camelCase object properties to snake_case for SQL columns
  const camelToSnake = (str: string) =>
    str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  // Process each property in the data object
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      // Convert camelCase property name to snake_case column name
      const columnName = camelToSnake(key);
      
      columns.push(columnName);
      placeholders.push('?');
      values.push(value);
    }
  }

  // Build the SQL statement
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

  return { sql, params: values };
}

/**
 * Generate a SQL UPDATE statement
 * 
 * @param tableName Table name
 * @param id Record ID
 * @param data Record data
 * @returns SQL statement and parameters
 */
export function generateUpdateStatement<T extends TableName>(
  tableName: T,
  id: string,
  data: Partial<DatabaseSchema[T]>
): { sql: string; params: DbValue[] } {
  const setStatements: string[] = [];
  const values: DbValue[] = [];

  // Convert camelCase object properties to snake_case for SQL columns
  const camelToSnake = (str: string) => 
    str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  // Process each property in the data object
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && key !== 'id') {
      const value = data[key];
      
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      // Convert camelCase property name to snake_case column name
      const columnName = camelToSnake(key);
      
      setStatements.push(`${columnName} = ?`);
      values.push(value);
    }
  }

  // Add the ID to the parameters
  values.push(id);

  // Build the SQL statement
  const sql = `UPDATE ${tableName} SET ${setStatements.join(', ')} WHERE id = ?`;

  return { sql, params: values };
}

/**
 * Generate a SQL SELECT statement
 * 
 * @param tableName Table name
 * @param id Record ID (optional)
 * @param whereClause Additional WHERE clause (optional)
 * @param params Query parameters (optional)
 * @returns SQL statement and parameters
 */
export function generateSelectStatement<T extends TableName>(
  tableName: T,
  id?: string,
  whereClause?: string,
  params?: DbValue[]
): { sql: string; params: DbValue[] } {
  let sql = `SELECT * FROM ${tableName}`;
  const values: DbValue[] = [];

  if (id) {
    sql += ' WHERE id = ?';
    values.push(id);
  } else if (whereClause) {
    sql += ` WHERE ${whereClause}`;
    if (params) {
      values.push(...params);
    }
  }

  return { sql, params: values };
}

/**
 * Generate a SQL DELETE statement
 * 
 * @param tableName Table name
 * @param id Record ID
 * @returns SQL statement and parameters
 */
export function generateDeleteStatement<T extends TableName>(
  tableName: T,
  id: string
): { sql: string; params: DbValue[] } {
  const sql = `DELETE FROM ${tableName} WHERE id = ?`;
  return { sql, params: [id] };
}

/**
 * Generate a SQL SELECT statement to find records by field value
 * 
 * @param tableName Table name
 * @param field Field name
 * @param value Field value
 * @returns SQL statement and parameters
 */
export function generateFindByStatement<T extends TableName>(
  tableName: T,
  field: keyof DatabaseSchema[T] & string,
  value: DbValue
): { sql: string; params: DbValue[] } {
  // Convert camelCase field name to snake_case column name
  const camelToSnake = (str: string) => 
    str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  
  const columnName = camelToSnake(field);
  
  const sql = `SELECT * FROM ${tableName} WHERE ${columnName} = ?`;
  return { sql, params: [value] };
}