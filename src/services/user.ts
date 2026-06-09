/**
 * User profile persistence.
 *
 * A user's *first* sign-in — whether by email/password or by Google — is treated
 * as a registration: it writes their profile document. Subsequent sign-ins only
 * refresh the lightweight, mutable fields (display name, photo, linked providers,
 * last-login time) and never clobber `createdAt`.
 *
 * Profile writes are best-effort. A transient failure here must never block a
 * user from entering the app, so callers invoke this from auth flows and ignore
 * rejections (the profile self-heals on the next sign-in).
 */
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Location of a user's profile. We store it as a doc inside the user's own
 * subtree (`users/{uid}/profile/info`) rather than the bare `users/{uid}`
 * document so it is covered by the existing owner-scoped security rules that
 * already guard everything under `users/{uid}/**`.
 */
const profileRef = (uid: string) => doc(db, 'users', uid, 'profile', 'info');

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** Provider ids linked to this account, e.g. `['password', 'google.com']`. */
  providers: string[];
}

/**
 * Create the profile document on first sign-in, or refresh it on return.
 * Resolves once the write completes; rejects only if Firestore does, which the
 * caller is expected to swallow.
 */
export const ensureUserProfile = async (firebaseUser: FirebaseUser): Promise<void> => {
  const ref = profileRef(firebaseUser.uid);
  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? null,
    displayName: firebaseUser.displayName ?? null,
    photoURL: firebaseUser.photoURL ?? null,
    providers: firebaseUser.providerData.map((p) => p.providerId),
  };

  const snap = await getDoc(ref);
  if (snap.exists()) {
    // Returning user: refresh mutable fields, but keep the original createdAt.
    await setDoc(ref, { ...profile, lastLoginAt: serverTimestamp() }, { merge: true });
  } else {
    // First sign-in is a registration — stamp createdAt once.
    await setDoc(ref, {
      ...profile,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  }
};
