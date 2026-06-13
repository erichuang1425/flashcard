# Auth persistence & the "never block sign-in" contract

"Remember me" maps onto Firebase Auth persistence:

- **checked** → `indexedDBLocalPersistence` (survives a browser restart)
- **unchecked** → `browserSessionPersistence` (cleared with the tab), backed by `sessionStorage`

The persistence choice is a *convenience preference*. It must **never** be able to
block authentication itself. See `src/context/AuthContext.tsx` (`applyPersistence`).

## The regression this guards against

The original "remember me" work called `setPersistence(...)` before every sign-in
and treated a failure as fatal — the email flow threw before signing in, and the
Google flow signed the user back out. In storage-restricted environments
(private/incognito, in-app webviews like Instagram/Facebook/iOS, disabled
cookies) the chosen store can't be written, so users could authenticate but were
immediately bounced back to `/login` with a null session. Both methods, every
time, exactly as reported.

## Current fix (shipped)

`setPersistence` does **not** surface a blocked store while signed out: with no
current user to migrate, `PersistenceUserManager.setPersistence` just switches
the active store and resolves *without* probing it or writing. The failure would
otherwise only land later, when sign-in writes the authenticated user (and that
write rejecting also skips `notifyAuthListeners`, so `onAuthStateChanged` never
fires).

Durable remember-me sessions use IndexedDB, matching Firebase's preferred
browser persistence instead of forcing localStorage. Session-only persistence is
probed up front and falls back to `inMemoryPersistence` when sessionStorage is
blocked. If the real authenticated-user write still rejects, email sign-in is
retried once under memory persistence. In-memory needs no storage and is
strictly more ephemeral than either choice. Worst case, the session lasts only
for the current page, but the user can actually sign in.

## Full hardening

### Quota: probe passes but the real user-write doesn't

Even an available persistence backend can reject Firebase's larger serialized
user write because of an origin quota or a browser/storage failure. When that
happens, `onAuthStateChanged` may never fire.

The sign-in calls are wrapped so that, if one rejects but `auth.currentUser` is
set (the credential was accepted, only persistence failed), they recover by
re-homing that user via `setPersistence(...)` + `updateCurrentUser(auth,
auth.currentUser)` so the listeners fire and the user lands signed in. This works
because `directlySetCurrentUser` sets `auth.currentUser` *before* the failing
persistence write. (Safe here because sign-in only runs while signed out, so a
non-null `currentUser` in the catch unambiguously means "authenticated but not
persisted.")

Recovery walks a **durability ladder** rather than dropping straight to memory: a
"remember me" sign-in whose IndexedDB write failed is re-homed in
`browserLocalPersistence` when `localStorage` is still writable (so the session
survives a restart), and only falls to `inMemoryPersistence` if that store
rejects the write too. A session-only ("remember me" unchecked) sign-in skips the
durable tier entirely, so the preference is never silently upgraded. Each tier is
strictly more ephemeral than the last; the worst case is an in-memory session
that lasts the current page but lets the user actually sign in.

### Google redirect fallback when `sessionStorage` is blocked

When the popup is blocked **and** `sessionStorage` is unavailable, the redirect
fallback still fails: Firebase's redirect resolver independently writes a
`pendingRedirect` marker to `browserSessionPersistence`, which our main
in-memory fallback does not affect. OAuth redirect fundamentally cannot complete
without that store.

When the probe shows storage is blocked, the app does not attempt the doomed
redirect. It surfaces a clear, actionable error instead of a silent failure.
Email/password (under in-memory persistence) remains available.

## Testing notes

`src/context/__tests__/AuthContext.test.tsx` covers the probe path (blocked
storage → in-memory, sign-in still proceeds), recovery after the real user write
fails, synchronous local auth state updates, cancellation, and the blocked
`sessionStorage` redirect guard.
