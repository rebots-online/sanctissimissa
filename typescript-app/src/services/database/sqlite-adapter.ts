/**
 * SQLite adapter for mobile database operations
 * 
 * Features:
 * - Asynchronous database operations
 * - Typed query results
 * - Parameterized queries for security
 * - Error handling
 * - Compatible with the DatabaseAdapter interface
 */

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DatabaseAdapter, QueryResult } from '../../shared/database/adapter';
import { TableName, DatabaseSchema } from '../../shared/database/types';
import { DbValue } from '../../shared/database/utils';

export class MobileSQLiteAdapter implements DatabaseAdapter {
  private db: SQLite.WebSQLDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private dbName: string = 'sanctissimissa.db') {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        this.db = SQLite.openDatabase(this.dbName);
        this.isInitialized = true;
        resolve();
      } catch (error) {
        console.error('Error initializing SQLite database:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  async query<T extends Record<string, DbValue>>(
    sql: string,
    params: DbValue[] = []
  ): Promise<QueryResult<T>> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          sql,
          params as any[],
          (_, result) => {
            resolve({
              rows: Array.from({ length: result.rows.length }, (_, i) => 
                result.rows.item(i)
              ) as T[],
              rowCount: result.rows.length
            });
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async querySingle<T extends Record<string, DbValue>>(
    sql: string,
    params: DbValue[] = []
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async execute(sql: string, params: DbValue[] = []): Promise<number> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          sql,
          params as any[],
          (_, result) => {
            resolve(result.rowsAffected);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async beginTransaction(): Promise<void> {
    await this.execute('BEGIN TRANSACTION');
  }

  async commitTransaction(): Promise<void> {
    await this.execute('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  async close(): Promise<void> {
    if (Platform.OS === 'web') {
      // Close not supported on web
      return;
    }
    
    if (this.db) {
      await this.execute('PRAGMA optimize');
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }

  async getAll<T extends TableName>(
    tableName: T,
    orderBy?: string
  ): Promise<DatabaseSchema[T][]> {
    const sql = `SELECT * FROM ${tableName}${orderBy ? ` ORDER BY ${orderBy}` : ''}`;
    const result = await this.query<DatabaseSchema[T]>(sql);
    return result.rows;
  }

  async getById<T extends TableName>(
    tableName: T,
    id: string
  ): Promise<DatabaseSchema[T] | null> {
    const sql = `SELECT * FROM ${tableName} WHERE id = ?`;
    return this.querySingle<DatabaseSchema[T]>(sql, [id]);
  }

  async insert<T extends TableName>(
    tableName: T,
    data: Partial<DatabaseSchema[T]>
  ): Promise<string> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    
    await this.execute(sql, values);
    const result = await this.querySingle<{ id: string }>('SELECT last_insert_rowid() as id');
    return result?.id || '';
  }

  async update<T extends TableName>(
    tableName: T,
    id: string,
    data: Partial<DatabaseSchema[T]>
  ): Promise<number> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const sql = `UPDATE ${tableName} SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    
    return this.execute(sql, [...values, id]);
  }

  async delete<T extends TableName>(
    tableName: T,
    id: string
  ): Promise<number> {
    const sql = `DELETE FROM ${tableName} WHERE id = ?`;
    return this.execute(sql, [id]);
  }

  async findBy<T extends TableName>(
    tableName: T,
    field: string,
    value: DbValue
  ): Promise<DatabaseSchema[T][]> {
    const sql = `SELECT * FROM ${tableName} WHERE ${field} = ?`;
    const result = await this.query<DatabaseSchema[T]>(sql, [value]);
    return result.rows;
  }
}