import React from 'react';
import { MassOrdinary, Language } from '../../models/MassTexts';
import MassPartDisplay from './MassPartDisplay';

interface MassOrdinaryDisplayProps {
  ordinary: MassOrdinary;
  primaryLanguage: Language;
  showTranslation: boolean;
  showRubrics: boolean;
  expandedSections: string[];
  onToggleSection: (sectionId: string) => void;
}

const MassOrdinaryDisplay: React.FC<MassOrdinaryDisplayProps> = ({
  ordinary,
  primaryLanguage,
  showTranslation,
  showRubrics,
  expandedSections,
  onToggleSection
}) => {
  const ordinaryParts = [
    { id: 'kyrie', label: 'Kyrie', part: ordinary.kyrie },
    { id: 'gloria', label: 'Gloria', part: ordinary.gloria },
    { id: 'credo', label: 'Credo', part: ordinary.credo },
    { id: 'sanctus', label: 'Sanctus', part: ordinary.sanctus },
    { id: 'agnusDei', label: 'Agnus Dei', part: ordinary.agnusDei },
    { id: 'dismissal', label: 'Ite Missa Est', part: ordinary.dismissal }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Ordinary of the Mass</h2>
      
      <div className="space-y-2">
        {ordinaryParts.map(({ id, label, part }) => (
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

export default MassOrdinaryDisplay;
