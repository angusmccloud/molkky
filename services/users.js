import { collection, doc, addDoc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/_layout';

// Add a new user
export const addUser = async (user) => {
  try {
    const docRef = await addDoc(collection(db, "users"), user);
    console.log("User added with ID: ", docRef.id);
    return docRef;
  } catch (e) {
    console.error("Error adding user: ", e);
    return null;
  }
};

// Edit an existing user
export const editUser = async (userId, userData) => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, userData);
    console.log("User updated successfully");
    return true;
  } catch (e) {
    console.error("Error updating user: ", e);
    return false;
  }
};

// Get a user by ID
export const getUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const userSnapshot = await getDoc(userRef);
  if (userSnapshot.exists()) {
    return { id: userSnapshot.id, ...userSnapshot.data() };
  } else {
    console.log("Error: No such user!");
    return null;
  }
};