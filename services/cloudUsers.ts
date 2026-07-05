import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Friend } from '@/services/localStore';

/**
 * Low-level Firestore operations for users. Called by the sync queue and the
 * auth flow (findOrCreateCloudUser is still useful on sign-in to make sure a user
 * document exists in Firestore).
 */

export interface CloudUserRecord {
  id: string;
  email: string;
  name: string;
  friends: Friend[];
  createdAt: string;
  /**
   * Remove-ads entitlement — SERVER-WRITTEN ONLY. Set exclusively by the
   * `validatePurchase` Cloud Function (functions/src/index.ts) after
   * verifying the App Store signed transaction; Firestore rules reject
   * client writes to these fields. Clients only READ them (login backfill
   * pull-down). removeAdsInfo carries the server's shape (transactionId,
   * originalTransactionId, environment, purchaseDate, validatedAt).
   */
  removeAds?: boolean;
  removeAdsInfo?: Record<string, unknown>;
}

export interface FindOrCreateUserInput {
  userId: string;
  email: string | null;
  name: string | null;
}

export const findOrCreateCloudUser = async (
  input: FindOrCreateUserInput,
): Promise<CloudUserRecord> => {
  const userRef = doc(db, 'users', input.userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data() as Partial<Omit<CloudUserRecord, 'id'>>;
    // Self-heal partial docs: an Admin-SDK writer (e.g. an older
    // validatePurchase Cloud Function claiming a purchase before this ran)
    // may have created the doc with only the entitlement fields. Repair any
    // missing/wrong-type BASE fields so the record always has the full shape.
    const repairs: Partial<Omit<CloudUserRecord, 'id'>> = {};
    if (typeof data.email !== 'string') repairs.email = input.email ?? '';
    if (typeof data.name !== 'string') repairs.name = input.name ?? input.email ?? '';
    if (!Array.isArray(data.friends)) repairs.friends = [];
    if (typeof data.createdAt !== 'string') repairs.createdAt = new Date().toISOString();
    if (Object.keys(repairs).length > 0) {
      // merge:true with ONLY the missing base fields: the write's
      // diff().affectedKeys() must stay clear of removeAds/removeAdsInfo
      // (server-written only) or the Firestore rules would reject it.
      await setDoc(userRef, repairs, { merge: true });
    }
    return { id: snap.id, ...data, ...repairs } as CloudUserRecord;
  }
  const newUser: Omit<CloudUserRecord, 'id'> = {
    email: input.email ?? '',
    name: input.name ?? input.email ?? '',
    friends: [],
    createdAt: new Date().toISOString(),
  };
  await setDoc(userRef, newUser);
  return { id: input.userId, ...newUser };
};

/**
 * Update the display name on the user's cloud record. Used to self-heal docs
 * created before the auth profile's displayName landed (Apple's first
 * sign-in persists the name via updateProfile AFTER findOrCreateCloudUser
 * already wrote the doc with the email as a fallback name).
 */
export const cloudSetUserName = async (
  userId: string,
  name: string,
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { name });
};

export const cloudUpdateUserFriends = async (
  userId: string,
  friends: Friend[],
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { friends });
};

export const cloudGetUser = async (userId: string): Promise<CloudUserRecord | null> => {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<CloudUserRecord, 'id'>) };
};

export const cloudDeleteUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
};
