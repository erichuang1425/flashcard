import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence 
} from 'firebase/auth';
import { auth } from '../services/firebase';
import type { User } from '../types';
import { logger } from '../services/logging';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Start with loading true
    setLoading(true);
    
    // Check for persisted auth state
    const lastAuthCheck = localStorage.getItem('lastAuthCheck');
    if (lastAuthCheck) {
      const lastCheck = new Date(lastAuthCheck);
      const now = new Date();
      // If last check was within last 24 hours, consider it valid
      if (now.getTime() - lastCheck.getTime() < 24 * 60 * 60 * 1000) {
        // Keep existing auth state while verifying
        const currentUser = auth.currentUser;
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email!,
            displayName: currentUser.displayName || undefined
          });
        }
      }
    }

    // Set persistence to LOCAL for better mobile experience
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || undefined
          });
          localStorage.setItem('lastAuthCheck', new Date().toISOString());
        } else {
          setUser(null);
          localStorage.removeItem('lastAuthCheck');
        }
      } catch (err) {
        logger.error('Auth state change error:', err as Error);
        setUser(null);
        localStorage.removeItem('lastAuthCheck');
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authInitialized, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
