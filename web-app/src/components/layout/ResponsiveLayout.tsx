import React from 'react';
import ResponsiveNavbar from '../navigation/ResponsiveNavbar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

/**
 * Responsive layout component
 * 
 * Provides a consistent layout for all pages with:
 * - Responsive navigation
 * - Main content area
 * - Footer
 */
const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navigation */}
      <ResponsiveNavbar />
      
      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">SanctissiMissa</h3>
              <p className="text-gray-300">
                A web application for traditional Catholic liturgical texts and prayers.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-gray-300 hover:text-white transition">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/mass" className="text-gray-300 hover:text-white transition">
                    Mass Texts
                  </a>
                </li>
                <li>
                  <a href="/office" className="text-gray-300 hover:text-white transition">
                    Divine Office
                  </a>
                </li>
                <li>
                  <a href="/prayers" className="text-gray-300 hover:text-white transition">
                    Prayers
                  </a>
                </li>
                <li>
                  <a href="/calendar" className="text-gray-300 hover:text-white transition">
                    Calendar
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">About</h3>
              <p className="text-gray-300 mb-4">
                SanctissiMissa provides access to traditional Catholic liturgical texts,
                including the Mass, Divine Office, and prayers in both Latin and English.
              </p>
              <p className="text-gray-300">
                &copy; {new Date().getFullYear()} SanctissiMissa. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResponsiveLayout;