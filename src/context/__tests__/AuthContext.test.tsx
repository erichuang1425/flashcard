/**
 * @jest-environment jsdom
 *
 * Tests for `AuthContext`, which wraps the Firebase Auth SDK. The SDK, the
 * firebase service module, the user-profile service and the mobile context are
 * mocked so the provider's own behaviour is exercised: mapping the Firebase user
 * onto the app `User`, the loading lifecycle, the email flows, "remember me"
 * persistence, ensuring a profile on every sign-in, the Google sign-in popup →
 * redirect fallback (which leans on the already-tested `authFallback` helpers),
 * and linking Google onto an existing password account.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

jest.mock('../../services/firebase', () => ({ auth: { __auth: true } }));

const mockOnAuthStateChanged = jest.fn();
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockSignInWithRedirect = jest.fn();
const mockGetRedirectResult = jest.fn();
const mockSetPersistence = jest.fn();
const mockLinkWithCredential = jest.fn();
const mockCredentialFromError = jest.fn();
const mockOAuthCredentialFromJSON = jest.fn();
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockSignUp(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
  getRedirectResult: (...args: unknown[]) => mockGetRedirectResult(...args),
  setPersistence: (...args: unknown[]) => mockSetPersistence(...args),
  linkWithCredential: (...args: unknown[]) => mockLinkWithCredential(...args),
  browserLocalPersistence: { __persistence: 'LOCAL' },
  browserSessionPersistence: { __persistence: 'SESSION' },
  inMemoryPersistence: { __persistence: 'MEMORY' },
  GoogleAuthProvider: class {
    static credentialFromError(...args: unknown[]): unknown {
      return mockCredentialFromError(...args);
    }
  },
  OAuthCredential: class {
    static fromJSON(...args: unknown[]): unknown {
      return mockOAuthCredentialFromJSON(...args);
    }
  },
}));

const mockEnsureUserProfile = jest.fn();
jest.mock('../../services/user', () => ({
  ensureUserProfile: (...args: unknown[]) => mockEnsureUserProfile(...args),
}));

let mockIsMobileDevice = false;
jest.mock('../MobileContext', () => ({
  useMobile: () => ({ isMobileDevice: mockIsMobileDevice }),
}));

import { AuthProvider, useAuth } from '../AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);
const renderAuth = () => renderHook(() => useAuth(), { wrapper });

// The latest callback handed to onAuthStateChanged, so tests can drive auth
// state transitions the way the SDK would.
const emitAuthState = (firebaseUser: unknown) => {
  const cb = mockOnAuthStateChanged.mock.calls.at(-1)![1] as (u: unknown) => void;
  act(() => cb(firebaseUser));
};

// A Firebase UserCredential as the SDK returns it from the sign-in calls.
const credential = () => ({
  user: { uid: 'u1', email: 'a@b.com', displayName: 'Mina', photoURL: null, providerData: [] },
});

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  mockIsMobileDevice = false;
  mockGetRedirectResult.mockResolvedValue(null);
  mockOnAuthStateChanged.mockReturnValue(() => {}); // unsubscribe fn
  mockSetPersistence.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
  mockSignInWithRedirect.mockResolvedValue(undefined);
  mockLinkWithCredential.mockResolvedValue(undefined);
  mockEnsureUserProfile.mockResolvedValue(undefined);
  mockCredentialFromError.mockReturnValue({ __googleCred: true });
  mockOAuthCredentialFromJSON.mockReturnValue(null);
  mockSignIn.mockResolvedValue(credential());
  mockSignUp.mockResolvedValue(credential());
  mockSignInWithPopup.mockResolvedValue(credential());
});

describe('auth state', () => {
  it('starts in a loading state and subscribes to auth changes', () => {
    const { result } = renderAuth();
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  it('maps the Firebase user onto the app user and clears loading', () => {
    const { result } = renderAuth();

    emitAuthState({ uid: 'u1', email: 'a@b.com', displayName: 'Mina' });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual({ uid: 'u1', email: 'a@b.com', displayName: 'Mina' });
  });

  it('maps the photo URL when present', () => {
    const { result } = renderAuth();
    emitAuthState({ uid: 'u1', email: 'a@b.com', displayName: 'Mina', photoURL: 'http://x/p.png' });
    expect(result.current.user).toEqual({
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'Mina',
      photoURL: 'http://x/p.png',
    });
  });

  it('represents a missing display name as undefined', () => {
    const { result } = renderAuth();
    emitAuthState({ uid: 'u1', email: 'a@b.com', displayName: null });
    expect(result.current.user).toEqual({ uid: 'u1', email: 'a@b.com', displayName: undefined });
  });

  it('clears the user on sign-out events', () => {
    const { result } = renderAuth();
    emitAuthState({ uid: 'u1', email: 'a@b.com', displayName: 'Mina' });
    emitAuthState(null);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes from the auth listener on unmount', () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(unsubscribe);
    const { unmount } = renderAuth();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('stamps the profile when a redirect sign-in resolves to a user', async () => {
    mockGetRedirectResult.mockResolvedValueOnce(credential());
    renderAuth();
    // Let the getRedirectResult promise (and its .then) settle.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockEnsureUserProfile).toHaveBeenCalledTimes(1);
  });
});

describe('email/password flows', () => {
  it('signIn delegates to signInWithEmailAndPassword', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'pw');
    });
    expect(mockSignIn).toHaveBeenCalledWith({ __auth: true }, 'a@b.com', 'pw');
  });

  it('ensures a profile after an email sign-in', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'pw');
    });
    expect(mockEnsureUserProfile).toHaveBeenCalledTimes(1);
  });

  it('signUp delegates to createUserWithEmailAndPassword and ensures a profile', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signUp('a@b.com', 'pw');
    });
    expect(mockSignUp).toHaveBeenCalledWith({ __auth: true }, 'a@b.com', 'pw');
    expect(mockEnsureUserProfile).toHaveBeenCalledTimes(1);
  });

  it('signOut calls the SDK and clears the local user', async () => {
    const { result } = renderAuth();
    emitAuthState({ uid: 'u1', email: 'a@b.com', displayName: 'Mina' });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });
});

describe('remember me persistence', () => {
  it('uses local persistence when remember-me is on (the default)', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'pw');
    });
    expect(mockSetPersistence).toHaveBeenLastCalledWith({ __auth: true }, { __persistence: 'LOCAL' });
  });

  it('uses session persistence when remember-me is off', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'pw', false);
    });
    expect(mockSetPersistence).toHaveBeenLastCalledWith({ __auth: true }, { __persistence: 'SESSION' });
  });

  it('applies persistence before a Google sign-in too', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signInWithGoogle(false);
    });
    expect(mockSetPersistence).toHaveBeenLastCalledWith({ __auth: true }, { __persistence: 'SESSION' });
  });

  it('selects in-memory persistence up front when web storage is unavailable', async () => {
    // Firebase's setPersistence resolves without probing the store while signed
    // out, so a blocked store would only fail later on the user-write and reject
    // sign-in. We probe up front: a failing probe must route straight to memory
    // and never hand the blocked store to setPersistence at all. Simulate the
    // "cookies disabled" case, where touching window.localStorage throws.
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage blocked');
      },
    });
    try {
      const { result } = renderAuth();

      await act(async () => {
        await result.current.signIn('a@b.com', 'pw'); // remember-me defaults to local
      });

      expect(mockSetPersistence).toHaveBeenCalledTimes(1);
      expect(mockSetPersistence).toHaveBeenCalledWith({ __auth: true }, { __persistence: 'MEMORY' });
      expect(mockSignIn).toHaveBeenCalledTimes(1); // sign-in still proceeds
    } finally {
      if (original) {
        Object.defineProperty(window, 'localStorage', original);
      } else {
        delete (window as unknown as { localStorage?: Storage }).localStorage;
      }
    }
  });
});

describe('signInWithGoogle', () => {
  it('uses the popup on mobile too, never the (storage-partitioned) redirect', async () => {
    mockIsMobileDevice = true;
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
  });

  it('opens the popup synchronously, without first awaiting persistence', async () => {
    // setPersistence stays pending: a strict mobile browser blocks a popup that
    // is opened after the gesture's call stack unwinds, so the popup must be
    // opened before we await persistence. Asserting the popup is requested while
    // persistence is still unresolved guards that ordering.
    let releasePersistence: () => void = () => {};
    mockSetPersistence.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releasePersistence = () => resolve();
      })
    );
    const { result } = renderAuth();

    let settled = false;
    await act(async () => {
      void result.current.signInWithGoogle().then(() => {
        settled = true;
      });
      await Promise.resolve();
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false); // still parked on the pending persistence

    await act(async () => {
      releasePersistence();
      await Promise.resolve();
    });
    expect(mockEnsureUserProfile).toHaveBeenCalledTimes(1);
  });

  it('falls back to in-memory persistence and still signs in when the chosen persistence cannot be applied', async () => {
    // A blocked web-storage environment (private mode, in-app webview) makes
    // setPersistence reject. That must never lock the user out: fall back to
    // in-memory persistence — strictly more ephemeral than the "session only"
    // they chose — and complete the sign-in rather than signing them back out.
    mockSetPersistence.mockRejectedValueOnce(new Error('storage access blocked'));
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle(false);
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockSetPersistence).toHaveBeenLastCalledWith({ __auth: true }, { __persistence: 'MEMORY' });
    expect(mockEnsureUserProfile).toHaveBeenCalledTimes(1);
  });

  it('uses the popup on desktop and ensures a profile', async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
    expect(mockEnsureUserProfile).toHaveBeenCalledTimes(1);
  });

  it('treats a user-cancelled popup as a benign no-op', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
    expect(mockEnsureUserProfile).not.toHaveBeenCalled();
  });

  it('falls back to redirect when the popup is blocked', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('treats a superseded popup request as a no-op, never a redirect', async () => {
    // A double-tap cancels the first popup with auth/cancelled-popup-request; the
    // second popup is still live, so the first call must stand down quietly
    // rather than launch the storage-partitioned redirect over the top of it.
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/cancelled-popup-request' });
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
    expect(mockEnsureUserProfile).not.toHaveBeenCalled();
  });

  it('still redirects under in-memory persistence when the chosen persistence cannot be applied', async () => {
    // The popup is blocked *and* storage is unavailable. Persistence degrades to
    // in-memory rather than aborting, so the redirect fallback still proceeds.
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    mockSetPersistence.mockRejectedValueOnce(new Error('storage access blocked'));
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle(false);
    });

    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1);
    expect(mockSetPersistence).toHaveBeenLastCalledWith({ __auth: true }, { __persistence: 'MEMORY' });
  });

  it('rethrows popup errors that are neither a cancel nor a fallback case', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toMatchObject({
        code: 'auth/network-request-failed',
      });
    });
    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
  });
});

describe('account linking', () => {
  it('asks for a password and links Google onto an existing password account', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'a@b.com' },
    });
    const pendingCred = { __googleCred: true };
    mockCredentialFromError.mockReturnValueOnce(pendingCred);

    const { result } = renderAuth();

    // The Google attempt surfaces a tagged error instead of failing outright.
    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toMatchObject({
        code: 'auth/needs-password-link',
        email: 'a@b.com',
      });
    });
    expect(mockSignInWithRedirect).not.toHaveBeenCalled();

    // The follow-up password sign-in links the stored Google credential.
    await act(async () => {
      await result.current.signIn('a@b.com', 'pw');
    });
    expect(mockLinkWithCredential).toHaveBeenCalledTimes(1);
    expect(mockLinkWithCredential).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1' }),
      pendingCred,
    );
  });

  it('does not link anything on a normal sign-in', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'pw');
    });
    expect(mockLinkWithCredential).not.toHaveBeenCalled();
  });

  it('refuses to attach a pending Google credential to a different email account', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'a@b.com' },
    });

    const { result } = renderAuth();
    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toMatchObject({
        code: 'auth/needs-password-link',
      });
    });

    await act(async () => {
      await expect(result.current.signIn('other@example.com', 'pw')).rejects.toMatchObject({
        code: 'auth/link-email-mismatch',
      });
    });

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockLinkWithCredential).not.toHaveBeenCalled();
    expect(result.current.pendingLinkEmail).toBe('a@b.com');
  });

  it('does not retain a Google credential when Firebase omits the account email', async () => {
    const conflict = {
      code: 'auth/account-exists-with-different-credential',
      customData: {},
    };
    mockSignInWithPopup.mockRejectedValueOnce(conflict);

    const { result } = renderAuth();
    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toBe(conflict);
    });

    expect(result.current.pendingLinkEmail).toBeNull();
    expect(window.sessionStorage.getItem('flashcards.auth.pending-google-link.v1')).toBeNull();
  });

  it('restores a redirect conflict and links it after the provider remounts', async () => {
    const serializedCredential = { providerId: 'google.com', idToken: 'token' };
    const redirectCredential = {
      __googleCred: 'redirect',
      toJSON: () => serializedCredential,
    };
    mockGetRedirectResult.mockRejectedValueOnce({
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'redirect@example.com' },
    });
    mockCredentialFromError.mockReturnValueOnce(redirectCredential);

    const firstMount = renderAuth();
    await act(async () => {
      await Promise.resolve();
    });

    expect(firstMount.result.current.pendingLinkEmail).toBe('redirect@example.com');
    firstMount.unmount();

    const restoredCredential = { __googleCred: 'restored' };
    mockOAuthCredentialFromJSON.mockReturnValueOnce(restoredCredential);
    const secondMount = renderAuth();

    expect(secondMount.result.current.pendingLinkEmail).toBe('redirect@example.com');
    await act(async () => {
      await secondMount.result.current.signIn('redirect@example.com', 'pw');
    });
    expect(mockOAuthCredentialFromJSON).toHaveBeenCalledWith(serializedCredential);
    expect(mockLinkWithCredential).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1' }),
      restoredCredential,
    );
    expect(secondMount.result.current.pendingLinkEmail).toBeNull();
  });

  it('reports a failed link and keeps it pending for another attempt', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'a@b.com' },
    });
    const pendingCred = { __googleCred: true };
    mockCredentialFromError.mockReturnValueOnce(pendingCred);
    mockLinkWithCredential.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });

    const { result } = renderAuth();
    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toMatchObject({
        code: 'auth/needs-password-link',
      });
    });

    await act(async () => {
      await expect(result.current.signIn('a@b.com', 'pw')).rejects.toMatchObject({
        code: 'auth/credential-already-in-use',
      });
    });

    expect(result.current.pendingLinkEmail).toBe('a@b.com');
  });

  it('clears restored link state after a later successful Google sign-in', async () => {
    window.sessionStorage.setItem(
      'flashcards.auth.pending-google-link.v1',
      JSON.stringify({
        email: 'old@example.com',
        credential: { providerId: 'google.com', idToken: 'old-token' },
      })
    );
    mockOAuthCredentialFromJSON.mockReturnValueOnce({ __googleCred: 'old' });

    const { result } = renderAuth();
    expect(result.current.pendingLinkEmail).toBe('old@example.com');

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.pendingLinkEmail).toBeNull();
    expect(window.sessionStorage.getItem('flashcards.auth.pending-google-link.v1')).toBeNull();
  });
});

it('throws when useAuth is used outside an AuthProvider', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/);
  errorSpy.mockRestore();
});
