import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

// ----------------------------------------------------------------------------
// Storage keys
// ----------------------------------------------------------------------------

const STORAGE_KEYS = {
  games: '@molkky/games',
  friends: '@molkky/friends',
  syncQueue: '@molkky/syncQueue',
  identity: '@molkky/identity',
  meta: '@molkky/meta',
  entitlements: '@molkky/entitlements',
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
  // Snapshots of the player's miss-streak and over-count at the start of the turn,
  // used to reliably restore state on undo. Optional for backwards compatibility.
  startingMisses?: number;
  startingTimesOver?: number;
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
}

export interface MetaState {
  lastSyncedAt: number | null;
  lastSyncError: string | null;
}

/** Receipt-ish details kept alongside the remove-ads flag so the cloud
 * entitlement (users/{uid}.removeAds) can be claimed from local state alone
 * via the server-side `validatePurchase` Cloud Function. */
export interface RemoveAdsInfo {
  productId: string;
  transactionId: string;
  platform: string;
  purchasedAt: string;
  /**
   * Firebase uid that was signed in when the purchase was granted. LOCAL-ONLY
   * (never sent to the cloud): kept for history/debugging of which account
   * originally claimed the purchase. Absent for grants made while signed out
   * or recorded before this field existed.
   */
  ownerUid?: string;
  /**
   * The StoreKit 2 signed transaction (JWS) as returned by expo-iap
   * (`purchase.purchaseToken`). LOCAL-ONLY: stored so a purchase made while
   * signed out can be claimed on the cloud account later — PurchaseContext
   * sends it to the `validatePurchase` Cloud Function on sign-in.
   */
  jws?: string;
}

