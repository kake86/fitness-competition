import React, { useState } from 'react';
import EventItem from './EventItem';
import EventForm from './EventForm';

function WeeklyView({ events, onToggleComplete, onAddEvent }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getWeekDates = (centerDate) => {
    const date = new Date(centerDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Get Monday of the week (adjust for Sunday)
    const monday = new Date(date);
    monday.setDate(diff);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d.toISOString().split('T')[0]);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);
  const today = new Date().toISOString().split('T')[0];

  const getEventsForDate = (dateString) => {
    return events
      .filter(event => event.date === dateString)
      .sort((a, b) => {
        // Support both new format (startTime) and old format (time) for backward compatibility
        const aTime = a.startTime || a.time;
        const bTime = b.startTime || b.time;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return aTime.localeCompare(bTime);
      });
  };

  const formatDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDayNumber = (dateString) => {
    const date = new Date(dateString);
    return date.getDate();
  };

  const changeWeek = (weeks) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (weeks * 7));
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="weekly-view">
      <div className="week-header">
        <button 
          className="week-nav-button"
          onClick={() => changeWeek(-1)}
          aria-label="Previous week"
        >
          ← Previous Week
        </button>
        <h2 className="week-title">This Week</h2>
        <button 
          className="week-nav-button"
          onClick={() => changeWeek(1)}
          aria-label="Next week"
        >
          Next Week →
        </button>
      </div>

      <div className="week-grid">
        {weekDates.map((dateString, index) => {
          const dayEvents = getEventsForDate(dateString);
          const isToday = dateString === today;
          const completedCount = dayEvents.filter(e => e.completed).length;
          const totalCount = dayEvents.length;

          return (
            <div 
              key={dateString} 
              className={`week-day ${isToday ? 'today' : ''}`}
            >
              <div className="day-header">
                <div className="day-name">{formatDayName(dateString)}</div>
                <div className="day-number">{formatDayNumber(dateString)}</div>
                {totalCount > 0 && (
                  <div className="day-progress">
                    {completedCount}/{totalCount}
                  </div>
                )}
              </div>
              <div className="day-events">
                {dayEvents.length === 0 ? (
                  <div className="day-empty">No events</div>
                ) : (
                  dayEvents.map(event => (
                    <EventItem
                      key={event.id}
                      event={event}
                      onToggleComplete={onToggleComplete}
                    />
                  ))
                )}
              </div>
              <button
                className="add-to-day-button"
                onClick={() => {
                  setSelectedDate(dateString);
                  // This will be handled by the parent to show form for this date
                }}
                title={`Add event to ${formatDayName(dateString)}`}
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      <div className="week-form-container">
        <EventForm 
          onAddEvent={onAddEvent} 
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}

export default WeeklyView;
