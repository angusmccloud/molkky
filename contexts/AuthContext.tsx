import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { signUpNewUser, signInUser, signOutUser } from '@/services/auth';
import { getAuth, onAuthStateChanged, User as firebaseUser } from 'firebase/auth';
import { findOrCreateUser } from '@/services/users';
import { updateUserFriends } from '@/services/users';

// Define a User type that extends Firebase's user by adding additional properties (name, friends)
export interface User extends firebaseUser {
  name?: string; // Optional name property
  friends?: string[]; // Optional friends list
  email: string; // Required email property
}

// Define the shape of the AuthContext
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null; 
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  addFriends: (newFriends: { id: string; name: string }[]) => Promise<void>;
}

// Create the AuthContext with a default value of null
export const AuthContext = createContext<AuthContextType | null>(null);

// Define the props for the AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Get user record from Firestore using userId
        try {
          const userRecord = await findOrCreateUser({
            userId: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || currentUser.email
          });
          
          setUser({
            ...currentUser,
            name: currentUser.displayName,
            friends: userRecord.friends || []
          });
        } catch (error) {
          console.error("Error fetching user record:", error);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    setError(null); // Reset error state
    try {
      const newUser = await signUpNewUser(email, password, displayName);
      setUser(newUser);
    } catch (error: any) {
      setError(error.message); // Set error message
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setError(null); // Reset error state
    try {
      const signedInUser = await signInUser(email, password);
      setUser(signedInUser);
    } catch (error: any) {
      setError(error.message); // Set error message
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null); // Reset error state
    try {
      await signOutUser();
      setUser(null);
    } catch (error: any) {
      setError(error.message); // Set error message
    }
  };

  const addFriends = async (newFriends: { id: string; name: string }[]): Promise<void> => {
    if (!user) return;
    
    try {
      const existingFriends = user.friends || [];
      const uniqueNewFriends = newFriends.filter(
        newFriend => !existingFriends.some(existing => existing.id === newFriend.id)
      );
      
      if (uniqueNewFriends.length === 0) return;
      
      const updatedFriends = [...existingFriends, ...uniqueNewFriends];
      
      // Update in Firestore
      await updateUserFriends(user.uid, updatedFriends);
      
      // Update local state
      setUser({
        ...user,
        friends: updatedFriends
      });
    } catch (error) {
      console.error("Error adding friends:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, error, signUp, signIn, signOut, addFriends }}>
      {children}
    </AuthContext.Provider>
  );
};
