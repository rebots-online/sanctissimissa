/**
 * Database Utilities
 *
 * This file exports utility functions for working with the database
 * that can be shared between web and mobile applications.
 *
 * Note: These modules are not exported directly from the main database index
 * to avoid naming conflicts with the existing utils.ts file. They can be
 * imported directly from this module when needed.
 */

// Import from the parent utils.ts file
import {
  DbValue,
  SqlValue,
  toSqliteFormat,
  fromSqliteFormat,
  generateInsertStatement,
  generateUpdateStatement,
  generateSelectStatement,
  generateDeleteStatement,
  generateUUID,
  formatDateForSqlite,
  parseSqliteDate
} from '../utils';

// Re-export from the parent utils.ts file
export type { DbValue, SqlValue };
export {
  toSqliteFormat,
  fromSqliteFormat,
  generateInsertStatement,
  generateUpdateStatement,
  generateSelectStatement,
  generateDeleteStatement,
  generateUUID,
  formatDateForSqlite,
  parseSqliteDate
};

// Export the validators (which don't conflict with utils.ts)
// Note: We'll implement this in the next step