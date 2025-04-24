import React from 'react';

/**
 * Props for the MassText component
 */
interface MassTextProps {
  id: string;
  part: 'proper' | 'ordinary';
  title?: {
    latin: string;
    english: string;
  };
  introit?: {
    latin: string;
    english: string;
    reference?: string;
  };
  collect?: {
    latin: string;
    english: string;
  };
  epistle?: {
    latin: string;
    english: string;
    reference?: string;
  };
  gradual?: {
    latin: string;
    english: string;
  };
  sequence?: {
    latin: string;
    english: string;
    rubric?: string;
  };
  gospel?: {
    latin: string;
    english: string;
    reference?: string;
  };
  offertory?: {
    latin: string;
    english: string;
    reference?: string;
  };
  secret?: {
    latin: string;
    english: string;
  };
  communion?: {
    latin: string;
    english: string;
    reference?: string;
  };
  postcommunion?: {
    latin: string;
    english: string;
  };
  showLatinOnly?: boolean;
  showEnglishOnly?: boolean;
}

/**
 * Component for rendering Mass texts
 */
const MassText: React.FC<MassTextProps> = ({
  id,
  part,
  title,
  introit,
  collect,
  epistle,
  gradual,
  sequence,
  gospel,
  offertory,
  secret,
  communion,
  postcommunion,
  showLatinOnly = false,
  showEnglishOnly = false,
}) => {
  // Helper function to render a section with Latin and English text
  const renderSection = (
    title: string,
    latin?: string,
    english?: string,
    reference?: string
  ) => {
    if (!latin && !english) return null;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {reference && (
          <p className="text-sm text-gray-600 italic mb-2">{reference}</p>
        )}
        
        {!showEnglishOnly && latin && (
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Latin</h4>
            <p className="whitespace-pre-line">{latin}</p>
          </div>
        )}
        
        {!showLatinOnly && english && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">English</h4>
            <p className="whitespace-pre-line">{english}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mass-text">
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
      
      <div className="mass-parts">
        {introit && renderSection(
          'Introit',
          introit.latin,
          introit.english,
          introit.reference
        )}
        
        {collect && renderSection(
          'Collect',
          collect.latin,
          collect.english
        )}
        
        {epistle && renderSection(
          'Epistle',
          epistle.latin,
          epistle.english,
          epistle.reference
        )}
        
        {gradual && renderSection(
          'Gradual',
          gradual.latin,
          gradual.english
        )}
        
        {sequence && renderSection(
          'Sequence',
          sequence.latin,
          sequence.english
        )}
        
        {gospel && renderSection(
          'Gospel',
          gospel.latin,
          gospel.english,
          gospel.reference
        )}
        
        {offertory && renderSection(
          'Offertory',
          offertory.latin,
          offertory.english,
          offertory.reference
        )}
        
        {secret && renderSection(
          'Secret',
          secret.latin,
          secret.english
        )}
        
        {communion && renderSection(
          'Communion',
          communion.latin,
          communion.english,
          communion.reference
        )}
        
        {postcommunion && renderSection(
          'Postcommunion',
          postcommunion.latin,
          postcommunion.english
        )}
      </div>
    </div>
  );
};

export default MassText;
