import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Home page component for SanctissiMissa
 */
const HomePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Welcome to SanctissiMissa</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Traditional Catholic Companion</h2>
        <p className="mb-4">
          SanctissiMissa provides access to traditional Catholic liturgical texts, 
          prayers, and personal spiritual journaling in one convenient application.
        </p>
        <p>
          This application contains the texts of the traditional Roman liturgy
          according to the 1962 Roman Missal and Breviary.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Liturgical Resources</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/calendar" className="text-blue-600 hover:underline">
                Liturgical Calendar
              </Link>
              <p className="text-sm text-gray-600">View the liturgical day and season</p>
            </li>
            <li>
              <Link to="/mass" className="text-blue-600 hover:underline">
                Mass Texts
              </Link>
              <p className="text-sm text-gray-600">Access the prayers and readings of the Mass</p>
            </li>
            <li>
              <Link to="/office" className="text-blue-600 hover:underline">
                Divine Office
              </Link>
              <p className="text-sm text-gray-600">Pray the Liturgy of the Hours</p>
            </li>
          </ul>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Personal Resources</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/prayers" className="text-blue-600 hover:underline">
                Prayers
              </Link>
              <p className="text-sm text-gray-600">Common Catholic prayers and devotions</p>
            </li>
            <li>
              <Link to="/journal" className="text-blue-600 hover:underline">
                Journal
              </Link>
              <p className="text-sm text-gray-600">Record your spiritual reflections and notes</p>
            </li>
            <li>
              <Link to="/import.html" className="text-blue-600 hover:underline">
                Database Management
              </Link>
              <p className="text-sm text-gray-600">Import or clear liturgical data</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
