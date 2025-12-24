import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import Card from './common/Card';
import { getHolidays } from '../services/api';

const ScheduleCalendar = ({ employeeId, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadHolidays();
  }, [year, month]);

  const loadHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getHolidays(year, month + 1);
      setHolidays(response.data.holidays || {});
    } catch (error) {
      console.error('Failed to load holidays:', error);
      setError('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(year, month, 1).getDay();
  };

  const isWeekend = (dayOfWeek) => dayOfWeek === 0 || dayOfWeek === 6;

  const getDateKey = (day) => {
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day) => {
    const dateStr = getDateKey(day);
    if (onDateSelect) {
      onDateSelect(dateStr);
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();

  // Create calendar grid
  const calendarDays = [];
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <Card className="w-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">{monthName}</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous month"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next month"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-6 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span>Weekends & Holidays</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span>Workday</span>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading calendar...</div>
        ) : (
          <div className="space-y-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => {
                  if (day === null) {
                    return <div key={`empty-${dayIdx}`} className="aspect-square"></div>;
                  }

                  const dateKey = getDateKey(day);
                  const dayOfWeek = (firstDay + day - 1) % 7;
                  const isHolidayOrWeekend =
                    isWeekend(dayOfWeek) ||
                    (holidays[dateKey] && holidays[dateKey].is_holiday);
                  const holidayName =
                    holidays[dateKey] && holidays[dateKey].holiday_name
                      ? holidays[dateKey].holiday_name
                      : null;

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square flex items-center justify-center text-sm font-medium rounded-lg
                        transition-all hover:shadow-md cursor-pointer relative
                        ${
                          isHolidayOrWeekend
                            ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                            : 'bg-blue-50 text-gray-800 hover:bg-blue-100'
                        }
                      `}
                      title={holidayName || (isWeekend(dayOfWeek) ? 'Weekend' : 'Workday')}
                    >
                      {day}
                      {holidayName && (
                        <div className="absolute -top-6 left-0 right-0 bg-gray-800 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap pointer-events-none">
                          {holidayName.length > 10
                            ? holidayName.substring(0, 10) + '...'
                            : holidayName}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Today indicator */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Note:</span> Gray areas represent weekends and public holidays in Japan. 
            These days have reduced shift requirements.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ScheduleCalendar;
