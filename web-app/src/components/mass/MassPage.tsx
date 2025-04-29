import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ResponsiveLiturgicalText from '../liturgical/ResponsiveLiturgicalText';
import { getLiturgicalDay, getMassText } from '../../services/database/liturgicalService';
import { LiturgicalDay, MassText } from '../../types/liturgical';

/**
 * Component for rendering the Mass page with responsive design
 */
const MassPage: React.FC = () => {
  const { date } = useParams<{ date?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liturgicalDay, setLiturgicalDay] = useState<LiturgicalDay | null>(null);
  const [massProper, setMassProper] = useState<MassText | null>(null);
  const [massOrdinary, setMassOrdinary] = useState<MassText | null>(null);
  const [showLatinOnly, setShowLatinOnly] = useState(false);
  const [showEnglishOnly, setShowEnglishOnly] = useState(false);
  const [showRubrics, setShowRubrics] = useState(true);

  useEffect(() => {
    const loadMassData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get today's date if not provided
        const targetDate = date || formatDate(new Date());

        // Get liturgical day
        const day = await getLiturgicalDay(targetDate);
        if (day) {
          // Cast to our type
          const liturgicalDayData = day as unknown as LiturgicalDay;
          setLiturgicalDay(liturgicalDayData);
          
          if (liturgicalDayData.massProper && typeof liturgicalDayData.massProper === 'string') {
            // Get mass proper
            const proper = await getMassText(liturgicalDayData.massProper);
            if (proper) {
              // Cast to our type
              setMassProper(proper as unknown as MassText);
            }
          } else {
            setError(`No Mass proper found for ${targetDate}`);
          }
        }

        // Get mass ordinary
        const ordinary = await getMassText('ordinary_default');
        if (ordinary) {
          // Cast to our type
          setMassOrdinary(ordinary as unknown as MassText);
        }

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
    <div className="max-w-4xl mx-auto">
      {liturgicalDay && (
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">{liturgicalDay.celebration}</h1>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="px-2 py-1 bg-gray-200 rounded text-sm">{liturgicalDay.season}</span>
            <span className="px-2 py-1 bg-gray-200 rounded text-sm">Color: {liturgicalDay.color}</span>
            {liturgicalDay.isHolyDay && (
              <span className="px-2 py-1 bg-blue-100 rounded text-sm">Holy Day</span>
            )}
            {liturgicalDay.isFeastDay && (
              <span className="px-2 py-1 bg-green-100 rounded text-sm">Feast Day</span>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={toggleLatinOnly}
              className={`px-3 py-1 rounded text-sm ${
                showLatinOnly ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Latin Only
            </button>
            <button
              onClick={toggleEnglishOnly}
              className={`px-3 py-1 rounded text-sm ${
                showEnglishOnly ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              English Only
            </button>
            <button
              onClick={toggleRubrics}
              className={`px-3 py-1 rounded text-sm ${
                showRubrics ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {showRubrics ? 'Hide Rubrics' : 'Show Rubrics'}
            </button>
          </div>
        </div>
      )}

      {massProper && (
        <div className="bg-white shadow-md rounded-lg p-4 md:p-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Proper of the Mass</h2>
          
          {/* Introit */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Introit</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.introitLatin as string | null,
                english: massProper.introitEnglish as string | null,
                reference: massProper.introitReference as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Collect */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Collect</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.collectLatin as string | null,
                english: massProper.collectEnglish as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Epistle */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Epistle</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.epistleLatin as string | null,
                english: massProper.epistleEnglish as string | null,
                reference: massProper.epistleReference as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Gradual */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Gradual</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.gradualLatin as string | null,
                english: massProper.gradualEnglish as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Sequence (if present) */}
          {(massProper.sequenceLatin || massProper.sequenceEnglish) && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Sequence</h3>
              <ResponsiveLiturgicalText
                content={{
                  latin: massProper.sequenceLatin as string | null,
                  english: massProper.sequenceEnglish as string | null,
                  rubric: massProper.sequenceRubric as string | null,
                }}
                showLatinOnly={showLatinOnly}
                showEnglishOnly={showEnglishOnly}
                showRubrics={showRubrics}
              />
            </div>
          )}
          
          {/* Gospel */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Gospel</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.gospelLatin as string | null,
                english: massProper.gospelEnglish as string | null,
                reference: massProper.gospelReference as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Offertory */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Offertory</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.offertoryLatin as string | null,
                english: massProper.offertoryEnglish as string | null,
                reference: massProper.offertoryReference as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Secret */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Secret</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.secretLatin as string | null,
                english: massProper.secretEnglish as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Communion */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Communion</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.communionLatin as string | null,
                english: massProper.communionEnglish as string | null,
                reference: massProper.communionReference as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
          
          {/* Postcommunion */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Postcommunion</h3>
            <ResponsiveLiturgicalText
              content={{
                latin: massProper.postcommunionLatin as string | null,
                english: massProper.postcommunionEnglish as string | null,
              }}
              showLatinOnly={showLatinOnly}
              showEnglishOnly={showEnglishOnly}
              showRubrics={showRubrics}
            />
          </div>
        </div>
      )}

      {massOrdinary && (
        <div className="bg-white shadow-md rounded-lg p-4 md:p-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Ordinary of the Mass</h2>
          {/* Ordinary content would go here */}
          <p className="text-center text-gray-600">
            The Ordinary of the Mass is the same for every Mass and includes the Kyrie, Gloria, Credo, Sanctus, and Agnus Dei.
          </p>
        </div>
      )}
    </div>
  );
};

export default MassPage;
