import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLiturgicalDaysForMonth } from '../services/database/liturgicalService';
import { LiturgicalDay } from '../types/liturgical';

interface CalendarPageParams {
  year?: string;
  month?: string;
}

/**
 * Calendar page component
 *
 * Features:
 * - Monthly calendar view
 * - Liturgical day information
 * - Navigation between months
 * - Links to Mass and Office texts
 * - Responsive design
 */
const CalendarPage: React.FC = () => {
  const { year, month } = useParams<CalendarPageParams>();
  const navigate = useNavigate();

  // Get current date if not provided
  const today = new Date();
  const currentYear = parseInt(year || today.getFullYear().toString());
  const currentMonth = parseInt(month || (today.getMonth() + 1).toString());

  const [liturgicalDays, setLiturgicalDays] = useState<LiturgicalDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load liturgical days for the month
  useEffect(() => {
    const loadLiturgicalDays = async () => {
      try {
        setLoading(true);
        setError(null);

        const days = await getLiturgicalDaysForMonth(currentYear, currentMonth);
        setLiturgicalDays(days);

        setLoading(false);
      } catch (err) {
        console.error('Error loading liturgical days:', err);
        setError(`Error loading liturgical days: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadLiturgicalDays();
  }, [currentYear, currentMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;

    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear--;
    }

    navigate(`/calendar/${prevYear}/${prevMonth}`);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    let nextYear = currentYear;
    let nextMonth = currentMonth + 1;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }

    navigate(`/calendar/${nextYear}/${nextMonth}`);
  };

  // Navigate to today
  const goToToday = () => {
    navigate(`/calendar/${today.getFullYear()}/${today.getMonth() + 1}`);
  };

  // Get month name
  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  // Get liturgical day for a specific date
  const getLiturgicalDay = (day: number) => {
    const dateString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return liturgicalDays.find(liturgicalDay => liturgicalDay.date === dateString);
  };

  // Get color class for liturgical day
  const getColorClass = (color?: string) => {
    switch (color?.toLowerCase()) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'purple':
      case 'violet':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'white':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'black':
        return 'bg-gray-800 text-white border-gray-600';
      case 'rose':
      case 'pink':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'gold':
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  // Calendar variables
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar days
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Liturgical Calendar</h1>
        <a
          href="/calendar/demo"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Try Enhanced Calendar Demo
        </a>
      </div>

      {/* Month navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={goToPreviousMonth}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Previous
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-semibold">
            {getMonthName(currentMonth)} {currentYear}
          </h2>
          <button
            onClick={goToToday}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition flex items-center"
        >
          Next
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Day names */}
        <div className="grid grid-cols-7 bg-gray-100">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center font-semibold">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="p-2 border border-gray-200 bg-gray-50"></div>;
            }

            const liturgicalDay = getLiturgicalDay(day);
            const isToday = today.getDate() === day &&
                           today.getMonth() + 1 === currentMonth &&
                           today.getFullYear() === currentYear;

            return (
              <div
                key={`day-${day}`}
                className={`p-2 border border-gray-200 min-h-[100px] ${isToday ? 'bg-blue-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                    {day}
                  </span>

                  {liturgicalDay && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getColorClass(liturgicalDay.color)}`}
                    >
                      {liturgicalDay.color}
                    </span>
                  )}
                </div>

                {liturgicalDay && (
                  <div className="mt-2">
                    <p className="text-sm font-medium line-clamp-2">
                      {liturgicalDay.celebration}
                    </p>

                    <div className="mt-2 flex flex-col space-y-1">
                      <a
                        href={`/mass/${liturgicalDay.date}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mass
                      </a>
                      <a
                        href={`/office/${liturgicalDay.date}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Office
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
