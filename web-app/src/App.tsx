import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ResponsiveLayout from './components/layout/ResponsiveLayout';
import HomePage from './pages/HomePage';
import DivineOfficePage from './pages/DivineOfficePage';
import PrayersPage from './pages/PrayersPage';
import JournalPage from './pages/JournalPage';
import MassPage from './components/mass/MassPage';
import CalendarPage from './pages/CalendarPage';
import NotFoundPage from './pages/NotFoundPage';
import { useDatabase } from './shared/database';
import SqlJsTest from './components/database/SqlJsTest';

/**
 * Main application component with routing configuration
 *
 * Features:
 * - Centralized routing configuration
 * - Responsive layout wrapper
 * - Dynamic route parameters
 * - Default route handling
 */
const App: React.FC = () => {
  // For testing SQL.js directly
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-6">SQL.js Test Page</h1>
      <div className="w-full max-w-2xl">
        <SqlJsTest />
      </div>
    </div>
  );

  /* Original code with database provider
  const { isLoading, error, isInitialized } = useDatabase();
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Log any errors to the console for debugging
    if (error) {
      console.error('Database initialization error:', error);
      setErrorDetails(error.message);
    }
  }, [error]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Loading SanctissiMissa</h1>
        <p className="text-gray-600">Initializing database...</p>
      </div>
    );
  }

  // Show error state
  if (error || !isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg w-full">
          <h1 className="text-xl font-semibold mb-2">Application Error</h1>
          <p className="mb-4">
            There was an error initializing the application. Please try reloading the page.
          </p>
          {errorDetails && (
            <div className="bg-white p-3 rounded mb-4 text-sm overflow-auto max-h-40">
              <code>{errorDetails}</code>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
  */

  /* Main application with routing - commented out for testing
  return (
    <Router>
      <ResponsiveLayout>
        <Routes>
          {/* Home page */}
          <Route path="/" element={<HomePage />} />

          {/* Mass routes */}
          <Route path="/mass" element={<MassPage />} />
          <Route path="/mass/:date" element={<MassPage />} />
          <Route path="/mass/ordinary" element={<MassPage ordinary={true} />} />
          <Route path="/mass/extraordinary" element={<MassPage extraordinary={true} />} />
          <Route path="/mass/calendar" element={<Navigate to="/calendar" replace />} />

          {/* Divine Office routes */}
          <Route path="/office" element={<DivineOfficePage />} />
          <Route path="/office/:date" element={<DivineOfficePage />} />
          <Route path="/office/:date/:hour" element={<DivineOfficePage />} />
          <Route path="/office/:hour" element={<DivineOfficePage />} />

          {/* Prayers routes */}
          <Route path="/prayers" element={<PrayersPage />} />
          <Route path="/prayers/:category" element={<PrayersPage />} />
          <Route path="/prayers/:category/:id" element={<PrayersPage />} />

          {/* Journal routes */}
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:id" element={<JournalPage />} />

          {/* Calendar routes */}
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/calendar/:year/:month" element={<CalendarPage />} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ResponsiveLayout>
    </Router>
  );
  */
};

export default App;
