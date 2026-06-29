# Auth Persistence and the "Never Block Sign-In" Contract

"Remember me" maps onto Firebase Auth persistence:

- **checked** -> `indexedDBLocalPersistence` (survives a browser restart)
- **unchecked** -> `browserSessionPersistence` (cleared with the tab), backed by `sessionStorage`

The persistence choice is a convenience preference. It must never be able to
block authentication itself. See `src/context/AuthContext.tsx`
(`applyPersistence`).

## Regression Guarded By This Design

The original remember-me work called `setPersistence(...)` before every sign-in
and treated a failure as fatal: the email flow threw before signing in, and the
Google flow signed the user back out. In storage-restricted environments such as
private windows, in-app webviews, disabled cookies, or full/blocked browser
storage, the chosen store can be unavailable even though the credentials are
valid.

The product rule is simple: storage durability can degrade, but sign-in should
still proceed whenever Firebase accepts the credential.

## Current Fix

`setPersistence` does not reliably surface a blocked store while signed out.
With no current user to migrate, Firebase may switch the active store and resolve
without probing or writing. The failure can land later, when sign-in writes the
authenticated user. If that write rejects, `onAuthStateChanged` may never fire.

To avoid that trap, every candidate store is probed before selection. For
"remember me", the ladder is:

```text
IndexedDB -> localStorage -> in-memory
```

For session-only sign-in, the ladder is:

```text
sessionStorage -> in-memory
```

Durable sessions prefer IndexedDB, Firebase's preferred browser backend, instead
of forcing localStorage. The fallback only gets less durable; it never silently
upgrades a session-only request into a durable browser session.

Probing IndexedDB before selecting it also prevents a deeper wedge. Once a
broken IndexedDB is the active store, `setPersistence` can fail while trying to
read and remove the user from that active store before swapping backends. The
probe opens a throwaway database and runs a trivial write, bounded by a timeout
for privacy modes that hang.

## Full Hardening

### Quota: probe passes but the real user write fails

Even an available persistence backend can reject Firebase's larger serialized
user write because of quota or a browser storage failure. When that happens, the
sign-in wrappers recover by re-homing the authenticated user through
`setPersistence(...)` and `updateCurrentUser(auth, auth.currentUser)`.

This is safe here because sign-in only runs while signed out. A non-null
`auth.currentUser` in the catch means the credential was accepted, but the
session was not persisted or announced to listeners.

Recovery walks the durability ladder rather than dropping straight to memory. A
"remember me" sign-in whose IndexedDB write failed tries `browserLocalPersistence`
when localStorage is still writable, then falls to `inMemoryPersistence`. A
session-only sign-in skips the durable tier entirely.

### Google redirect fallback when sessionStorage is blocked

When the popup is blocked and `sessionStorage` is unavailable, Firebase's OAuth
redirect resolver cannot complete because it independently writes a
`pendingRedirect` marker to `browserSessionPersistence`. The app therefore does
not attempt a doomed redirect when the probe shows session storage is blocked.
It surfaces a clear error instead. Email/password sign-in under in-memory
persistence remains available.

## Testing Notes

`src/context/__tests__/AuthContext.test.tsx` covers blocked-storage fallback,
successful sign-in under in-memory persistence, recovery after real user-write
failure, synchronous local auth state updates, cancellation, and the blocked
`sessionStorage` redirect guard.
