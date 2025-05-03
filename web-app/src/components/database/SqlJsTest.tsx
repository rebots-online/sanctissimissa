import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';

const SqlJsTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Loading SQL.js...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testSqlJs = async () => {
      try {
        setStatus('Initializing SQL.js...');
        
        // Try to initialize SQL.js with default settings
        const SQL = await initSqlJs();
        setStatus('SQL.js initialized successfully');
        
        // Test if SQL.Database is a constructor
        if (typeof SQL.Database === 'function') {
          setStatus('SQL.Database is a constructor');
          
          // Try to create a new database
          try {
            const db = new SQL.Database();
            setStatus('Successfully created a new database');
            
            // Try to execute a simple query
            try {
              db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
              db.exec('INSERT INTO test VALUES (1, "test")');
              const result = db.exec('SELECT * FROM test');
              setStatus(`Query executed successfully: ${JSON.stringify(result)}`);
            } catch (queryError) {
              setError(`Error executing query: ${queryError.message}`);
            }
          } catch (dbError) {
            setError(`Error creating database: ${dbError.message}`);
          }
        } else {
          setError(`SQL.Database is not a constructor. Type: ${typeof SQL.Database}`);
        }
      } catch (initError) {
        setError(`Error initializing SQL.js: ${initError.message}`);
      }
    };

    testSqlJs();
  }, []);

  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">SQL.js Test</h2>
      <div className="mb-4">
        <p className="font-semibold">Status:</p>
        <p className="bg-blue-100 p-2 rounded">{status}</p>
      </div>
      {error && (
        <div className="mb-4">
          <p className="font-semibold text-red-600">Error:</p>
          <p className="bg-red-100 p-2 rounded text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SqlJsTest;
