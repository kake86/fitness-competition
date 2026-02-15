// Data utilities for saving and loading events
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const STORAGE_KEY = 'planning-tool-events';
const STORAGE_ROOM_KEY = 'planning-tool-room';

// Load events from localStorage
export function loadEvents() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.events || [];
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }
  return [];
}

// Save events to localStorage
export function saveEvents(events) {
  try {
    const data = { events };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving events:', error);
    return false;
  }
}

// Save current room ID
export function saveRoomId(roomId) {
  try {
    localStorage.setItem(STORAGE_ROOM_KEY, roomId);
    return true;
  } catch (error) {
    console.error('Error saving room ID:', error);
    return false;
  }
}

// Load current room ID
export function loadRoomId() {
  try {
    return localStorage.getItem(STORAGE_ROOM_KEY) || null;
  } catch (error) {
    console.error('Error loading room ID:', error);
    return null;
  }
}

// Clear room ID
export function clearRoomId() {
  try {
    localStorage.removeItem(STORAGE_ROOM_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing room ID:', error);
    return false;
  }
}

// Sync events to Firebase
export async function syncEventsToFirebase(roomId, events) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await setDoc(roomRef, {
      events: events,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error syncing to Firebase:', error);
    return false;
  }
}

// Load events from Firebase
export async function loadEventsFromFirebase(roomId) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const docSnap = await getDoc(roomRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.events || [];
    }
    return [];
  } catch (error) {
    console.error('Error loading from Firebase:', error);
    return [];
  }
}

// Subscribe to real-time updates from Firebase
export function subscribeToRoom(roomId, callback) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback(data.events || []);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Error in Firebase subscription:', error);
      callback(null); // Return null on error
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up Firebase subscription:', error);
    return null;
  }
}

// Download events as JSON file
export function downloadEvents(events) {
  try {
    const data = { events };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'planning-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error downloading events:', error);
    return false;
  }
}

// Load events from uploaded JSON file
export function loadEventsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const events = data.events || [];
        saveEvents(events);
        resolve(events);
      } catch (error) {
        reject(new Error('Invalid file format'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

// Generate unique ID for events
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
