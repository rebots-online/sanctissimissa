/**
 * Database Adapter Interface
 *
 * This file defines a common interface for database operations
 * that can be implemented for different platforms (web, mobile).
 */

import { TableName, DatabaseSchema } from './types';
import { DbValue } from './utils';

/**
 * Database query result
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Database adapter interface
 */
export interface DatabaseAdapter {
  /**
   * Initialize the database
   */
  initialize(): Promise<void>;
  
  /**
   * Execute a SQL query
   *
   * @param sql SQL query
   * @param params Query parameters
   * @returns Query result
   */
  query<T extends Record<string, DbValue>>(sql: string, params?: DbValue[]): Promise<QueryResult<T>>;
  
  /**
   * Execute a SQL query and return a single result
   *
   * @param sql SQL query
   * @param params Query parameters
   * @returns Single result or null if no results
   */
  querySingle<T extends Record<string, DbValue>>(sql: string, params?: DbValue[]): Promise<T | null>;
  
  /**
   * Execute a SQL statement that doesn't return results
   * 
   * @param sql SQL statement
   * @param params Statement parameters
   * @returns Number of affected rows
   */
  execute(sql: string, params?: DbValue[]): Promise<number>;
  
  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<void>;
  
  /**
   * Commit a transaction
   */
  commitTransaction(): Promise<void>;
  
  /**
   * Rollback a transaction
   */
  rollbackTransaction(): Promise<void>;
  
  /**
   * Close the database connection
   */
  close(): Promise<void>;
  
  /**
   * Get all records from a table
   * 
   * @param tableName Table name
   * @param orderBy Optional ORDER BY clause
   * @returns All records in the table
   */
  getAll<T extends TableName>(
    tableName: T,
    orderBy?: string
  ): Promise<DatabaseSchema[T][]>;
  
  /**
   * Get a record by ID
   * 
   * @param tableName Table name
   * @param id Record ID
   * @returns Record with the specified ID or null if not found
   */
  getById<T extends TableName>(
    tableName: T,
    id: string
  ): Promise<DatabaseSchema[T] | null>;
  
  /**
   * Insert a record
   * 
   * @param tableName Table name
   * @param data Record data
   * @returns Inserted record ID
   */
  insert<T extends TableName>(
    tableName: T,
    data: Partial<DatabaseSchema[T]>
  ): Promise<string>;
  
  /**
   * Update a record
   * 
   * @param tableName Table name
   * @param id Record ID
   * @param data Record data
   * @returns Number of affected rows
   */
  update<T extends TableName>(
    tableName: T,
    id: string,
    data: Partial<DatabaseSchema[T]>
  ): Promise<number>;
  
  /**
   * Delete a record
   * 
   * @param tableName Table name
   * @param id Record ID
   * @returns Number of affected rows
   */
  delete<T extends TableName>(
    tableName: T,
    id: string
  ): Promise<number>;
  
  /**
   * Find records by a field value
   * 
   * @param tableName Table name
   * @param field Field name
   * @param value Field value
   * @returns Records matching the field value
   */
  findBy<T extends TableName>(
    tableName: T,
    field: string,
    value: DbValue
  ): Promise<DatabaseSchema[T][]>;
}