import React, { useState, useRef, useEffect, useCallback } from 'react';

// Generate arrays for scroll wheels (constants outside component)
const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
const minuteOptions = Array.from({ length: 60 }, (_, i) => i);
const ampmOptions = ['AM', 'PM'];

function TimePicker({ value, onChange, label }) {
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [ampm, setAmpm] = useState('AM');
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const ampmRef = useRef(null);
  const [isDragging, setIsDragging] = useState({ hours: false, minutes: false, ampm: false });
  const [dragStart, setDragStart] = useState({ hours: 0, minutes: 0, ampm: 0 });
  const isScrollingProgrammatically = useRef(false);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      const hour24 = parseInt(h, 10);
      const min = parseInt(m, 10);
      const hour12 = hour24 % 12 || 12;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      setHours(hour12);
      setMinutes(min);
      setAmpm(period);
    }
  }, [value]);

  const updateTime = useCallback((h, m, period) => {
    const hour24 = period === 'PM' && h !== 12 ? h + 12 : (period === 'AM' && h === 12 ? 0 : h);
    const timeString = `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onChange(timeString);
  }, [onChange]);

  const handleHoursChange = useCallback((newHour) => {
    setHours(newHour);
    updateTime(newHour, minutes, ampm);
  }, [minutes, ampm, updateTime]);

  const handleMinutesChange = useCallback((newMinute) => {
    setMinutes(newMinute);
    updateTime(hours, newMinute, ampm);
  }, [hours, ampm, updateTime]);

  const handleAmpmChange = useCallback((newAmpm) => {
    setAmpm(newAmpm);
    updateTime(hours, minutes, newAmpm);
  }, [hours, minutes, updateTime]);

  const handleWheel = (e, type, options) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 1 : -1;
    const currentValue = type === 'hours' ? hours : type === 'minutes' ? minutes : ampm;
    const currentIndex = options.indexOf(currentValue);
    const newIndex = Math.max(0, Math.min(options.length - 1, currentIndex + delta));
    const newValue = options[newIndex];
    
    if (type === 'hours') {
      handleHoursChange(newValue);
    } else if (type === 'minutes') {
      handleMinutesChange(newValue);
    } else {
      handleAmpmChange(newValue);
    }
  };

  const handleScroll = (e, type, options) => {
    // Ignore scroll events if we're programmatically scrolling
    if (isScrollingProgrammatically.current) {
      return;
    }
    
    // Prevent manual scrolling drift - re-align immediately
    requestAnimationFrame(() => {
      scrollAllToAlign();
    });
  };

  const handleMouseDown = (e, type) => {
    setIsDragging({ ...isDragging, [type]: true });
    setDragStart({ ...dragStart, [type]: e.clientY });
    e.preventDefault();
  };


  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDragging.hours) {
        const deltaY = dragStart.hours - e.clientY;
        const itemHeight = 50;
        const steps = Math.round(deltaY / itemHeight);
        
        if (Math.abs(steps) >= 1) {
          const currentIndex = hourOptions.indexOf(hours);
          const newIndex = Math.max(0, Math.min(hourOptions.length - 1, currentIndex + steps));
          const newValue = hourOptions[newIndex];
          setHours(newValue);
          updateTime(newValue, minutes, ampm);
          setDragStart(prev => ({ ...prev, hours: e.clientY }));
        }
      }
      if (isDragging.minutes) {
        const deltaY = dragStart.minutes - e.clientY;
        const itemHeight = 50;
        const steps = Math.round(deltaY / itemHeight);
        
        if (Math.abs(steps) >= 1) {
          const currentIndex = minuteOptions.indexOf(minutes);
          const newIndex = Math.max(0, Math.min(minuteOptions.length - 1, currentIndex + steps));
          const newValue = minuteOptions[newIndex];
          setMinutes(newValue);
          updateTime(hours, newValue, ampm);
          setDragStart(prev => ({ ...prev, minutes: e.clientY }));
        }
      }
      if (isDragging.ampm) {
        const deltaY = dragStart.ampm - e.clientY;
        const itemHeight = 50;
        const steps = Math.round(deltaY / itemHeight);
        
        if (Math.abs(steps) >= 1) {
          const currentIndex = ampmOptions.indexOf(ampm);
          const newIndex = Math.max(0, Math.min(ampmOptions.length - 1, currentIndex + steps));
          const newValue = ampmOptions[newIndex];
          setAmpm(newValue);
          updateTime(hours, minutes, newValue);
          setDragStart(prev => ({ ...prev, ampm: e.clientY }));
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging({ hours: false, minutes: false, ampm: false });
    };

    if (isDragging.hours || isDragging.minutes || isDragging.ampm) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, hours, minutes, ampm, updateTime]);

  // Scroll all columns to align selected items horizontally
  const scrollAllToAlign = useCallback(() => {
    if (hoursRef.current && minutesRef.current && ampmRef.current) {
      // Use a fixed wheel height (200px as defined in CSS)
      const wheelHeight = 200;
      const centerPosition = wheelHeight / 2; // 100px from top
      const itemHeight = 50;
      const spacerHeight = 75;
      
      // Calculate scroll position to center the selected item
      // The selected item's center should be at the wheel's center (100px from top)
      const calculateScroll = (index) => {
        if (index < 0) return 0;
        const itemTop = spacerHeight + (index * itemHeight);
        const itemCenter = itemTop + (itemHeight / 2);
        const scrollPos = itemCenter - centerPosition;
        return Math.max(0, scrollPos);
      };
      
      const hoursIndex = hourOptions.indexOf(hours);
      const minutesIndex = minuteOptions.indexOf(minutes);
      const ampmIndex = ampmOptions.indexOf(ampm);
      
      // Apply the exact same calculation to all columns simultaneously
      // This ensures all selected items align at the same vertical position
      const hoursScroll = calculateScroll(hoursIndex);
      const minutesScroll = calculateScroll(minutesIndex);
      const ampmScroll = calculateScroll(ampmIndex);
      
      // Set scroll positions - use a flag to prevent scroll event loops
      isScrollingProgrammatically.current = true;
      
      // Apply scroll positions
      hoursRef.current.scrollTop = hoursScroll;
      minutesRef.current.scrollTop = minutesScroll;
      ampmRef.current.scrollTop = ampmScroll;
      
      // Reset flag after scroll positions are set
      requestAnimationFrame(() => {
        isScrollingProgrammatically.current = false;
      });
    }
  }, [hours, minutes, ampm]);

  // Initial scroll positioning - wait for DOM to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollAllToAlign();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Scroll all columns whenever any value changes
  useEffect(() => {
    // Use a small delay to ensure state updates are complete
    const timer = setTimeout(() => {
      scrollAllToAlign();
    }, 20);
    return () => clearTimeout(timer);
  }, [hours, minutes, ampm, scrollAllToAlign]);

  return (
    <div className="time-picker-container">
      {label && <label className="time-picker-label">{label}</label>}
      <div className="time-picker">
        <div className="time-picker-column">
          <div className="time-picker-header">Hour</div>
          <div 
            className="time-picker-wheel"
            ref={hoursRef}
            onWheel={(e) => handleWheel(e, 'hours', hourOptions)}
            onScroll={(e) => handleScroll(e, 'hours', hourOptions)}
            onMouseDown={(e) => handleMouseDown(e, 'hours')}
            style={{ cursor: isDragging.hours ? 'grabbing' : 'grab' }}
          >
            <div className="time-picker-spacer"></div>
            {hourOptions.map((hour) => (
              <div
                key={hour}
                className={`time-picker-item ${hours === hour ? 'selected' : ''}`}
                onClick={() => !isDragging.hours && handleHoursChange(hour)}
              >
                {hour}
              </div>
            ))}
            <div className="time-picker-spacer"></div>
          </div>
        </div>
        <div className="time-picker-column">
          <div className="time-picker-header">Min</div>
          <div 
            className="time-picker-wheel"
            ref={minutesRef}
            onWheel={(e) => handleWheel(e, 'minutes', minuteOptions)}
            onScroll={(e) => handleScroll(e, 'minutes', minuteOptions)}
            onMouseDown={(e) => handleMouseDown(e, 'minutes')}
            style={{ cursor: isDragging.minutes ? 'grabbing' : 'grab' }}
          >
            <div className="time-picker-spacer"></div>
            {minuteOptions.map((minute) => (
              <div
                key={minute}
                className={`time-picker-item ${minutes === minute ? 'selected' : ''}`}
                onClick={() => !isDragging.minutes && handleMinutesChange(minute)}
              >
                {minute.toString().padStart(2, '0')}
              </div>
            ))}
            <div className="time-picker-spacer"></div>
          </div>
        </div>
        <div className="time-picker-column">
          <div className="time-picker-header">AM/PM</div>
          <div 
            className="time-picker-wheel"
            ref={ampmRef}
            onWheel={(e) => handleWheel(e, 'ampm', ampmOptions)}
            onScroll={(e) => handleScroll(e, 'ampm', ampmOptions)}
            onMouseDown={(e) => handleMouseDown(e, 'ampm')}
            style={{ cursor: isDragging.ampm ? 'grabbing' : 'grab' }}
          >
            <div className="time-picker-spacer"></div>
            {ampmOptions.map((period) => (
              <div
                key={period}
                className={`time-picker-item ${ampm === period ? 'selected' : ''}`}
                onClick={() => !isDragging.ampm && handleAmpmChange(period)}
              >
                {period}
              </div>
            ))}
            <div className="time-picker-spacer"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimePicker;
