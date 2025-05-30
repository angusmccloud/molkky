import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { signUpNewUser, signInUser, signOutUser } from '@/services/auth';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Define the shape of the AuthContext
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null; // Add error state
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null); // Add error state

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const signUp = async (email: string, password: string): Promise<void> => {
    setError(null); // Reset error state
    try {
      const newUser = await signUpNewUser(email, password);
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

  return (
    <AuthContext.Provider value={{ user, loading, error, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
