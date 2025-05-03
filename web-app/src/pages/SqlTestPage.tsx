import React, { useState, useEffect } from 'react';
import { useDatabase } from '../shared/database';
import { getSqliteDatabase, query, getLiturgicalDay } from '../services/database/sqlite';
import DatabaseDebug from '../components/debug/DatabaseDebug';

const SqlTestPage: React.FC = () => {
  const { isInitialized, isLoading, error: contextError } = useDatabase();
  const [status, setStatus] = useState<string>('Waiting for database initialization...');
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [liturgicalDay, setLiturgicalDay] = useState<any>(null);

  // Run tests when the database is initialized
  useEffect(() => {
    if (isInitialized && !isLoading) {
      runTests();
    }
  }, [isInitialized, isLoading]);

  const runTests = async () => {
    try {
      setStatus('Database initialized, running tests...');

      // Test 1: Get the database instance
      try {
        const db = getSqliteDatabase();
        setStatus('Successfully got database instance');
        console.log('Database instance:', db);

        // Test 2: Run a simple query
        try {
          const results = query('SELECT sqlite_version()');
          setTestResults(results);
          setStatus(`Query executed successfully: SQLite version ${results[0]?.['sqlite_version()']}`);
          console.log('Query results:', results);

          // Test 3: Get liturgical day data
          try {
            const easterSunday = getLiturgicalDay('2025-04-20');
            setLiturgicalDay(easterSunday);
            setStatus('All tests completed successfully');
            console.log('Easter Sunday data:', easterSunday);
          } catch (liturgicalError: any) {
            console.error('Error getting liturgical day:', liturgicalError);
            setError(`Error getting liturgical day: ${liturgicalError.message || String(liturgicalError)}`);
          }
        } catch (queryError: any) {
          console.error('Error executing query:', queryError);
          setError(`Error executing query: ${queryError.message || String(queryError)}`);
        }
      } catch (dbError: any) {
        console.error('Error getting database instance:', dbError);
        setError(`Error getting database instance: ${dbError.message || String(dbError)}`);
      }
    } catch (testError: any) {
      console.error('Error running tests:', testError);
      setError(`Error running tests: ${testError.message || String(testError)}`);
    }
  };

  // If the database is still loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">SQLite Database Test</h1>
        <div className="flex items-center mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
          <p>Loading database...</p>
        </div>
      </div>
    );
  }

  // If there was an error initializing the database, show the error
  if (contextError) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">SQLite Database Test</h1>
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          <h2 className="text-lg font-semibold mb-2">Database Initialization Error:</h2>
          <p>{contextError.message}</p>
        </div>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SQLite Database Test</h1>

      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Status:</h2>
        <p>{status}</p>
      </div>

      <div className="mb-4">
        <DatabaseDebug />
      </div>

      <div className="mb-4 p-4 bg-blue-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Database Context:</h2>
        <p>Initialized: {isInitialized ? 'Yes' : 'No'}</p>
        <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="text-lg font-semibold mb-2">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {testResults && (
        <div className="mb-4 p-4 bg-green-100 rounded">
          <h2 className="text-lg font-semibold mb-2">SQLite Version:</h2>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      {liturgicalDay && (
        <div className="mb-4 p-4 bg-green-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Easter Sunday 2025:</h2>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(liturgicalDay, null, 2)}
          </pre>
        </div>
      )}

      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        onClick={() => window.location.reload()}
      >
        Reload Page
      </button>

      <button
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        onClick={runTests}
        disabled={!isInitialized || isLoading}
      >
        Run Tests Again
      </button>
    </div>
  );
};

export default SqlTestPage;
