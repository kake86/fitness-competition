import React, { useState } from 'react';
import TimePicker from './TimePicker';

function EventForm({ onAddEvent, selectedDate }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [includeStartTime, setIncludeStartTime] = useState(false);
  const [includeFinishTime, setIncludeFinishTime] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onAddEvent({
        title: title.trim(),
        startTime: includeStartTime ? startTime : null,
        finishTime: includeFinishTime ? finishTime : null,
        date: selectedDate || new Date().toISOString().split('T')[0],
        completed: false,
      });
      setTitle('');
      setStartTime('');
      setFinishTime('');
      setIncludeStartTime(false);
      setIncludeFinishTime(false);
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button 
        className="add-event-button"
        onClick={() => setShowForm(true)}
      >
        Add Event
      </button>
    );
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="event-title">What do you want to do?</label>
        <select
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="form-select"
          autoFocus
        >
          <option value="">Choose an activity...</option>
          <option value="School">School</option>
          <option value="Music">Music</option>
          <option value="Homework">Homework</option>
          <option value="English Homework">English Homework</option>
          <option value="Maths Homework">Maths Homework</option>
          <option value="Other Homework">Other Homework</option>
          <option value="Play">Play</option>
          <option value="TV">TV</option>
          <option value="Computer">Computer</option>
          <option value="Language Skills">Language Skills</option>
          <option value="Sports">Sports</option>
          <option value="Reading">Reading</option>
          <option value="Art">Art</option>
          <option value="Friends">Friends</option>
          <option value="Family Time">Family Time</option>
          <option value="Exercise">Exercise</option>
          <option value="Chores">Chores</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div className="time-pickers-row">
        <div className="time-picker-wrapper">
          <TimePicker
            label="Start Time"
            value={startTime}
            onChange={setStartTime}
          />
        </div>
        <div className="time-picker-wrapper">
          <TimePicker
            label="Finish Time"
            value={finishTime}
            onChange={setFinishTime}
          />
        </div>
        <div className="time-inclusion-checkboxes">
          <label className="time-inclusion-label">
            <input
              type="checkbox"
              checked={includeStartTime}
              onChange={(e) => setIncludeStartTime(e.target.checked)}
              className="time-inclusion-checkbox"
            />
            <span>Include Start</span>
          </label>
          <label className="time-inclusion-label">
            <input
              type="checkbox"
              checked={includeFinishTime}
              onChange={(e) => setIncludeFinishTime(e.target.checked)}
              className="time-inclusion-checkbox"
            />
            <span>Include Finish</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-button">
          Add
        </button>
        <button 
          type="button" 
          className="cancel-button"
          onClick={() => {
            setShowForm(false);
            setTitle('');
            setStartTime('');
            setFinishTime('');
            setIncludeStartTime(false);
            setIncludeFinishTime(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default EventForm;
