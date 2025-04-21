import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface OfficeSettings {
  language: 'latin' | 'english';
  showRubrics: boolean;
  showTranslations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface OfficeHour {
  id: string;
  name: {
    latin: string;
    english: string;
  };
  description?: {
    latin: string;
    english: string;
  };
  parts: OfficePart[];
}

interface OfficePart {
  id: string;
  title: {
    latin: string;
    english: string;
  };
  content: {
    latin: string;
    english: string;
  };
  rubrics?: {
    text: string;
    position: 'before' | 'after' | 'inline';
  }[];
}

interface OfficeDay {
  id: string;
  date: string;
  title: {
    latin: string;
    english: string;
  };
  description?: {
    latin: string;
    english: string;
  };
  liturgicalDay: {
    season: string;
    week: string;
    day: string;
    rank: number;
    color: 'white' | 'red' | 'green' | 'purple' | 'rose' | 'black';
  };
  hours: {
    matins?: OfficeHour;
    lauds?: OfficeHour;
    prime?: OfficeHour;
    terce?: OfficeHour;
    sext?: OfficeHour;
    none?: OfficeHour;
    vespers?: OfficeHour;
    compline?: OfficeHour;
  };
}

const DivineOfficePage: React.FC = () => {
  const { date, hour } = useParams<{ date: string; hour: string }>();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<string>(date || new Date().toISOString().split('T')[0]);
  const [currentHour, setCurrentHour] = useState<string>(hour || 'vespers');
  const [officeDay, setOfficeDay] = useState<OfficeDay | null>(null);
  const [settings, setSettings] = useState<OfficeSettings>({
    language: 'latin',
    showRubrics: true,
    showTranslations: true,
    fontSize: 'medium'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  useEffect(() => {
    const fetchOfficeTexts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // This is a placeholder for actual data fetching
        // In a real implementation, we would call a service like:
        // const officeService = OfficeTextsService.getInstance();
        // const officeData = await officeService.getOfficeForDate(currentDate);
        
        // For now, we'll just simulate a loading delay
        setTimeout(() => {
          setOfficeDay({
            id: `office-${currentDate}`,
            date: currentDate,
            title: {
              latin: 'Divinum Officium',
              english: 'Divine Office'
            },
            description: {
              latin: 'Breviarium Romanum',
              english: 'Roman Breviary'
            },
            liturgicalDay: {
              season: 'Ordinary Time',
              week: 'Week 15',
              day: 'Sunday',
              rank: 2,
              color: 'green'
            },
            hours: {
              matins: {
                id: 'matins',
                name: {
                  latin: 'Matutinum',
                  english: 'Matins'
                },
                parts: []
              },
              lauds: {
                id: 'lauds',
                name: {
                  latin: 'Laudes',
                  english: 'Lauds'
                },
                parts: []
              },
              vespers: {
                id: 'vespers',
                name: {
                  latin: 'Vesperae',
                  english: 'Vespers'
                },
                parts: [
                  {
                    id: 'intro',
                    title: {
                      latin: 'Introductio',
                      english: 'Introduction'
                    },
                    content: {
                      latin: 'Deus, in adjutórium meum inténde.\nDómine, ad adjuvándum me festína.\nGlória Patri, et Fílio, et Spirítui Sancto.\nSicut erat in princípio, et nunc, et semper, et in sǽcula sæculórum. Amen. Allelúja.',
                      english: 'O God, come to my assistance.\nO Lord, make haste to help me.\nGlory be to the Father, and to the Son, and to the Holy Spirit.\nAs it was in the beginning, is now, and ever shall be, world without end. Amen. Alleluia.'
                    }
                  },
                  {
                    id: 'psalm-109',
                    title: {
                      latin: 'Psalmus 109',
                      english: 'Psalm 109'
                    },
                    content: {
                      latin: 'Dixit Dóminus Dómino meo: Sede a dextris meis.\nDonec ponam inimícos tuos: scabéllum pedum tuórum.',
                      english: 'The Lord said to my Lord: Sit at my right hand.\nUntil I make your enemies your footstool.'
                    }
                  }
                ]
              },
              compline: {
                id: 'compline',
                name: {
                  latin: 'Completorium',
                  english: 'Compline'
                },
                parts: []
              }
            }
          });
          setLoading(false);
        }, 1000);
        
      } catch (err) {
        console.error('Error loading Office texts:', err);
        setError('Failed to load Divine Office texts. Please try again.');
        setLoading(false);
      }
    };
    
    fetchOfficeTexts();
  }, [currentDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCurrentDate(newDate);
    navigate(`/office/${newDate}/${currentHour}`);
  };

  const handleHourChange = (hour: string) => {
    setCurrentHour(hour);
    navigate(`/office/${currentDate}/${hour}`);
  };

  const handlePreviousDay = () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const formattedDate = prevDate.toISOString().split('T')[0];
    setCurrentDate(formattedDate);
    navigate(`/office/${formattedDate}/${currentHour}`);
  };

  const handleNextDay = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const formattedDate = nextDate.toISOString().split('T')[0];
    setCurrentDate(formattedDate);
    navigate(`/office/${formattedDate}/${currentHour}`);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId) 
        : [...prev, sectionId]
    );
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
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
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!officeDay) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p>No Divine Office texts available for the selected date.</p>
        </div>
      </div>
    );
  }

  // Get the current hour's data
  const currentHourData = officeDay.hours[currentHour as keyof typeof officeDay.hours];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header with date navigation */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <span className="mr-2">Divine Office</span>
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

      {/* Office day information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {officeDay.title[settings.language]}
          {settings.showTranslations && settings.language === 'latin' && (
            <span className="text-lg font-normal text-gray-600 ml-2">
              ({officeDay.title.english})
            </span>
          )}
        </h2>
        
        {officeDay.description && (
          <p className="text-gray-700 mb-4">
            {officeDay.description[settings.language]}
            {settings.showTranslations && settings.language === 'latin' && (
              <span className="text-gray-600 ml-2">
                ({officeDay.description.english})
              </span>
            )}
          </p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-semibold">Season:</span> {officeDay.liturgicalDay.season}</p>
            <p><span className="font-semibold">Rank:</span> {officeDay.liturgicalDay.rank}</p>
          </div>
          <div>
            <p>
              <span className="font-semibold">Liturgical Color:</span>
              <span 
                className={`ml-2 inline-block w-4 h-4 rounded-full ${getColorClass(officeDay.liturgicalDay.color)}`}
                title={officeDay.liturgicalDay.color}
              ></span>
              <span className="ml-1">{officeDay.liturgicalDay.color}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Hour selection */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Hours</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(officeDay.hours).map(([hourKey, hourData]) => (
            hourData && (
              <button 
                key={hourKey}
                onClick={() => handleHourChange(hourKey)}
                className={`px-3 py-1 rounded text-sm ${currentHour === hourKey ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                {hourData.name[settings.language]}
              </button>
            )
          ))}
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
        </div>
      </div>

      {/* Current Hour Content */}
      {currentHourData ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            {currentHourData.name[settings.language]}
            {settings.showTranslations && settings.language === 'latin' && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                ({currentHourData.name.english})
              </span>
            )}
          </h2>
          
          <div className="space-y-6">
            {currentHourData.parts.map((part) => (
              <div key={part.id} className="border-t pt-4">
                <h3 className="text-xl font-semibold mb-2">
                  {part.title[settings.language]}
                  {settings.showTranslations && settings.language === 'latin' && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      ({part.title.english})
                    </span>
                  )}
                </h3>
                
                <div className="space-y-4">
                  {/* Primary language */}
                  <div className="text-lg leading-relaxed">
                    {part.content[settings.language].split('\n').map((paragraph, idx) => (
                      <p key={`${part.id}-${settings.language}-${idx}`} className="mb-2">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  
                  {/* Translation */}
                  {settings.showTranslations && settings.language === 'latin' && (
                    <div className="text-md text-gray-700 leading-relaxed border-l-4 border-gray-200 pl-4">
                      {part.content.english.split('\n').map((paragraph, idx) => (
                        <p key={`${part.id}-english-${idx}`} className="mb-2">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {/* Rubrics */}
                  {settings.showRubrics && part.rubrics && part.rubrics.length > 0 && (
                    <div className="mt-3">
                      {part.rubrics.map((rubric, idx) => (
                        <div 
                          key={`${part.id}-rubric-${idx}`}
                          className="text-sm italic text-red-800 my-2"
                        >
                          {rubric.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center text-gray-500">
            <p>No content available for {currentHour}.</p>
            <p className="mt-2">Please select another hour from the options above.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DivineOfficePage;
