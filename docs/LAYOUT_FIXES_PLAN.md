# Layout Deep-Diagnosis Scan — Fixes Plan

A focused pass over the **layout/structure** layer (`Layout`, `NavBar`, the
page shells, and the viewport-height math) on the current `main` line. The
earlier `MOBILE_FIXES_PLAN.md` items have largely shipped (single
`SettingsProvider`, one `<Toolbar />` spacer, merged mobile theme, `100dvh`
migration, un-nested `<Container>`s, ES2020 target, the mobile bottom-sheet
panel). The findings below are **new** regressions/inconsistencies that the
mobile work either introduced or left behind.

Each item: **symptom → root cause → fix → effort/risk**. Severity tiers:
Tier 0 = visible layout bug today; Tier 1 = structural correctness; Tier 2 =
cleanup/consistency.

---

## Tier 0 — Visible layout bugs

### L1 Desktop content width is subtracted twice → narrow content + dead gap 🔴

- **Symptom:** On `md`+ the page content is squeezed into a column that's far
  narrower than the available space, with a large empty band on the right
  (beyond what the Level/Pomodoro panel actually occupies).
- **Root cause:** Two independent mechanisms both reserve the side-panel
  column in `src/components/Layout.tsx`:
  1. The flex row reserves it with right padding —
     `pr: { md: !focusMode && !isPanelCollapsed ? '324px' : '64px' }`
     (`Layout.tsx:74`).
  2. The inner content `Box` *also* caps its own width —
     `width: { md: calc(100% - 324px/64px) }` (`Layout.tsx:84-87`).
  Because the child's `100%` is already the *padded* width (`full − 324`),
  the `calc` subtracts the panel a **second** time → content width is
  `full − 648px` (or `full − 128px` when collapsed). With `mx: 'auto'` the
  shortfall shows up as extra empty space.
- **Fix:** Keep exactly one mechanism. Keep the parent `pr` (it correctly
  clears the `position: fixed` panel) and set the inner content `Box` to
  `width: '100%'` — drop the `calc(...)` width entirely.
- **Effort:** ~15 min. **Risk:** low. Verify at `md`/`lg`/`xl`, panel
  expanded + collapsed, and in focus mode (where `pr` becomes `0`).

### L2 Per-page `minHeight: '100dvh'` inside a fixed-height scroll box → phantom scroll on every page 🔴

- **Symptom:** Every page can be scrolled ~one navbar-height past its content
  even when the content easily fits; the inner scrollbar/scroll region never
  truly "rests", and the desktop side panel's height never lines up with the
  content.
- **Root cause:** `Layout` already constrains the scroll region:
  `height: 'calc(100dvh - 64px)'` + `overflowY: 'auto'`
  (`Layout.tsx:89-90`). But each page's own shell then demands a *full*
  viewport height inside that already-shortened box:
  - `Home.tsx:141`, `Settings.tsx:112`, `Library.tsx:53`,
    `Worksheets.tsx:168` → `minHeight: '100dvh'`
  - `Study.tsx:259` (`100dvh`) plus inner `Study.tsx:262`
    (`calc(100dvh - 64px/48px)`) and `Study.tsx:272`
    (`calc(100dvh - 96px)`).
  A child asking for `100dvh` inside a `100dvh − 64px` viewport always
  overflows by ≥64px → forced scroll regardless of content.
- **Fix:** Pages that want to fill the available area should fill the **scroll
  container**, not the viewport: replace per-page `minHeight: '100dvh'` with
  `minHeight: '100%'`. For `Study`'s inner panels, base the height on `100%`
  of the flex row rather than fresh viewport math.
- **Effort:** ~45 min. **Risk:** low-medium (touch each page; visual sweep).

### L3 Hard-coded 64px navbar offset is wrong on phones/landscape 🟠

- **Symptom:** On phones (portrait toolbar = **56px**, landscape = **48px**)
  the content region is ~8–16px too tall, adding a sliver of scroll and
  nudging the bottom of full-height screens out of view.
- **Root cause:** The toolbar offset is hard-coded as `64` in the viewport
  math — `Layout.tsx:89` (`calc(100dvh - 64px)`), the side panel
  `top: 76` / `height: calc(100dvh - 88px)` (`Layout.tsx:126,131`), and
  `Study.tsx:262` even guesses `xs: 64` (should be 56). MUI's `Toolbar`
  min-height is responsive (56 xs / 48 landscape / 64 sm+).
- **Fix:** Stop hard-coding it. Preferred: once L2 switches pages to
  `100%`, let the root flex column + the existing `<Toolbar />` spacer own
  the offset and set the content `Box` to `height: '100%'` (no viewport
  subtraction at all). Where a numeric offset is still needed, derive it
  from `theme.mixins.toolbar` instead of the literal `64`.
