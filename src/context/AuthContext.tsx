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
  indexedDBLocalPersistence,
  inMemoryPersistence,
  updateCurrentUser,
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
import {
  LINK_EMAIL_MISMATCH_CODE,
  NEEDS_PASSWORD_LINK_CODE,
  REDIRECT_STORAGE_UNAVAILABLE_CODE,
} from '../utils/authErrors';
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
  signInWithGoogle: (rememberMe?: boolean) => Promise<boolean>;
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

// Probe whether a Web Storage backend can actually be written. `setPersistence`
// itself skips this availability check while signed out, so we mirror Firebase's
// own init-time check here. Accessing `window.localStorage`/`sessionStorage` can
// itself throw (e.g. cookies disabled), so the whole probe is guarded.
const webStorageWritable = (kind: 'local' | 'session'): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
    if (!storage) return false;
    const probeKey = '__flashcards.persistence-probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
};

// sessionStorage backs session-only auth and Firebase's redirect resolver;
// localStorage backs the durable recovery tier below.
const sessionStorageWritable = (): boolean => webStorageWritable('session');
const localStorageWritable = (): boolean => webStorageWritable('local');

const extractAuthErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
};

// Authentication errors have stable auth/* codes. Persistence failures from
// IndexedDB/Web Storage generally surface as a DOMException, a plain Error, or
// auth/internal-error. Only those failures are safe to retry after switching to
// memory; retrying a wrong password would waste another network attempt.
const isPersistenceWriteFailure = (error: unknown): boolean => {
  const code = extractAuthErrorCode(error);
  return code === undefined || code === 'auth/internal-error' || code === 'auth/web-storage-unsupported';
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
  //
  // Applying persistence must never block sign-in. The chosen store needs Web
  // Storage that some environments withhold — private browsing, in-app webviews
  // (Instagram/Facebook/iOS), or disabled cookies. Crucially, `setPersistence`
  // does NOT surface that while signed out: with no user to migrate it just
  // switches the active store and resolves without testing it, so the failure
  // would only land later when sign-in writes the user — rejecting the whole
  // sign-in. (That regression locked users out: the email flow threw before
  // sign-in; Google signed the user back out.) So probe the store up front and
  // fall back to in-memory persistence when it is unavailable — it needs no
  // storage and is strictly *more* ephemeral than either choice, so a "session
  // only" pick is never silently upgraded to a persistent one. The session then
  // lasts only for this page, but the user can actually sign in.
  const applyPersistence = async (
    rememberMe: boolean
  ): Promise<{ redirectStorageAvailable: boolean }> => {
    const targetStorageAvailable = rememberMe || sessionStorageWritable();
    const redirectStorageAvailable =
      rememberMe ? sessionStorageWritable() : targetStorageAvailable;
    const target = targetStorageAvailable
      ? rememberMe
        // Firebase's normal browser default prefers IndexedDB for durable
        // sessions. Using localStorage explicitly caused the reported
        // remember-me-only failure when that store was full or restricted,
        // while session persistence continued to work.
        ? indexedDBLocalPersistence
        : browserSessionPersistence
      : inMemoryPersistence;
    try {
      await setPersistence(auth, target);
    } catch {
      // Defensive: the store could change underfoot between probe and write.
      // Never let it block sign-in.
      await setPersistence(auth, inMemoryPersistence).catch(() => {});
    }
    return { redirectStorageAvailable };
  };

  // Firebase assigns `auth.currentUser` before writing the serialized user to
  // persistence and notifying auth listeners. If that larger write fails after
  // our small availability probe passed (for example because the durable store
  // is nearly full or restricted), the credential promise rejects even though
  // authentication succeeded. Re-home that already-authenticated user in the
  // most durable store that still accepts the write and replay it through the
  // public API so listeners fire instead of bouncing back to login.
  //
  // A "remember me" session should survive a restart whenever *any* durable
  // store works: when IndexedDB was the broken one, localStorage may still be
  // writable, so try it before collapsing all the way to in-memory (which is
  // lost on reload). Each tier is strictly more ephemeral than the last, so a
  // "session only" pick is never silently upgraded.
  const recoverAuthenticatedUser = async (
    originalError: unknown,
    rememberMe: boolean
  ): Promise<FirebaseUser> => {
    const authenticatedUser = auth.currentUser;
    if (!authenticatedUser) throw originalError;

    const tiers =
      rememberMe && localStorageWritable()
        ? [browserLocalPersistence, inMemoryPersistence]
        : [inMemoryPersistence];

    for (const persistence of tiers) {
      try {
        await setPersistence(auth, persistence);
        await updateCurrentUser(auth, authenticatedUser);
        return authenticatedUser;
      } catch {
        // The probe passed but this store rejected the real write too; fall
        // through to the next, more ephemeral, tier.
      }
    }
    throw originalError;
  };

  const retryEmailSignInInMemory = async (
    email: string,
    password: string,
    originalError: unknown
  ): Promise<FirebaseUser> => {
    if (!isPersistenceWriteFailure(originalError)) throw originalError;
    await setPersistence(auth, inMemoryPersistence);
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    return firebaseUser;
  };

  const finishSignIn = async (firebaseUser: FirebaseUser): Promise<void> => {
    setUser(toAppUser(firebaseUser));
    setLoading(false);
    await ensureUserProfile(firebaseUser).catch(() => {});
  };

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
    let firebaseUser: FirebaseUser;
    try {
      ({ user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password));
    } catch (error) {
      firebaseUser = auth.currentUser
        ? await recoverAuthenticatedUser(error, rememberMe)
        : await retryEmailSignInInMemory(email, password, error);
    }

    // If a Google sign-in was parked awaiting a password, link it now so the
    // account carries both providers. Do not report success or discard the
    // credential when Firebase rejects the link; the user can retry or sign out.
    const pending = pendingGoogleCredential.current;
    if (pending) {
      await linkWithCredential(firebaseUser, pending);
      clearPendingGoogleLink();
    }

    await finishSignIn(firebaseUser);
  };

  const signUp = async (email: string, password: string, rememberMe = true) => {
    await applyPersistence(rememberMe);
    let firebaseUser: FirebaseUser;
    try {
      ({ user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password));
    } catch (error) {
      if (auth.currentUser) {
        firebaseUser = await recoverAuthenticatedUser(error, rememberMe);
      } else if (isPersistenceWriteFailure(error)) {
        // Account creation may have succeeded server-side before the local
        // persistence write failed. Sign in to that account under memory rather
        // than calling createUser again and receiving email-already-in-use.
        firebaseUser = await retryEmailSignInInMemory(email, password, error);
      } else {
        throw error;
      }
    }
    await finishSignIn(firebaseUser);
  };

  const signOut = async () => {
    clearPendingGoogleLink();
    await firebaseSignOut(auth);
    setUser(null);
  };

  const signInWithGoogle = async (rememberMe = true) => {
    const provider = new GoogleAuthProvider();

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
    //
    // Open the popup *synchronously* from the click — before awaiting anything.
    // Strict mobile browsers (notably iOS Safari) only allow `window.open` while
    // the original user gesture is still on the call stack; an intervening
    // `await` (even on a fast promise like `setPersistence`) unwinds that stack
    // and the popup gets blocked — which would then trip the redirect fallback,
    // the very flow this change exists to avoid. So persistence is applied in
    // parallel: it settles in milliseconds, far inside the seconds the user
    // spends in the Google popup, so the session is still stored with the chosen
    // persistence by the time sign-in resolves. `applyPersistence` resolves on
    // its own (falling back to in-memory if the store is unavailable), so it
    // never aborts the sign-in.
    const persistence = applyPersistence(rememberMe);
    const popup = signInWithPopup(auth, provider);
    try {
      let firebaseUser: FirebaseUser;
      try {
        ({ user: firebaseUser } = await popup);
      } catch (error) {
        firebaseUser = await recoverAuthenticatedUser(error, rememberMe);
      }
      await persistence;
      clearPendingGoogleLink();
      await finishSignIn(firebaseUser);
      return true;
    } catch (err) {
      if (isPopupCancelledByUser(err)) {
        return false;
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
        const { redirectStorageAvailable } = await persistence;
        // Firebase's redirect resolver always stores a pending marker in
        // sessionStorage, independently of the selected auth persistence. When
        // that store is blocked, redirect cannot complete; fail visibly instead
        // of sending the user through a guaranteed silent return to /login.
        if (!redirectStorageAvailable) {
          throw Object.assign(
            new Error('Google redirect sign-in requires session storage'),
            { code: REDIRECT_STORAGE_UNAVAILABLE_CODE }
          );
        }
        await signInWithRedirect(auth, provider);
        return true;
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
