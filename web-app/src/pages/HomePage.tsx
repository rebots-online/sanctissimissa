import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Home page component
 * 
 * Features:
 * - Hero section with app introduction
 * - Quick access to main sections
 * - Featured content
 * - Responsive design
 */
const HomePage: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* Hero section */}
      <section className="bg-blue-700 text-white rounded-lg shadow-xl overflow-hidden">
        <div className="container mx-auto px-6 py-16 md:py-20 md:flex md:items-center">
          <div className="md:w-1/2 md:pr-12">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              SanctissiMissa
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Traditional Catholic liturgical texts and prayers at your fingertips.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/mass"
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg shadow hover:bg-gray-100 transition"
              >
                Today's Mass
              </Link>
              <Link
                to="/office"
                className="px-6 py-3 bg-blue-800 text-white font-semibold rounded-lg shadow hover:bg-blue-900 transition"
              >
                Divine Office
              </Link>
            </div>
          </div>
          <div className="hidden md:block md:w-1/2">
            <img
              src="/images/missal.jpg"
              alt="Traditional Missal"
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>
      
      {/* Quick access section */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-center">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Mass Texts</h3>
            <p className="text-gray-600 mb-4">
              Access the texts for the Mass of the day in Latin and English.
            </p>
            <Link
              to="/mass"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View Mass Texts &rarr;
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Divine Office</h3>
            <p className="text-gray-600 mb-4">
              Pray the Liturgy of the Hours with texts for each canonical hour.
            </p>
            <Link
              to="/office"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View Divine Office &rarr;
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Prayers</h3>
            <p className="text-gray-600 mb-4">
              Browse a collection of traditional Catholic prayers and devotions.
            </p>
            <Link
              to="/prayers"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View Prayers &rarr;
            </Link>
          </div>
        </div>
      </section>
      
      {/* Features section */}
      <section className="bg-gray-100 rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-center">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Bilingual Texts</h3>
            <p className="text-gray-600">
              All liturgical texts available in both Latin and English.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Liturgical Calendar</h3>
            <p className="text-gray-600">
              Complete liturgical calendar with feasts and celebrations.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Personal Journal</h3>
            <p className="text-gray-600">
              Keep a spiritual journal with your reflections and prayers.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Responsive Design</h3>
            <p className="text-gray-600">
              Optimized for all devices, from mobile to desktop.
            </p>
          </div>
        </div>
      </section>
      
      {/* Call to action */}
      <section className="bg-blue-700 text-white rounded-lg p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Start Praying Today</h2>
        <p className="text-xl mb-6 max-w-2xl mx-auto">
          Access traditional Catholic liturgical texts and prayers anytime, anywhere.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/mass"
            className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg shadow hover:bg-gray-100 transition"
          >
            Today's Mass
          </Link>
          <Link
            to="/prayers"
            className="px-6 py-3 bg-blue-800 text-white font-semibold rounded-lg shadow hover:bg-blue-900 transition"
          >
            Browse Prayers
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
