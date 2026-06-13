# Auth persistence & the "never block sign-in" contract

"Remember me" maps onto Firebase Auth persistence:

- **checked** → `browserLocalPersistence` (survives a browser restart), backed by `localStorage`
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

So we **probe the backing Web Storage up front** — mirroring Firebase's own
init-time `_isAvailable()` check — and fall back to `inMemoryPersistence` when it
can't be written, before handing anything to `setPersistence`. In-memory needs no
storage and is strictly *more* ephemeral than either choice, so a "session only"
pick is never silently upgraded. Worst case: the session lasts only for the
current page (lost on reload), but the user can actually sign in.

## Known remaining edge cases — deferred (full hardening TODO)

Two narrow cases are **not** yet covered. They were consciously deferred; the
common storage-restricted environments above are already handled.

### 1. Quota: probe passes but the real user-write doesn't

The up-front probe writes a single tiny value. If the store has room for the
probe but not for Firebase's larger serialized user (≈1–4 KB) — e.g.
`localStorage` filled by the reading-mode article cache
(`src/services/articleCache.ts`) — the probe succeeds, then the sign-in write
rejects and `onAuthStateChanged` never fires.

**Planned fix:** wrap the sign-in call; if it rejects but `auth.currentUser` is
set (the credential was accepted, only persistence failed), recover by
`setPersistence(auth, inMemoryPersistence)` and re-running
`updateCurrentUser(auth, auth.currentUser)` so the listeners fire and the user
lands signed in. This works because `directlySetCurrentUser` sets
`auth.currentUser` *before* the failing persistence write. (Safe here because
sign-in only runs while signed out, so a non-null `currentUser` in the catch
unambiguously means "authenticated but not persisted.")

### 2. Google redirect fallback when `sessionStorage` is blocked

When the popup is blocked **and** `sessionStorage` is unavailable, the redirect
fallback still fails: Firebase's redirect resolver independently writes a
`pendingRedirect` marker to `browserSessionPersistence`, which our main
in-memory fallback does not affect. OAuth redirect fundamentally cannot complete
without that store.

**Planned fix:** when the probe shows storage is blocked, don't attempt the
doomed redirect — surface a clear, actionable error ("Google sign-in isn't
available in this browser; try email/password or enable cookies") instead of a
silent failure. Email/password (under in-memory persistence) remains available.

## Testing notes

`src/context/__tests__/AuthContext.test.tsx` covers the probe path (blocked
storage → in-memory, sign-in still proceeds) and the defensive `setPersistence`
backstop. The two deferred cases above will need their own regression tests when
implemented (simulate `auth.currentUser` set + a rejecting user-write; and a
blocked `sessionStorage` with a popup-blocked redirect fallback).
