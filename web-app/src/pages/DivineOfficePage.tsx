import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOfficeText, getLiturgicalDay } from '../services/database/liturgicalService';
import { OfficeText, LiturgicalDay, Psalm, Reading } from '../types/liturgical';
import ResponsiveLiturgicalText from '../components/liturgical/ResponsiveLiturgicalText';

interface OfficePageParams {
  date?: string;
  hour?: string;
}

/**
 * Divine Office page component
 * 
 * Features:
 * - View Office texts for a specific day and hour
 * - Navigate between hours
 * - Toggle between Latin and English
 * - Responsive design
 */
const DivineOfficePage: React.FC = () => {
  const { date, hour } = useParams<OfficePageParams>();
  const navigate = useNavigate();
  
  const [officeText, setOfficeText] = useState<OfficeText | null>(null);
  const [liturgicalDay, setLiturgicalDay] = useState<LiturgicalDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Hours of the Divine Office
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
  
  // Load Office text
  useEffect(() => {
    const loadOfficeText = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use today's date if not provided
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        // Get liturgical day information
        const day = await getLiturgicalDay(targetDate);
        if (day) {
          setLiturgicalDay(day);
        }
        
        // Default to Vespers if no hour is specified
        const targetHour = hour || 'vespers';
        
        // Get Office text
        const officeId = `${targetDate}_${targetHour}`;
        const office = await getOfficeText(officeId);
        
        if (office) {
          setOfficeText(office);
        } else {
          setError(`Office text for ${targetHour} on ${targetDate} not found`);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading Office text:', err);
        setError(`Error loading Office text: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    loadOfficeText();
  }, [date, hour]);
  
  // Navigate to a different hour
  const handleHourChange = (selectedHour: string) => {
    navigate(`/office/${date || new Date().toISOString().split('T')[0]}/${selectedHour}`);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Divine Office</h1>
        {liturgicalDay && (
          <div className="mt-2">
            <p className="text-lg text-gray-600">
              {formatDate(liturgicalDay.date)}
            </p>
            <p className="text-lg font-medium">
              {liturgicalDay.celebration}
              <span className="ml-2 px-2 py-1 text-sm rounded bg-gray-100">
                {liturgicalDay.color}
              </span>
            </p>
          </div>
        )}
      </div>
      
      {/* Hour navigation */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {hours.map(h => (
            <button
              key={h.id}
              onClick={() => handleHourChange(h.id)}
              className={`px-4 py-2 rounded-md transition ${
                h.id === (hour || 'vespers')
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Office content */}
      {officeText ? (
        <div className="space-y-8">
          {/* Introduction */}
          <ResponsiveLiturgicalText
            title={`${hours.find(h => h.id === (hour || 'vespers'))?.name || 'Office'}`}
            content={officeText.content}
            contentLatin={officeText.contentLatin}
            className="mb-8"
          />
          
          {/* Psalms */}
          {officeText.psalms && officeText.psalms.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Psalms</h2>
              {officeText.psalms.map((psalm: Psalm) => (
                <ResponsiveLiturgicalText
                  key={psalm.id}
                  title={`Psalm ${psalm.number}`}
                  content={psalm.content}
                  contentLatin={psalm.contentLatin}
                />
              ))}
            </div>
          )}
          
          {/* Readings */}
          {officeText.readings && officeText.readings.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Readings</h2>
              {officeText.readings.map((reading: Reading) => (
                <ResponsiveLiturgicalText
                  key={reading.id}
                  title={`Reading ${reading.number}`}
                  content={reading.content}
                  contentLatin={reading.contentLatin}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No Office text available for this day and hour.</p>
        </div>
      )}
    </div>
  );
};

export default DivineOfficePage;
