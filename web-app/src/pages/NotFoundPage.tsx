import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 404 Not Found page component
 * 
 * Features:
 * - Clear error message
 * - Navigation links to main sections
 * - Responsive design
 */
const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-700 mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable.
        </p>
        
        <div className="space-y-4">
          <p className="text-lg font-medium">You can navigate to:</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
            >
              Home
            </Link>
            
            <Link
              to="/mass"
              className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow hover:bg-gray-300 transition"
            >
              Mass Texts
            </Link>
            
            <Link
              to="/office"
              className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow hover:bg-gray-300 transition"
            >
              Divine Office
            </Link>
            
            <Link
              to="/prayers"
              className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow hover:bg-gray-300 transition"
            >
              Prayers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;