import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Responsive navigation bar component
 * 
 * Features:
 * - Mobile hamburger menu
 * - Responsive design for different screen sizes
 * - Active link highlighting
 * - Dropdown menus for sections with sub-items
 */
const ResponsiveNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMassDropdownOpen, setIsMassDropdownOpen] = useState(false);
  const [isOfficeDropdownOpen, setIsOfficeDropdownOpen] = useState(false);
  const [isPrayersDropdownOpen, setIsPrayersDropdownOpen] = useState(false);
  const location = useLocation();
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Check if a link is active
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  return (
    <nav className="bg-blue-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">SanctissiMissa</span>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/' ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
              }`}
            >
              Home
            </Link>
            
            {/* Mass dropdown */}
            <div className="relative">
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                  isActive('/mass') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
                }`}
                onClick={() => setIsMassDropdownOpen(!isMassDropdownOpen)}
              >
                Mass
                <svg
                  className={`ml-1 h-4 w-4 transition-transform ${isMassDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isMassDropdownOpen && (
                <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <Link
                      to="/mass"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Today's Mass
                    </Link>
                    <Link
                      to="/mass/calendar"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Calendar
                    </Link>
                    <Link
                      to="/mass/ordinary"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Ordinary Form
                    </Link>
                    <Link
                      to="/mass/extraordinary"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Extraordinary Form
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Office dropdown */}
            <div className="relative">
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                  isActive('/office') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
                }`}
                onClick={() => setIsOfficeDropdownOpen(!isOfficeDropdownOpen)}
              >
                Divine Office
                <svg
                  className={`ml-1 h-4 w-4 transition-transform ${isOfficeDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isOfficeDropdownOpen && (
                <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <Link
                      to="/office"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Today's Office
                    </Link>
                    <Link
                      to="/office/matins"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Matins
                    </Link>
                    <Link
                      to="/office/lauds"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Lauds
                    </Link>
                    <Link
                      to="/office/prime"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Prime
                    </Link>
                    <Link
                      to="/office/terce"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Terce
                    </Link>
                    <Link
                      to="/office/sext"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sext
                    </Link>
                    <Link
                      to="/office/none"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      None
                    </Link>
                    <Link
                      to="/office/vespers"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Vespers
                    </Link>
                    <Link
                      to="/office/compline"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Compline
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Prayers dropdown */}
            <div className="relative">
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                  isActive('/prayers') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
                }`}
                onClick={() => setIsPrayersDropdownOpen(!isPrayersDropdownOpen)}
              >
                Prayers
                <svg
                  className={`ml-1 h-4 w-4 transition-transform ${isPrayersDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isPrayersDropdownOpen && (
                <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <Link
                      to="/prayers"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      All Prayers
                    </Link>
                    <Link
                      to="/prayers/daily"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Daily Prayers
                    </Link>
                    <Link
                      to="/prayers/rosary"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Rosary
                    </Link>
                    <Link
                      to="/prayers/litanies"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Litanies
                    </Link>
                    <Link
                      to="/prayers/saints"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Saints
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            <Link
              to="/journal"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/journal') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
              }`}
            >
              Journal
            </Link>
            
            <Link
              to="/calendar"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/calendar') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
              }`}
            >
              Calendar
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              location.pathname === '/' ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
            }`}
          >
            Home
          </Link>
          
          <button
            className={`w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              isActive('/mass') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
            }`}
            onClick={() => setIsMassDropdownOpen(!isMassDropdownOpen)}
          >
            Mass
          </button>
          
          {isMassDropdownOpen && (
            <div className="pl-4 space-y-1">
              <Link
                to="/mass"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Today's Mass
              </Link>
              <Link
                to="/mass/calendar"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Calendar
              </Link>
              <Link
                to="/mass/ordinary"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Ordinary Form
              </Link>
              <Link
                to="/mass/extraordinary"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Extraordinary Form
              </Link>
            </div>
          )}
          
          <button
            className={`w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              isActive('/office') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
            }`}
            onClick={() => setIsOfficeDropdownOpen(!isOfficeDropdownOpen)}
          >
            Divine Office
          </button>
          
          {isOfficeDropdownOpen && (
            <div className="pl-4 space-y-1">
              <Link
                to="/office"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Today's Office
              </Link>
              <Link
                to="/office/matins"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Matins
              </Link>
              <Link
                to="/office/lauds"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Lauds
              </Link>
              <Link
                to="/office/prime"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Prime
              </Link>
              <Link
                to="/office/terce"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Terce
              </Link>
              <Link
                to="/office/sext"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Sext
              </Link>
              <Link
                to="/office/none"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                None
              </Link>
              <Link
                to="/office/vespers"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Vespers
              </Link>
              <Link
                to="/office/compline"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Compline
              </Link>
            </div>
          )}
          
          <button
            className={`w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              isActive('/prayers') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
            }`}
            onClick={() => setIsPrayersDropdownOpen(!isPrayersDropdownOpen)}
          >
            Prayers
          </button>
          
          {isPrayersDropdownOpen && (
            <div className="pl-4 space-y-1">
              <Link
                to="/prayers"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                All Prayers
              </Link>
              <Link
                to="/prayers/daily"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Daily Prayers
              </Link>
              <Link
                to="/prayers/rosary"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Rosary
              </Link>
              <Link
                to="/prayers/litanies"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Litanies
              </Link>
              <Link
                to="/prayers/saints"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700"
              >
                Saints
              </Link>
            </div>
          )}
          
          <Link
            to="/journal"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/journal') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
            }`}
          >
            Journal
          </Link>
          
          <Link
            to="/calendar"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/calendar') ? 'bg-blue-900 text-white' : 'hover:bg-blue-700'
            }`}
          >
            Calendar
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default ResponsiveNavbar;