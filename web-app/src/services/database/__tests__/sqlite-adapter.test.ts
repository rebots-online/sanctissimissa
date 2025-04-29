/**
 * SQLite Adapter Tests
 * 
 * This file contains tests for the SQLite adapter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SQLiteAdapter } from '../sqlite-adapter';

// Mock the SQLite database
vi.mock('expo-sqlite', () => ({
  openDatabase: vi.fn(() => ({
    transaction: vi.fn((callback, errorCallback, successCallback) => {
      callback({
        executeSql: vi.fn((sql, params, successCallback) => {
          // Mock successful query execution
          successCallback(null, {
            rows: {
              length: 0,
              item: () => ({}),
            },
            rowsAffected: 1,
          });
        }),
      });
      if (successCallback) {
        successCallback();
      }
    }),
  })),
}));

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    adapter = new SQLiteAdapter('test.db');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize the database', async () => {
    await expect(adapter.initialize()).resolves.not.toThrow();
  });

  it('should insert a record', async () => {
    const id = await adapter.insert('prayers', {
      id: 'test-id',
      category: 'test-category',
      title: 'Test Prayer',
      content: 'Test content',
    });
    
    expect(id).toBe('test-id');
  });

  it('should update a record', async () => {
    const result = await adapter.update('prayers', 'test-id', {
      title: 'Updated Prayer',
    });
    
    expect(result).toBe(1);
  });

  it('should get a record by ID', async () => {
    // Mock the result for getById
    vi.spyOn(adapter, 'query').mockResolvedValueOnce({
      rows: [{
        id: 'test-id',
        category: 'test-category',
        title: 'Test Prayer',
        content: 'Test content',
      }],
      rowCount: 1,
    });
    
    const record = await adapter.getById('prayers', 'test-id');
    
    expect(record).toEqual({
      id: 'test-id',
      category: 'test-category',
      title: 'Test Prayer',
      content: 'Test content',
    });
  });

  it('should delete a record', async () => {
    const result = await adapter.delete('prayers', 'test-id');
    
    expect(result).toBe(1);
  });

  it('should query records', async () => {
    // Mock the result for query
    vi.spyOn(adapter, 'query').mockResolvedValueOnce({
      rows: [{
        id: 'test-id',
        category: 'test-category',
        title: 'Test Prayer',
        content: 'Test content',
      }],
      rowCount: 1,
    });
    
    const result = await adapter.queryTable('prayers', 'category = ?', ['test-category']);
    
    expect(result).toEqual([{
      id: 'test-id',
      category: 'test-category',
      title: 'Test Prayer',
      content: 'Test content',
    }]);
  });

  it('should execute a SQL statement', async () => {
    const result = await adapter.execute('DELETE FROM prayers WHERE id = ?', ['test-id']);
    
    expect(result).toBe(1);
  });

  it('should handle transactions', async () => {
    await expect(adapter.beginTransaction()).resolves.not.toThrow();
    await expect(adapter.commitTransaction()).resolves.not.toThrow();
    await expect(adapter.rollbackTransaction()).resolves.not.toThrow();
  });
});