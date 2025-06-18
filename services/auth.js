import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { findOrCreateUser } from './users';

export const signUpNewUser = (email, password, displayName) => {
  const auth = getAuth();
  return createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      // Signed up 
      console.log("User signed up successfully:", userCredential);
      const user = userCredential.user;
      
      // Update the user's profile with the display name
      await updateProfile(user, { displayName: displayName });
      console.log("User profile updated successfully");
      
      // Find or create user record in Firestore using userId
      const userRecord = await findOrCreateUser({
        userId: user.uid,
        email: user.email,
        name: displayName
      });
      
      // Return user with additional data
      return {
        ...user,
        name: displayName,
        friends: userRecord.friends || []
      };
    })
    .catch((error) => {
      console.error("Error signing up user:", error);
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(`Error ${errorCode}: ${errorMessage}`);
    });
};

export const signInUser = (email, password) => {
  const auth = getAuth();
  return signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      // Signed in 
      console.log("User signed in successfully:", userCredential);
      const user = userCredential.user;
      
      // Find or create user record in Firestore using userId
      const userRecord = await findOrCreateUser({
        userId: user.uid,
        email: user.email,
        name: user.displayName || user.email
      });
      
      // Return user with additional data
      return {
        ...user,
        name: user.displayName,
        friends: userRecord.friends || []
      };
    })
    .catch((error) => {
      console.error("Error signing in user:", error);
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(`Error ${errorCode}: ${errorMessage}`);
    });
}

export const signOutUser = () => {
  const auth = getAuth();
  return signOut(auth)
    .then(() => {
      // Sign-out successful.
      console.log("User signed out successfully");
    })
    .catch((error) => {
      console.error("Error signing out user:", error);
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(`Error ${errorCode}: ${errorMessage}`);
    });
}

export const getCurrentUser = () => {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        reject(new Error('No user is currently signed in.'));
      }
    });
  });
};

export const isUserSignedIn = () => {
  const auth = getAuth();
  return !!auth.currentUser;
};