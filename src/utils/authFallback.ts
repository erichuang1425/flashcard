/**
 * Helpers for deciding how to react to Firebase Google sign-in errors.
 *
 * Popup-based sign-in is the preferred desktop flow, but it fails in several
 * environments (popup blockers, embedded webviews, some mobile browsers). These
 * helpers classify the Firebase `auth/*` error codes so the sign-in flow can
 * fall back to a full-page redirect or treat a user-initiated cancel as a no-op.
 */

/** Error codes that mean the popup never opened — fall back to redirect. */
export const POPUP_FALLBACK_ERROR_CODES = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
] as const;

/**
 * Error codes that mean this popup attempt should quietly stand down with no
 * error surfaced. `popup-closed-by-user` / `user-cancelled` are deliberate
 * dismissals. `cancelled-popup-request` is raised on the *earlier* of two
 * overlapping sign-in attempts (e.g. a double-tap): the newer request is still
 * in flight and will resolve sign-in, so the superseded one must be a no-op —
 * never a redirect, or it would clobber the live popup with the
 * storage-partitioned redirect flow we avoid.
 */
export const POPUP_CANCELLED_ERROR_CODES = [
  'auth/popup-closed-by-user',
  'auth/user-cancelled',
  'auth/cancelled-popup-request',
] as const;

/**
 * Code Firebase raises when the chosen provider's email already belongs to an
 * account created with a *different* provider (e.g. signing in with Google for
 * an email first registered with a password). The two identities can be merged
 * into a single account once the user re-authenticates with the original
 * method — see the account-linking flow in `AuthContext`.
 */
export const ACCOUNT_EXISTS_ERROR_CODE = 'auth/account-exists-with-different-credential';

const extractCode = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
};

/** True when a popup sign-in failure should retry via `signInWithRedirect`. */
export const shouldFallbackToRedirect = (error: unknown): boolean => {
  const code = extractCode(error);
  return code !== undefined && (POPUP_FALLBACK_ERROR_CODES as readonly string[]).includes(code);
};

/**
 * True when this popup attempt was cancelled benignly — the user dismissed it,
 * or a newer overlapping request superseded it. Either way it resolves to a
 * no-op rather than a redirect fallback.
 */
export const isPopupCancelledByUser = (error: unknown): boolean => {
  const code = extractCode(error);
  return code !== undefined && (POPUP_CANCELLED_ERROR_CODES as readonly string[]).includes(code);
};

/**
 * True when a Google sign-in failed only because the email already belongs to
 * an account created with another method. This is recoverable: the sign-in flow
 * can link Google onto that existing account instead of surfacing an error.
 */
export const isAccountExistsWithDifferentCredential = (error: unknown): boolean =>
  extractCode(error) === ACCOUNT_EXISTS_ERROR_CODE;
