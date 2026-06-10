import { AppState, AppStateStatus } from 'react-native';
import { auth } from '@/lib/firebase';
import {
  getAllGames,
  getGamesForUid,
  upsertGame,
  type Game,
} from '@/services/localStore';
import { cloudGetAllUserGames } from '@/services/cloudGames';
import { enqueueGameUpsert, processQueue } from '@/services/syncQueue';

/**
 * Cloud → local reconciliation (the "pull" half of sync).
 *
 * The sync queue (services/syncQueue.ts) handles local → cloud pushes. This
 * module handles pulling other devices' changes back down and merging them so
 * a user with a phone AND an iPad sees the union of their games on both, and
 * no game from either device is ever lost.
 *
 * Merge policy:
 *   - Union, never delete. A game present locally but missing from the cloud is
 *     kept (it may be an offline-created game not yet pushed). A game present in
 *     the cloud but missing locally is added.
 *   - Never clobber unsynced local edits. If a local game has syncStatus other
 *     than 'synced', the local copy wins — the queue will push it up.
 *   - Last-write-wins per game (by `updatedAt`) when both sides are clean.
 */

const updatedAtMs = (g: { updatedAt?: string; createdAt?: string }): number =>
  Date.parse(g.updatedAt || g.createdAt || '') || 0;

// ----------------------------------------------------------------------------
// Change notifications — lets the UI re-read local data after a background pull.
// ----------------------------------------------------------------------------

const subscribers = new Set<() => void>();

export const subscribeToCloudData = (cb: () => void): (() => void) => {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
};

const notifyDataChanged = () => {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.log('[cloudSync] subscriber error', e);
    }
  });
};

// ----------------------------------------------------------------------------
// Pull + merge
// ----------------------------------------------------------------------------

/**
 * Pull all of the user's cloud games and merge them into local storage.
 * Returns the number of local games that were added or updated.
 */
export const pullAndMergeGames = async (uid: string): Promise<number> => {
  if (!uid) return 0;
  let remoteGames: Game[];
  try {
    remoteGames = await cloudGetAllUserGames(uid);
  } catch (e) {
    // Offline or transient — nothing to merge this pass. Local data is safe.
    console.log('[cloudSync] pull failed (continuing offline)', e);
    return 0;
  }

  const localGames = await getAllGames();
  const localById = new Map(localGames.map((g) => [g.id, g]));
  let changed = 0;

  for (const remote of remoteGames) {
    const existing = localById.get(remote.id);
    const remoteUpdated = updatedAtMs(remote);

    if (!existing) {
      await upsertGame({
        ...remote,
        uid,
        syncStatus: 'synced',
        localUpdatedAt: remoteUpdated || Date.now(),
      });
      changed += 1;
      continue;
    }

    // Local has unpushed work — keep it; the queue will push it up.
    if (existing.syncStatus !== 'synced') continue;

    const localUpdated = Math.max(updatedAtMs(existing), existing.localUpdatedAt || 0);
    if (remoteUpdated > localUpdated) {
      await upsertGame({
        ...remote,
        uid,
        syncStatus: 'synced',
        localUpdatedAt: remoteUpdated || Date.now(),
      });
      changed += 1;
    }
  }

  if (changed > 0) notifyDataChanged();
  return changed;
};

/**
 * Re-enqueue every dirty local game so nothing pending is ever forgotten — a
 * belt-and-suspenders guard in case a queue op was lost (the local store is the
 * source of truth for "needs sync"). enqueueGameUpsert dedupes by game id, so
 * this is cheap and idempotent.
 */
export const reconcileDirtyGames = async (uid: string): Promise<void> => {
  if (!uid) return;
  const games = await getGamesForUid(uid);
  for (const g of games) {
    if (g.syncStatus !== 'synced') {
      await enqueueGameUpsert(g);
    }
  }
};

/**
 * Full sync pass: re-enqueue dirty games, push the queue, then pull + merge.
 * Safe to call anytime — bails when not signed in. Never blocks the UI.
 */
export const syncNow = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  await reconcileDirtyGames(user.uid);
  await processQueue();
  await pullAndMergeGames(user.uid);
};

// ----------------------------------------------------------------------------
// Lifecycle — pull on app foreground (cheap, and exactly when divergence matters)
// ----------------------------------------------------------------------------

let listening = false;
let appStateSub: { remove: () => void } | null = null;

const handleAppStateChange = (next: AppStateStatus) => {
  if (next === 'active') void syncNow();
};

export const startCloudSyncLifecycle = () => {
  if (listening) return;
  listening = true;
  appStateSub = AppState.addEventListener('change', handleAppStateChange);
};

export const stopCloudSyncLifecycle = () => {
  if (!listening) return;
  listening = false;
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
};
