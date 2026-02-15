import React, { useState } from 'react';
import EventItem from './EventItem';
import EventForm from './EventForm';

function DailyView({ events, onToggleComplete, onAddEvent }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

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

  const dayEvents = getEventsForDate(selectedDate);
  const completedCount = dayEvents.filter(e => e.completed).length;
  const totalCount = dayEvents.length;

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="daily-view">
      <div className="date-header">
        <button 
          className="date-nav-button"
          onClick={() => changeDate(-1)}
          aria-label="Previous day"
        >
          ←
        </button>
        <h2 className="date-title">{formatDisplayDate(selectedDate)}</h2>
        <button 
          className="date-nav-button"
          onClick={() => changeDate(1)}
          aria-label="Next day"
        >
          →
        </button>
      </div>

      {totalCount > 0 && (
        <div className="progress-indicator">
          <span className="progress-text">
            {completedCount} of {totalCount} completed!
            {completedCount === totalCount && ' Great job!'}
          </span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <EventForm 
        onAddEvent={onAddEvent} 
        selectedDate={selectedDate}
      />

      <div className="events-list">
        {dayEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events for this day yet!</p>
            <p>Click "Add Event" above to get started!</p>
          </div>
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
    </div>
  );
}

export default DailyView;
