import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  AuthCredential,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  linkWithCredential,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import type { User } from '../types';
import { useMobile } from './MobileContext';
import {
  isAccountExistsWithDifferentCredential,
  isPopupCancelledByUser,
  shouldFallbackToRedirect,
} from '../utils/authFallback';
import { NEEDS_PASSWORD_LINK_CODE } from '../utils/authErrors';
import { ensureUserProfile } from '../services/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /**
   * Sign in with email/password. When a previous Google sign-in is waiting to
   * be linked (see `signInWithGoogle`), a successful sign-in also attaches the
   * Google provider, so the two methods end up on a single account.
   */
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Sign in (or, on first use, register) with Google. If the email already has
   * a password account, throws an error tagged `auth/needs-password-link` and
   * remembers the Google credential so the next `signIn` can link it.
   */
  signInWithGoogle: (rememberMe?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const toAppUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email ?? '',
  displayName: firebaseUser.displayName || undefined,
  photoURL: firebaseUser.photoURL || undefined,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isMobileDevice } = useMobile();

  // A Google credential captured when sign-in hit
  // `auth/account-exists-with-different-credential`. It lives here (not in
  // component state) so it survives across the Google attempt and the
  // follow-up password sign-in that links it.
  const pendingGoogleCredential = useRef<AuthCredential | null>(null);

  // "Remember me" maps onto Firebase persistence: local survives a browser
  // restart, session is cleared when the tab/window closes. Applied before each
  // sign-in so the choice on the form always wins.
  const applyPersistence = (rememberMe: boolean) =>
    setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

  useEffect(() => {
    // Complete any pending redirect sign-in (mobile flow or popup-blocked
    // fallback). Resolving this lets the Firebase SDK finish the round-trip;
    // onAuthStateChanged below then receives the signed-in user. We also stamp
    // the profile for a first Google login that came back via redirect. A
    // missing or failed redirect result is non-fatal, so swallow it.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          void ensureUserProfile(result.user).catch(() => {});
        }
      })
      .catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setUser(firebaseUser ? toAppUser(firebaseUser) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe = true) => {
    await applyPersistence(rememberMe);
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);

    // If a Google sign-in was parked awaiting a password, link it now so the
    // account carries both providers. Linking is best-effort: clear the pending
    // credential either way so a stale one can't dog later sign-ins.
    const pending = pendingGoogleCredential.current;
    pendingGoogleCredential.current = null;
    if (pending) {
      await linkWithCredential(firebaseUser, pending).catch(() => {});
    }

    await ensureUserProfile(firebaseUser).catch(() => {});
  };

  const signUp = async (email: string, password: string, rememberMe = true) => {
    await applyPersistence(rememberMe);
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(firebaseUser).catch(() => {});
  };

  const signOut = async () => {
    pendingGoogleCredential.current = null;
    await firebaseSignOut(auth);
    setUser(null);
  };

  const signInWithGoogle = async (rememberMe = true) => {
    const provider = new GoogleAuthProvider();
    await applyPersistence(rememberMe);

    // On mobile, popups are unreliable (often blocked or unsupported), so go
    // straight to the redirect flow. The profile is stamped when the redirect
    // result resolves on the next load (see the effect above).
    if (isMobileDevice) {
      await signInWithRedirect(auth, provider);
      return;
    }

    // On desktop, prefer the popup but fall back to a redirect when the popup
    // is blocked or unsupported. A user-initiated cancel is treated as a no-op.
    try {
      const { user: firebaseUser } = await signInWithPopup(auth, provider);
      pendingGoogleCredential.current = null;
      await ensureUserProfile(firebaseUser).catch(() => {});
    } catch (err) {
      if (isPopupCancelledByUser(err)) {
        return;
      }
      // The email already has a password account. Stash the Google credential
      // and ask the caller to collect the password; the next `signIn` links it.
      if (isAccountExistsWithDifferentCredential(err)) {
        pendingGoogleCredential.current = GoogleAuthProvider.credentialFromError(
          err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
        );
        const email = (err as { customData?: { email?: string } })?.customData?.email ?? '';
        throw Object.assign(new Error('Account exists with a different credential'), {
          code: NEEDS_PASSWORD_LINK_CODE,
          email,
        });
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
