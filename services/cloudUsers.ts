import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Friend } from '@/services/localStore';

/**
 * Low-level Firestore operations for users. Called by the sync queue and the
 * auth flow (findOrCreateUser is still useful on sign-in to make sure a user
 * document exists in Firestore).
 */

export interface CloudUserRecord {
  id: string;
  email: string;
  name: string;
  friends: Friend[];
  createdAt: string;
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
    const data = snap.data() as Omit<CloudUserRecord, 'id'>;
    return { id: snap.id, ...data };
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

export const cloudGetAllUsers = async (): Promise<CloudUserRecord[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CloudUserRecord, 'id'>) }));
};

export const cloudDeleteUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
};
