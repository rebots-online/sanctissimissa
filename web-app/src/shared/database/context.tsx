import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initSqliteDatabase } from '../../services/database/sqlite';

interface DatabaseContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  db: any | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isInitialized: false,
  isLoading: true,
  error: null,
  db: null
});

export const useDatabase = () => useContext(DatabaseContext);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        if (isMounted) setIsLoading(true);

        // Initialize the database
        console.log('Starting database initialization...');
        await initSqliteDatabase();

        if (isMounted) {
          console.log('Database initialization complete');
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ isInitialized, isLoading, error, db }}>
      {children}
    </DatabaseContext.Provider>
  );
};
