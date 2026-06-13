#!/usr/bin/env node
/**
 * Grant (or revoke) the `admin: true` custom auth claim that `firestore.rules`
 * uses to identify administrators.
 *
 * Custom claims are the Firebase-recommended way to model admin access: the flag
 * lives on the user's ID token (verified server-side), never in a
 * client-writable document, so a user can't escalate their own privileges.
 *
 * Usage:
 *   # one-off local install of the Admin SDK (it is intentionally not saved)
 *   npm i --no-save firebase-admin
 *
 *   # point at a service-account key for the project (Project settings →
 *   # Service accounts → Generate new private key)
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *
 *   node scripts/set-admin-claim.mjs <email-or-uid> [--revoke]
 *
 * The change takes effect once the target user's ID token refreshes — on their
 * next sign-in, or within ~1 hour. Have them sign out and back in to apply it
 * immediately.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [, , identifier, ...flags] = process.argv;
const revoke = flags.includes('--revoke');

if (!identifier) {
  console.error('Usage: node scripts/set-admin-claim.mjs <email-or-uid> [--revoke]');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();

const lookup = identifier.includes('@')
  ? auth.getUserByEmail(identifier)
  : auth.getUser(identifier);

lookup
  .then(async (user) => {
    // Preserve any other claims already on the account; only flip `admin`.
    const claims = { ...(user.customClaims ?? {}) };
    if (revoke) {
      delete claims.admin;
    } else {
      claims.admin = true;
    }
    await auth.setCustomUserClaims(user.uid, claims);
    console.log(
      `${revoke ? 'Revoked' : 'Granted'} admin for ${user.email ?? user.uid} (uid ${user.uid}).`
    );
    console.log('Effective after their ID token refreshes (re-login or ~1h).');
  })
  .catch((err) => {
    console.error('Failed to update admin claim:', err.message ?? err);
    process.exit(1);
  });
