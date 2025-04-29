/**
 * Database Utilities
 * 
 * This file contains shared database utility types and functions.
 */

/**
 * Valid database value types
 */
export type DbValue = string | number | boolean | null | Blob | undefined;

/**
 * Convert a value to a string for SQL
 */
export function sqlEscape(value: DbValue): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (value instanceof Blob) {
    throw new Error('Blob values must be handled separately');
  }
  return `'${value.toString().replace(/'/g, "''")}'`;
}

/**
 * Create a parameterized SQL query
 */
export function createParameterizedQuery(sql: string, params: DbValue[]): string {
  let index = 0;
  return sql.replace(/\?/g, () => sqlEscape(params[index++]));
}

/**
 * Validate table name to prevent SQL injection
 */
export function validateTableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Validate field name to prevent SQL injection
 */
export function validateFieldName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Create comma-separated list of field names
 */
export function createFieldList(fields: string[]): string {
  return fields.map(field => {
    if (!validateFieldName(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    return field;
  }).join(', ');
}

/**
 * Create SET clause for UPDATE statement
 */
export function createSetClause(fields: string[], params: DbValue[]): string {
  return fields.map((field, index) => {
    if (!validateFieldName(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    return `${field} = ${sqlEscape(params[index])}`;
  }).join(', ');
}

/**
 * Create INSERT VALUES clause
 */
export function createValuesClause(params: DbValue[]): string {
  return `(${params.map(param => sqlEscape(param)).join(', ')})`;
}

/**
 * Create WHERE clause with optional parameters
 */
export function createWhereClause(conditions: string[], params: DbValue[]): string {
  if (conditions.length === 0) {
    return '';
  }
  let index = 0;
  const whereClause = conditions.map(condition => 
    condition.replace(/\?/g, () => sqlEscape(params[index++]))
  ).join(' AND ');
  return `WHERE ${whereClause}`;
}