- **Effort:** ~30 min. **Risk:** low-medium. Pairs naturally with L2.

---

## Tier 1 — Structural correctness

### L4 Dead small-screen code path in the desktop side panel 🟡

- **Symptom:** None visible — but a whole branch of the panel's styling can
  never execute, which masks bugs and carries a redundant resize listener.
- **Root cause:** The `Paper` panel is `display: { xs: 'none', md: 'flex' }`
  (`Layout.tsx:140`) — it only renders from `md` (900px) up. Yet the
  component keeps an `isSmallScreen = window.innerWidth < 900` state
  (`Layout.tsx:25`) and branches on it throughout the panel: bottom-anchored
  geometry and full-width `xs` values (`126-145`), `boxShadow: 'none'`
  (`150`), vertical `Collapse` orientation (`188`), and the icon-direction
  swaps (`166-183`). Since the panel is mounted only when
  `width ≥ 900`, `isSmallScreen` is **always `false`** in every one of those
  branches → all the `xs`/`isSmallScreen` arms are unreachable. The
  small-screen surface is the bottom-sheet `Drawer` (`Layout.tsx:224`),
  which already handles `< md`.
- **Fix:** Delete the `isSmallScreen` state and its `resize` effect
  (`Layout.tsx:25,28-52`), and collapse the dead `xs`/`isSmallScreen`
  branches in the `Paper`/`IconButton`/`Collapse` to their desktop values.
  Removes one more `resize` listener and a chunk of misleading code.
- **Effort:** ~30 min. **Risk:** low (deleting unreachable code; sweep the
  desktop panel collapse/expand afterward).

### L5 Desktop collapse state never re-expands when the window grows 🟡

- **Symptom:** Shrink the window below 900px and back; the desktop side panel
  stays **collapsed** even though there's now room for it.
- **Root cause:** The resize handler sets `isPanelCollapsed(true)` when small
  but never restores it on the way back up (`Layout.tsx:28-33`).
- **Fix:** Largely subsumed by L4 — once the redundant width-watcher is gone,
  drive collapse purely from the user toggle (and, if desired, an
  expand-on-enter-desktop using the `md` `useMediaQuery` that already exists).
- **Effort:** ~10 min (with L4). **Risk:** low.

---

## Tier 2 — Consistency / cleanup

### L6 Mixed `vh` / `dvh` for centering shells 🟢

- **Root cause:** After the `dvh` migration a few centering containers still
  use static `vh`: `Login.tsx:47` & `Register.tsx:45` (`80vh`),
  `StudyWorksheet.tsx:85` (`60vh`), `App.tsx:37` `RouteFallback` (`60vh`),
  and `Study.tsx:300` (`50vh`/`60vh`). Low-impact (they only center a small
  card/spinner) but inconsistent with the rest of the app on mobile browsers.
- **Fix:** Convert these `vh` values to `dvh` for consistency.
- **Effort:** ~10 min. **Risk:** very low.

### Note — Two stacked right-hand columns on desktop Study

Not a bug, but worth flagging while in the area: on `md`+ the `Study` page
renders its **own** 300px progress sidebar (`Study.tsx:271`) *in addition to*
the Layout's 324px reserved Level/Pomodoro panel. Combined with L1 this is
what makes Study feel especially cramped. Once L1/L2 land, re-check whether
Study's sidebar + Layout's panel together leave enough room at `md`; if not,
consider hiding the Layout panel on the Study route (it duplicates progress
info anyway).

---

## Suggested execution order

1. **L1** (width double-subtract) — standalone, highest visible payoff.
2. **L2 + L3** (viewport-height model) — do together; they share the fix.
3. **L4 + L5** (dead small-screen code + collapse state) — together.
4. **L6** (`vh → dvh`) — trivial sweep.

Each step ships with `npm run build` + `npm test` green and a manual sweep at
`xs` / `sm` / `md` / `lg` (panel expanded, collapsed, and focus mode).

---

## Quick reference — files touched

| Item | Primary file(s) |
| --- | --- |
| L1 width double-subtract | `src/components/Layout.tsx` |
| L2 per-page `100dvh` | `src/components/Layout.tsx`, `pages/{Home,Settings,Library,Worksheets,Study}.tsx` |
| L3 hard-coded 64px offset | `src/components/Layout.tsx`, `pages/Study.tsx` |
| L4 dead small-screen code | `src/components/Layout.tsx` |
| L5 collapse never re-expands | `src/components/Layout.tsx` |
| L6 `vh → dvh` | `pages/{Login,Register,StudyWorksheet,Study}.tsx`, `src/App.tsx` |
</content>
</invoke>
