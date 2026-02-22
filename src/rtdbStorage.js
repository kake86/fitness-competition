import { ref, get, set, onValue, remove, runTransaction } from 'firebase/database';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { createClient } from '@supabase/supabase-js';
import { rtdb, auth } from './firebase';

const COMPETITION_PATH = 'competition';
const DEFAULT_SUPABASE_TABLE = 'competition_state';
const DEFAULT_SUPABASE_ROW_ID = 1;
const SUPABASE_TABLE = import.meta.env.VITE_SUPABASE_STATE_TABLE || DEFAULT_SUPABASE_TABLE;
const SUPABASE_ROW_ID = Number(import.meta.env.VITE_SUPABASE_STATE_ROW_ID || DEFAULT_SUPABASE_ROW_ID);
const HAS_SUPABASE_CONFIG = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const STORAGE_PROVIDER = (import.meta.env.VITE_STORAGE_PROVIDER || (HAS_SUPABASE_CONFIG ? 'supabase' : 'firebase')).toLowerCase();

const supabase = HAS_SUPABASE_CONFIG
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function ensureSupabaseConfigured() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
}

function toPlayersArray(rawPlayers) {
  if (!rawPlayers) return [];
  if (Array.isArray(rawPlayers)) {
    return rawPlayers.filter((v) => typeof v === 'string' && v.length > 0);
  }
  if (typeof rawPlayers === 'object') {
    return Object.values(rawPlayers).filter((v) => typeof v === 'string' && v.length > 0);
  }
  return [];
}

function toObject(raw) {
  return raw && typeof raw === 'object' ? raw : {};
}

function normalizeState(data) {
  return {
    players: toPlayersArray(data?.operatives),
    scores: toObject(data?.scores),
    userBindings: toObject(data?.userBindings ?? data?.user_bindings),
  };
}

function getClaimOwner(userBindings, playerName) {
  const entry = Object.entries(userBindings || {}).find(([, claimed]) => claimed === playerName);
  return entry ? entry[0] : null;
}

async function getSupabaseUserOrThrow() {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Must be signed in to continue');
  return data.user;
}

