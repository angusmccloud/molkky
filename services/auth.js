import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";

export const signUpNewUser = (email, password, displayName) => {
  const auth = getAuth();
  return createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up 
      console.log("User signed up successfully:", userCredential);
      const user = userCredential.user;
      // Update the user's profile with the display name
      return updateProfile(user, { displayName: displayName })
        .then(() => {
          console.log("User profile updated successfully");
          return user;
        })
        .catch((error) => {
          console.error("Error updating user profile:", error);
          throw new Error(`Error updating profile: ${error.message}`);
        });
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
    .then((userCredential) => {
      // Signed in 
      console.log("User signed in successfully:", userCredential);
      const user = userCredential.user;
      return user;
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