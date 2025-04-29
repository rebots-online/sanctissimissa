import React, { useState } from 'react';
import { useMediaQuery } from 'react-responsive';

interface ResponsiveLiturgicalTextProps {
  title?: string;
  titleLatin?: string;
  content: string;
  contentLatin?: string;
  rubrics?: string[];
  className?: string;
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
}) => {
  const [showLatin, setShowLatin] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 1024px)' });
  const isMobile = useMediaQuery({ query: '(max-width: 640px)' });
  
  // Format content with rubrics highlighted
  const formatContent = (text: string) => {
    if (!text) return '';
    
    let formattedText = text;
    
    // Highlight rubrics
    rubrics.forEach(rubric => {
      formattedText = formattedText.replace(
        new RegExp(rubric, 'g'),
        `<span class="text-red-600 italic">${rubric}</span>`
      );
    });
    
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
          {showLatin ? titleLatin || title : title || titleLatin}
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
          {contentLatin && (
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
          __html: formatContent(showLatin ? contentLatin || content : content)
        }}
      />
      
      {/* Mobile layout for side-by-side view */}
      {!isMobile && contentLatin && content && (
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
      {!isTabletOrMobile && contentLatin && content && (
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Latin</h3>
            <div 
              className="prose max-w-none"
              style={{ fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{
                __html: formatContent(contentLatin)
              }}
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">English</h3>
            <div 
              className="prose max-w-none"
              style={{ fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{
                __html: formatContent(content)
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveLiturgicalText;