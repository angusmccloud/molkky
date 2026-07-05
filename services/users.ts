import {
  addLocalFriends,
  getFriends as localGetFriends,
  setFriends as localSetFriends,
  type Friend,
} from '@/services/localStore';
import { enqueueUpdateFriends } from '@/services/syncQueue';
import { cloudDeleteUser, cloudSetUserName } from '@/services/cloudUsers';

/**
 * Local-first users API.
 *
 * The user's "friends" list now lives locally — Firestore is just a backup
 * destination for it. Anything that updates the friends list writes locally
 * and enqueues a sync.
 */

/**
 * Add new friends to the local list (deduped by id) and enqueue a sync.
 */
export const addFriendsLocal = async (
  newFriends: Friend[],
  userId?: string | null,
): Promise<Friend[]> => {
  const merged = await addLocalFriends(newFriends);
  if (userId) {
    void enqueueUpdateFriends(userId, merged);
  }
  return merged;
};

/**
 * Remove a friend from the local list by id and enqueue a sync.
 */
export const removeFriendLocal = async (
  friendId: string,
  userId?: string | null,
): Promise<Friend[]> => {
  const existing = await localGetFriends();
  const next = existing.filter((f) => f.id !== friendId);
  await localSetFriends(next);
  if (userId) {
    void enqueueUpdateFriends(userId, next);
  }
  return next;
};

// ----------------------------------------------------------------------------
// Sign-in helpers — these still hit Firestore (called from auth flows).
// ----------------------------------------------------------------------------

export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    await cloudDeleteUser(userId);
    return true;
  } catch (e) {
    console.log('[users] deleteUser error', e);
    return false;
  }
};

/**
 * Mirror the auth displayName to the user's cloud record. Best-effort: the
 * login backfill self-heals a missed write on the next launch, so failures
 * are logged and reported via the return value rather than thrown.
 */
export const setUserNameCloud = async (
  userId: string,
  name: string,
): Promise<boolean> => {
  try {
    await cloudSetUserName(userId, name);
    return true;
  } catch (e) {
    console.log('[users] setUserNameCloud error', e);
    return false;
  }
};
