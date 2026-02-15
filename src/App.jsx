import React, { useState, useEffect, useRef } from 'react';
import DailyView from './DailyView';
import WeeklyView from './WeeklyView';
import RoomManager from './RoomManager';
import { 
  loadEvents, 
  saveEvents, 
  downloadEvents, 
  loadEventsFromFile, 
  generateId,
  saveRoomId,
  loadRoomId,
  clearRoomId,
  syncEventsToFirebase,
  loadEventsFromFirebase,
  subscribeToRoom
} from './dataUtils';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('daily'); // 'daily' or 'weekly'
  const [roomId, setRoomId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const unsubscribeRef = useRef(null);
  const isUpdatingFromFirebase = useRef(false);

  useEffect(() => {
    // Load room ID from localStorage
    const savedRoomId = loadRoomId();
    if (savedRoomId) {
      setRoomId(savedRoomId);
    } else {
      // Load events from localStorage if no room
      const loadedEvents = loadEvents();
      setEvents(loadedEvents);
    }
  }, []);

  useEffect(() => {
    if (roomId) {
      // Join room and sync with Firebase
      handleJoinRoom(roomId, false);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId && !isUpdatingFromFirebase.current) {
      // Save to localStorage as backup
      saveEvents(events);
      
      // Sync to Firebase (debounced)
      const timeoutId = setTimeout(() => {
        syncEventsToFirebase(roomId, events);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [events, roomId]);

  const handleJoinRoom = async (newRoomId, showAlert = true) => {
    try {
      setIsSyncing(true);
      
      // Unsubscribe from previous room if exists
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Save room ID
      saveRoomId(newRoomId);
      setRoomId(newRoomId);

      // Load initial data from Firebase
      const firebaseEvents = await loadEventsFromFirebase(newRoomId);
      
      if (firebaseEvents.length > 0) {
        isUpdatingFromFirebase.current = true;
        setEvents(firebaseEvents);
        saveEvents(firebaseEvents);
        isUpdatingFromFirebase.current = false;
      } else {
        // If room is empty, use local events and sync them
        const localEvents = loadEvents();
        if (localEvents.length > 0) {
          await syncEventsToFirebase(newRoomId, localEvents);
          setEvents(localEvents);
        }
      }

      // Subscribe to real-time updates
      unsubscribeRef.current = subscribeToRoom(newRoomId, (updatedEvents) => {
        if (updatedEvents !== null && !isUpdatingFromFirebase.current) {
          isUpdatingFromFirebase.current = true;
          setEvents(updatedEvents);
          saveEvents(updatedEvents);
          isUpdatingFromFirebase.current = false;
        }
      });

      if (showAlert) {
        alert(`Joined room ${newRoomId}! Changes will sync in real-time.`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Error connecting to room. Make sure Firebase is configured correctly.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLeaveRoom = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    clearRoomId();
    setRoomId(null);
    
    // Load local events
    const localEvents = loadEvents();
    setEvents(localEvents);
    
    alert('Left room. Now using local storage only.');
  };

  const handleAddEvent = (eventData) => {
    const newEvent = {
      ...eventData,
      id: generateId(),
    };
    setEvents([...events, newEvent]);
  };

  const handleToggleComplete = (eventId) => {
    setEvents(events.map(event =>
      event.id === eventId
        ? { ...event, completed: !event.completed }
        : event
    ));
  };

  const handleDownload = () => {
    downloadEvents(events);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      loadEventsFromFile(file)
        .then(loadedEvents => {
          setEvents(loadedEvents);
          alert('Events loaded successfully!');
        })
        .catch(error => {
          alert('Error loading file: ' + error.message);
        });
    }
    // Reset input
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all events? This cannot be undone!')) {
      setEvents([]);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">My Planning Tool</h1>
        <div className="view-switcher">
          <button
            className={`view-button ${view === 'daily' ? 'active' : ''}`}
            onClick={() => setView('daily')}
          >
            Daily
          </button>
          <button
            className={`view-button ${view === 'weekly' ? 'active' : ''}`}
            onClick={() => setView('weekly')}
          >
            Weekly
          </button>
        </div>
      </header>

      <main className="app-main">
        <RoomManager 
          onJoinRoom={handleJoinRoom}
          currentRoomId={roomId}
          onLeaveRoom={handleLeaveRoom}
        />
        {isSyncing && (
          <div className="sync-indicator">
            <span>🔄 Syncing...</span>
          </div>
        )}
        {view === 'daily' ? (
          <DailyView
            events={events}
            onToggleComplete={handleToggleComplete}
            onAddEvent={handleAddEvent}
          />
        ) : (
          <WeeklyView
            events={events}
            onToggleComplete={handleToggleComplete}
            onAddEvent={handleAddEvent}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-actions">
          <label className="file-upload-button">
            Load from File
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button className="download-button" onClick={handleDownload}>
            Save to File
          </button>
          <button className="clear-button" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
