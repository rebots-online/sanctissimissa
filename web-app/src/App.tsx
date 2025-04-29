import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ResponsiveLayout from './components/layout/ResponsiveLayout';
import HomePage from './pages/HomePage';
import DivineOfficePage from './pages/DivineOfficePage';
import PrayersPage from './pages/PrayersPage';
import JournalPage from './pages/JournalPage';
import MassPage from './components/mass/MassPage';
import CalendarPage from './pages/CalendarPage';
import NotFoundPage from './pages/NotFoundPage';

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
  return (
    <Router>
      <ResponsiveLayout>
        <Routes>
          {/* Home page */}
          <Route path="/" element={<HomePage />} />
          
          {/* Mass routes */}
          <Route path="/mass" element={<MassPage />} />
          <Route path="/mass/:date" element={<MassPage />} />
          <Route path="/mass/ordinary" element={<MassPage ordinary />} />
          <Route path="/mass/extraordinary" element={<MassPage extraordinary />} />
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
};

export default App;
