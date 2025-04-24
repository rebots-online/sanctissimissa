import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HashRouter } from 'react-router-dom'
import { initSqliteDatabase } from './services/database/sqlite'

// Create a loading component to show during import
const LoadingScreen = ({ message }: { message: string }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h2 className="text-xl font-bold mb-4">SanctissiMissa</h2>
      <div className="animate-pulse flex space-x-4 mb-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Root component to handle database initialization and loading states
const Root = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Checking database...');
  // isReady state is used to track when the database is ready for use
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  console.log('Root component rendering. Loading:', isLoading, 'Ready:', isReady);

  useEffect(() => {
    // Function to initialize the SQLite database
    async function initializeDatabase() {
      try {
        console.log('======= DATABASE INITIALIZATION =======');
        console.log('Current URL:', window.location.href);

        setLoadingMessage('Initializing database... This may take a moment.');

        // Initialize the SQLite database
        await initSqliteDatabase();

        console.log('SQLite database initialized successfully');
        setLoadingMessage('Database initialized successfully!');

        // Short delay to show success message
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Database is ready
        setIsReady(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing SQLite database:', error);
        setLoadingMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Even on error, we'll try to render the app after a delay
        setTimeout(() => {
          setIsReady(true);
          setIsLoading(false);
        }, 3000);
      }
    }

    // Run the initialization process
    initializeDatabase().catch(err => {
      console.error('Unhandled error in initializeDatabase:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    });
  }, []);

  // Show error if one occurred
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-red-100 z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full border-2 border-red-500">
          <h2 className="text-xl font-bold mb-4 text-red-600">SanctissiMissa Error</h2>
          <p className="text-gray-800 mb-4">An error occurred while initializing the application:</p>
          <div className="bg-red-50 p-4 rounded border border-red-200 mb-4 overflow-auto max-h-60">
            <code className="text-red-800 whitespace-pre-wrap">{error.message}
{error.stack}</code>
          </div>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen while checking/importing data
  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  // Render the app once ready
  return (
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
};

// Render the root component
ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
