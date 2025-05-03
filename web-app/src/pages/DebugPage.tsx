import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DatabaseDebug from '../components/debug/DatabaseDebug';

/**
 * Debug Page
 * 
 * This page provides debugging tools and information for developers.
 * It includes database debugging, network testing, and other utilities.
 */
const DebugPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('database');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Tools</h1>
      
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 ${
                activeTab === 'database'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('database')}
            >
              Database
            </button>
            <button
              className={`py-2 px-1 border-b-2 ${
                activeTab === 'network'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('network')}
            >
              Network
            </button>
            <button
              className={`py-2 px-1 border-b-2 ${
                activeTab === 'tests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('tests')}
            >
              Tests
            </button>
          </nav>
        </div>
      </div>
      
      {activeTab === 'database' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Database Debugging</h2>
          <DatabaseDebug />
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Database Test Pages</h3>
            <div className="flex space-x-4">
              <Link 
                to="/test/sql" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                SQL Test Page
              </Link>
              <Link 
                to="/test/office" 
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Office Test Page
              </Link>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Database Troubleshooting</h3>
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">Common Issues:</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>WASM file not found:</strong> Make sure <code>sql-wasm.wasm</code> exists in the public directory.
                </li>
                <li>
                  <strong>Database file not found:</strong> Check that <code>sanctissimissa.sqlite</code> exists in the public directory.
                </li>
                <li>
                  <strong>SQL.js initialization error:</strong> This could be due to CORS issues or problems with the WASM file.
                </li>
                <li>
                  <strong>Database not a constructor error:</strong> This indicates that SQL.js didn't load properly.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'network' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Network Debugging</h2>
          <div className="bg-white shadow rounded p-4">
            <p className="mb-4">Network debugging tools will be added in a future update.</p>
          </div>
        </div>
      )}
      
      {activeTab === 'tests' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Test Pages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              to="/test/sql" 
              className="p-4 bg-white shadow rounded hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">SQL Test Page</h3>
              <p className="text-gray-600">Test SQL.js initialization and database queries.</p>
            </Link>
            <Link 
              to="/test/office" 
              className="p-4 bg-white shadow rounded hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">Office Test Page</h3>
              <p className="text-gray-600">Test Divine Office data rendering.</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPage;
