/**
 * Database Validators
 * 
 * This file contains validation functions for database operations.
 */

import { TableName, DatabaseSchema } from '../types';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate a record for insertion
 * 
 * @param tableName Table name
 * @param data Record data
 * @returns Validation result
 */
export function validateInsert<T extends TableName>(
  tableName: T,
  data: Partial<DatabaseSchema[T]>
): ValidationResult {
  const errors: string[] = [];
  
  // Check for required fields based on table
  switch (tableName) {
    case 'liturgical_days':
      if (!data.date) errors.push('date is required');
      if (!data.season) errors.push('season is required');
      if (!data.celebration) errors.push('celebration is required');
      if (data.rank === undefined) errors.push('rank is required');
      if (!data.color) errors.push('color is required');
      break;
      
    case 'mass_texts':
      if (!data.part) errors.push('part is required');
      if (!data.content) errors.push('content is required');
      break;
      
    case 'office_texts':
      if (!data.hour) errors.push('hour is required');
      if (!data.content) errors.push('content is required');
      break;
      
    case 'psalms':
      if (!data.office_id) errors.push('office_id is required');
      if (data.number === undefined) errors.push('number is required');
      if (!data.content) errors.push('content is required');
      break;
      
    case 'readings':
      if (!data.office_id) errors.push('office_id is required');
      if (data.number === undefined) errors.push('number is required');
      if (!data.content) errors.push('content is required');
      break;
      
    case 'prayers':
      if (!data.category) errors.push('category is required');
      if (!data.title) errors.push('title is required');
      if (!data.content) errors.push('content is required');
      break;
      
    case 'journal_entries':
      if (!data.title) errors.push('title is required');
      if (!data.content) errors.push('content is required');
      if (!data.type) errors.push('type is required');
      if (!data.date) errors.push('date is required');
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a record for update
 * 
 * @param tableName Table name
 * @param id Record ID
 * @param data Record data
 * @returns Validation result
 */
export function validateUpdate<T extends TableName>(
  tableName: T,
  id: string,
  data: Partial<DatabaseSchema[T]>
): ValidationResult {
  const errors: string[] = [];
  
  // Check that ID is valid
  if (!id) {
    errors.push('id is required');
  }
  
  // Check that data is not empty
  if (Object.keys(data).length === 0) {
    errors.push('no fields to update');
  }
  
  // Validate data types based on table
  switch (tableName) {
    case 'liturgical_days':
      if (data.date !== undefined && typeof data.date !== 'string') errors.push('date must be a string');
      if (data.season !== undefined && typeof data.season !== 'string') errors.push('season must be a string');
      if (data.celebration !== undefined && typeof data.celebration !== 'string') errors.push('celebration must be a string');
      if (data.rank !== undefined && typeof data.rank !== 'number') errors.push('rank must be a number');
      if (data.color !== undefined && typeof data.color !== 'string') errors.push('color must be a string');
      break;
      
    case 'mass_texts':
      if (data.part !== undefined && typeof data.part !== 'string') errors.push('part must be a string');
      if (data.content !== undefined && typeof data.content !== 'string') errors.push('content must be a string');
      if (data.day_id !== undefined && typeof data.day_id !== 'string') errors.push('day_id must be a string');
      break;
      
    case 'office_texts':
      if (data.hour !== undefined && typeof data.hour !== 'string') errors.push('hour must be a string');
      if (data.content !== undefined && typeof data.content !== 'string') errors.push('content must be a string');
      if (data.day_id !== undefined && typeof data.day_id !== 'string') errors.push('day_id must be a string');
      break;
      
    case 'psalms':
      if (data.office_id !== undefined && typeof data.office_id !== 'string') errors.push('office_id must be a string');
      if (data.number !== undefined && typeof data.number !== 'number') errors.push('number must be a number');
      if (data.content !== undefined && typeof data.content !== 'string') errors.push('content must be a string');
      break;
      
    case 'readings':
      if (data.office_id !== undefined && typeof data.office_id !== 'string') errors.push('office_id must be a string');
      if (data.number !== undefined && typeof data.number !== 'number') errors.push('number must be a number');
      if (data.content !== undefined && typeof data.content !== 'string') errors.push('content must be a string');
      break;
      
    case 'prayers':
      if (data.category !== undefined && typeof data.category !== 'string') errors.push('category must be a string');
      if (data.title !== undefined && typeof data.title !== 'string') errors.push('title must be a string');
      if (data.content !== undefined && typeof data.content !== 'string') errors.push('content must be a string');
      if (data.latin_content !== undefined && typeof data.latin_content !== 'string') errors.push('latin_content must be a string');
      break;
      
    case 'journal_entries':
      if (data.title !== undefined && typeof data.title !== 'string') errors.push('title must be a string');
      if (data.content !== undefined && typeof data.content !== 'string') errors.push('content must be a string');
      if (data.type !== undefined && typeof data.type !== 'string') errors.push('type must be a string');
      if (data.date !== undefined && typeof data.date !== 'string') errors.push('date must be a string');
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}