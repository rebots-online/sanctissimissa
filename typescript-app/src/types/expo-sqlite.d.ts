declare module 'expo-sqlite' {
  export interface SQLResultSet {
    insertId: number;
    rowsAffected: number;
    rows: {
      length: number;
      item: (idx: number) => any;
      _array: any[];
    };
  }

  export interface SQLTransaction {
    executeSql: (
      sqlStatement: string,
      args?: any[],
      success?: (tx: SQLTransaction, resultSet: SQLResultSet) => void,
      error?: (tx: SQLTransaction, error: Error) => boolean
    ) => void;
  }

  export interface WebSQLDatabase {
    transaction: (
      callback: (tx: SQLTransaction) => void,
      error?: (error: Error) => void,
      success?: () => void
    ) => void;
    readTransaction: (
      callback: (tx: SQLTransaction) => void,
      error?: (error: Error) => void,
      success?: () => void
    ) => void;
    closeAsync: () => Promise<void>;
    deleteAsync: () => Promise<void>;
  }

  export interface SQLiteOptions {
    name: string;
    version?: string;
    description?: string;
    size?: number;
    callback?: (db: WebSQLDatabase) => void;
  }

  export function openDatabase(
    name: string | SQLiteOptions
  ): WebSQLDatabase;
}