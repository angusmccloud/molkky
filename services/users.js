import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Find or create a user record using userId (Firebase Auth UID)
export const findOrCreateUser = async (userInfo) => {
  try {
    // Use the userId as the document ID for direct lookup
    const userRef = doc(db, 'users', userInfo.userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      // User exists, return the data
      return { 
        id: userSnapshot.id, 
        ...userSnapshot.data() 
      };
    }
    
    // Create new user if doesn't exist
    const newUser = {
      email: userInfo.email,
      name: userInfo.name || userInfo.email,
      friends: [],
      createdAt: new Date().toISOString()
    };
    
    // Use setDoc with the userId as the document ID
    await setDoc(userRef, newUser);
    console.log("User created with ID: ", userInfo.userId);
    
    return {
      id: userInfo.userId,
      ...newUser
    };
  } catch (error) {
    console.log("Error finding or creating user: ", error);
    throw error;
  }
};

// Update user's friends list
export const updateUserFriends = async (userId, friends) => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, { friends });
    console.log("User friends updated successfully");
    return true;
  } catch (e) {
    console.log("Error updating user friends: ", e);
    return false;
  }
};

// Get user by ID
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

// Get all users (for admin or initial setup purposes)
export const getAllUsers = async () => {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return userList;
};

// Delete a user by ID (for admin use)
export const deleteUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  try {
    await deleteDoc(userRef);
    console.log("User deleted successfully");
    return true;
  } catch (e) {
    console.log("Error deleting user: ", e);
    return false;
  }
};

// Example of a more complex query: Get users by a specific field (e.g., all users with a specific friend)
export const getUsersByFriend = async (friendId) => {
  const usersCol = collection(db, 'users');
  const q = query(usersCol, where("friends", "array-contains", friendId));
  const userSnapshot = await getDocs(q);
  const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return userList;
};