import { Database, QueryExecResult } from 'sql.js';
import { DbValue } from '../../shared/database/utils';

/**
 * SQLite adapter for client-side database operations
 * 
 * Features:
 * - Asynchronous database operations
 * - Typed query results
 * - Parameterized queries for security
 * - Error handling
 */
export class SQLiteAdapter {
  private db: Database | null = null;
  private dbName: string;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Create a new SQLite adapter
   * @param dbName Database file name
   */
  constructor(dbName: string = 'sanctissimissa.sqlite') {
    this.dbName = dbName;
  }

  /**
   * Initialize the database
   * @returns Promise that resolves when the database is initialized
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Load SQL.js
        const SQL = await import('sql.js');
        
        // Fetch the database file
        const response = await fetch(`/${this.dbName}`);
        const arrayBuffer = await response.arrayBuffer();
        const uInt8Array = new Uint8Array(arrayBuffer);
        
        // Create the database
        this.db = new SQL.Database(uInt8Array);
        this.isInitialized = true;
        resolve();
      } catch (error) {
        console.error('Error initializing SQLite database:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Execute a SQL query
   * @param query SQL query
   * @param params Query parameters
   * @returns Query results
   */
  async executeQuery<T = Record<string, DbValue>>(
    query: string,
    params: DbValue[] = []
  ): Promise<T[]> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Execute the query
      const results: QueryExecResult[] = this.db.exec({
        sql: query,
        bind: params,
      });

      if (results.length === 0) {
        return [];
      }

      // Convert the results to an array of objects
      const { columns, values } = results[0];
      return values.map((row) => {
        const obj: Record<string, DbValue> = {};
        columns.forEach((column, index) => {
          obj[column] = row[index];
        });
        return obj as unknown as T;
      });
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query that doesn't return results
   * @param query SQL query
   * @param params Query parameters
   * @returns Number of rows affected
   */
  async executeNonQuery(query: string, params: DbValue[] = []): Promise<number> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Execute the query
      const statement = this.db.prepare(query);
      statement.bind(params);
      
      // Run the query and get the number of rows affected
      statement.step();
      const rowsAffected = this.db.getRowsModified();
      statement.free();
      
      return rowsAffected;
    } catch (error) {
      console.error('Error executing non-query:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL transaction
   * @param queries SQL queries to execute in a transaction
   * @returns Whether the transaction was successful
   */
  async executeTransaction(
    queries: { query: string; params: DbValue[] }[]
  ): Promise<boolean> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Begin transaction
      this.db.exec('BEGIN TRANSACTION');

      // Execute each query
      for (const { query, params } of queries) {
        const statement = this.db.prepare(query);
        statement.bind(params);
        statement.step();
        statement.free();
      }

      // Commit transaction
      this.db.exec('COMMIT');
      return true;
    } catch (error) {
      // Rollback transaction on error
      console.error('Error executing transaction:', error);
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}