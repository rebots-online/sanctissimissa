import React, { useState } from 'react';
import { useMediaQuery } from 'react-responsive';

interface BilingualContent {
  latin: string | null;
  english: string | null;
  reference?: string | null;
  rubric?: string | null;
}

interface ResponsiveLiturgicalTextProps {
  title?: string;
  titleLatin?: string;
  content: string | BilingualContent;
  contentLatin?: string;
  rubrics?: string[];
  className?: string;
  showLatinOnly?: boolean;
  showEnglishOnly?: boolean;
  showRubrics?: boolean;
}

/**
 * Responsive component for displaying liturgical texts
 *
 * Features:
 * - Responsive layout for different screen sizes
 * - Toggle between Latin and English
 * - Highlight rubrics
 * - Adjustable font size
 */
const ResponsiveLiturgicalText: React.FC<ResponsiveLiturgicalTextProps> = ({
  title,
  titleLatin,
  content,
  contentLatin,
  rubrics = [],
  className = '',
  showLatinOnly = false,
  showEnglishOnly = false,
  showRubrics = true,
}) => {
  const [showLatin, setShowLatin] = useState(showLatinOnly);
  const [fontSize, setFontSize] = useState(16);

  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 1024px)' });
  const isMobile = useMediaQuery({ query: '(max-width: 640px)' });

  // Get the appropriate content based on the content type
  const getContent = () => {
    if (typeof content === 'string') {
      return {
        latin: contentLatin || '',
        english: content || '',
        reference: null,
        rubric: null
      };
    } else {
      return {
        latin: content.latin || '',
        english: content.english || '',
        reference: content.reference || null,
        rubric: content.rubric || null
      };
    }
  };

  const bilingualContent = getContent();

  // Format content with rubrics highlighted
  const formatContent = (text: string) => {
    if (!text) return '';

    let formattedText = text;

    // Highlight rubrics if enabled
    if (showRubrics) {
      // Add the rubric from the content if it exists
      const allRubrics = [...rubrics];
      if (bilingualContent.rubric) {
        allRubrics.push(bilingualContent.rubric);
      }

      allRubrics.forEach(rubric => {
        if (rubric) {
          formattedText = formattedText.replace(
            new RegExp(rubric, 'g'),
            `<span class="text-red-600 italic">${rubric}</span>`
          );
        }
      });
    }

    // Add reference if it exists
    if (bilingualContent.reference) {
      formattedText += `<div class="text-sm text-gray-600 mt-2">${bilingualContent.reference}</div>`;
    }

    // Replace newlines with <br> tags
    formattedText = formattedText.replace(/\n/g, '<br />');

    return formattedText;
  };

  // Increase font size
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  // Decrease font size
  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };

  // Toggle language
  const toggleLanguage = () => {
    setShowLatin(prev => !prev);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      {/* Header with title and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-semibold mb-2 sm:mb-0">
          {showLatin ? (titleLatin || title) : (title || titleLatin)}
        </h2>

        <div className="flex items-center space-x-2">
          {/* Font size controls */}
          <button
            onClick={decreaseFontSize}
            className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            aria-label="Decrease font size"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            onClick={increaseFontSize}
            className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            aria-label="Increase font size"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Language toggle */}
          {bilingualContent.latin && bilingualContent.english && !showLatinOnly && !showEnglishOnly && (
            <button
              onClick={toggleLanguage}
              className={`px-3 py-1 rounded transition ${
                showLatin ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              {showLatin ? 'Latin' : 'English'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="prose max-w-none"
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{
          __html: formatContent(showLatin ? bilingualContent.latin : bilingualContent.english)
        }}
      />

      {/* Mobile layout for side-by-side view */}
      {!isMobile && bilingualContent.latin && bilingualContent.english && !showLatinOnly && !showEnglishOnly && (
        <div className="mt-4">
          <button
            onClick={toggleLanguage}
            className="text-blue-600 hover:text-blue-800 underline mb-2"
          >
            {showLatin ? 'Show English' : 'Show Latin'}
          </button>
        </div>
      )}

      {/* Tablet and desktop layout for side-by-side view */}
      {!isTabletOrMobile && bilingualContent.latin && bilingualContent.english && !showLatinOnly && !showEnglishOnly && (
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Latin</h3>
            <div
              className="prose max-w-none"
              style={{ fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{
                __html: formatContent(bilingualContent.latin)
              }}
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">English</h3>
            <div
              className="prose max-w-none"
              style={{ fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{
                __html: formatContent(bilingualContent.english)
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveLiturgicalText;