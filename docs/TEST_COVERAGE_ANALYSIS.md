# Test Coverage Status and Remaining Plan

This document tracks what the automated suites actually cover after PRs #87,
#88, and the PR #83-#90 remediation pass. It is a status ledger, not a claim
that every production module is covered.

## How to interpret the numbers

- `npm test` runs the default Jest suite and excludes `*.rules.test.ts`.
- `npm run test:rules` starts the Firestore emulator and runs the security-rule
  and writer integration suites.
- `npm test -- --coverage` currently measures files imported by the default
  tests. `jest.config.js` does not set `collectCoverageFrom`, so the reported
  percentage is **not repository-wide coverage**. Untouched pages, components,
  and services are absent from the denominator.
- Repository-wide coverage should only be published after adding an explicit
  `collectCoverageFrom` policy and agreeing on exclusions for entrypoints,
  generated types, and Firebase configuration.

## Completed coverage

### Pure learning and utility logic

- SM-2 scheduling and helper utilities.
- Crossword generation and crossword scoring helpers.
- Fill-in answer normalization.
- Multiple-choice option construction, deduplication, and direction handling.
- Matching-pair detection.
- Worksheet generation and template branches.
- Speech API wrappers and viewport helpers.
- Study streak and running-average calculations.
- Authentication error and popup-fallback classification.

### UI, contexts, and hooks

- `FillInBlanks`, `MatchingGame`, and `MultipleChoice` interaction flows.
- Language detection, persistence, translation, and interpolation.
- `AuthContext` email, Google popup/redirect, persistence, profile stamping,
  and account-linking flows.
- `SettingsContext` theme and Pomodoro behavior.
- `GamificationContext` subscriptions, XP, achievements, and focus mode.
- `useUserPreferences` and `useUserSettings`.
- Import CSV parsing helpers.
- Regression coverage for:
  - redirect-return Google/password linking,
  - link-failure propagation,
  - user-scoped Library categories,
  - nested FlashCard keyboard controls,
  - the Study "all caught up" state.

### Firestore emulator suites

- Owner-only access to the user subtree.
- Public-card reads and base-vocabulary restrictions.
- Category creation ownership.
- `updateStudyStats`, `updateUserStudyStats`, and `updateDailyStreak` writer
  behavior across first-session, same-day, and new-day cases.

These tests require Java because the Firebase Firestore emulator runs on the
JVM. A missing Java runtime is an environment blocker, not a passing result.

## Remaining high-value work

### Stage A: Firestore data services

Add tests for:

- `updateWeeklyStudyGoal`
- `getMasteryCount`
- `getTotalCardsCount`
- `searchVocabularyAdvanced`
- category counter updates and category deletion behavior
- library pagination/query failure handling

Prefer emulator tests for transactions, aggregations, and query constraints.
Use unit tests only for extracted pure calculations.

### Stage B: Export and document generation

Add focused tests for:

- `services/exportService.ts`
- `services/pdfService.ts`
- worksheet export error handling
- generated document structure at the service boundary

Avoid brittle byte-for-byte PDF assertions. Assert inputs, document structure,
filenames, and surfaced failures.

### Stage C: Route-level workflows

Add rendering tests for:

- Login and Register pending-link prompts.
- Study loading, transport error, empty, and completion states.
- Library load failure and category selection.
- Import reset after success and partial failure.
- Home dashboard stat layout semantics.

### Stage D: Remaining providers and pages

Prioritize:

- `FocusModeContext`
- `MobileContext`
- `OnboardingContext`
- `PronunciationContext`
- `Diary`
- `Worksheets` and `StudyWorksheet`
- `Settings`

## Execution rules

1. Add one behavior-focused failing test.
2. Confirm the failure is caused by the missing behavior.
3. Make the smallest production change.
4. Run the focused test, then the default suite.
5. Use `npm run test:rules` for Firestore behavior and record Java/emulator
   prerequisites in the PR.
6. Do not call the plan complete while any item in "Remaining high-value work"
   is still open.
