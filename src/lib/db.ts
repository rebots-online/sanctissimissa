/**
 * Database connection for SanctissiMissa
 *
 * This is a simplified wrapper around the SQLite database
 */

// Import the actual database implementation
import * as sqliteAdapter from '../services/database/sqlite';

// Export a simplified interface for use in other modules
export const db = {
  /**
   * Execute a SQL query
   *
   * @param sql SQL query to execute
   * @param params Parameters for the query
   * @returns Query result
   */
  query: async (sql: string, params: any[] = []): Promise<any> => {
    return sqliteAdapter.query(sql, params);
  },

  /**
   * Get a single row by ID
   *
   * @param table Table name
   * @param id ID of the row
   * @returns Row or null if not found
   */
  getById: async (table: string, id: string): Promise<any | null> => {
    return sqliteAdapter.querySingle(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  }
};
