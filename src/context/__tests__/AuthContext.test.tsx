/**
 * @jest-environment jsdom
 *
 * Tests for `AuthContext`, which wraps the Firebase Auth SDK. The SDK, the
 * firebase service module and the mobile context are mocked so the provider's
 * own behaviour is exercised: mapping the Firebase user onto the app `User`,
 * the loading lifecycle, the email flows, and the Google sign-in popup →
 * redirect fallback (which leans on the already-tested `authFallback` helpers).
 */
import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('../../services/firebase', () => ({ auth: { __auth: true } }));

const mockOnAuthStateChanged = jest.fn();
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockSignInWithRedirect = jest.fn();
const mockGetRedirectResult = jest.fn();
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockSignUp(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
  getRedirectResult: (...args: unknown[]) => mockGetRedirectResult(...args),
  GoogleAuthProvider: class {},
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

beforeEach(() => {
  jest.clearAllMocks();
  mockIsMobileDevice = false;
  mockGetRedirectResult.mockResolvedValue(null);
  mockOnAuthStateChanged.mockReturnValue(() => {}); // unsubscribe fn
  [mockSignIn, mockSignUp, mockSignOut, mockSignInWithPopup, mockSignInWithRedirect].forEach(
    (m) => m.mockResolvedValue(undefined),
  );
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
});

describe('email/password flows', () => {
  it('signIn delegates to signInWithEmailAndPassword', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'pw');
    });
    expect(mockSignIn).toHaveBeenCalledWith({ __auth: true }, 'a@b.com', 'pw');
  });

  it('signUp delegates to createUserWithEmailAndPassword', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signUp('a@b.com', 'pw');
    });
    expect(mockSignUp).toHaveBeenCalledWith({ __auth: true }, 'a@b.com', 'pw');
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

describe('signInWithGoogle', () => {
  it('goes straight to redirect on mobile', async () => {
    mockIsMobileDevice = true;
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1);
    expect(mockSignInWithPopup).not.toHaveBeenCalled();
  });

  it('uses the popup on desktop', async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
  });

  it('treats a user-cancelled popup as a benign no-op', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
  });

  it('falls back to redirect when the popup is blocked', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1);
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

it('throws when useAuth is used outside an AuthProvider', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/);
  errorSpy.mockRestore();
});
