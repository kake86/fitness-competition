import { ref, get, set, onValue, remove, runTransaction } from 'firebase/database';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { rtdb, auth } from './firebase';

const COMPETITION_PATH = 'competition';

/** Sign in with Google. Requires user interaction (popup). */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

/** Sign out the current user. */
export async function signOut() {
  await firebaseSignOut(auth);
}

/** Subscribe to auth state changes. Callback receives user or null. Returns unsubscribe function. */
export function onAuthReady(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Load competition data. Requires auth.currentUser. */
export async function loadFromRTDB() {
  if (!auth.currentUser) throw new Error('Must be signed in to load data');
  const dataRef = ref(rtdb, COMPETITION_PATH);
  const snap = await get(dataRef);
  const data = snap.val() || {};
  return {
    players: data.operatives ? Object.values(data.operatives) : [],
    scores: data.scores || {},
  };
}

export function subscribeToRTDB(callback) {
  const dataRef = ref(rtdb, COMPETITION_PATH);
  return onValue(dataRef, (snap) => {
    const data = snap.val() || {};
    callback({
      players: data.operatives ? Object.values(data.operatives) : [],
      scores: data.scores || {},
    });
  });
}

/** Add a player using transaction to prevent race conditions (one at a time). */
export async function addPlayerToRTDB(name) {
  if (!auth.currentUser) throw new Error('Must be signed in to add player');
  const dataRef = ref(rtdb, COMPETITION_PATH);
  await runTransaction(dataRef, (current) => {
    const data = current.val() || {};
    const ops = data.operatives ? Object.values(data.operatives) : [];
    if (ops.includes(name)) return; // already exists
    ops.push(name);
    const operatives = {};
    ops.forEach((p, i) => { operatives[i] = p; });
    return { ...data, operatives, scores: data.scores || {} };
  });
}

/** Save full competition state (players + scores). Used for score updates, delete player, etc. */
export async function saveToRTDB(players, scores) {
  if (!auth.currentUser) throw new Error('Must be signed in to save');
  const dataRef = ref(rtdb, COMPETITION_PATH);
  const operatives = {};
  players.forEach((p, i) => { operatives[i] = p; });
  await set(dataRef, { operatives, scores });
}

export async function deleteFromRTDB() {
  if (!auth.currentUser) throw new Error('Must be signed in to delete');
  const dataRef = ref(rtdb, COMPETITION_PATH);
  await remove(dataRef);
}
