/**
 * Translates Firebase `auth/*` error codes into the app's translation keys so
 * the login and register screens can show a friendly, localised message instead
 * of a raw SDK error string. Anything we don't recognise falls back to a generic
 * key chosen by the caller — sign-in and sign-up want different wording.
 */

/**
 * Synthetic code (not emitted by Firebase) used to signal that a Google sign-in
 * stalled because the email already has a password account. The user must
 * re-authenticate with that password before the two are linked into one
 * account; the login screen turns this into a guided prompt rather than an
 * error dead-end.
 */
export const NEEDS_PASSWORD_LINK_CODE = 'auth/needs-password-link';

const extractCode = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
};

// Maps a Firebase error code to a translation key. Codes that mean the same
// thing to a user (wrong password vs. unknown user vs. malformed credential)
// intentionally collapse onto one message so we never reveal whether an email
// is registered.
const CODE_TO_KEY: Record<string, string> = {
  'auth/invalid-email': 'authError.invalidEmail',
  'auth/user-disabled': 'authError.userDisabled',
  'auth/user-not-found': 'authError.invalidCredentials',
  'auth/wrong-password': 'authError.invalidCredentials',
  'auth/invalid-credential': 'authError.invalidCredentials',
  'auth/invalid-login-credentials': 'authError.invalidCredentials',
  'auth/too-many-requests': 'authError.tooManyRequests',
  'auth/network-request-failed': 'authError.network',
  'auth/email-already-in-use': 'authError.emailInUse',
  'auth/weak-password': 'authError.weakPassword',
  'auth/popup-blocked': 'authError.popupBlocked',
  [NEEDS_PASSWORD_LINK_CODE]: 'authError.needsPasswordLink',
};

/**
 * Resolves the translation key for an auth error. `fallbackKey` is returned for
 * unknown or non-Firebase errors (e.g. `'login.errorFail'` or
 * `'register.errorFail'`).
 */
export const getAuthErrorKey = (error: unknown, fallbackKey: string): string => {
  const code = extractCode(error);
  return (code && CODE_TO_KEY[code]) || fallbackKey;
};
