import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initSqliteDatabase } from '../../services/database/sqlite';

interface DatabaseContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isInitialized: false,
  isLoading: true,
  error: null
});

export const useDatabase = () => useContext(DatabaseContext);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await initSqliteDatabase();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  return (
    <DatabaseContext.Provider value={{ isInitialized, isLoading, error }}>
      {children}
    </DatabaseContext.Provider>
  );
};
