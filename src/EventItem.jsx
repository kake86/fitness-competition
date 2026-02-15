import React from 'react';

function EventItem({ event, onToggleComplete }) {
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  // Support both new format (startTime/finishTime) and old format (time) for backward compatibility
  const startTime = event.startTime || (event.time ? event.time : null);
  const finishTime = event.finishTime || null;

  return (
    <div className={`event-item ${event.completed ? 'completed' : ''}`}>
      <label className="checkbox-container">
        <input
          type="checkbox"
          checked={event.completed || false}
          onChange={() => onToggleComplete(event.id)}
          className="event-checkbox"
        />
        <span className="checkmark"></span>
      </label>
      <div className="event-content">
        <div className="event-title">{event.title}</div>
        <div className="event-details">
          {startTime && finishTime && (
            <span className="event-time">
              {formatTime(startTime)} - {formatTime(finishTime)}
            </span>
          )}
          {startTime && !finishTime && (
            <span className="event-time">{formatTime(startTime)}</span>
          )}
          {event.date && <span className="event-date">{formatDate(event.date)}</span>}
        </div>
      </div>
    </div>
  );
}

export default EventItem;
