import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/_layout';


// Create a new game
export const createGame = async (game) => {
  try {
    const docRef = await addDoc(collection(db, "games"), game);
    console.log("Game created with ID: ", docRef.id);
    return docRef.id; // Return the ID of the newly created game
  } catch (e) {
    console.error("Error creating game: ", e);
    return null;
  }
};

export const getGame = async (gameId) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnapshot = await getDoc(gameRef);
  if (gameSnapshot.exists()) {
    return { id: gameSnapshot.id, ...gameSnapshot.data() };
  } else {
    console.log("Error: No such game!");
    return null;
  }
}

export const updateGame = async (gameId, gameData) => {
  const gameRef = doc(db, 'games', gameId);
  try {
    await updateDoc(gameRef, gameData);
    console.log("Game updated successfully");
    return true;
  } catch (e) {
    console.error("Error updating game: ", e);
    return false;
  }
}

export const getAllUsergames = async (uid) => {
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  const games = [];
  querySnapshot.forEach((doc) => {
    games.push({ id: doc.id, ...doc.data() });
  });
  return games;
}