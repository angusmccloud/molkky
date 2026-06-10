import { AppState, AppStateStatus } from 'react-native';
import { auth } from '@/lib/firebase';
import {
  enqueueOp,
  getQueue,
  incrementOpRetries,
  removeOpFromQueue,
  rotateOpToBack,
  setGameSyncStatus,
  setMeta,
  getLocalGame,
  type SyncOp,
} from '@/services/localStore';
import {
  cloudDeleteGame,
  cloudUpsertGame,
} from '@/services/cloudGames';
import { cloudUpdateUserFriends } from '@/services/cloudUsers';

const MAX_RETRIES = 5;
const PERIODIC_INTERVAL_MS = 30_000;

// Backoff bounds for "stuck" ops (retries >= MAX_RETRIES). Without this, a
// permanently-poison op (e.g. one rejected by security rules) gets retried on
// EVERY pass — every periodic tick and every app foreground — forever, churning
// battery and network for an op that will never succeed. We throttle these ops
// with an exponential backoff: each additional failure past MAX_RETRIES roughly
// doubles the wait, capped so we still occasionally retry (in case the failure
// was actually transient, e.g. a backend outage or a rules deploy fixing it).
const STUCK_BACKOFF_BASE_MS = 60_000; // 1 min for the first stuck failure
const STUCK_BACKOFF_MAX_MS = 30 * 60_000; // cap at 30 min between retries

// In-memory only (per the offline-first design, persisted queue state lives in
// localStore; this throttling state is intentionally ephemeral and resets on
// app restart so a fresh launch gives every op an immediate retry). Keyed by op
// id -> epoch ms before which the stuck op should be skipped. Entries are
// cleared when an op finally succeeds (removeOpFromQueue path) so the Map can't
// grow unbounded.
const stuckBackoffUntil = new Map<string, number>();

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

/**
 * Count of ops that have failed at least MAX_RETRIES times and are still in the
 * queue (rotated, never dropped). A non-zero value means something is stuck and
 * should be surfaced to the user rather than silently lost.
 */
export const getStuckCount = async (): Promise<number> => {
  const queue = await getQueue();
  return queue.filter((q) => q.retries >= MAX_RETRIES).length;
};

export const isOnlineHint = (): boolean => lastKnownOnline;

// ----------------------------------------------------------------------------
// Queue draining
// ----------------------------------------------------------------------------

const runOp = async (op: SyncOp): Promise<boolean> => {
  switch (op.type) {
    case 'game.upsert': {
      // Push the freshest local copy rather than the (possibly stale) payload
      // captured at enqueue time. If the game no longer exists locally there is
      // nothing to sync — drop the op (this is not data loss).
      const local = await getLocalGame(op.payload?.id);
      if (!local) return true;
      await cloudUpsertGame(local);
      await setGameSyncStatus(local.id, 'synced');
      return true;
    }
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
  const user = auth.currentUser;
  if (!user) return; // guest — keep queue intact, push later

  processing = true;
  try {
    let queue = await getQueue();
    if (queue.length === 0) return;

    // Each op gets at most one attempt per pass; bound iterations so a queue
    // full of poison ops can't spin forever in a single pass.
    let attempts = 0;
    const maxAttempts = queue.length;

    while (queue.length > 0 && attempts < maxAttempts) {
      const op = queue[0];
      attempts += 1;

      // If this is a stuck op still inside its backoff window, skip it WITHOUT
      // attempting the network call. We rotate it to the back so the healthy ops
      // behind it still get processed, and we DON'T `return` (that would treat it
      // like a transient/offline failure and abort the whole pass). It is also
      // not counted as a hard failure — we simply move past it until its
      // nextRetryAt elapses. No data loss: the op stays in the queue.
      const backoffUntil = stuckBackoffUntil.get(op.id);
      if (backoffUntil !== undefined && Date.now() < backoffUntil) {
        await rotateOpToBack(op.id);
        queue = await getQueue();
        continue;
      }

      try {
        await runOp(op);
        await removeOpFromQueue(op.id);
        // Op finally succeeded — drop any backoff bookkeeping so the Map stays
        // bounded (and a future op reusing this id, though ids are unique, would
        // start fresh).
        stuckBackoffUntil.delete(op.id);
        lastKnownOnline = true;
        notify();
      } catch (err: any) {
        const retries = await incrementOpRetries(op.id);
        const msg = err?.message || String(err);
        await setMeta({ lastSyncError: msg });
        lastKnownOnline = false;
        notify();
        if (retries >= MAX_RETRIES) {
          // This op has failed repeatedly — likely poison (e.g. rejected by
          // security rules). We do NOT drop it: that would lose the user's
          // data. Instead rotate it to the back so it can't block the healthy
          // ops behind it, and keep retrying it on future passes. The stuck
          // count (getStuckCount) surfaces this state in the UI.
          console.log(`[syncQueue] op ${op.id} stuck after ${retries} retries:`, msg);
          // Schedule the next allowed retry with exponential backoff so we stop
          // hammering a poison op on every pass. `retries - MAX_RETRIES` is the
          // number of failures accrued *past* the threshold (0 on the first
          // stuck failure), giving base, 2x, 4x, ... up to the cap.
          const overflow = retries - MAX_RETRIES;
          const backoff = Math.min(
            STUCK_BACKOFF_BASE_MS * 2 ** overflow,
            STUCK_BACKOFF_MAX_MS,
          );
          stuckBackoffUntil.set(op.id, Date.now() + backoff);
          await rotateOpToBack(op.id);
          // Continue to the next op.
        } else {
          // Probably a transient/offline failure — stop draining and retry the
          // whole queue later rather than hammering every op while offline.
          return;
        }
      }
      queue = await getQueue();
    }

    const remaining = await getQueue();
    if (remaining.length === 0) {
      await setMeta({ lastSyncedAt: Date.now(), lastSyncError: null });
    }
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
