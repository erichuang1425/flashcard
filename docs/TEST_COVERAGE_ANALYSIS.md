# Test Coverage Analysis & Improvement Plan

A snapshot of the current automated-test coverage on `main` and a prioritized
plan for where to invest next. Each recommendation lists **what to test**,
**why it matters**, and **effort/blockers** so the work can be picked up as a
set of small, focused PRs.

> **Status:** Analysis only. This document is the record/rationale; the test
> work is intended to land as follow-up PRs (see sequencing at the end).

---

## Current state

Running `npm test -- --coverage` today:

- **61 tests pass across 7 suites.** The existing tests are good — focused,
  well-structured unit tests with clear arrange/act/assert and edge-case
  coverage.
- **Overall statement coverage is ~8%** (≈5% of functions). The tested code is
  a thin slice of pure utilities; the bulk of the app is untested.

### What is tested today (all in `src/utils` + `src/i18n`)

| Area | Coverage |
| --- | --- |
| `utils/spaced-repetition.ts` | ~98% ✅ |
| `utils/crossword.ts` | ~97% ✅ |
| `utils/csv.ts` | 100% (covered transitively) ✅ |
| `utils/authFallback.ts` | 100% ✅ |
| `utils/helpers.ts` | ~82% |
| `utils/speech.ts` | ~51% |
| `i18n/translations.ts` | 100% ✅ |

### What is at 0%

- **All 7 `services/`** files (incl. `firestore.ts`, the 853-line data backbone)
- **All 7 `context/`** providers
- **Both `hooks/`**
- **All 11 `pages/`**
- **25 of 26 `components/`** (only `ImportTools` has a test)

---

## Structural blocker: no component/hook test tooling — ✅ RESOLVED

> **Update:** `jest-environment-jsdom`, `@testing-library/react`,
> `@testing-library/jest-dom` and `@testing-library/user-event` are now
> installed. Jest still defaults to `testEnvironment: 'node'` (fast pure-unit
> tests), and UI tests opt into the DOM per-file with a
> `@jest-environment jsdom` docblock. jest-dom matchers are registered globally
> via `jest.setup.ts`. Components, hooks and contexts can now be rendered.

Originally: the Jest config used `testEnvironment: 'node'` with neither `jsdom`
nor `@testing-library/react` installed, so it was *impossible* to render a
component or exercise a hook. That tooling is now in place, unblocking UI
coverage.

---

## Recommended areas to improve, by priority

### 1. `services/gamification.ts` — pure logic, high value, no tooling needed 🟢
- **What:** `getRequiredXP()` (pure) and the level-up loop inside
  `updateUserXP()` (XP rollover across multiple level-ups, default-stats
  initialization when no doc exists).
- **Why:** core game mechanics; bugs here silently corrupt user progress.
- **Effort:** `getRequiredXP` is testable as-is. Extract the leveling math from
  the Firestore call so the loop can be unit-tested without mocking.

### 2. `services/firestore.ts` — 853 lines, 0%, the data backbone 🔴
- **What:** highest-value targets are the stat/streak math —
  `updateStudyStats`, `updateDailyStreak`, `updateUserStudyStats`,
  `updateWeeklyStudyGoal` (date-boundary, timezone, consecutive-day, and
  streak-reset edge cases), plus `getMasteryCount`, `getTotalCardsCount`, and
  `searchVocabularyAdvanced`.
- **Why:** largest and most critical untested file; date math is a classic
  bug source.
- **Effort:** the repo **already depends on `@firebase/rules-unit-testing`**
  (installed, currently unused). Stand up the Firestore emulator harness and
  test against it. Pair this with **security-rules tests** — `firestore.rules`
  has zero tests today, and untested rules are a real data-leak risk.

### 3. Study-mode game logic 🟡
- **What:** `MatchingGame`, `MultipleChoice`, `FillInBlanks`, and especially
  `FillInPuzzle` (348 lines) — answer-checking, scoring, and puzzle
  generation. Verify answer tolerance end-to-end (e.g. `normalizeAnswer`
  treats "café" == "cafe"; `shuffle` is unbiased).
- **Why:** this is the core learning loop; wrong answer-matching directly
  harms users.
- **Effort:** much of the logic is pure and can be extracted into testable
  helpers even before jsdom lands. Full UI tests need the tooling above.

### 4. `utils/worksheet-templates.ts` (208 lines) + `services/exportService.ts` 🟢
- **What:** `generateWorksheet` builds structured content from templates —
  pure transformation logic.
- **Why:** worksheet generation is a headline feature.
- **Effort:** low; no mocking required.

### 5. Finish the partially-covered utils 🟢
- **What:** bring `utils/speech.ts` (51%) and `utils/helpers.ts` (82%, the
  `capitalizeAfterPunctuation` branches) up to ~100%.
- **Why:** cheap, and closes out the one directory already in good shape.

### 6. Contexts & hooks (after tooling lands) 🟡
- **What:** `AuthContext`, `GamificationContext`, `SettingsContext`,
  `useUserSettings`, `useUserPreferences`.
- **Why:** they orchestrate critical app-wide state.
- **Effort:** blocked on adding jsdom + Testing Library (see above).
- **Status:** `useUserPreferences` (load / first-run defaulting / error path /
  persisted updates), `useUserSettings` (single-field & pomodoro patches, dirty
  tracking, save round-trip, guards) and `SettingsContext` (theme cycle +
  Pomodoro countdown / pause / reset / work-break rollover under fake timers)
  are now covered. Remaining: `AuthContext` and `GamificationContext`.

---

## Suggested sequencing

1. ✅ **Quick wins now (no new tooling):** `gamification.ts` pure functions,
   `worksheet-templates.ts`, extract + test study-mode answer logic, top up
   `speech.ts` / `helpers.ts`. *(Done — leveling math, study-mode logic,
   worksheet generation and the speech/helpers utils are covered.)*
2. ✅ **Add the emulator harness:** wire up the already-present
   `@firebase/rules-unit-testing` → test `firestore.rules` and the
   streak/stats functions. *(Done — `firestore.rules` is covered via the
   emulator (`npm run test:rules`), the streak / running-average math is
   extracted into pure `utils/study-stats.ts` and unit-tested, and the full
   `updateStudyStats` / `updateUserStudyStats` / `updateDailyStreak` writers are
   now exercised against the emulator in `firestore.writers.rules.test.ts`
   (first-session, new-day reset, same-day accumulation, running-average and
   streak continue/reset/idempotent cases).)*
3. ✅ **Add jsdom + `@testing-library/react`:** unlock contexts, hooks, and
   components. *(Done — tooling installed; study-mode components and the
   language context now have rendering tests.)*
