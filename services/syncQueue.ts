import { getAuth } from 'firebase/auth';
import { AppState, AppStateStatus } from 'react-native';
import {
  enqueueOp,
  getQueue,
  incrementOpRetries,
  removeOpFromQueue,
  setGameSyncStatus,
  setMeta,
  type SyncOp,
} from '@/services/localStore';
import {
  cloudDeleteGame,
  cloudUpsertGame,
} from '@/services/cloudGames';
import { cloudUpdateUserFriends } from '@/services/cloudUsers';

const MAX_RETRIES = 5;
const PERIODIC_INTERVAL_MS = 30_000;

let processing = false;
let listenersAttached = false;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastKnownOnline = true; // optimistic — we discover offline by failure
const subscribers = new Set<() => void>();

const notify = () => {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.log('[syncQueue] subscriber error', e);
    }
  });
};

export const subscribeToSyncQueue = (cb: () => void): (() => void) => {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
};

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export const enqueueGameUpsert = async (game: any) => {
  const op = await enqueueOp({ type: 'game.upsert', payload: game });
  notify();
  // Fire-and-forget — never block the UI.
  void processQueue();
  return op;
};

export const enqueueGameDelete = async (gameId: string) => {
  const op = await enqueueOp({ type: 'game.delete', payload: { id: gameId } });
  notify();
  void processQueue();
  return op;
};

export const enqueueUpdateFriends = async (userId: string, friends: any[]) => {
  const op = await enqueueOp({
    type: 'user.updateFriends',
    payload: { userId, friends },
  });
  notify();
  void processQueue();
  return op;
};

export const getPendingCount = async (): Promise<number> => {
  const queue = await getQueue();
  return queue.length;
};

export const isOnlineHint = (): boolean => lastKnownOnline;

// ----------------------------------------------------------------------------
// Queue draining
// ----------------------------------------------------------------------------

const runOp = async (op: SyncOp): Promise<boolean> => {
  switch (op.type) {
    case 'game.upsert':
      await cloudUpsertGame(op.payload);
      await setGameSyncStatus(op.payload.id, 'synced');
      return true;
    case 'game.delete':
      await cloudDeleteGame(op.payload.id);
      return true;
    case 'user.updateFriends':
      await cloudUpdateUserFriends(op.payload.userId, op.payload.friends);
      return true;
    default:
      console.log('[syncQueue] unknown op type', (op as SyncOp).type);
      return true; // unknown — drop it
  }
};

/**
 * Drain the queue if conditions allow. Always safe to call — bails fast when
 * not signed in, when already processing, or when the queue is empty.
 */
export const processQueue = async (): Promise<void> => {
  if (processing) return;
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return; // guest — keep queue intact, push later

  processing = true;
  try {
    let queue = await getQueue();
    if (queue.length === 0) return;

    // Drain in order. Stop on first network-style failure to avoid hammering.
    while (queue.length > 0) {
      const op = queue[0];
      try {
        await runOp(op);
        await removeOpFromQueue(op.id);
        lastKnownOnline = true;
        notify();
      } catch (err: any) {
        const retries = await incrementOpRetries(op.id);
        const msg = err?.message || String(err);
        await setMeta({ lastSyncError: msg });
        // Heuristic: treat all errors as potentially offline, but drop ops that
        // have exceeded MAX_RETRIES so we don't loop forever on bad data.
        lastKnownOnline = false;
        notify();
        if (retries >= MAX_RETRIES) {
          console.log(`[syncQueue] dropping op ${op.id} after ${retries} retries:`, msg);
          await removeOpFromQueue(op.id);
          // Continue draining — the rest of the queue might be fine.
        } else {
          // Bail out — try again later.
          return;
        }
      }
      queue = await getQueue();
    }
    await setMeta({ lastSyncedAt: Date.now(), lastSyncError: null });
    notify();
  } finally {
    processing = false;
  }
};

// ----------------------------------------------------------------------------
// Lifecycle (app foreground, periodic timer)
// ----------------------------------------------------------------------------

const handleAppStateChange = (next: AppStateStatus) => {
  if (next === 'active') {
    void processQueue();
  }
};

export const startSyncQueueLifecycle = () => {
  if (listenersAttached) return;
  listenersAttached = true;
  appStateSub = AppState.addEventListener('change', handleAppStateChange);
  periodicTimer = setInterval(() => {
    void processQueue();
  }, PERIODIC_INTERVAL_MS);
};

export const stopSyncQueueLifecycle = () => {
  if (!listenersAttached) return;
  listenersAttached = false;
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
};
