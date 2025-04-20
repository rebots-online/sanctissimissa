import React from 'react';
import { LiturgicalDay, LiturgicalColor } from '../../models/calendar';

interface LiturgicalDayDisplayProps {
  liturgicalDay: LiturgicalDay;
}

/**
 * Component to display information about a liturgical day
 */
export const LiturgicalDayDisplay: React.FC<LiturgicalDayDisplayProps> = ({ liturgicalDay }) => {
  // Map liturgical colors to CSS color classes
  const colorMap: Record<LiturgicalColor, string> = {
    [LiturgicalColor.WHITE]: 'bg-white text-gray-900 border-gray-300',
    [LiturgicalColor.RED]: 'bg-red-600 text-white border-red-800',
    [LiturgicalColor.GREEN]: 'bg-green-600 text-white border-green-800',
    [LiturgicalColor.PURPLE]: 'bg-purple-700 text-white border-purple-900',
    [LiturgicalColor.ROSE]: 'bg-pink-400 text-white border-pink-600',
    [LiturgicalColor.BLACK]: 'bg-gray-900 text-white border-gray-700',
    [LiturgicalColor.GOLD]: 'bg-yellow-500 text-gray-900 border-yellow-700',
  };

  // Get the CSS class for the current liturgical color
  const colorClass = colorMap[liturgicalDay.color];

  return (
    <div className="p-4 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{liturgicalDay.celebration}</h2>
        <div 
          className={`w-6 h-6 rounded-full ${colorClass} border`} 
          title={`Liturgical Color: ${liturgicalDay.color}`}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-600">Date:</div>
        <div>{new Date(liturgicalDay.date).toLocaleDateString()}</div>
        
        <div className="text-gray-600">Season:</div>
        <div>{liturgicalDay.season.name}</div>
        
        <div className="text-gray-600">Rank:</div>
        <div>{liturgicalDay.rank}</div>
        
        {liturgicalDay.isHolyDay && (
          <div className="col-span-2 mt-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Holy Day
            </span>
          </div>
        )}
        
        {liturgicalDay.isFeastDay && (
          <div className="col-span-2 mt-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
              Feast Day
            </span>
          </div>
        )}
      </div>
      
      {liturgicalDay.commemorations.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700">Commemorations:</h3>
          <ul className="list-disc list-inside text-sm mt-1">
            {liturgicalDay.commemorations.map((commemoration, index) => (
              <li key={index}>{commemoration}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LiturgicalDayDisplay;
