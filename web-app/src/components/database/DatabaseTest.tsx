import React, { useState, useEffect } from 'react';
import { initSqliteDatabase, getLiturgicalDay, getAllLiturgicalDays, getMassText, getOfficeText } from '../../services/database/sqlite';

const DatabaseTest: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  const [easterData, setEasterData] = useState<any>(null);
  const [massData, setMassData] = useState<any>(null);
  const [officeData, setOfficeData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize the database
  useEffect(() => {
    const init = async () => {
      try {
        await initSqliteDatabase();
        setInitialized(true);
      } catch (error) {
        setError(`Error initializing database: ${error}`);
      }
    };

    init();
  }, []);

  // Test retrieving liturgical day data
  const handleTestLiturgicalDay = () => {
    try {
      // Get Easter Sunday 2025
      const easterSunday = getLiturgicalDay('2025-04-20');
      setEasterData(easterSunday);

      console.log('Easter Sunday entry:', easterSunday);
    } catch (error) {
      setError(`Error testing liturgical day: ${error}`);
    }
  };

  // Test retrieving Mass text data
  const handleTestMassText = () => {
    try {
      // Get Easter Sunday Mass
      const easterMass = getMassText('proper_easter_sunday');
      setMassData(easterMass);

      console.log('Easter Sunday Mass:', easterMass);
    } catch (error) {
      setError(`Error testing Mass text: ${error}`);
    }
  };

  // Test retrieving Office text data
  const handleTestOfficeText = () => {
    try {
      // Get Easter Sunday Lauds
      const easterLauds = getOfficeText('easter_sunday_lauds');
      setOfficeData(easterLauds);

      console.log('Easter Sunday Lauds:', easterLauds);
    } catch (error) {
      setError(`Error testing Office text: ${error}`);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">SQLite Database Test</h2>

      <div className="mb-4">
        <p>Database initialized: {initialized ? 'Yes' : 'No'}</p>
      </div>

      <div className="mb-4">
        <button
          onClick={handleTestLiturgicalDay}
          className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
          disabled={!initialized}
        >
          Test Liturgical Day
        </button>

        <button
          onClick={handleTestMassText}
          className="px-4 py-2 bg-green-500 text-white rounded mr-2"
          disabled={!initialized}
        >
          Test Mass Text
        </button>

        <button
          onClick={handleTestOfficeText}
          className="px-4 py-2 bg-purple-500 text-white rounded"
          disabled={!initialized}
        >
          Test Office Text
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

      {massData && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Easter Sunday Mass</h3>
          <pre className="p-4 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(massData, null, 2)}
          </pre>
        </div>
      )}

      {officeData && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Easter Sunday Office</h3>
          <pre className="p-4 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(officeData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;
