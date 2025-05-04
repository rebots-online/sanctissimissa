import * as React from 'react';
import { format, isValid, parse } from 'date-fns';

/**
 * Custom date adapter for date-fns
 * 
 * This adapter provides a simplified interface for date operations
 * that works with the installed version of date-fns.
 */
export class CustomDateAdapter {
  /**
   * Format a date according to the specified format string
   * 
   * @param date The date to format
   * @param formatString The format string
   * @returns The formatted date string
   */
  static formatDate(date: Date, formatString: string): string {
    if (!isValid(date)) {
      return '';
    }
    
    return format(date, formatString);
  }
  
  /**
   * Parse a date string according to the specified format string
   * 
   * @param dateString The date string to parse
   * @param formatString The format string
   * @returns The parsed date
   */
  static parseDate(dateString: string, formatString: string): Date | null {
    try {
      const parsedDate = parse(dateString, formatString, new Date());
      return isValid(parsedDate) ? parsedDate : null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }
  
  /**
   * Get the current date
   * 
   * @returns The current date
   */
  static today(): Date {
    return new Date();
  }
  
  /**
   * Check if two dates are the same day
   * 
   * @param date1 The first date
   * @param date2 The second date
   * @returns True if the dates are the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}
