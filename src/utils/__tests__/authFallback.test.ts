import {
  shouldFallbackToRedirect,
  isPopupCancelledByUser,
  isAccountExistsWithDifferentCredential,
} from '../authFallback';

describe('shouldFallbackToRedirect', () => {
  it('returns true when the popup is blocked', () => {
    expect(shouldFallbackToRedirect({ code: 'auth/popup-blocked' })).toBe(true);
  });

  it('returns true when popups are unsupported in the environment', () => {
    expect(
      shouldFallbackToRedirect({
        code: 'auth/operation-not-supported-in-this-environment',
      })
    ).toBe(true);
  });

  it('returns true when a popup request is cancelled by a newer request', () => {
    expect(
      shouldFallbackToRedirect({ code: 'auth/cancelled-popup-request' })
    ).toBe(true);
  });

  it('returns false when the user closed the popup', () => {
    expect(
      shouldFallbackToRedirect({ code: 'auth/popup-closed-by-user' })
    ).toBe(false);
  });

  it('returns false for unrelated errors', () => {
    expect(shouldFallbackToRedirect({ code: 'auth/network-request-failed' })).toBe(
      false
    );
  });

  it('returns false for non-error values', () => {
    expect(shouldFallbackToRedirect(undefined)).toBe(false);
    expect(shouldFallbackToRedirect(null)).toBe(false);
    expect(shouldFallbackToRedirect('auth/popup-blocked')).toBe(false);
    expect(shouldFallbackToRedirect({})).toBe(false);
  });
});

describe('isPopupCancelledByUser', () => {
  it('returns true when the user closed the popup', () => {
    expect(isPopupCancelledByUser({ code: 'auth/popup-closed-by-user' })).toBe(
      true
    );
  });

  it('returns true when the user cancelled sign-in', () => {
    expect(isPopupCancelledByUser({ code: 'auth/user-cancelled' })).toBe(true);
  });

  it('returns false when the popup was blocked', () => {
    expect(isPopupCancelledByUser({ code: 'auth/popup-blocked' })).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isPopupCancelledByUser(undefined)).toBe(false);
    expect(isPopupCancelledByUser({})).toBe(false);
  });
});

describe('isAccountExistsWithDifferentCredential', () => {
  it('returns true for the account-exists error code', () => {
    expect(
      isAccountExistsWithDifferentCredential({
        code: 'auth/account-exists-with-different-credential',
      })
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isAccountExistsWithDifferentCredential({ code: 'auth/popup-blocked' })).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isAccountExistsWithDifferentCredential(undefined)).toBe(false);
    expect(isAccountExistsWithDifferentCredential(null)).toBe(false);
    expect(isAccountExistsWithDifferentCredential({})).toBe(false);
  });
});
