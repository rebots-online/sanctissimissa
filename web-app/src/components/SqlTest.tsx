import React, { useEffect, useState } from 'react';
import initSqlJs from 'sql.js';

const SqlTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Loading SQL.js...');
  const [error, setError] = useState<string | null>(null);
  const [sqlLoaded, setSqlLoaded] = useState<boolean>(false);

  useEffect(() => {
    const loadSql = async () => {
      try {
        setStatus('Initializing SQL.js...');
        
        // Initialize SQL.js with direct path to WASM file
        const SQL = await initSqlJs({
          locateFile: file => `/sql-wasm.wasm`
        });
        
        // Test if SQL.Database is a constructor
        if (typeof SQL.Database !== 'function') {
          throw new Error(`SQL.Database is not a constructor. Type: ${typeof SQL.Database}`);
        }
        
        // Create a test database
        const db = new SQL.Database();
        
        // Execute a simple query
        db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
        db.exec("INSERT INTO test VALUES (1, 'Test')");
        const result = db.exec("SELECT * FROM test");
        
        setStatus(`SQL.js loaded successfully. Test query result: ${JSON.stringify(result)}`);
        setSqlLoaded(true);
      } catch (err) {
        console.error('Error loading SQL.js:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('Failed to load SQL.js');
      }
    };
    
    loadSql();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">SQL.js Test</h2>
      
      <div className="mb-4">
        <p className="font-semibold">Status:</p>
        <p className={sqlLoaded ? "text-green-600" : "text-blue-600"}>{status}</p>
      </div>
      
      {error && (
        <div className="mb-4">
          <p className="font-semibold text-red-600">Error:</p>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        <p className="font-semibold">SQL.Database is a constructor:</p>
        <p className={sqlLoaded ? "text-green-600" : "text-red-600"}>
          {sqlLoaded ? "Yes" : "No"}
        </p>
      </div>
      
      <div className="mb-4">
        <p className="font-semibold">Browser Information:</p>
        <p>{navigator.userAgent}</p>
      </div>
    </div>
  );
};

export default SqlTest;
