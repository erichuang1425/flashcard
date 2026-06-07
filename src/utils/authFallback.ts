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
  'auth/cancelled-popup-request',
] as const;

/** Error codes that mean the user intentionally dismissed the popup. */
export const POPUP_CANCELLED_ERROR_CODES = [
  'auth/popup-closed-by-user',
  'auth/user-cancelled',
] as const;

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

/** True when the user closed/cancelled the popup themselves (benign). */
export const isPopupCancelledByUser = (error: unknown): boolean => {
  const code = extractCode(error);
  return code !== undefined && (POPUP_CANCELLED_ERROR_CODES as readonly string[]).includes(code);
};
