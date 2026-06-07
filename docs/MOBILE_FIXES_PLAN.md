# Mobile Fixes, Logic Errors & Optimization Plan

This document inventories the bugs, logic errors, and optimization
opportunities found in the current `main` line that affect (primarily) the
mobile experience, and lays out a concrete, file-level remediation plan.
Each item lists **symptom → root cause → fix → effort/risk** so the work can
be picked up as a set of small, focused PRs.

Findings are grouped by severity. Items in **Tier 0/1 are genuine logic
bugs** (wrong behavior, not just polish); Tier 2 is mobile UX; Tier 3 is
optimization.

---

## Tier 0 — Logic bugs (wrong behavior today)

### 0.1 Duplicate `SettingsProvider` — dark-mode toggle is a no-op 🔴

- **Symptom:** Toggling the theme (NavBar moon/sun icon, or the mobile
  drawer "Toggle Theme") changes the icon but **the actual MUI palette never
  switches**. Pomodoro state is also effectively duplicated.
- **Root cause:** `SettingsProvider` is mounted **twice**:
  - `src/main.tsx` wraps `ThemedApp` in `<SettingsProvider>`, and
    `ThemedApp` reads `useSettings().theme` to build the MUI theme
    (`getTheme(theme)`).
  - `src/App.tsx` (lines 47/103) wraps the whole app in **another**
    `<SettingsProvider>`.
  - `NavBar`, `Settings`, and `PomodoroTimer` all resolve `useSettings()` to
    the **nearest** (inner, App-level) provider, but the theme is rendered
    from the **outer** (main-level) provider. Toggling updates inner state;
    the renderer reads outer state → no visual change.
  - Side effect: two independent `useUserPreferences()` subscriptions and two
    Pomodoro `setInterval` loops run at once.
- **Fix:** Remove the inner `<SettingsProvider>` from `src/App.tsx` (keep the
  single one in `main.tsx` that wraps `ThemedApp`). One provider; toggling now
  drives the rendered theme.
- **Effort:** ~15 min. **Risk:** low. **Highest value.**

### 0.2 Double `<Toolbar />` spacer — ~128px of dead space under the AppBar 🔴

- **Symptom:** Every page starts with a large empty gap below the top bar;
  on small screens this pushes the first interactive element well below the
  fold.
- **Root cause:** `NavBar` already renders its own spacer `<Toolbar />`
  (`src/components/NavBar.tsx:287`) after the fixed `AppBar`. `Layout` then
  renders **a second** spacer `<Toolbar />` (`src/components/Layout.tsx:45`).
  Two 64px spacers stack.
- **Fix:** Keep exactly one spacer. Recommended: remove the spacer from
  `Layout.tsx:45` and let `NavBar` own its offset (or vice-versa, but only
  one).
- **Effort:** ~10 min. **Risk:** low.

### 0.3 Mobile theme overrides are dead code — iOS zoom-on-focus + small tap targets 🔴

- **Symptom:** On iOS, focusing any text field (login, Fill-in-Blanks, diary,
  import) **zooms the page** because the input font is < 16px. Buttons/inputs
  can fall below the 48px touch-target minimum.
- **Root cause:** `src/theme/mobile-theme.ts` (`getMobileThemeOverrides`)
  defines all the right things — 16px inputs, 48px min button/touch sizes,
  safe-area-aware bottom nav, dialog sizing — but it is **never imported or
  merged** into the active theme. `getTheme()` in `src/theme.ts` ignores it.
  The only other zoom mitigation, `useResponsive()` (which injects an
  `input{font-size:16px}` style tag), is **also never called** (see 1.3).
- **Fix:** Merge the mobile overrides into the theme produced by
  `getTheme()`. Because the overrides are already wrapped in
  `@media (max-width:600px)`, they can be merged unconditionally (deep-merge
  into `components`/`typography`). Note: the `MuiCard` `boxShadow` value uses
  a `(theme) => ...` callback inside `styleOverrides`, which is **not** a
  valid static style — convert it to a concrete value (or an `ownerState`
  callback) during the merge.
- **Effort:** ~1–2 hrs (merge + verify the callback-style fix builds).
  **Risk:** medium (theme shape). High mobile value.

---

## Tier 1 — Mobile layout/structure bugs

