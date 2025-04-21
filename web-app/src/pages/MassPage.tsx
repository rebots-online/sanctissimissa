import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MassTextsService } from '../services/massTexts/massTextsService';
import { MassDay, MassSettings } from '../models/MassTexts';
import MassProperDisplay from '../components/mass/MassProperDisplay';
import MassOrdinaryDisplay from '../components/mass/MassOrdinaryDisplay';
import ImportDataButton from '../components/database/ImportDataButton';

const MassPage: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<string>(date || new Date().toISOString().split('T')[0]);
  const [massDay, setMassDay] = useState<MassDay | null>(null);
  const [settings, setSettings] = useState<MassSettings>({
    language: 'latin',
    showRubrics: true,
    showTranslations: true,
    fontSize: 'medium'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  // For responsive layout
  const [displayMode, setDisplayMode] = useState<'interactive' | 'side-by-side' | 'stacked'>('interactive');

  useEffect(() => {
    const fetchMassTexts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user settings
        const massService = MassTextsService.getInstance();
        const userSettings = await massService.getSettings();
        setSettings(userSettings);
        
        // Get mass texts for the current date
        const massData = await massService.getMassForDate(currentDate);
        if (!massData) {
          throw new Error(`No Mass texts found for date: ${currentDate}`);
        }
        
        setMassDay(massData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading Mass texts:', err);
        setError('Failed to load Mass texts. Please try again.');
        setLoading(false);
      }
    };
    
    fetchMassTexts();
  }, [currentDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCurrentDate(newDate);
    navigate(`/mass/${newDate}`);
  };

  const handlePreviousDay = () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const formattedDate = prevDate.toISOString().split('T')[0];
    setCurrentDate(formattedDate);
    navigate(`/mass/${formattedDate}`);
  };

  const handleNextDay = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const formattedDate = nextDate.toISOString().split('T')[0];
    setCurrentDate(formattedDate);
    navigate(`/mass/${formattedDate}`);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId) 
        : [...prev, sectionId]
    );
  };

  const toggleDisplayMode = () => {
    setDisplayMode(prev => {
      if (prev === 'interactive') return 'side-by-side';
      if (prev === 'side-by-side') return 'stacked';
      return 'interactive';
    });
  };

  const toggleLanguage = () => {
    setSettings(prev => ({
      ...prev,
      language: prev.language === 'latin' ? 'english' : 'latin'
    }));
  };

  const toggleTranslations = () => {
    setSettings(prev => ({
      ...prev,
      showTranslations: !prev.showTranslations
    }));
  };

  const toggleRubrics = () => {
    setSettings(prev => ({
      ...prev,
      showRubrics: !prev.showRubrics
    }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
        <ImportDataButton />
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!massDay) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p>No Mass texts available for the selected date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header with date navigation */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <span className="mr-2">Mass Texts</span>
          <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
            {new Date(currentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </h1>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button 
            onClick={handlePreviousDay}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Previous Day
          </button>
          
          <input 
            type="date" 
            value={currentDate}
            onChange={handleDateChange}
            className="px-3 py-1 border rounded text-sm"
          />
          
          <button 
            onClick={handleNextDay}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Next Day
          </button>
        </div>
      </div>

      {/* Mass day information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {massDay.title[settings.language]}
          {settings.showTranslations && settings.language === 'latin' && (
            <span className="text-lg font-normal text-gray-600 ml-2">
              ({massDay.title.english})
            </span>
          )}
        </h2>
        
        {massDay.description && (
          <p className="text-gray-700 mb-4">
            {massDay.description[settings.language]}
            {settings.showTranslations && settings.language === 'latin' && (
              <span className="text-gray-600 ml-2">
                ({massDay.description.english})
              </span>
            )}
          </p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-semibold">Season:</span> {massDay.liturgicalDay.season}</p>
            <p><span className="font-semibold">Rank:</span> {massDay.liturgicalDay.rank}</p>
          </div>
          <div>
            <p>
              <span className="font-semibold">Liturgical Color:</span>
              <span 
                className={`ml-2 inline-block w-4 h-4 rounded-full ${getColorClass(massDay.liturgicalDay.color)}`}
                title={massDay.liturgicalDay.color}
              ></span>
              <span className="ml-1">{massDay.liturgicalDay.color}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Display settings */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Display Settings</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={toggleLanguage}
            className={`px-3 py-1 rounded text-sm ${settings.language === 'latin' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {settings.language === 'latin' ? 'Latin' : 'English'}
          </button>
          
          <button 
            onClick={toggleTranslations}
            className={`px-3 py-1 rounded text-sm ${settings.showTranslations ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {settings.showTranslations ? 'Show Translations' : 'Hide Translations'}
          </button>
          
          <button 
            onClick={toggleRubrics}
            className={`px-3 py-1 rounded text-sm ${settings.showRubrics ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {settings.showRubrics ? 'Show Rubrics' : 'Hide Rubrics'}
          </button>
          
          <button 
            onClick={toggleDisplayMode}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Display: {displayMode === 'interactive' ? 'Tap/Hover' : displayMode === 'side-by-side' ? 'Two Columns' : 'Stacked'}
          </button>
        </div>
      </div>

      {/* Mass Proper */}
      <MassProperDisplay 
        proper={massDay.proper}
        primaryLanguage={settings.language}
        showTranslation={settings.showTranslations}
        showRubrics={settings.showRubrics}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />

      {/* Mass Ordinary */}
      {massDay.ordinary && (
        <MassOrdinaryDisplay 
          ordinary={massDay.ordinary as any /* Type cast to avoid TypeScript error */}
          primaryLanguage={settings.language}
          showTranslation={settings.showTranslations}
          showRubrics={settings.showRubrics}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
        />
      )}

      {/* Commemorations */}
      {massDay.commemorations && massDay.commemorations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Commemorations</h2>
          
          <div className="space-y-4">
            {massDay.commemorations.map((commemoration, index) => (
              <div key={`commemoration-${index}`} className="border-t pt-4">
                <h3 className="text-xl font-semibold mb-2">
                  {commemoration.title[settings.language]}
                  {settings.showTranslations && settings.language === 'latin' && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      ({commemoration.title.english})
                    </span>
                  )}
                </h3>
                
                <p className="text-gray-700">
                  {commemoration.content[settings.language]}
                  {settings.showTranslations && settings.language === 'latin' && (
                    <div className="text-sm text-gray-600 mt-2 border-l-4 border-gray-200 pl-4">
                      {commemoration.content.english}
                    </div>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get Tailwind color class based on liturgical color
const getColorClass = (color: string): string => {
  switch (color.toLowerCase()) {
    case 'white': return 'bg-white border border-gray-300';
    case 'red': return 'bg-red-600';
    case 'green': return 'bg-green-600';
    case 'purple': return 'bg-purple-800';
    case 'rose': return 'bg-pink-400';
    case 'black': return 'bg-black';
    default: return 'bg-gray-400';
  }
};

export default MassPage;
