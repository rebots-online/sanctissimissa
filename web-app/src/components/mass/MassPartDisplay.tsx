import React, { useState, useEffect } from 'react';
import { MassPart, Language, Rubric } from '../../models/MassTexts';

interface MassPartDisplayProps {
  part: MassPart;
  primaryLanguage: Language;
  showTranslation: boolean;
  showRubrics: boolean;
  displayMode?: 'interactive' | 'side-by-side' | 'stacked';
}

const MassPartDisplay: React.FC<MassPartDisplayProps> = ({
  part,
  primaryLanguage,
  showTranslation,
  showRubrics,
  displayMode = 'interactive'
}) => {
  const secondaryLanguage: Language = primaryLanguage === 'latin' ? 'english' : 'latin';
  const [activeTranslationIndex, setActiveTranslationIndex] = useState<number | null>(null);
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Check screen width on mount and resize
  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 768); // md breakpoint in Tailwind
    };
    
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    
    return () => {
      window.removeEventListener('resize', checkScreenWidth);
    };
  }, []);

  // Determine the actual display mode based on props and screen width
  const effectiveDisplayMode = 
    displayMode === 'interactive' ? 'interactive' :
    (displayMode === 'side-by-side' && isWideScreen) ? 'side-by-side' : 'stacked';

  // Split text into paragraphs
  const primaryParagraphs = part.content[primaryLanguage].split('\n');
  const secondaryParagraphs = part.content[secondaryLanguage].split('\n');

  return (
    <div className="mb-6 border-b pb-4">
      <h3 className="text-xl font-semibold mb-2">
        {part.title[primaryLanguage]}
        {showTranslation && (
          <span className="text-sm font-normal text-gray-600 ml-2">
            ({part.title[secondaryLanguage]})
          </span>
        )}
      </h3>

      {/* Content display based on mode */}
      {effectiveDisplayMode === 'interactive' ? (
        // Interactive mode (tap/hover to show translation)
        <div className="space-y-4">
          {primaryParagraphs.map((paragraph, index) => (
            <div key={`${part.id}-para-${index}`} className="mb-4">
              <p 
                className="text-lg leading-relaxed cursor-pointer relative"
                onClick={() => setActiveTranslationIndex(activeTranslationIndex === index ? null : index)}
                onMouseEnter={() => setActiveTranslationIndex(index)}
                onMouseLeave={() => setActiveTranslationIndex(null)}
              >
                {paragraph}
                {showTranslation && activeTranslationIndex === index && (
                  <span className="absolute top-full left-0 right-0 bg-gray-100 p-3 text-md text-gray-700 border-l-4 border-gray-200 z-10 shadow-md rounded">
                    {secondaryParagraphs[index] || ''}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      ) : effectiveDisplayMode === 'side-by-side' ? (
        // Side-by-side mode (two columns)
        <div className="grid grid-cols-2 gap-6">
          {/* Primary language column */}
          <div className="text-lg leading-relaxed">
            {primaryParagraphs.map((paragraph, index) => (
              <p key={`${part.id}-${primaryLanguage}-${index}`} className="mb-2">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Secondary language column */}
          {showTranslation && (
            <div className="text-md text-gray-700 leading-relaxed border-l-4 border-gray-200 pl-4">
              {secondaryParagraphs.map((paragraph, index) => (
                <p key={`${part.id}-${secondaryLanguage}-${index}`} className="mb-2">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Stacked mode (one after another)
        <div className="space-y-4">
          {/* Primary language text */}
          <div className="text-lg leading-relaxed">
            {primaryParagraphs.map((paragraph, index) => (
              <p key={`${part.id}-${primaryLanguage}-${index}`} className="mb-2">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Secondary language (translation) */}
          {showTranslation && (
            <div className="text-md text-gray-700 leading-relaxed border-l-4 border-gray-200 pl-4">
              {secondaryParagraphs.map((paragraph, index) => (
                <p key={`${part.id}-${secondaryLanguage}-${index}`} className="mb-2">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Wrap the following in a fragment to fix adjacent JSX error */}
      <>
        {/* Rubrics */}
        {showRubrics && part.rubrics && part.rubrics.length > 0 && (
          <div className="mt-3">
            {part.rubrics.map((rubric: Rubric, index: number) => (
              <div 
                key={`${part.id}-rubric-${index}`}
                className={`text-sm italic ${
                  rubric.isImportant 
                    ? 'text-red-700 font-semibold' 
                    : 'text-gray-600'
                } mb-1`}
              >
                {rubric.text}
              </div>
            ))}
          </div>
        )}
      </>
    </div>
  );
};

export default MassPartDisplay;
