import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

// ----------------------------------------------------------------------------
// Storage keys
// ----------------------------------------------------------------------------

export const STORAGE_KEYS = {
  games: '@molkky/games',
  friends: '@molkky/friends',
  syncQueue: '@molkky/syncQueue',
  identity: '@molkky/identity',
  meta: '@molkky/meta',
} as const;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type SyncStatus = 'local' | 'pending' | 'synced';

export interface Friend {
  id: string;
  name: string;
}

export interface GamePlayer {
  id: string;
  name: string;
}

export interface GameScoreEntry {
  playerId: string;
  score: number;
  timesOver: number;
  misses: number;
  isOut: boolean;
  isWinner?: boolean;
}

export interface GameTurn {
  playerId: string;
  score: number;
  gameRound: number;
  startingScore: number;
  winnableTurn: boolean;
  wonOnTurn: boolean;
  endingScore: number;
  skipped: boolean;
  wentOver: boolean;
  eliminated: boolean;
  gotZero: boolean;
}

export interface GameRules {
  winningScore: number;
  goBackToScore: number;
  outAfterThreeMisses: boolean;
  outAfterThreeTimesOver: boolean;
}

export interface Game {
  id: string;
  uid: string;
  players: GamePlayer[];
  rules: GameRules;
  scores: GameScoreEntry[];
  gameStatus: 'inProgress' | 'finished' | 'abandoned';
  gameRound: number;
  turns: GameTurn[];
  whichPlayersTurn: string;
  winningPlayerId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Offline-first metadata
  syncStatus: SyncStatus;
  localUpdatedAt: number;
}

export interface Identity {
  localUserId: string;
  // Tracks whether we've already done the one-time pull-down from Firestore
  // for the currently signed-in firebase uid. Stored per-uid.
  firstSyncPulledFor: string[];
}

export interface MetaState {
  lastSyncedAt: number | null;
  lastSyncError: string | null;
}

// ----------------------------------------------------------------------------
// Low-level get/set helpers
// ----------------------------------------------------------------------------

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.log(`[localStore] readJSON error for ${key}`, e);
    return fallback;
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.log(`[localStore] writeJSON error for ${key}`, e);
  }
}

// ----------------------------------------------------------------------------
// Identity
// ----------------------------------------------------------------------------

export const getIdentity = async (): Promise<Identity> => {
  const existing = await readJSON<Identity | null>(STORAGE_KEYS.identity, null);
  if (existing && existing.localUserId) {
    return existing;
  }
  const fresh: Identity = {
    localUserId: `local-${String(uuid.v4())}`,
    firstSyncPulledFor: [],
  };
  await writeJSON(STORAGE_KEYS.identity, fresh);
  return fresh;
};

export const markFirstSyncPulled = async (firebaseUid: string): Promise<void> => {
  const ident = await getIdentity();
  if (!ident.firstSyncPulledFor.includes(firebaseUid)) {
    ident.firstSyncPulledFor.push(firebaseUid);
    await writeJSON(STORAGE_KEYS.identity, ident);
  }
};

export const hasFirstSyncPulled = async (firebaseUid: string): Promise<boolean> => {
  const ident = await getIdentity();
  return ident.firstSyncPulledFor.includes(firebaseUid);
};

// ----------------------------------------------------------------------------
// Games
// ----------------------------------------------------------------------------

export const getAllGames = async (): Promise<Game[]> => {
  return readJSON<Game[]>(STORAGE_KEYS.games, []);
};

export const getGamesForUid = async (uid: string): Promise<Game[]> => {
  const games = await getAllGames();
  return games.filter((g) => g.uid === uid);
};

export const getLocalGame = async (id: string): Promise<Game | null> => {
  const games = await getAllGames();
  return games.find((g) => g.id === id) || null;
};

export const upsertGame = async (game: Game): Promise<Game> => {
  const games = await getAllGames();
  const idx = games.findIndex((g) => g.id === game.id);
  const updated: Game = {
    ...game,
    localUpdatedAt: Date.now(),
  };
  if (idx >= 0) {
    games[idx] = updated;
  } else {
    games.push(updated);
  }
  await writeJSON(STORAGE_KEYS.games, games);
  return updated;
};

export const deleteLocalGame = async (id: string): Promise<void> => {
  const games = await getAllGames();
  const next = games.filter((g) => g.id !== id);
  await writeJSON(STORAGE_KEYS.games, next);
};

