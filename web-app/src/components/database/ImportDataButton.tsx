import React, { useState } from 'react';
import { importAllData } from '../../services/import/dataImport';

/**
 * Button component to trigger data import from flat files to IndexedDB
 */
const ImportDataButton: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      setSuccess(false);
      
      await importAllData();
      
      setSuccess(true);
      setImporting(false);
    } catch (err) {
      console.error('Error importing data:', err);
      setError(`Error importing data: ${err instanceof Error ? err.message : String(err)}`);
      setImporting(false);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-bold mb-4">Data Import</h2>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-2">
          Import liturgical texts from flat files to the database. This is required for the app to function properly.
        </p>
        
        <button 
          onClick={handleImport}
          disabled={importing}
          className={`px-4 py-2 rounded ${
            importing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : success 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-blue-500 hover:bg-blue-600'
          } text-white font-semibold`}
        >
          {importing ? 'Importing...' : success ? 'Import Successful!' : 'Import Liturgical Data'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-100 text-green-800 rounded">
          <p>Data import successful! You can now use the app with full liturgical texts.</p>
          <p className="mt-2">Please refresh the page to see the changes.</p>
        </div>
      )}
    </div>
  );
};

export default ImportDataButton;
