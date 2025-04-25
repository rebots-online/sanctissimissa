import React from 'react';

/**
 * Props for the OfficeText component
 */
interface OfficeTextProps {
  id: string;
  hour: string;
  title?: {
    latin: string;
    english: string;
  };
  hymn?: {
    latin: string;
    english: string;
    rubric?: string;
  };
  psalms?: Array<{
    number: number;
    title?: {
      latin: string;
      english: string;
    };
    text: {
      latin: string;
      english: string;
    };
    antiphon?: {
      latin: string;
      english: string;
    };
  }>;
  chapter?: {
    latin: string;
    english: string;
    reference?: string;
    rubric?: string;
  };
  readings?: Array<{
    number: number;
    text: {
      latin: string;
      english: string;
    };
    response?: {
      latin: string;
      english: string;
    };
  }>;
  prayer?: {
    latin: string;
    english: string;
    ending?: string;
    rubric?: string;
  };
  showLatinOnly?: boolean;
  showEnglishOnly?: boolean;
  showRubrics?: boolean;
}

/**
 * Component for rendering Divine Office texts
 */
const OfficeText: React.FC<OfficeTextProps> = ({
  id,
  hour,
  title,
  hymn,
  psalms,
  chapter,
  readings,
  prayer,
  showLatinOnly = false,
  showEnglishOnly = false,
  showRubrics = true,
}) => {
  // Helper function to render a section with Latin and English text
  const renderSection = (
    title: string,
    options: {
      latin?: string;
      english?: string;
      reference?: string;
      rubric?: string;
      ending?: string;
    }
  ) => {
    const { latin, english, reference, rubric, ending } = options;
    
    if (!latin && !english) return null;

    return (
      <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 border-b pb-2">{title}</h3>
        
        {reference && (
          <p className="text-sm text-gray-600 italic mb-3">
            <span className="font-medium">Reference:</span> {reference}
          </p>
        )}
        
        {showRubrics && rubric && (
          <div className="mb-3 p-2 bg-red-50 text-red-800 rounded text-sm">
            <span className="font-medium">Rubric:</span> {rubric}
          </div>
        )}
        
        {!showEnglishOnly && latin && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
              <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>
              Latin
            </h4>
            <p className="whitespace-pre-line font-serif leading-relaxed">{latin}</p>
            
            {showRubrics && ending && (
              <p className="text-sm text-red-700 mt-1 italic">{ending}</p>
            )}
          </div>
        )}
        
        {!showLatinOnly && english && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
              English
            </h4>
            <p className="whitespace-pre-line leading-relaxed">{english}</p>
            
            {showRubrics && ending && (
              <p className="text-sm text-blue-700 mt-1 italic">{ending}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render a psalm
  const renderPsalm = (psalm: any, index: number) => {
    if (!psalm) return null;

    return (
      <div key={`psalm-${index}`} className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 border-b pb-2">
          Psalm {psalm.number}
          {psalm.title && (
            <span className="text-sm font-normal ml-2">
              {!showEnglishOnly && psalm.title.latin && (
                <span className="italic">{psalm.title.latin}</span>
              )}
              {!showLatinOnly && psalm.title.english && (
                <span className="text-gray-600 ml-1">({psalm.title.english})</span>
              )}
            </span>
          )}
        </h3>
        
        {psalm.antiphon && (
          <div className="mb-4 p-2 bg-yellow-50 rounded">
            <p className="text-sm font-medium text-yellow-800 mb-1">Antiphon:</p>
            {!showEnglishOnly && psalm.antiphon.latin && (
              <p className="text-sm italic mb-1">{psalm.antiphon.latin}</p>
            )}
            {!showLatinOnly && psalm.antiphon.english && (
              <p className="text-sm">{psalm.antiphon.english}</p>
            )}
          </div>
        )}
        
        {!showEnglishOnly && psalm.text.latin && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
              <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>
              Latin
            </h4>
            <p className="whitespace-pre-line font-serif leading-relaxed">{psalm.text.latin}</p>
          </div>
        )}
        
        {!showLatinOnly && psalm.text.english && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
              English
            </h4>
            <p className="whitespace-pre-line leading-relaxed">{psalm.text.english}</p>
          </div>
        )}
        
        {psalm.antiphon && (
          <div className="mt-4 p-2 bg-yellow-50 rounded">
            <p className="text-sm font-medium text-yellow-800 mb-1">Antiphon (repeated):</p>
            {!showEnglishOnly && psalm.antiphon.latin && (
              <p className="text-sm italic mb-1">{psalm.antiphon.latin}</p>
            )}
            {!showLatinOnly && psalm.antiphon.english && (
              <p className="text-sm">{psalm.antiphon.english}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render a reading
  const renderReading = (reading: any, index: number) => {
    if (!reading) return null;

    return (
      <div key={`reading-${index}`} className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 border-b pb-2">
          Reading {reading.number}
        </h3>
        
        {!showEnglishOnly && reading.text.latin && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
              <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>
              Latin
            </h4>
            <p className="whitespace-pre-line font-serif leading-relaxed">{reading.text.latin}</p>
          </div>
        )}
        
        {!showLatinOnly && reading.text.english && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
              English
            </h4>
            <p className="whitespace-pre-line leading-relaxed">{reading.text.english}</p>
          </div>
        )}
        
        {reading.response && (
          <div className="mt-4 p-2 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-800 mb-1">Response:</p>
            {!showEnglishOnly && reading.response.latin && (
              <p className="text-sm italic mb-1">{reading.response.latin}</p>
            )}
            {!showLatinOnly && reading.response.english && (
              <p className="text-sm">{reading.response.english}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="office-text">
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-center">
          {!showEnglishOnly && title.latin && (
            <span className="block">{title.latin}</span>
          )}
          {!showLatinOnly && title.english && (
            <span className="block text-gray-700">{title.english}</span>
          )}
        </h2>
      )}
      
      <div className="office-parts">
        {hymn && renderSection(
          'Hymn',
          {
            latin: hymn.latin,
            english: hymn.english,
            rubric: hymn.rubric
          }
        )}
        
        {psalms && psalms.map((psalm, index) => renderPsalm(psalm, index))}
        
        {chapter && renderSection(
          'Chapter',
          {
            latin: chapter.latin,
            english: chapter.english,
            reference: chapter.reference,
            rubric: chapter.rubric
          }
        )}
        
        {readings && readings.map((reading, index) => renderReading(reading, index))}
        
        {prayer && renderSection(
          'Prayer',
          {
            latin: prayer.latin,
            english: prayer.english,
            ending: prayer.ending,
            rubric: prayer.rubric
          }
        )}
      </div>
    </div>
  );
};

export default OfficeText;
