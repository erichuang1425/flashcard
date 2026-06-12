import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
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
  OAuthCredential,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import type { User } from '../types';
import {
  isAccountExistsWithDifferentCredential,
  isPopupCancelledByUser,
  shouldFallbackToRedirect,
} from '../utils/authFallback';
import { LINK_EMAIL_MISMATCH_CODE, NEEDS_PASSWORD_LINK_CODE } from '../utils/authErrors';
import { ensureUserProfile } from '../services/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Email whose Google credential is waiting for password re-authentication. */
  pendingLinkEmail: string | null;
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
const PENDING_GOOGLE_LINK_KEY = 'flashcards.auth.pending-google-link.v1';

interface PendingGoogleLink {
  email: string;
  credential: AuthCredential;
}

const loadPendingGoogleLink = (): PendingGoogleLink | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_GOOGLE_LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown; credential?: unknown };
    if (typeof parsed.email !== 'string' || !parsed.credential) return null;
    const credential = OAuthCredential.fromJSON(parsed.credential as object);
    return credential ? { email: parsed.email, credential } : null;
  } catch {
    return null;
  }
};

const persistPendingGoogleLink = (link: PendingGoogleLink): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      PENDING_GOOGLE_LINK_KEY,
      JSON.stringify({ email: link.email, credential: link.credential.toJSON() })
    );
  } catch {
    // Keep the in-memory credential for this page when storage is unavailable.
  }
};

const removePersistedGoogleLink = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_GOOGLE_LINK_KEY);
  } catch {
    // Storage cleanup is best-effort.
  }
};

const toAppUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email ?? '',
  displayName: firebaseUser.displayName || undefined,
  photoURL: firebaseUser.photoURL || undefined,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const restoredLink = useRef<PendingGoogleLink | null | undefined>(undefined);
  if (restoredLink.current === undefined) {
    restoredLink.current = loadPendingGoogleLink();
  }

  // Redirect sign-in reloads the page, so the pending credential is mirrored
  // into sessionStorage. It remains scoped to this tab and is removed as soon
  // as linking succeeds or the user signs out.
  const pendingGoogleCredential = useRef<AuthCredential | null>(
    restoredLink.current?.credential ?? null
  );
  const [pendingLinkEmail, setPendingLinkEmail] = useState<string | null>(
    restoredLink.current?.email ?? null
  );

  const clearPendingGoogleLink = useCallback(() => {
    pendingGoogleCredential.current = null;
    setPendingLinkEmail(null);
    removePersistedGoogleLink();
  }, []);

  const rememberPendingGoogleLink = useCallback((error: unknown): string | null => {
    const credential = GoogleAuthProvider.credentialFromError(
      error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
    );
    const email =
      (error as { customData?: { email?: string } })?.customData?.email?.trim() ?? '';
    if (!credential || !email) {
      clearPendingGoogleLink();
      return null;
    }

    const link = { email, credential };
    pendingGoogleCredential.current = credential;
    setPendingLinkEmail(email);
    persistPendingGoogleLink(link);
    return email;
  }, [clearPendingGoogleLink]);

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
          clearPendingGoogleLink();
          void ensureUserProfile(result.user).catch(() => {});
        }
      })
      .catch((error) => {
        if (isAccountExistsWithDifferentCredential(error)) {
          rememberPendingGoogleLink(error);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setUser(firebaseUser ? toAppUser(firebaseUser) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clearPendingGoogleLink, rememberPendingGoogleLink]);

  const signIn = async (email: string, password: string, rememberMe = true) => {
    if (
      pendingGoogleCredential.current &&
      pendingLinkEmail &&
      email.trim().toLowerCase() !== pendingLinkEmail.trim().toLowerCase()
    ) {
      throw Object.assign(new Error('Password sign-in email does not match the pending link'), {
        code: LINK_EMAIL_MISMATCH_CODE,
      });
    }

    await applyPersistence(rememberMe);
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);

    // If a Google sign-in was parked awaiting a password, link it now so the
    // account carries both providers. Do not report success or discard the
    // credential when Firebase rejects the link; the user can retry or sign out.
    const pending = pendingGoogleCredential.current;
    if (pending) {
      await linkWithCredential(firebaseUser, pending);
      clearPendingGoogleLink();
    }

    await ensureUserProfile(firebaseUser).catch(() => {});
  };

  const signUp = async (email: string, password: string, rememberMe = true) => {
    await applyPersistence(rememberMe);
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(firebaseUser).catch(() => {});
  };

  const signOut = async () => {
    clearPendingGoogleLink();
    await firebaseSignOut(auth);
    setUser(null);
  };

  const signInWithGoogle = async (rememberMe = true) => {
    const provider = new GoogleAuthProvider();
    await applyPersistence(rememberMe);

    // Prefer the popup on every device. `signInWithRedirect` looks attractive on
    // mobile, but it bounces through `<authDomain>/__/auth/handler` — a different
    // origin than the deployed app — and mobile browsers that partition
    // third-party storage (iOS Safari/ITP, Chrome) block the storage the SDK
    // needs to finish the round-trip. The user comes back signed *out* with no
    // error, which is exactly the reported breakage. Popups keep the flow in the
    // app's own first-party context, so they complete reliably. See Firebase's
    // redirect best-practices guidance. Redirect is kept only as a last resort
    // for the rare case a popup cannot open at all. A user-initiated cancel is
    // treated as a no-op.
    try {
      const { user: firebaseUser } = await signInWithPopup(auth, provider);
      clearPendingGoogleLink();
      await ensureUserProfile(firebaseUser).catch(() => {});
    } catch (err) {
      if (isPopupCancelledByUser(err)) {
        return;
      }
      // The email already has a password account. Stash the Google credential
      // and ask the caller to collect the password; the next `signIn` links it.
      if (isAccountExistsWithDifferentCredential(err)) {
        const email = rememberPendingGoogleLink(err);
        if (email === null) throw err;
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
    <AuthContext.Provider
      value={{ user, loading, pendingLinkEmail, signIn, signUp, signOut, signInWithGoogle }}
    >
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
