import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../shared/database';
import { getSqliteDatabase, query } from '../../services/database/sqlite';

/**
 * Database Debug Component
 * 
 * This component displays debug information about the SQLite database.
 * It shows the database initialization status, any errors, and allows
 * running test queries.
 */
const DatabaseDebug: React.FC = () => {
  const { isInitialized, isLoading, error: contextError } = useDatabase();
  const [dbInstance, setDbInstance] = useState<any>(null);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [customQuery, setCustomQuery] = useState<string>('SELECT sqlite_version()');
  const [error, setError] = useState<string | null>(null);

  // Get the database instance when initialized
  useEffect(() => {
    if (isInitialized && !isLoading) {
      try {
        const db = getSqliteDatabase();
        setDbInstance(db);
        console.log('Database instance:', db);
      } catch (err) {
        console.error('Error getting database instance:', err);
        setError(`Error getting database instance: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [isInitialized, isLoading]);

  // Run a test query
  const runTestQuery = () => {
    try {
      if (!isInitialized) {
        setError('Database not initialized');
        return;
      }

      const results = query(customQuery);
      setQueryResult(results);
      setError(null);
      console.log('Query results:', results);
    } catch (err) {
      console.error('Error executing query:', err);
      setError(`Error executing query: ${err instanceof Error ? err.message : String(err)}`);
      setQueryResult(null);
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Database Debug</h2>
      
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="p-2 bg-gray-100 rounded">
          <span className="font-semibold">Initialized:</span> 
          <span className={isInitialized ? 'text-green-600' : 'text-red-600'}>
            {isInitialized ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="p-2 bg-gray-100 rounded">
          <span className="font-semibold">Loading:</span> 
          <span className={isLoading ? 'text-yellow-600' : 'text-green-600'}>
            {isLoading ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="p-2 bg-gray-100 rounded">
          <span className="font-semibold">DB Instance:</span> 
          <span className={dbInstance ? 'text-green-600' : 'text-red-600'}>
            {dbInstance ? 'Available' : 'Not Available'}
          </span>
        </div>
        
        <div className="p-2 bg-gray-100 rounded">
          <span className="font-semibold">WASM File:</span> 
          <span className="text-blue-600">
            /sql-wasm.wasm
          </span>
        </div>
      </div>
      
      {contextError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          <p className="font-semibold">Context Error:</p>
          <p>{contextError.message}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        <label className="block font-semibold mb-2">Run SQL Query:</label>
        <textarea 
          className="w-full p-2 border rounded mb-2"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          rows={3}
        />
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={runTestQuery}
          disabled={!isInitialized || isLoading}
        >
          Run Query
        </button>
      </div>
      
      {queryResult && (
        <div className="mb-4">
          <p className="font-semibold mb-2">Query Result:</p>
          <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-60">
            {JSON.stringify(queryResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseDebug;