### 1.1 Pervasive `100vh` — content cutoff & scroll jump on mobile browsers 🟠

- **Symptom:** On iOS Safari / Android Chrome the dynamic address bar makes
  `100vh` taller than the visible viewport, cutting off the bottom of
  full-height screens and causing jumps when the bar shows/hides.
- **Root cause:** `100vh` (and `calc(100vh - …)`) used in 9 places:
  `Layout.tsx` (38, 69, 111), `Study.tsx` (259, 262, 272), `Home.tsx` (127),
  `Library.tsx` (48), `Settings.tsx` (87), `Worksheets.tsx` (168, 389).
- **Fix:** Switch full-height containers to `100dvh` with a `100vh` fallback
  (e.g. `minHeight: ['100vh', '100dvh']` or a small CSS var helper). For inner
  scroll regions prefer `100%`/flex over viewport math.
- **Effort:** ~1 hr. **Risk:** low.

### 1.2 Nested `<Container>` — doubled gutters / compounded width caps 🟠

- **Symptom:** Extra horizontal padding and inconsistent max-width on mobile;
  content feels cramped and off-center on some pages.
- **Root cause:** `Layout` already wraps `children` in
  `<Container maxWidth="lg">` (`Layout.tsx:57`), yet **every page** mounts its
  own `<Container>` again (Home, Study, Library, Worksheets, Settings, Import,
  Diary, Profile, StudyWorksheet). MUI Containers nest, so paddings add up.
- **Fix:** Pick one ownership model. Recommended: **remove the Container from
  `Layout`** and let each page own its width/padding (least churn, pages
  already set `maxWidth`/`sx`). Alternatively keep Layout's and strip the
  per-page ones. Do one consistently.
- **Effort:** ~1 hr. **Risk:** low-medium (visual regression sweep needed).

### 1.3 `useResponsive` hook is dead code 🟡

- **Root cause:** `src/hooks/useResponsive.ts` is never imported. It contains
  the only active iOS-zoom mitigation (16px input style) and an
  `ios-device` body class for safe-area handling — but it never runs.
- **Fix:** Once 0.3 folds the 16px-input rule into the theme, **delete**
  `useResponsive.ts` (and the redundant `device-detection`/`isMobile`
  duplication if unused elsewhere) to avoid confusion. If safe-area body
  classing is still wanted, mount the hook once in `App`.
- **Effort:** ~20 min. **Risk:** low.

### 1.4 Persistent bottom side-panel crowds the mobile viewport 🟡

- **Symptom:** On phones, the LevelProgress + Pomodoro panel is a
  `position: fixed` bar pinned to the bottom; even collapsed it occupies a
  48px strip, and expanded it covers ~300px and overlaps content. The main
  content compensates with up to `pb: 40` (320px) of padding.
- **Root cause:** `src/components/Layout.tsx` renders the side panel on all
  breakpoints and only changes its geometry; on mobile it competes with the
  content and the OS home indicator.
- **Fix:** On `xs`, move the panel into an on-demand surface (e.g. a
  bottom-sheet/`Drawer` opened from the NavBar, or hide it on mobile and
  surface Level/Pomodoro on the Home/Profile pages). Remove the large
  compensating `pb` once the panel no longer overlays content.
- **Effort:** ~half day. **Risk:** medium (interaction redesign).

---

## Tier 2 — Mobile polish / correctness edge cases

### 2.1 `isMobile.any()` misses iPadOS 13+ (auth redirect) 🟡

- **Root cause:** `src/utils/device-detection.ts` is pure userAgent matching;
  iPadOS 13+ reports as desktop Safari, so `isMobileDevice` is `false`. In
  `AuthContext.signInWithGoogle` that means iPad takes the **popup** path,
  which is the one that's unreliable on iOS.
- **Fix:** Augment detection with a touch/pointer check
  (`navigator.maxTouchPoints > 0 && /Macintosh/` heuristic) **or** rely on the
  already-present popup→redirect fallback (`shouldFallbackToRedirect`) for all
  platforms and drop the hard mobile branch.
- **Effort:** ~30 min. **Risk:** low.

### 2.2 Pomodoro notification audio references a missing asset 🟡