export const setGameSyncStatus = async (id: string, status: SyncStatus): Promise<void> => {
  const games = await getAllGames();
  const idx = games.findIndex((g) => g.id === id);
  if (idx < 0) return;
  games[idx] = { ...games[idx], syncStatus: status };
  await writeJSON(STORAGE_KEYS.games, games);
};

/**
 * Reassign ownership of all games owned by `fromUid` to `toUid`.
 * Used on sign-in: local-owned games become owned by the firebase uid.
 */
export const reassignGamesOwner = async (fromUid: string, toUid: string): Promise<Game[]> => {
  const games = await getAllGames();
  const changed: Game[] = [];
  const next = games.map((g) => {
    if (g.uid === fromUid) {
      const updated: Game = {
        ...g,
        uid: toUid,
        syncStatus: 'pending',
        localUpdatedAt: Date.now(),
      };
      changed.push(updated);
      return updated;
    }
    return g;
  });
  await writeJSON(STORAGE_KEYS.games, next);
  return changed;
};

// ----------------------------------------------------------------------------
// Friends
// ----------------------------------------------------------------------------

export const getFriends = async (): Promise<Friend[]> => {
  return readJSON<Friend[]>(STORAGE_KEYS.friends, []);
};

export const setFriends = async (friends: Friend[]): Promise<void> => {
  await writeJSON(STORAGE_KEYS.friends, friends);
};

export const addLocalFriends = async (newFriends: Friend[]): Promise<Friend[]> => {
  const existing = await getFriends();
  const merged = [...existing];
  for (const f of newFriends) {
    if (!merged.some((m) => m.id === f.id)) {
      merged.push(f);
    }
  }
  await writeJSON(STORAGE_KEYS.friends, merged);
  return merged;
};

// ----------------------------------------------------------------------------
// Sync queue (persisted FIFO)
// ----------------------------------------------------------------------------

export type SyncOpType = 'game.upsert' | 'game.delete' | 'user.updateFriends';

export interface SyncOp {
  id: string;
  type: SyncOpType;
  payload: any;
  retries: number;
  createdAt: number;
}

export const getQueue = async (): Promise<SyncOp[]> => {
  return readJSON<SyncOp[]>(STORAGE_KEYS.syncQueue, []);
};

export const setQueue = async (queue: SyncOp[]): Promise<void> => {
  await writeJSON(STORAGE_KEYS.syncQueue, queue);
};

export const enqueueOp = async (op: Omit<SyncOp, 'id' | 'retries' | 'createdAt'>): Promise<SyncOp> => {
  const queue = await getQueue();
  // Deduplicate game.upsert by gameId — only the latest payload matters.
  let next = queue;
  if (op.type === 'game.upsert' && op.payload?.id) {
    next = queue.filter(
      (q) => !(q.type === 'game.upsert' && q.payload?.id === op.payload.id),
    );
  }
  if (op.type === 'user.updateFriends') {
    // Only need the most-recent friends snapshot.
    next = next.filter((q) => q.type !== 'user.updateFriends');
  }
  const fullOp: SyncOp = {
    id: String(uuid.v4()),
    retries: 0,
    createdAt: Date.now(),
    ...op,
  };
  next.push(fullOp);
  await writeJSON(STORAGE_KEYS.syncQueue, next);
  return fullOp;
};

export const removeOpFromQueue = async (opId: string): Promise<void> => {
  const queue = await getQueue();
  await writeJSON(
    STORAGE_KEYS.syncQueue,
    queue.filter((q) => q.id !== opId),
  );
};

export const incrementOpRetries = async (opId: string): Promise<number> => {
  const queue = await getQueue();
  const idx = queue.findIndex((q) => q.id === opId);
  if (idx < 0) return 0;
  queue[idx] = { ...queue[idx], retries: queue[idx].retries + 1 };
  await writeJSON(STORAGE_KEYS.syncQueue, queue);
  return queue[idx].retries;
};

// ----------------------------------------------------------------------------
// Meta
// ----------------------------------------------------------------------------

export const getMeta = async (): Promise<MetaState> => {
  return readJSON<MetaState>(STORAGE_KEYS.meta, { lastSyncedAt: null, lastSyncError: null });
};

export const setMeta = async (meta: Partial<MetaState>): Promise<void> => {
  const current = await getMeta();
  await writeJSON(STORAGE_KEYS.meta, { ...current, ...meta });
};

// ----------------------------------------------------------------------------
// Util
// ----------------------------------------------------------------------------

export const newLocalId = (): string => String(uuid.v4());
