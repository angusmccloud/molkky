import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Game } from '@/services/localStore';

/**
 * Low-level Firestore operations for games.
 *
 * These are not called from UI code directly. UI calls into `services/games.ts`
 * which always writes locally first; the sync queue is responsible for pushing
 * those local writes here when the user is signed in and online.
 *
 * IDs are stable: we use the local id as the Firestore document id (setDoc,
 * not addDoc) so there's no document-id remapping.
 */

/** A game payload as it lives in Firestore — strips local-only fields. */
const stripLocalFields = (game: Game) => {
  const { syncStatus: _s, localUpdatedAt: _l, ...rest } = game;
  return rest;
};

export const cloudUpsertGame = async (game: Game): Promise<void> => {
  if (!game.id) {
    throw new Error('cloudUpsertGame: game.id is required');
  }
  const ref = doc(db, 'games', game.id);
  await setDoc(ref, stripLocalFields(game), { merge: true });
};

export const cloudDeleteGame = async (gameId: string): Promise<void> => {
  const ref = doc(db, 'games', gameId);
  await deleteDoc(ref);
};

export const cloudGetGame = async (gameId: string): Promise<Game | null> => {
  const ref = doc(db, 'games', gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Game, 'id'>) } as Game;
};

export const cloudGetAllUserGames = async (uid: string): Promise<Game[]> => {
  const q = query(collection(db, 'games'), where('uid', '==', uid));
  const snap = await getDocs(q);
  const games: Game[] = [];
  snap.forEach((d) => {
    games.push({ id: d.id, ...(d.data() as Omit<Game, 'id'>) } as Game);
  });
  return games;
};