async function loadSupabaseState() {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select('operatives,scores,user_bindings')
    .eq('id', SUPABASE_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return normalizeState(data || {});
}

async function saveSupabaseState(players, scores, userBindings) {
  ensureSupabaseConfigured();
  const payload = {
    id: SUPABASE_ROW_ID,
    operatives: players,
    scores,
    user_bindings: userBindings,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(SUPABASE_TABLE).upsert(payload);
  if (error) throw error;
}

export function getStorageProviderName() {
  return STORAGE_PROVIDER;
}

/** Sign in with Google. Requires user interaction. */
export async function signInWithGoogle() {
  if (STORAGE_PROVIDER === 'supabase') {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
    return;
  }

  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

/** Sign out the current user. */
export async function signOut() {
  if (STORAGE_PROVIDER === 'supabase') {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }
  await firebaseSignOut(auth);
}

/** Subscribe to auth state changes. Callback receives user or null. Returns unsubscribe function. */
export function onAuthReady(callback) {
  if (STORAGE_PROVIDER === 'supabase') {
    ensureSupabaseConfigured();
    let isUnmounted = false;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isUnmounted) {
        if (error) {
          callback(null);
          return;
        }
        callback(data?.session?.user || null);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });

    return () => {
      isUnmounted = true;
      data.subscription.unsubscribe();
    };
  }

  return onAuthStateChanged(auth, callback);
}

/** Load competition data. Requires auth user. */
export async function loadFromRTDB() {
  if (STORAGE_PROVIDER === 'supabase') {
    await getSupabaseUserOrThrow();
    return loadSupabaseState();
  }

  if (!auth.currentUser) throw new Error('Must be signed in to load data');
  const dataRef = ref(rtdb, COMPETITION_PATH);
  const snap = await get(dataRef);
  return normalizeState(snap.val() || {});
}

export function subscribeToRTDB(callback) {
  if (STORAGE_PROVIDER === 'supabase') {
    ensureSupabaseConfigured();
    const channel = supabase
      .channel('competition-state-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLE, filter: `id=eq.${SUPABASE_ROW_ID}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            callback({ players: [], scores: {}, userBindings: {} });
            return;
          }
          callback(normalizeState(payload.new || {}));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const dataRef = ref(rtdb, COMPETITION_PATH);
  return onValue(dataRef, (snap) => {
    callback(normalizeState(snap.val() || {}));
  });
}

/** Add a player and auto-claim it for current signed in user if unclaimed. */
export async function addPlayerToRTDB(name) {
  if (STORAGE_PROVIDER === 'supabase') {
    const user = await getSupabaseUserOrThrow();
    const current = await loadSupabaseState();
    if (current.players.includes(name)) return;

    const players = [...current.players, name];
    const userBindings = { ...current.userBindings };
    if (!userBindings[user.id]) {
      userBindings[user.id] = name;
    }
    await saveSupabaseState(players, current.scores, userBindings);
    return;
  }

  if (!auth.currentUser) throw new Error('Must be signed in to add player');
  const currentUid = auth.currentUser.uid;
  const dataRef = ref(rtdb, COMPETITION_PATH);
  await runTransaction(dataRef, (current) => {
    const data = current || {};
    const ops = toPlayersArray(data.operatives);
    if (ops.includes(name)) return; // already exists
    ops.push(name);
    const operatives = {};
    ops.forEach((p, i) => {
      operatives[i] = p;
    });
    const userBindings = toObject(data.userBindings);
    if (!userBindings[currentUid]) {
      userBindings[currentUid] = name;
    }
    return { ...data, operatives, scores: toObject(data.scores), userBindings };
  });
}

/** Claim an existing player profile for the currently signed in user. */
export async function claimPlayerToRTDB(name) {
  if (STORAGE_PROVIDER === 'supabase') {
    const user = await getSupabaseUserOrThrow();
    const current = await loadSupabaseState();
    if (!current.players.includes(name)) {
      throw new Error('Player profile does not exist');
    }

    const ownerUid = getClaimOwner(current.userBindings, name);
    if (ownerUid && ownerUid !== user.id) {
      throw new Error('That profile is already claimed by another user');
    }

    const userBindings = { ...current.userBindings, [user.id]: name };
    await saveSupabaseState(current.players, current.scores, userBindings);
    return;
  }

  if (!auth.currentUser) throw new Error('Must be signed in to claim a profile');
  const currentUid = auth.currentUser.uid;
  const dataRef = ref(rtdb, COMPETITION_PATH);
  let abortReason = null;

  const result = await runTransaction(dataRef, (current) => {
    const data = current || {};
    const players = toPlayersArray(data.operatives);
    if (!players.includes(name)) {
      abortReason = 'missing';
      return;
    }

    const userBindings = toObject(data.userBindings);
    const ownerUid = getClaimOwner(userBindings, name);
    if (ownerUid && ownerUid !== currentUid) {
      abortReason = 'claimed';
      return;
    }

    userBindings[currentUid] = name;
    return {
      ...data,
      operatives: data.operatives || {},
      scores: toObject(data.scores),
      userBindings,
    };
  });

  if (!result.committed) {
    if (abortReason === 'missing') throw new Error('Player profile does not exist');
    if (abortReason === 'claimed') throw new Error('That profile is already claimed by another user');
    throw new Error('Could not claim player profile');
  }
}

/** Save full competition state (players + scores + bindings). */
export async function saveToRTDB(players, scores, userBindings = {}) {
  if (STORAGE_PROVIDER === 'supabase') {
    await getSupabaseUserOrThrow();
    await saveSupabaseState(players, scores, userBindings);
    return;
  }

  if (!auth.currentUser) throw new Error('Must be signed in to save');
  const dataRef = ref(rtdb, COMPETITION_PATH);
  const operatives = {};
  players.forEach((p, i) => {
    operatives[i] = p;
  });
  await set(dataRef, { operatives, scores, userBindings });
}

export async function deleteFromRTDB() {
  if (STORAGE_PROVIDER === 'supabase') {
    await getSupabaseUserOrThrow();
    await saveSupabaseState([], {}, {});
    return;
  }

  if (!auth.currentUser) throw new Error('Must be signed in to delete');
  const dataRef = ref(rtdb, COMPETITION_PATH);
  await remove(dataRef);
}