export interface Entitlements {
  removeAds: boolean;
  removeAdsInfo?: RemoveAdsInfo;
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
// Per-key async mutex
// ----------------------------------------------------------------------------
//
// Every mutation here is a read-whole-blob -> mutate -> write-whole-blob, with
// an `await` between the read and the write. JS yields the event loop at each
// `await`, and we have many concurrent callers hitting the same storage key:
// fire-and-forget enqueue/upsert, the periodic processQueue timer, per-op
// setGameSyncStatus, the cloud-pull upsertGame loop, and UI updateGame during
// play. Without serialization these interleave — two callers both read the same
// old blob, each mutates its own copy, and the last write wins — silently losing
// games and dropping/duplicating sync ops.
//
// withLock serializes the read->modify->write of all mutations on the SAME key
// by chaining a promise per key (a simple Map<key, Promise> tail). Different
// keys run independently. Pure reads (getAllGames, getQueue, etc.) stay
// UNGUARDED: writeJSON is a single atomic AsyncStorage.setItem, so a read always
// sees either the whole old blob or the whole new blob, never a torn one.
//
// DEADLOCK SAFETY: no function called while holding a key's lock may itself call
// withLock on that same key. The guarded mutations below only call the unguarded
// pure reads and writeJSON, so this holds.
const keyLocks = new Map<string, Promise<unknown>>();

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Wait for the previous operation on this key to finish, then run ours. We
  // swallow the previous op's rejection so one failure can't poison the chain.
  const prev = keyLocks.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  // Park a non-throwing tail so the next caller chains off completion, not value.
  keyLocks.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

// ----------------------------------------------------------------------------
// Identity
// ----------------------------------------------------------------------------

export const getIdentity = async (): Promise<Identity> => {
  // Guarded so two concurrent first-calls can't each generate a fresh id and
  // clobber each other — the second caller must see the id the first wrote.
  return withLock(STORAGE_KEYS.identity, async () => {
    const existing = await readJSON<Identity | null>(STORAGE_KEYS.identity, null);
    if (existing && existing.localUserId) {
      return existing;
    }
    const fresh: Identity = {
      localUserId: `local-${String(uuid.v4())}`,
    };
    await writeJSON(STORAGE_KEYS.identity, fresh);
    return fresh;
  });
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
  // Guarded: read->modify->write of the whole games blob must be atomic vs other
  // games mutations, or concurrent writers clobber each other and lose games.
  return withLock(STORAGE_KEYS.games, async () => {
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
  });
};

/**
 * Atomically read-modify-write a single game. `updater` receives the current
 * stored game (or null if absent) and returns the new value to store, or null
 * to make no change. The read and write run inside the SAME per-key critical
 * section, so this is the safe way to do a read-modify-write that spans a load
 * and a save — calling getLocalGame() then upsertGame() from the caller does
 * the read OUTSIDE the lock, which loses one of two concurrent patches to the
 * same game (the classic lost-update race). `updater` must be synchronous and
 * must not call back into a guarded games mutation (that would deadlock).
 */
export const mutateGame = async (
  id: string,
  updater: (existing: Game | null) => Game | null,
): Promise<Game | null> => {
  return withLock(STORAGE_KEYS.games, async () => {
    const games = await getAllGames();
    const idx = games.findIndex((g) => g.id === id);
    const existing = idx >= 0 ? games[idx] : null;
    const next = updater(existing);
    if (next === null) return existing;
    const updated: Game = { ...next, id, localUpdatedAt: Date.now() };
    if (idx >= 0) {
      games[idx] = updated;
    } else {
      games.push(updated);
    }
    await writeJSON(STORAGE_KEYS.games, games);
    return updated;
  });
};

export const deleteLocalGame = async (id: string): Promise<void> => {
  // Guarded: atomic read->filter->write so a concurrent upsert can't resurrect
  // the deleted game (or have its write dropped).
  return withLock(STORAGE_KEYS.games, async () => {
    const games = await getAllGames();
    const next = games.filter((g) => g.id !== id);
    await writeJSON(STORAGE_KEYS.games, next);
  });
};

export const setGameSyncStatus = async (id: string, status: SyncStatus): Promise<void> => {
  // Guarded: atomic so a sync-status flip can't clobber a concurrent gameplay
  // upsert (and vice versa) on the same games blob.
  return withLock(STORAGE_KEYS.games, async () => {
    const games = await getAllGames();
    const idx = games.findIndex((g) => g.id === id);
    if (idx < 0) return;
    games[idx] = { ...games[idx], syncStatus: status };
    await writeJSON(STORAGE_KEYS.games, games);
  });
};

/**
 * Reassign ownership of all games owned by `fromUid` to `toUid`.
 * Used on sign-in: local-owned games become owned by the firebase uid.
 */
export const reassignGamesOwner = async (fromUid: string, toUid: string): Promise<Game[]> => {
  // Guarded: atomic read->remap->write so the ownership rewrite can't be lost to
  // (or lose) a concurrent gameplay upsert on the same games blob.
  return withLock(STORAGE_KEYS.games, async () => {
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
  });
};

// ----------------------------------------------------------------------------
// Friends
// ----------------------------------------------------------------------------

export const getFriends = async (): Promise<Friend[]> => {
  return readJSON<Friend[]>(STORAGE_KEYS.friends, []);
};

export const setFriends = async (friends: Friend[]): Promise<void> => {
  // Guarded so a wholesale replace is serialized against a concurrent
  // addLocalFriends merge on the same friends blob.
  return withLock(STORAGE_KEYS.friends, async () => {
    await writeJSON(STORAGE_KEYS.friends, friends);
  });
};

export const addLocalFriends = async (newFriends: Friend[]): Promise<Friend[]> => {
  // Guarded: atomic read->merge->write so two concurrent adds don't each start
  // from the same list and drop one another's friends.
  return withLock(STORAGE_KEYS.friends, async () => {
    const existing = await getFriends();
    const merged = [...existing];
    for (const f of newFriends) {
      if (!merged.some((m) => m.id === f.id)) {
        merged.push(f);
      }
    }
    await writeJSON(STORAGE_KEYS.friends, merged);
    return merged;
  });
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

export const enqueueOp = async (op: Omit<SyncOp, 'id' | 'retries' | 'createdAt'>): Promise<SyncOp> => {
  // Guarded: atomic read->dedupe->append->write so concurrent enqueues (and the
  // processQueue remove/rotate) can't read the same blob and drop one another's
  // ops — losing pending sync work.
  return withLock(STORAGE_KEYS.syncQueue, async () => {
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
  });
};

export const removeOpFromQueue = async (opId: string): Promise<void> => {
  // Guarded: atomic read->filter->write so removing a processed op can't clobber
  // a concurrent enqueue (or vice versa) on the same queue blob.
  return withLock(STORAGE_KEYS.syncQueue, async () => {
    const queue = await getQueue();
    await writeJSON(
      STORAGE_KEYS.syncQueue,
      queue.filter((q) => q.id !== opId),
    );
  });
};

export const incrementOpRetries = async (opId: string): Promise<number> => {
  // Guarded: atomic read->modify->write so a retry bump can't be lost to (or
  // lose) a concurrent enqueue/remove on the same queue blob.
  return withLock(STORAGE_KEYS.syncQueue, async () => {
    const queue = await getQueue();
    const idx = queue.findIndex((q) => q.id === opId);
    if (idx < 0) return 0;
    queue[idx] = { ...queue[idx], retries: queue[idx].retries + 1 };
    await writeJSON(STORAGE_KEYS.syncQueue, queue);
    return queue[idx].retries;
  });
};

/**
 * Move an op to the back of the queue without dropping it. Used when an op has
 * failed many times: rotating it stops a single poison op from blocking healthy
 * ops behind it, while still guaranteeing we never lose the data.
 */
export const rotateOpToBack = async (opId: string): Promise<void> => {
  // Guarded: atomic read->splice->push->write so rotating a poison op can't
  // clobber a concurrent enqueue/remove on the same queue blob.
  return withLock(STORAGE_KEYS.syncQueue, async () => {
    const queue = await getQueue();
    const idx = queue.findIndex((q) => q.id === opId);
    if (idx < 0) return;
    const [op] = queue.splice(idx, 1);
    queue.push(op);
    await writeJSON(STORAGE_KEYS.syncQueue, queue);
  });
};

// ----------------------------------------------------------------------------
// Meta
// ----------------------------------------------------------------------------

export const getMeta = async (): Promise<MetaState> => {
  return readJSON<MetaState>(STORAGE_KEYS.meta, { lastSyncedAt: null, lastSyncError: null });
};

export const setMeta = async (meta: Partial<MetaState>): Promise<void> => {
  // Guarded: atomic read->merge->write so two concurrent partial updates (e.g.
  // lastSyncedAt and lastSyncError) don't each start from the same blob and drop
  // one another's field.
  return withLock(STORAGE_KEYS.meta, async () => {
    const current = await getMeta();
    await writeJSON(STORAGE_KEYS.meta, { ...current, ...meta });
  });
};

// ----------------------------------------------------------------------------
// Entitlements (in-app purchases)
// ----------------------------------------------------------------------------
//
// The "remove ads" purchase is local-first like everything else: this flag is
// the source of truth for the UI, and Firestore (users/{uid}.removeAds) is a
// backup that lets the entitlement follow the account across devices — see
// contexts/PurchaseContext.tsx and services/backfill.ts.

// Change notifications so the PurchaseContext can react when something other
// than the purchase flow grants the entitlement (e.g. the login backfill
// pulling `removeAds` down from the cloud). Mirrors cloudSync's subscriber set.
const entitlementSubscribers = new Set<() => void>();

export const subscribeToEntitlements = (cb: () => void): (() => void) => {
  entitlementSubscribers.add(cb);
  return () => {
    entitlementSubscribers.delete(cb);
  };
};

const notifyEntitlementsChanged = () => {
  for (const cb of entitlementSubscribers) {
    try {
      cb();
    } catch (e) {
      console.log('[localStore] entitlement subscriber error', e);
    }
  }
};

export const getEntitlements = async (): Promise<Entitlements> => {
  return readJSON<Entitlements>(STORAGE_KEYS.entitlements, { removeAds: false });
};

export const setRemoveAdsEntitlement = async (
  removeAds: boolean,
  info?: RemoveAdsInfo,
): Promise<Entitlements> => {
  // Guarded: atomic read->merge->write so two concurrent grants (purchase
  // callback + login backfill) don't clobber each other's fields.
  const next = await withLock(STORAGE_KEYS.entitlements, async () => {
    const current = await getEntitlements();
    const merged: Entitlements = {
      ...current,
      removeAds,
      removeAdsInfo: info ?? current.removeAdsInfo,
    };
    await writeJSON(STORAGE_KEYS.entitlements, merged);
    return merged;
  });
  notifyEntitlementsChanged();
  return next;
};

// ----------------------------------------------------------------------------
// Util
// ----------------------------------------------------------------------------

export const newLocalId = (): string => String(uuid.v4());

/**
 * Wipe all per-user data from this device (games, friends, pending sync queue,
 * sync meta). The stable local identity is preserved so the device can keep
 * playing as a guest afterwards. Used when deleting an account.
 *
 * Entitlements (the remove-ads purchase) are deliberately NOT cleared: the
 * purchase is scoped to the user's Apple ID / Google account, not to the
 * deleted app account, so it survives account deletion.
 */
export const clearLocalUserData = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.games),
    AsyncStorage.removeItem(STORAGE_KEYS.friends),
    AsyncStorage.removeItem(STORAGE_KEYS.syncQueue),
    AsyncStorage.removeItem(STORAGE_KEYS.meta),
  ]);
};
