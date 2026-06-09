import {
  getAuthErrorKey,
  LINK_EMAIL_MISMATCH_CODE,
  NEEDS_PASSWORD_LINK_CODE,
} from '../authErrors';

describe('getAuthErrorKey', () => {
  it('maps known Firebase error codes to their translation keys', () => {
    expect(getAuthErrorKey({ code: 'auth/invalid-email' }, 'fallback')).toBe(
      'authError.invalidEmail'
    );
    expect(getAuthErrorKey({ code: 'auth/email-already-in-use' }, 'fallback')).toBe(
      'authError.emailInUse'
    );
    expect(getAuthErrorKey({ code: 'auth/too-many-requests' }, 'fallback')).toBe(
      'authError.tooManyRequests'
    );
    expect(getAuthErrorKey({ code: 'auth/network-request-failed' }, 'fallback')).toBe(
      'authError.network'
    );
  });

  it('collapses wrong-password / unknown-user / invalid-credential onto one message', () => {
    const key = 'authError.invalidCredentials';
    expect(getAuthErrorKey({ code: 'auth/wrong-password' }, 'fallback')).toBe(key);
    expect(getAuthErrorKey({ code: 'auth/user-not-found' }, 'fallback')).toBe(key);
    expect(getAuthErrorKey({ code: 'auth/invalid-credential' }, 'fallback')).toBe(key);
  });

  it('maps the synthetic needs-password-link code', () => {
    expect(getAuthErrorKey({ code: NEEDS_PASSWORD_LINK_CODE }, 'fallback')).toBe(
      'authError.needsPasswordLink'
    );
  });

  it('maps the synthetic link-email-mismatch code', () => {
    expect(getAuthErrorKey({ code: LINK_EMAIL_MISMATCH_CODE }, 'fallback')).toBe(
      'authError.linkEmailMismatch'
    );
  });

  it('returns the fallback key for unknown or non-Firebase errors', () => {
    expect(getAuthErrorKey({ code: 'auth/something-new' }, 'login.errorFail')).toBe(
      'login.errorFail'
    );
    expect(getAuthErrorKey(new Error('boom'), 'register.errorFail')).toBe('register.errorFail');
    expect(getAuthErrorKey(undefined, 'login.errorFail')).toBe('login.errorFail');
    expect(getAuthErrorKey('a string', 'login.errorFail')).toBe('login.errorFail');
  });
});
