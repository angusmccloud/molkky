import { createContext, useContext, useState, useEffect } from 'react';
import { signUpNewUser, signInUser, getCurrentUser } from '@/services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error fetching current user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signUp = async (email, password) => {
    const newUser = await signUpNewUser(email, password);
    setUser(newUser);
  };

  const signIn = async (email, password) => {
    const loggedInUser = await signInUser(email, password);
    setUser(loggedInUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};