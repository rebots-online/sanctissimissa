import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import OfficeText from './OfficeText';
import { getLiturgicalDay, getOfficeText } from '../../services/database/sqlite';

/**
 * Component for rendering the Divine Office page
 */
const OfficePage: React.FC = () => {
  const { date, hour } = useParams<{ date?: string; hour?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liturgicalDay, setLiturgicalDay] = useState<any>(null);
  const [officeText, setOfficeText] = useState<any>(null);
  const [selectedHour, setSelectedHour] = useState<string>(hour || 'lauds');
  const [showLatinOnly, setShowLatinOnly] = useState(false);
  const [showEnglishOnly, setShowEnglishOnly] = useState(false);
  const [showRubrics, setShowRubrics] = useState(true);

  // Available hours of the Divine Office
  const hours = [
    { id: 'matins', name: 'Matins' },
    { id: 'lauds', name: 'Lauds' },
    { id: 'prime', name: 'Prime' },
    { id: 'terce', name: 'Terce' },
    { id: 'sext', name: 'Sext' },
    { id: 'none', name: 'None' },
    { id: 'vespers', name: 'Vespers' },
    { id: 'compline', name: 'Compline' }
  ];

  useEffect(() => {
    const loadOfficeData = () => {
      try {
        setLoading(true);
        setError(null);

        // Get today's date if not provided
        const targetDate = date || formatDate(new Date());
        
        // Get liturgical day
        const day = getLiturgicalDay(targetDate);
        setLiturgicalDay(day);
        
        // Set the hour from URL parameter or default to lauds
        const hourToLoad = hour || selectedHour;
        setSelectedHour(hourToLoad);
        
        // Get office text for the selected hour
        const officeId = `${day?.celebration?.toLowerCase().replace(/\\s+/g, '_')}_${hourToLoad}`;
        const office = getOfficeText(officeId);
        
        if (office) {
          setOfficeText(office);
        } else {
          // Try a fallback ID
          const fallbackId = `${day?.season}_${hourToLoad}`;
          const fallbackOffice = getOfficeText(fallbackId);
          
          if (fallbackOffice) {
            setOfficeText(fallbackOffice);
          } else {
            setError(`No Office text found for ${hourToLoad} on ${targetDate}`);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading Office data:', err);
        setError(`Error loading Office data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    loadOfficeData();
  }, [date, hour, selectedHour]);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle hour selection
  const handleHourChange = (hourId: string) => {
    setSelectedHour(hourId);
  };

  // Toggle language display
  const toggleLatinOnly = () => {
    setShowLatinOnly(!showLatinOnly);
    if (!showLatinOnly) {
      setShowEnglishOnly(false);
    }
  };

  const toggleEnglishOnly = () => {
    setShowEnglishOnly(!showEnglishOnly);
    if (!showEnglishOnly) {
      setShowLatinOnly(false);
    }
  };
  
  // Toggle rubrics display
  const toggleRubrics = () => {
    setShowRubrics(!showRubrics);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {liturgicalDay && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{liturgicalDay.celebration}</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 bg-gray-200 rounded text-sm">{liturgicalDay.season}</span>
            <span className="px-2 py-1 bg-gray-200 rounded text-sm">Color: {liturgicalDay.color}</span>
            {liturgicalDay.is_holy_day === 1 && (
              <span className="px-2 py-1 bg-blue-100 rounded text-sm">Holy Day</span>
            )}
            {liturgicalDay.is_feast_day === 1 && (
              <span className="px-2 py-1 bg-green-100 rounded text-sm">Feast Day</span>
            )}
          </div>
          
          {/* Hour selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Select Hour:</h2>
            <div className="flex flex-wrap gap-2">
              {hours.map(hour => (
                <button
                  key={hour.id}
                  onClick={() => handleHourChange(hour.id)}
                  className={`px-3 py-1 rounded ${
                    selectedHour === hour.id ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {hour.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Display options */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={toggleLatinOnly}
              className={`px-3 py-1 rounded ${
                showLatinOnly ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Latin Only
            </button>
            <button
              onClick={toggleEnglishOnly}
              className={`px-3 py-1 rounded ${
                showEnglishOnly ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              English Only
            </button>
            <button
              onClick={toggleRubrics}
              className={`px-3 py-1 rounded ${
                showRubrics ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {showRubrics ? 'Hide Rubrics' : 'Show Rubrics'}
            </button>
          </div>
        </div>
      )}
      
      {officeText ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <OfficeText
            id={officeText.id}
            hour={selectedHour}
            title={{
              latin: officeText.title_latin,
              english: officeText.title_english,
            }}
            hymn={{
              latin: officeText.hymn_latin,
              english: officeText.hymn_english,
            }}
            chapter={{
              latin: officeText.chapter_latin,
              english: officeText.chapter_english,
              reference: officeText.chapter_reference,
            }}
            prayer={{
              latin: officeText.prayer_latin,
              english: officeText.prayer_english,
            }}
            showLatinOnly={showLatinOnly}
            showEnglishOnly={showEnglishOnly}
            showRubrics={showRubrics}
          />
        </div>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p>No Office texts available for {selectedHour} on this date.</p>
        </div>
      )}
    </div>
  );
};

export default OfficePage;
