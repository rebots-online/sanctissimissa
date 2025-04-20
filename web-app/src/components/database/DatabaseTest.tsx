import React, { useState, useEffect } from 'react';
import { initDatabase, getDatabase } from '../../services/database/db';
import { importLiturgicalCalendar } from '../../services/import/calendarImport';
import { importAllData } from '../../services/import/dataImport';

const DatabaseTest: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  const [imported, setImported] = useState(false);
  const [easterData, setEasterData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the database
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setInitialized(true);
      } catch (error) {
        setError(`Error initializing database: ${error}`);
      }
    };
    
    init();
  }, []);
  
  // Import data
  const handleImport = async () => {
    try {
      await importAllData();
      setImported(true);
    } catch (error) {
      setError(`Error importing data: ${error}`);
    }
  };
  
  // Test retrieving data
  const handleTest = async () => {
    try {
      // Test importing just the 2025 calendar
      await importLiturgicalCalendar(2025, 2025);
      
      // Get Easter Sunday 2025
      const db = await getDatabase();
      const easterSunday = await db.get('liturgical_days', '2025-04-20');
      setEasterData(easterSunday);
      
      console.log('Easter Sunday entry:', easterSunday);
    } catch (error) {
      setError(`Error testing database: ${error}`);
    }
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Database Test</h2>
      
      <div className="mb-4">
        <p>Database initialized: {initialized ? 'Yes' : 'No'}</p>
        <p>Data imported: {imported ? 'Yes' : 'No'}</p>
      </div>
      
      <div className="mb-4">
        <button 
          onClick={handleImport}
          className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
          disabled={!initialized || imported}
        >
          Import All Data
        </button>
        
        <button 
          onClick={handleTest}
          className="px-4 py-2 bg-green-500 text-white rounded"
          disabled={!initialized}
        >
          Test Calendar Import
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded mb-4">
          {error}
        </div>
      )}
      
      {easterData && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Easter Sunday 2025</h3>
          <pre className="p-4 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(easterData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;
