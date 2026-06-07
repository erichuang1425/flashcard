import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../services/firebase';
import type { User } from '../types';
import { useMobile } from './MobileContext';
import { isPopupCancelledByUser, shouldFallbackToRedirect } from '../utils/authFallback';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isMobileDevice } = useMobile();

  useEffect(() => {
    // Complete any pending redirect sign-in (mobile flow or popup-blocked
    // fallback). Resolving this lets the Firebase SDK finish the round-trip;
    // onAuthStateChanged below then receives the signed-in user. A missing or
    // failed redirect result is non-fatal, so swallow it here.
    getRedirectResult(auth).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined
        });
      } else {
        setUser(null);
      }
      setLoading(false);
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

    // On mobile, popups are unreliable (often blocked or unsupported), so go
    // straight to the redirect flow.
    if (isMobileDevice) {
      await signInWithRedirect(auth, provider);
      return;
    }

    // On desktop, prefer the popup but fall back to a redirect when the popup
    // is blocked or unsupported. A user-initiated cancel is treated as a no-op.
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (isPopupCancelledByUser(err)) {
        return;
      }
      if (shouldFallbackToRedirect(err)) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithGoogle }}>
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
