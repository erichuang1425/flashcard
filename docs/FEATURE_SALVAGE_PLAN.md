# Feature Salvage Plan

This document captures the useful work locked up in the stale Codex pull
requests (#52–#62) so the PRs themselves can be closed without losing the
ideas. Each entry records **what the PR did**, **why it cannot be merged as-is**,
and a **concrete re-implementation plan** against the current `main`.

## Background: why these PRs can't just be merged

All eleven PRs (#52–#62) were opened against **`translation-test-branch`**, a
divergent product line that was *not* the basis for the current `main`. `main`
is the result of the "professional refactor" line, which deliberately
**removed or restructured** most of the infrastructure those PRs depend on:

| Dependency the PRs assume | State on current `main` |
| --- | --- |
| `src/i18n/` (`useI18n`, `t()`, `en.ts`, `zh-TW.ts`) | **Removed.** UI strings are hard-coded English. |
| `useAudio` hook (`playSound`) | **Does not exist.** |
| `AuthService` class (`src/services/authService.ts`) | **Removed.** Auth lives in `src/context/AuthContext.tsx`. |
| `ImportManualEntry.tsx` component | **Does not exist** as a standalone file. |
| Firestore API: `saveStudyProgress`, `saveFillInBlanksPreference`, `getFillInBlanksPreference` | **Not present.** `main` uses `updateCardReview`, `getUserFlashcards`, etc. |

Because of this, every PR is effectively a **re-implementation**, not a
cherry-pick. They are being **closed**, and the salvageable intent is recorded
below, prioritized by value-to-effort.

---

## Tier 1 — High value, clean fit (recommended first)

### A. Mobile Google sign-in fallback — from #57

**What #57 did:** Tried popup sign-in first and fell back to
`signInWithRedirect` when the popup was blocked / unsupported; also seeded
default user preferences on first login.

**Why not mergeable:** Patched `src/services/authService.ts`, which no longer
exists.

**Re-implementation plan (current `main`):**
- Target `src/context/AuthContext.tsx` → `signInWithGoogle`. It currently does a
  hard `isMobileDevice ? signInWithRedirect : signInWithPopup` branch.
- Replace with: attempt `signInWithPopup`; on `auth/popup-blocked` or
  `auth/operation-not-supported-in-this-environment`, fall back to
  `signInWithRedirect`. Treat `auth/popup-closed-by-user` as a benign cancel.
- Ensure `getRedirectResult` is awaited on load (in the existing
  `onAuthStateChanged` effect) so the redirect round-trip completes.
- Seed default preferences via the existing `useUserPreferences` /
  `firestore` helpers rather than the old inline `setDoc` block.
- **Tests/verify:** unit-test the error-branch selection; manually verify on a
  mobile user agent.
- **Effort:** ~half a day. No new deps. **Strongly recommended.**

---

## Tier 2 — Genuine user-facing features, moderate effort

### B. Fill-in puzzle (crossword) study mode — from #56

**What #56 did:** Added a `FillInPuzzle` study mode using
`crossword-layout-generator`, with random/manual word selection and batch size,
wired into the Study page and `StudyModeSelector`, with XP rewards.

**Why not mergeable:** Depends on `useI18n`, `useAudio`, and
`saveStudyProgress` — none of which exist on `main`.

**Re-implementation plan:**
- Add dependency `crossword-layout-generator` + the `.d.ts` shim under
  `src/types/`.
- Recreate `src/components/study-modes/FillInPuzzle.tsx`, but:
  - Replace all `t('...')` calls with hard-coded English strings (matches the
    other study-mode components on `main`).
  - Drop `useAudio`/`playSound` (no audio system on `main`).
  - Persist progress through `main`'s API: call `updateCardReview` per solved
    card and award XP via `updateUserXP`, mirroring how `MatchingGame`
    completion is handled in `src/pages/Study.tsx`.
- Extend the `StudyMode` union in `src/types/index.ts` with `'fillInPuzzle'`,
  add it to `validModes` and the renderer switch in `Study.tsx`, and add the
  entry to `StudyModeSelector.tsx`.
- **Tests/verify:** render test for grid generation; manual play-through.
- **Effort:** ~1 day. Adds one runtime dep.

### C. SAT vocabulary import — from #55 (+ tooling #61, #60)

**What they did:** #55 added a "Load SAT vocab" button that fetches
`/sat.csv`, preselects a locked "SAT" category, and disables category editing.
#61 added a build-time script to download an SAT word list and enrich it with
dictionary definitions, producing `public/sat.csv`. #60 added a localStorage-
cached dictionary lookup service used by that script.

**Why not mergeable:** #55 targets the old `ImportTools` layout; #60/#61 assume
the old service layout and external API access at build time.

**Re-implementation plan:**
- **Data first:** generate `public/sat.csv` once (offline) with columns matching
  `main`'s current `ImportTools` CSV importer (verify header order against
  `src/components/ImportTools.tsx`). Commit the static CSV so no build-time
  network call is needed.
- **UI:** add a "Load SAT word list" action to the current `ImportTools` that
  fetches `/sat.csv`, maps rows to the import preview, and tags them with a
  `SAT` category. Reuse the existing CSV parsing path rather than a parallel one.
- **Dictionary service (#60):** only port if we want *live* enrichment. For a
  static CSV it is unnecessary. If ported, place it at
  `src/services/dictionaryService.ts` with the same localStorage cache and a
  unit test; keep it independent of i18n.
- **Effort:** ~1 day for the static-CSV path; the enrichment script is optional.

### D. Suggested vocabulary in diary — from #59

**What #59 did:** Added a service to fetch due/recent vocabulary and a
"Use these words" panel in the diary editor, logging selected words with
translations into the entry.

**Why not mergeable:** Built on the old diary editor + i18n; `main`'s
`src/pages/Diary.tsx` differs.

**Re-implementation plan:**
- Add a helper (reusing `getUserFlashcards`) to select N due/recent cards.
- Render a dismissible "Suggested words" chip row above the diary editor on
  `main`'s `Diary.tsx`; clicking a chip inserts the word.
- Optionally record used words on the saved entry document.
- **Effort:** ~1 day. Lower priority than A–C.

---

## Tier 3 — Small bugfixes worth re-checking against `main`

### E. Mobile scrolling fix — from #52

**What #52 did:** Allowed vertical overflow so mobile pages scroll.

**Plan:** Verify whether `main`'s responsive layout already scrolls (the
refactor reworked `Layout`/responsive hooks). If the bug reproduces on a narrow
viewport, apply the minimal `overflow-y: auto` fix to the affected container.
**Likely already fixed** — confirm before doing anything.

### F. Clear stale duplicate-word warning — from #62

**What #62 did:** Reset the duplicate-word error when the word field is edited
in `ImportManualEntry.tsx`.

**Plan:** `main` has no `ImportManualEntry.tsx`. First confirm whether the
current `ImportTools` manual-entry path even has duplicate detection. If it
does and the stale-warning bug reproduces, clear the error in the word field's
`onChange`. **Conditional** on the feature existing on `main`.

---

## Tier 4 — Close, do not port

### G. Diary prompts — #53 and #54 (duplicates of each other)

**What they did:** Added predefined diary prompts with selection/randomization,
plus localization.

**Disposition:** #53 and #54 are duplicate submissions of the same task.
The diary prompt idea is reasonable but heavily tied to the i18n strings the
refactor removed, and is low priority for a portfolio app. If desired later,
re-implement as a small static English prompt list with a "shuffle" button on
`main`'s `Diary.tsx` — no need to keep either PR open. **Close both.**

### H. Grammar checking service — #58

**What #58 did:** Added `grammarService` (LanguageTool API), diary grammar
suggestions, and an i18n preference toggle.

**Disposition:** Depends on i18n and an external API call per keystroke/entry.
This is arguably scope-creep for a clean portfolio app and reintroduces exactly
what the refactor removed. **Close.** Revisit only if grammar feedback becomes a
product goal; if so, implement as an opt-in `src/services/grammarService.ts`
(debounced, English-only UI) behind a settings flag.

---

## Suggested execution order

1. **#57** mobile auth fallback (Tier 1) — own PR.
2. **#56** fill-in puzzle (Tier 2 B) — own PR.
3. **#55/#61/#60** SAT import via static CSV (Tier 2 C) — own PR.
4. **#59** diary suggestions (Tier 2 D) — own PR.
5. Re-check **#52** and **#62** against `main`; fix only if they still
   reproduce.
6. Leave **#53/#54** (diary prompts) and **#58** (grammar) closed unless they
   become product goals.

Each item above should land as its own focused PR against `main`, English-only,
using `main`'s consolidated services — not by reviving the stale branches.