- **Root cause:** `SettingsContext` plays `new Audio('/notification.mp3')` but
  `public/` has no `notification.mp3` (only `404.html`, `favicon.ico`,
  `index.html`, `sat.csv`). The error is swallowed, so the break transition is
  silent.
- **Fix:** Add the asset to `public/`, or replace with the WebAudio API beep /
  remove the call. Consider a vibration fallback (`navigator.vibrate`) on
  mobile where autoplay audio is often blocked anyway.
- **Effort:** ~20 min. **Risk:** low.

---

## Tier 3 — Optimization

### 3.1 `target: "es5"` bloats the bundle ⚡ (biggest perf win)

- **Issue:** `tsconfig.json` compiles to **ES5**. For a React 18 + MUI 6 +
  Firebase + framer-motion app this forces heavy down-leveling/polyfilling and
  inflates the JS payload — paid for on every mobile page load over cellular.
  All supported targets run ES2017+ natively.
- **Fix:** Bump `target` to `ES2020` (or at least `ES2017`) and let Vite/esbuild
  handle final transforms. Verify the build and a smoke test afterward.
- **Effort:** ~30 min + verify. **Risk:** low-medium (broad but mechanical).

### 3.2 Single SettingsProvider also halves background work ⚡

- After 0.1, only one `useUserPreferences` Firestore subscription and one
  Pomodoro interval run instead of two. No extra work — a free win bundled
  with the 0.1 fix.

### 3.3 Throttle resize/orientation handlers 🟢

- `Layout` and `MobileContext` both attach `resize`/`orientationchange`
  listeners that call `setState` on every event. Wrap in
  `requestAnimationFrame`/debounce to cut re-render churn during the address-bar
  show/hide thrash on mobile. **Effort:** ~20 min. Minor.

### 3.4 Remove duplicate/empty theme files 🟢

- `src/theme.ts` (the live `getTheme`) coexists with `src/theme/index.ts`
  (an unused `theme` const) — `./theme` resolution is ambiguous and confusing.
  `src/services/theme/index.ts` is empty. Consolidate to one theme module and
  delete the dead ones. **Effort:** ~20 min.

---

## Suggested execution order (small, reviewable PRs)

1. **PR A — Provider + layout logic fixes (Tier 0):** 0.1 duplicate
   provider, 0.2 double spacer, 0.3 wire up mobile theme overrides. Highest
   value, mostly low-risk. *(0.3 may warrant its own PR if the theme merge is
   fiddly.)*
2. **PR B — Viewport & container hygiene (Tier 1):** 1.1 `100dvh`, 1.2 nested
   Containers, 1.3 remove `useResponsive` dead code.
3. **PR C — Mobile panel redesign (1.4)** — own PR, has UX decisions.
4. **PR D — Edge cases (2.1, 2.2).**
5. **PR E — Optimization (3.1 es5 bump, 3.3 throttle, 3.4 file cleanup);**
   3.2 lands automatically with 0.1.

Each PR should ship with a manual mobile-viewport check (DevTools device
emulation at minimum; a real iOS Safari pass for 0.3/1.1/1.4) and a green
`npm test` / `npm run build`.

---

## Quick reference — files touched

| Item | Primary file(s) |
| --- | --- |
| 0.1 duplicate provider | `src/App.tsx` |
| 0.2 double spacer | `src/components/Layout.tsx`, `src/components/NavBar.tsx` |
| 0.3 mobile theme dead | `src/theme.ts`, `src/theme/mobile-theme.ts` |
| 1.1 `100vh` | `Layout.tsx`, `Study.tsx`, `Home.tsx`, `Library.tsx`, `Settings.tsx`, `Worksheets.tsx` |
| 1.2 nested Container | `src/components/Layout.tsx` + all `src/pages/*.tsx` |
| 1.3 dead hook | `src/hooks/useResponsive.ts` |
| 1.4 mobile panel | `src/components/Layout.tsx` |
| 2.1 iPad detection | `src/utils/device-detection.ts`, `src/context/AuthContext.tsx` |
| 2.2 audio asset | `src/context/SettingsContext.tsx`, `public/` |
| 3.1 es5 target | `tsconfig.json` |
| 3.3 throttle | `src/components/Layout.tsx`, `src/context/MobileContext.tsx` |
| 3.4 theme cleanup | `src/theme/index.ts`, `src/services/theme/index.ts` |
</content>
</invoke>
