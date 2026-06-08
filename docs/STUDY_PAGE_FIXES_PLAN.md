# Study Page — Deep-Diagnosis Scan & Fixes Plan

A focused pass over the **Study page and every component/function it touches**
(`pages/Study.tsx`, `FlashCard`, `StudyProgress`, `StudyModeSelector`, and the
four study modes — `MultipleChoice`, `FillInBlanks`, `MatchingGame`,
`FillInPuzzle`), plus the shell it renders inside (`Layout`, `NavBar`) and the
`viewport` / `safe-area` helpers.

The earlier app-wide plans — `LAYOUT_FIXES_PLAN.md` and
`IOS_MOBILE_FIXES_PLAN.md` — already shipped on this line (single
`SettingsProvider`, one `<Toolbar />` spacer, `100dvh` migration + `dvh`
fallback helpers, safe-area insets for fixed chrome, iOS speech/audio
unlocks, gradient-text fallback). The findings below are the **new,
Study-specific** regressions/inconsistencies those passes left behind —
several were explicitly flagged-but-deferred in the layout plan's closing note.

Each item: **symptom → root cause → fix → effort/risk**. Severity tiers:
Tier 0 = visible bug today; Tier 1 = correctness / iOS; Tier 2 =
polish/cleanup.

> **Status:** Tier 0 and Tier 1 (S1–S7) implemented in this PR. Tier 2
> (S8–S11) is recorded here as the diagnosis backlog.

---

## Tier 0 — Visible bugs

### S1 Double sidebar squeezes Study content on desktop/tablet 🔴

- **Symptom:** At `md` (900–1200px, including iPad landscape) the card is
  crammed into a narrow middle column with the rest of the row eaten by two
  side panels.
