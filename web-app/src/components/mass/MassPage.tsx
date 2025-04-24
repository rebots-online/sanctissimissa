import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MassText from './MassText';
import { getLiturgicalDay, getMassText } from '../../services/database/sqlite';

/**
 * Component for rendering the Mass page
 */
const MassPage: React.FC = () => {
  const { date } = useParams<{ date?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liturgicalDay, setLiturgicalDay] = useState<any>(null);
  const [massProper, setMassProper] = useState<any>(null);
  const [massOrdinary, setMassOrdinary] = useState<any>(null);
  const [showLatinOnly, setShowLatinOnly] = useState(false);
  const [showEnglishOnly, setShowEnglishOnly] = useState(false);

  useEffect(() => {
    const loadMassData = () => {
      try {
        setLoading(true);
        setError(null);

        // Get today's date if not provided
        const targetDate = date || formatDate(new Date());
        
        // Get liturgical day
        const day = getLiturgicalDay(targetDate);
        setLiturgicalDay(day);
        
        if (day && day.mass_proper) {
          // Get mass proper
          const proper = getMassText(day.mass_proper);
          setMassProper(proper);
        } else {
          setError(`No Mass proper found for ${targetDate}`);
        }
        
        // Get mass ordinary
        const ordinary = getMassText('ordinary_default');
        setMassOrdinary(ordinary);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading Mass data:', err);
        setError(`Error loading Mass data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    loadMassData();
  }, [date]);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
          
          <div className="flex gap-4 mb-6">
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
          </div>
        </div>
      )}
      
      {massProper && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <MassText
            id={massProper.id}
            part="proper"
            title={{
              latin: massProper.title_latin,
              english: massProper.title_english,
            }}
            introit={{
              latin: massProper.introit_latin,
              english: massProper.introit_english,
              reference: massProper.introit_reference,
            }}
            collect={{
              latin: massProper.collect_latin,
              english: massProper.collect_english,
            }}
            epistle={{
              latin: massProper.epistle_latin,
              english: massProper.epistle_english,
              reference: massProper.epistle_reference,
            }}
            gradual={{
              latin: massProper.gradual_latin,
              english: massProper.gradual_english,
            }}
            sequence={massProper.sequence_latin || massProper.sequence_english ? {
              latin: massProper.sequence_latin,
              english: massProper.sequence_english,
              rubric: massProper.sequence_rubric,
            } : undefined}
            gospel={{
              latin: massProper.gospel_latin,
              english: massProper.gospel_english,
              reference: massProper.gospel_reference,
            }}
            offertory={{
              latin: massProper.offertory_latin,
              english: massProper.offertory_english,
              reference: massProper.offertory_reference,
            }}
            secret={{
              latin: massProper.secret_latin,
              english: massProper.secret_english,
            }}
            communion={{
              latin: massProper.communion_latin,
              english: massProper.communion_english,
              reference: massProper.communion_reference,
            }}
            postcommunion={{
              latin: massProper.postcommunion_latin,
              english: massProper.postcommunion_english,
            }}
            showLatinOnly={showLatinOnly}
            showEnglishOnly={showEnglishOnly}
          />
        </div>
      )}
      
      {massOrdinary && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Ordinary of the Mass</h2>
          <MassText
            id={massOrdinary.id}
            part="ordinary"
            showLatinOnly={showLatinOnly}
            showEnglishOnly={showEnglishOnly}
          />
        </div>
      )}
    </div>
  );
};

export default MassPage;
