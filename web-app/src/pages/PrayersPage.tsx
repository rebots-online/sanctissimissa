import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAllPrayers, getPrayersByCategory } from '../services/database/liturgicalService';
import { Prayer } from '../types/liturgical';
import ResponsiveLiturgicalText from '../components/liturgical/ResponsiveLiturgicalText';

interface PrayersPageParams {
  category?: string;
  id?: string;
}

/**
 * Prayers page component
 * 
 * Features:
 * - Browse prayers by category
 * - View prayer details
 * - Toggle between Latin and English
 * - Responsive design
 */
const PrayersPage: React.FC = () => {
  const { category, id } = useParams<PrayersPageParams>();
  const navigate = useNavigate();
  
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load prayers
  useEffect(() => {
    const loadPrayers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let prayersList: Prayer[];
        
        if (category) {
          prayersList = await getPrayersByCategory(category);
        } else {
          prayersList = await getAllPrayers();
        }
        
        setPrayers(prayersList);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(prayersList.map(prayer => prayer.category))
        ).sort();
        
        setCategories(uniqueCategories);
        
        // If an ID is provided, find the selected prayer
        if (id) {
          const prayer = prayersList.find(p => p.id === id);
          if (prayer) {
            setSelectedPrayer(prayer);
          } else {
            setError(`Prayer with ID ${id} not found`);
          }
        } else {
          setSelectedPrayer(null);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading prayers:', err);
        setError(`Error loading prayers: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    loadPrayers();
  }, [category, id]);
  
  // Handle category selection
  const handleCategorySelect = (selectedCategory: string) => {
    navigate(`/prayers/${selectedCategory}`);
  };
  
  // Handle prayer selection
  const handlePrayerSelect = (prayer: Prayer) => {
    navigate(`/prayers/${prayer.category}/${prayer.id}`);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Prayers</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4">Categories</h2>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => navigate('/prayers')}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    !category ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                  }`}
                >
                  All Prayers
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => handleCategorySelect(cat)}
                    className={`w-full text-left px-3 py-2 rounded transition ${
                      category === cat ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-3">
          {selectedPrayer ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <button
                  onClick={() => navigate(category ? `/prayers/${category}` : '/prayers')}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to {category || 'All Prayers'}
                </button>
              </div>
              
              <ResponsiveLiturgicalText
                title={selectedPrayer.title}
                titleLatin={selectedPrayer.titleLatin}
                content={selectedPrayer.content}
                contentLatin={selectedPrayer.contentLatin}
              />
              
              {/* Prayer metadata */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">About this Prayer</h3>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Category:</span> {selectedPrayer.category}
                </p>
                
                {/* Tags (if available) */}
                {selectedPrayer.tags && selectedPrayer.tags.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-gray-600">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedPrayer.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                {category ? `${category} Prayers` : 'All Prayers'}
              </h2>
              
              {prayers.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-500">No prayers found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prayers.map(prayer => (
                    <div
                      key={prayer.id}
                      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition cursor-pointer"
                      onClick={() => handlePrayerSelect(prayer)}
                    >
                      <h3 className="text-lg font-semibold mb-2">
                        {prayer.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {prayer.category}
                      </p>
                      <p className="text-gray-600 line-clamp-3">
                        {prayer.content.substring(0, 80)}
                        {prayer.content.length > 80 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrayersPage;
