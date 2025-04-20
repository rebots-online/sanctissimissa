import React, { useState, useEffect } from 'react';
import { getLiturgicalDay } from '../services/calendar/liturgicalCalendar';
import { LiturgicalDay } from '../models/calendar';
import LiturgicalDayDisplay from '../components/calendar/LiturgicalDayDisplay';

/**
 * Calendar page component
 */
const CalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [liturgicalDay, setLiturgicalDay] = useState<LiturgicalDay | null>(null);
  
  // Update liturgical day when selected date changes
  useEffect(() => {
    try {
      const day = getLiturgicalDay(selectedDate);
      setLiturgicalDay(day);
    } catch (error) {
      console.error('Error getting liturgical day:', error);
      setLiturgicalDay(null);
    }
  }, [selectedDate]);
  
  // Handle date change
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(event.target.value);
    setSelectedDate(newDate);
  };
  
  // Navigate to previous/next day
  const navigateDay = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };
  
  // Format date for input
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Liturgical Calendar</h1>
      
      <div className="mb-6 flex items-center space-x-4">
        <button 
          onClick={() => navigateDay(-1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Previous Day
        </button>
        
        <input
          type="date"
          value={formatDateForInput(selectedDate)}
          onChange={handleDateChange}
          className="px-4 py-2 border rounded"
        />
        
        <button 
          onClick={() => navigateDay(1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Next Day
        </button>
      </div>
      
      {liturgicalDay ? (
        <LiturgicalDayDisplay liturgicalDay={liturgicalDay} />
      ) : (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          Error loading liturgical day information.
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Important Upcoming Dates</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* We'll add dynamic upcoming dates here in a future update */}
          <div className="p-4 border rounded">
            <div className="font-semibold">Easter Sunday</div>
            <div>April 20, 2025</div>
          </div>
          <div className="p-4 border rounded">
            <div className="font-semibold">Pentecost</div>
            <div>June 8, 2025</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
