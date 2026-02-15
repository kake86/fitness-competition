import { ref, get, set, onValue, remove } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { rtdb, auth } from './firebase';

const COMPETITION_PATH = 'competition';

export async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export async function loadFromRTDB() {
  await ensureAuth();
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

export async function saveToRTDB(players, scores) {
  await ensureAuth();
  const dataRef = ref(rtdb, COMPETITION_PATH);
  const operatives = {};
  players.forEach((p, i) => { operatives[i] = p; });
  await set(dataRef, { operatives, scores });
}

export async function deleteFromRTDB() {
  await ensureAuth();
  const dataRef = ref(rtdb, COMPETITION_PATH);
  await remove(dataRef);
}
