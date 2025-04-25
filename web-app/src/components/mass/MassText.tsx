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
    rubric?: string;
  };
  collect?: {
    latin: string;
    english: string;
    rubric?: string;
    ending?: string;
  };
  epistle?: {
    latin: string;
    english: string;
    reference?: string;
    introduction?: string;
    rubric?: string;
  };
  gradual?: {
    latin: string;
    english: string;
    reference?: string;
    rubric?: string;
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
    introduction?: string;
    rubric?: string;
  };
  offertory?: {
    latin: string;
    english: string;
    reference?: string;
    rubric?: string;
  };
  secret?: {
    latin: string;
    english: string;
    ending?: string;
    rubric?: string;
  };
  communion?: {
    latin: string;
    english: string;
    reference?: string;
    rubric?: string;
  };
  postcommunion?: {
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
      introduction?: string;
      ending?: string;
    }
  ) => {
    const { latin, english, reference, rubric, introduction, ending } = options;

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

        {showRubrics && introduction && (
          <div className="mb-3 p-2 bg-blue-50 text-blue-800 rounded text-sm">
            <span className="font-medium">Introduction:</span> {introduction}
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
          {
            latin: introit.latin,
            english: introit.english,
            reference: introit.reference,
            rubric: introit.rubric
          }
        )}

        {collect && renderSection(
          'Collect',
          {
            latin: collect.latin,
            english: collect.english,
            rubric: collect.rubric,
            ending: collect.ending
          }
        )}

        {epistle && renderSection(
          'Epistle',
          {
            latin: epistle.latin,
            english: epistle.english,
            reference: epistle.reference,
            introduction: epistle.introduction,
            rubric: epistle.rubric
          }
        )}

        {gradual && renderSection(
          'Gradual',
          {
            latin: gradual.latin,
            english: gradual.english,
            reference: gradual.reference,
            rubric: gradual.rubric
          }
        )}

        {sequence && renderSection(
          'Sequence',
          {
            latin: sequence.latin,
            english: sequence.english,
            rubric: sequence.rubric
          }
        )}

        {gospel && renderSection(
          'Gospel',
          {
            latin: gospel.latin,
            english: gospel.english,
            reference: gospel.reference,
            introduction: gospel.introduction,
            rubric: gospel.rubric
          }
        )}

        {offertory && renderSection(
          'Offertory',
          {
            latin: offertory.latin,
            english: offertory.english,
            reference: offertory.reference,
            rubric: offertory.rubric
          }
        )}

        {secret && renderSection(
          'Secret',
          {
            latin: secret.latin,
            english: secret.english,
            ending: secret.ending,
            rubric: secret.rubric
          }
        )}

        {communion && renderSection(
          'Communion',
          {
            latin: communion.latin,
            english: communion.english,
            reference: communion.reference,
            rubric: communion.rubric
          }
        )}

        {postcommunion && renderSection(
          'Postcommunion',
          {
            latin: postcommunion.latin,
            english: postcommunion.english,
            ending: postcommunion.ending,
            rubric: postcommunion.rubric
          }
        )}
      </div>
    </div>
  );
};

export default MassText;
