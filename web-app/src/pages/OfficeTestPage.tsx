import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';

const OfficeTestPage: React.FC = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [officeData, setOfficeData] = useState<any>(null);

  useEffect(() => {
    const loadOfficeData = async () => {
      try {
        setStatus('Initializing SQL.js...');

        // Initialize SQL.js with explicit WASM path
        const SQL = await initSqlJs({
          locateFile: file => {
            console.log(`Locating file: ${file}`);
            // Try to use the exact file name that SQL.js is looking for
            return `/sql-wasm.wasm`;
          }
        });

        setStatus('SQL.js initialized, loading database...');

        // Fetch the SQLite database file
        const response = await fetch('/sanctissimissa.sqlite');
        if (!response.ok) {
          throw new Error(`Failed to fetch database: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const uInt8Array = new Uint8Array(arrayBuffer);

        // Create a database from the file
        const db = new SQL.Database(uInt8Array);
        setStatus('Database loaded successfully');

        // Get current date
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // JavaScript months are 0-based
        const day = now.getDate();
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        // Determine current hour of the day to select appropriate office
        const hour = now.getHours();
        let officeName = 'lauds'; // Default to Lauds

        if (hour >= 21 || hour < 3) {
          officeName = 'completorium'; // Compline
        } else if (hour >= 15 && hour < 18) {
          officeName = 'vespers'; // Vespers
        } else if (hour >= 12 && hour < 15) {
          officeName = 'sext'; // Sext
        } else if (hour >= 9 && hour < 12) {
          officeName = 'terce'; // Terce
        } else if (hour >= 6 && hour < 9) {
          officeName = 'prime'; // Prime
        } else if (hour >= 3 && hour < 6) {
          officeName = 'matins'; // Matins
        }

        setStatus(`Querying for ${officeName} on ${dateStr}...`);

        // First, get the liturgical day information
        const liturgicalDayResult = db.exec(`
          SELECT * FROM liturgical_days
          WHERE date = '${dateStr}'
        `);

        if (!liturgicalDayResult.length || !liturgicalDayResult[0].values.length) {
          throw new Error(`No liturgical day found for ${dateStr}`);
        }

        const liturgicalDay = {
          id: liturgicalDayResult[0].values[0][0],
          date: liturgicalDayResult[0].values[0][1],
          season: liturgicalDayResult[0].values[0][2],
          celebration: liturgicalDayResult[0].values[0][3],
          rank: liturgicalDayResult[0].values[0][4],
          color: liturgicalDayResult[0].values[0][5]
        };

        // Now query for the specific office
        const officeResult = db.exec(`
          SELECT * FROM divine_office
          WHERE liturgical_day_id = ${liturgicalDay.id}
          AND hour = '${officeName}'
        `);

        if (!officeResult.length || !officeResult[0].values.length) {
          // Try to get a default office for this season
          const defaultOfficeResult = db.exec(`
            SELECT * FROM divine_office
            WHERE liturgical_day_id IS NULL
            AND season = '${liturgicalDay.season}'
            AND hour = '${officeName}'
          `);

          if (!defaultOfficeResult.length || !defaultOfficeResult[0].values.length) {
            throw new Error(`No office found for ${officeName} on ${dateStr} (${liturgicalDay.celebration})`);
          }

          setOfficeData({
            liturgicalDay,
            office: {
              id: defaultOfficeResult[0].values[0][0],
              hour: defaultOfficeResult[0].values[0][1],
              content: defaultOfficeResult[0].values[0][2],
              isDefault: true
            }
          });
        } else {
          setOfficeData({
            liturgicalDay,
            office: {
              id: officeResult[0].values[0][0],
              hour: officeResult[0].values[0][1],
              content: officeResult[0].values[0][2],
              isDefault: false
            }
          });
        }

        setStatus('Office data retrieved successfully');

      } catch (err: any) {
        console.error('Error:', err);
        setError(`Error: ${err.message}`);
        setStatus('Failed to load office data');
      }
    };

    loadOfficeData();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Divine Office Test</h1>

      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Status:</h2>
        <p>{status}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="text-lg font-semibold mb-2">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {officeData && (
        <div className="mb-4">
          <div className="p-4 bg-blue-50 rounded mb-4">
            <h2 className="text-lg font-semibold mb-2">Liturgical Day:</h2>
            <p><strong>Date:</strong> {officeData.liturgicalDay.date}</p>
            <p><strong>Season:</strong> {officeData.liturgicalDay.season}</p>
            <p><strong>Celebration:</strong> {officeData.liturgicalDay.celebration}</p>
            <p><strong>Rank:</strong> {officeData.liturgicalDay.rank}</p>
            <p><strong>Color:</strong> {officeData.liturgicalDay.color}</p>
          </div>

          <div className="p-4 bg-yellow-50 rounded">
            <h2 className="text-lg font-semibold mb-2">
              Office: {officeData.office.hour.charAt(0).toUpperCase() + officeData.office.hour.slice(1)}
              {officeData.office.isDefault && ' (Default for season)'}
            </h2>
            <div className="mt-4 p-4 bg-white rounded border">
              <pre className="whitespace-pre-wrap">{officeData.office.content}</pre>
            </div>
          </div>
        </div>
      )}

      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => window.location.reload()}
      >
        Reload Page
      </button>
    </div>
  );
};

export default OfficeTestPage;
