import React from 'react';
import { MassProper, Language } from '../../models/MassTexts';
import MassPartDisplay from './MassPartDisplay';

interface MassProperDisplayProps {
  proper: MassProper;
  primaryLanguage: Language;
  showTranslation: boolean;
  showRubrics: boolean;
  expandedSections: string[];
  onToggleSection: (sectionId: string) => void;
}

const MassProperDisplay: React.FC<MassProperDisplayProps> = ({
  proper,
  primaryLanguage,
  showTranslation,
  showRubrics,
  expandedSections,
  onToggleSection
}) => {
  // Define the structure of the Mass Proper
  const properParts = [
    { id: 'introit', label: 'Introit', part: proper.introit },
    { id: 'collect', label: 'Collect', part: proper.collect },
    { id: 'epistle', label: 'Epistle', part: proper.epistle },
    { id: 'gradual', label: 'Gradual', part: proper.gradual }
  ];
  
  // Conditionally add parts that might not be present in every Mass
  if (proper.alleluia) {
    properParts.push({ id: 'alleluia', label: 'Alleluia', part: proper.alleluia });
  }
  
  if (proper.tract) {
    properParts.push({ id: 'tract', label: 'Tract', part: proper.tract });
  }
  
  if (proper.sequence) {
    properParts.push({ id: 'sequence', label: 'Sequence', part: proper.sequence });
  }
  
  // Add the remaining parts
  properParts.push(
    { id: 'gospel', label: 'Gospel', part: proper.gospel },
    { id: 'offertory', label: 'Offertory', part: proper.offertory },
    { id: 'secret', label: 'Secret', part: proper.secret },
    { id: 'preface', label: 'Preface', part: proper.preface },
    { id: 'communion', label: 'Communion', part: proper.communion },
    { id: 'postcommunion', label: 'Postcommunion', part: proper.postcommunion }
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Proper of the Mass</h2>
      
      <div className="space-y-2">
        {properParts.map(({ id, label, part }) => (
          <div key={id} className="border rounded-lg overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center"
              onClick={() => onToggleSection(id)}
            >
              <span className="font-semibold">{label}</span>
              <span>{expandedSections.includes(id) ? '−' : '+'}</span>
            </button>
            
            {expandedSections.includes(id) && (
              <div className="p-4">
                <MassPartDisplay
                  part={part}
                  primaryLanguage={primaryLanguage}
                  showTranslation={showTranslation}
                  showRubrics={showRubrics}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MassProperDisplay;