- **Root cause:** `Study.tsx` renders its **own** 300px progress sidebar
  *and* `Layout.tsx` reserves a 324px right-hand column for the
  Level/Pomodoro panel (`pr: { md: '324px' }`). On Study these stack, so the
  card gets roughly `900 − 300 − 324 − gaps ≈ 250px`. (Flagged but unfixed in
  `LAYOUT_FIXES_PLAN.md`'s closing note.)
- **Fix:** On the `/study` route, hide Layout's fixed side panel and drop its
  `pr` reservation so Study owns the single sidebar and the card fills the
  remaining width. The Level/Pomodoro data is still reachable on mobile via
  the on-demand bottom sheet, and on desktop the Study sidebar already shows
  session progress.
- **Effort:** ~30 min. **Risk:** low-medium.

### S2 "No cards due" flash during the initial load 🔴

- **Symptom:** On a slow connection the page briefly shows the empty/error
  state ("No cards due for study!") before the cards pop in.
- **Root cause:** `loadCards()` is async with no loading flag; until it
  resolves, `cards.length === 0`, so the empty/error branch renders first.
- **Fix:** Add a `loading` state (initialised `true`, cleared in a `finally`)
  and render a centered `CircularProgress` while the fetch is in flight, ahead
  of the error/empty branches.
- **Effort:** ~20 min. **Risk:** low.

### S3 Matching game columns are cramped/misaligned on mobile 🔴

- **Symptom:** In Matching, the left "word" buttons (short) and right
  "definition" buttons (long, multi-line) live in two 50%-width columns; on a
  narrow phone the definitions wrap heavily, the columns don't line up, and
  the tap targets are needlessly tight.
- **Root cause:** `MatchingGame.tsx` uses two fixed `Grid item xs={6}` columns
  of independently-sized `fullWidth` buttons at every breakpoint. (The two
  shuffles are intentionally independent — rows can't be paired — so the
  fix is layout, not pairing.)
- **Fix:** On `xs`, stack the two groups vertically (Words, then Definitions),
  each as full-width buttons with a small section label, so definitions get
  the full width to read and targets stay large. Keep the side-by-side
  columns from `sm` up.
- **Effort:** ~45 min. **Risk:** medium.

---

## Tier 1 — Correctness / iOS

### S4 Study sidebar sticky height uses viewport math inside a fixed scroll box 🟠

- **Symptom:** On desktop/iPad the sticky progress panel can be taller than
  its scroll container, so it clips and contributes a sliver of phantom
  scroll — the same class of bug L2/L3 fixed elsewhere.
- **Root cause:** `Study.tsx` sets the sidebar to `height: calc(100vh − 96px)`
  (a fixed height, hard-coded 96px, measured against the *viewport*) while it
  actually lives inside Layout's `calc(100dvh − 64px)` scroll region.
- **Fix:** Switch the fixed `height` to a `maxHeight` derived from the dynamic
  viewport minus the real toolbar + sticky offset, with a `vh` fallback for
  engines without `dvh`, and `alignSelf: 'flex-start'` so a short panel no
  longer stretches.
- **Effort:** ~30 min. **Risk:** low-medium.

### S5 Crossword cell auto-advance fights the iOS keyboard 🟠

- **Symptom:** In Crossword on iPhone/iPad, typing a letter (which auto-jumps
  focus to the next cell) makes the on-screen keyboard flicker and the caret
  highlight misbehave; `.select()` is a no-op on iOS.
- **Root cause:** `FillInPuzzle.tsx` `focusCell()` calls `el.focus()` then
  `el.select()`. On iOS WebKit, `.select()` on a freshly-focused sibling input
  can blur it, and the scroll-into-view on focus is jarring.
- **Fix:** On iOS, focus with `{ preventScroll: true }` and skip the
  `.select()` call (keep the snappy `focus()+select()` path on other
  platforms). Guard with the existing `isMobile.iOS()` detection. Focus is
  already moved synchronously inside the `onChange` handler, so it stays
  within the user-gesture window.
- **Effort:** ~30 min. **Risk:** low-medium (real-device pass recommended).

### S6 FlashCard rating buttons are unlabeled on touch 🟠

- **Symptom:** On mobile the five rating buttons show **only emoji**
  (😟 😐 🙂 😊 🎯); their meaning lives in a `Tooltip` that needs hover, so
  touch users and VoiceOver get no label.
- **Root cause:** `FlashCard.tsx` renders `isMobile ? emoji : emoji+label`
  and conveys meaning through a hover-only `Tooltip` with no `aria-label`.
- **Fix:** Always set `aria-label={label}` on each rating button so the
  control is announced and understandable regardless of input modality.
- **Effort:** ~15 min. **Risk:** very low.

### S7 Bare `dvh` without the `vh` fallback in the Study content area 🟡

- **Symptom:** On iOS < 15.4 (or any engine lacking `dvh`) the content area's
  min-height is dropped and the column can collapse.
- **Root cause:** `Study.tsx` uses a bare
  `minHeight: { xs: '50dvh', sm: '60dvh' }`, bypassing the `vh`-fallback
  pattern that the `dvhMinHeight()` helper was introduced for.
- **Fix:** Emit a `vh` base with a `@supports (min-height: 100dvh)` override
  (the same shape as the helper), preserving the responsive 50/60 values.
- **Effort:** ~10 min. **Risk:** very low.

---

## Tier 2 — Polish / cleanup (backlog)

### S8 Legacy MUI v6 `Grid` deprecation 🟢

`StudyProgress.tsx` and `MatchingGame.tsx` use the deprecated v5
`Grid item xs={6}` API on MUI v6, which logs deprecation warnings. Migrate to
flex/`Grid` v2. (`MatchingGame`'s Grid is removed as part of S3.)

### S9 Dead code on the Study path 🟢

`StudyFeedback` is imported in `Study.tsx` but never rendered; `Alert` is
imported unused in `MultipleChoice.tsx`; `StudySession.tsx` is an orphaned
component not imported anywhere. Remove.

### S10 Unstyled empty/error/complete states 🟢

The error, "No cards due", and "Session complete!" states render as bare
top-left `<Container>` content with no centering, no session summary, and no
safe-area. Give them a centered card with the session stats.

### S11 Crossword horizontal overflow on small phones 🟢

`FillInPuzzle.tsx` wraps the 44px-cell grid in `overflowX: auto`; wide puzzles
silently overflow with no affordance. Add a scroll hint or cap the cell size
on very narrow screens.

---

## Execution order

1. **S1 + S4** — Study desktop/tablet geometry (biggest visible win).
2. **S2** — loading state.
3. **S6 + S7** — FlashCard a11y + `dvh` fallback.
4. **S3** — Matching mobile layout.
5. **S5** — Crossword iOS focus.
6. *(Backlog)* **S8 + S9 + S10 + S11** — cleanup + polish.

Each step ships with `npm run build` + `npm test` green and a manual sweep at
`xs` / `sm` / `md` / `lg` (and, for S5, a real iOS Safari pass).

---

## Quick reference — files touched

| Item | Primary file(s) |
| --- | --- |
| S1 hide Layout panel on /study | `src/components/Layout.tsx` |
| S2 loading state | `src/pages/Study.tsx` |
| S3 Matching mobile layout | `src/components/study-modes/MatchingGame.tsx` |
| S4 sidebar sticky height | `src/pages/Study.tsx` |
| S5 crossword iOS focus | `src/components/study-modes/FillInPuzzle.tsx` |
| S6 rating button a11y | `src/components/FlashCard.tsx` |
| S7 content `dvh` fallback | `src/pages/Study.tsx` |
| S8–S11 (backlog) | `StudyProgress.tsx`, `MultipleChoice.tsx`, `StudySession.tsx`, `Study.tsx`, `FillInPuzzle.tsx` |
</content>
</invoke>
