import {
  addLocalFriends,
  getFriends as localGetFriends,
  setFriends as localSetFriends,
  type Friend,
} from '@/services/localStore';
import { enqueueUpdateFriends } from '@/services/syncQueue';
import {
  findOrCreateCloudUser,
  cloudGetUser,
  cloudGetAllUsers,
  cloudDeleteUser,
  type CloudUserRecord,
  type FindOrCreateUserInput,
} from '@/services/cloudUsers';

/**
 * Local-first users API.
 *
 * The user's "friends" list now lives locally — Firestore is just a backup
 * destination for it. `findOrCreateUser` still hits Firestore on sign-in (so
 * the user document exists), but anything that updates the friends list
 * writes locally and enqueues a sync.
 */

export interface UpdateFriendsResult {
  friends: Friend[];
  ok: boolean;
}

export const getLocalFriends = async (): Promise<Friend[]> => {
  return localGetFriends();
};

/**
 * Replace the friends list locally and enqueue a cloud sync.
 * If `userId` is provided (i.e. user is signed in or recently was), the queue
 * entry will target that uid.
 */
export const setLocalFriends = async (
  friends: Friend[],
  userId?: string | null,
): Promise<UpdateFriendsResult> => {
  await localSetFriends(friends);
  if (userId) {
    void enqueueUpdateFriends(userId, friends);
  }
  return { friends, ok: true };
};

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
 * Backwards-compatible name. Same as setLocalFriends.
 */
export const updateUserFriends = async (
  userId: string,
  friends: Friend[],
): Promise<boolean> => {
  const res = await setLocalFriends(friends, userId);
  return res.ok;
};

// ----------------------------------------------------------------------------
// Sign-in helpers — these still hit Firestore (called from auth flows).
// ----------------------------------------------------------------------------

export const findOrCreateUser = async (
  userInfo: FindOrCreateUserInput,
): Promise<CloudUserRecord> => {
  return findOrCreateCloudUser(userInfo);
};

export const getUser = async (userId: string): Promise<CloudUserRecord | null> => {
  return cloudGetUser(userId);
};

export const getAllUsers = async (): Promise<CloudUserRecord[]> => {
  return cloudGetAllUsers();
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    await cloudDeleteUser(userId);
    return true;
  } catch (e) {
    console.log('[users] deleteUser error', e);
    return false;
  }
};
