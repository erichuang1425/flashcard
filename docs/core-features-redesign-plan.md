# Core Features Redesign Plan

## Context

Flashcard Studio has grown feature-by-feature across ~95 PRs: five study modes, an SM-2
scheduler, library/import, reading mode, gamification, Pomodoro, diary, and worksheets.
Each feature works, but a codebase-wide audit (June 2026) found the seams are showing:

- Study modes feed the scheduler with **inconsistent rating granularity**, so the same
  knowledge level produces different schedules depending on which mode you studied in.
- The **data layer is fragmented**: one 916-line `firestore.ts`, duplicated type
  definitions, a half-finished legacy `categories` migration, and pages that re-derive
  stats from full-deck reads instead of the precomputed stats doc.
- **State management is duplicated**: two `UserPreferences` definitions, two readers of
  the same preferences doc, a Pomodoro timer living inside `SettingsContext`, and nine
  nested providers.
- **Gamification is half-built**: daily challenges are a no-op skeleton, achievements
  only refresh at session end, and a `LeaderboardEntry` type exists with no UI.

This plan redesigns the core features around a single principle: **one source of truth
per concern** — one rating pipeline into the scheduler, one data-access module per
domain, one preferences shape, one stats document that pages read instead of recompute.
It is sequenced so each phase ships independently as its own PR.

## Current architecture (what the redesign touches)

| Concern | Today | Key files |
|---|---|---|
| Session orchestration | One 466-line component mixing mode selection, scheduling, XP, and stats | `src/pages/Study.tsx` |
| SRS scheduling | Pure SM-2, well tested | `src/utils/spaced-repetition.ts` |
| Mode → rating mapping | Flashcard: 1–5; MC/FillInBlanks: binary→2/4; batch modes: all-or-nothing 2/4 | `src/components/study-modes/*` |
| Data access | Single 916-line module spanning cards, stats, streaks, categories, search | `src/services/firestore.ts` |
| Types | `Flashcard` vs `VocabularyWord` overlap; `UserPreferences` defined twice | `src/types/index.ts`, `src/pages/Settings.tsx:35`, `src/hooks/useUserPreferences.ts:6` |
| Preferences | `useUserPreferences` hook and `SettingsContext` both read/write `users/{uid}/preferences/study` | `src/hooks/useUserPreferences.ts`, `src/context/SettingsContext.tsx` |
| Stats | `users/{uid}/stats/study` exists, but Home re-derives dueToday/mastered from a full `getUserFlashcards()` read | `src/pages/Home.tsx`, `firestore.ts` |
| Gamification | XP/levels work; `refreshChallenges` is an empty stub (`GamificationContext.tsx:129-132`) | `src/context/GamificationContext.tsx`, `src/services/gamification.ts` |

## Phase 1 — Unified study session engine

**Goal:** every study mode feeds the scheduler through one graded pipeline, and session
orchestration moves out of the page component.

1. **Extract a session engine** from `Study.tsx` into `src/hooks/useStudySession.ts`
   (pure logic + a thin Firestore boundary):
   - owns the queue (due-card selection via existing `classifyLoadedStudyCards()` in
     `src/pages/studyLoadState.ts`), batch carving, progress state, and session totals;
   - exposes `submitRating(cardId, rating)` and `submitBatch(results)`;
   - `Study.tsx` becomes layout + mode renderer selection only.
2. **Replace binary correctness with graded outcomes.** Introduce one shared type in
   `src/components/study-modes/logic.ts`:
   ```ts
   type ModeOutcome = { cardId: string; quality: 1 | 2 | 3 | 4 | 5 };
   ```
   - MultipleChoice/FillInBlanks: wrong → 1 (lapse, not "Hard"), correct → 3 (Good),
     correct-on-first-try-fast → 4. Today a wrong answer maps to rating 2, which *grows*
     a mature card's interval by 1.2× — a correctness bug this fixes.
   - Matching/Crossword: per-card results (already produced by `buildPuzzleResults()` /
     `isMatchingPair()`) map per card instead of all-or-nothing.
3. **Shared option/distractor builder.** Each mode currently builds its own distractors;
   consolidate on `buildMultipleChoiceOptions()` in `logic.ts` and extend it rather than
   duplicating per mode.
4. **Surface write failures.** `updateCardReview` errors are currently swallowed; the
   session engine should retry once, then queue the review and show a non-blocking toast.
5. **Align XP with quality** in one place (the engine): XP = f(quality), identical for
   single-card and batch modes, replacing the inline 2/5/10 vs flat-5 split.

**Acceptance:** all five modes schedule through `submitRating`/`submitBatch`; a wrong
answer in any mode lapses the card; `Study.tsx` under ~200 lines; existing
`study-modes` tests pass with updated expectations.

## Phase 2 — Scheduler and stats correctness

**Goal:** fix the scheduling/stat behaviors that quietly mis-serve learners.

1. **Overdue handling** in `src/utils/spaced-repetition.ts`: when a card is reviewed
   late and answered well, credit the elapsed time (SM-2-with-overdue: use
   `max(interval, daysLate × 0.5 + interval)` style bonus, capped). Keep the function
   pure; pass `now` in.
2. **Local-day streaks.** `nextStreak()`/`isoDate()` in `src/utils/study-stats.ts` use
   UTC dates, so users west of UTC can lose streaks studying in the evening. Compute
   calendar days in the user's local timezone (pass an optional `timeZone` argument so
   the function stays testable).
3. **Retire the `difficulty` field.** It is derived from ease, persisted on every
   review, and read almost nowhere. Stop writing it; derive on display where still
   shown. (Leave existing values in place — no migration needed.)
4. **Make `users/{uid}/stats/study` the dashboard's source of truth.** Maintain
   `dueTodayCount` and `masteredCount` on the stats doc (updated inside the existing
   `updateUserStudyStats` transaction and on card review), so `Home.tsx` reads one doc
   instead of the full deck. This is the single biggest read-amplification win.

**Acceptance:** unit tests for overdue credit and timezone streaks (extend
`spaced-repetition` and `study-stats` test suites); Home renders from the stats doc
with no `getUserFlashcards()` call.

## Phase 3 — Data layer split

**Goal:** replace the 916-line `firestore.ts` with domain modules sharing one types
source.

1. Split `src/services/firestore.ts` into:
   - `src/services/cards.ts` (CRUD, review writes, due queries, search)
   - `src/services/stats.ts` (study stats, streaks — the transactional writers)
   - `src/services/categories.ts` (user-scoped categories; **finish** the legacy global
     `/categories` merge-read so it can be deleted)
   - keep `gamification.ts` as is.
   Re-export from `firestore.ts` temporarily so call sites migrate incrementally.
2. **Unify types** in `src/types/index.ts`: make `VocabularyWord` a `Pick<Flashcard,…>`
   (or delete it) and move `UserPreferences` here, deleting the copies in
   `Settings.tsx` and `useUserPreferences.ts`.
3. **Consistent caching:** `articleService` has a cache layer, cards don't. Add the same
   lightweight cache to `cards.ts` reads used by Library/Study (invalidate on write).

**Acceptance:** `firestore.ts` reduced to re-exports (then deleted in a follow-up);
one `UserPreferences` definition; existing emulator/rules tests and service tests pass.

## Phase 4 — Settings and provider architecture

**Goal:** one owner per piece of client state.

1. **Merge preference access:** `SettingsContext` becomes the single reader/writer of
   `users/{uid}/preferences/study`, internally using the (now type-unified)
   `useUserPreferences` logic. Remove the theme-override divergence.
2. **Extract Pomodoro** from `SettingsContext` into `src/context/PomodoroContext.tsx`
   (timer state, chime, vibration), mounted only where used. Settings keeps only the
   duration preferences.
3. **Flatten providers:** audit the nine providers in `main.tsx`/`App.tsx`; mount
   `ReadingModeProvider` on the Reading route only (it already is route-specific);
   combine Onboarding/Guide if their state is as small as it looks.

**Acceptance:** preferences round-trip through one code path; Pomodoro works unchanged;
provider tree documented in a short comment in `main.tsx`.

## Phase 5 — Gamification: finish or trim

**Goal:** no half-built systems visible to users or maintainers.

1. **Implement daily challenges** (the smaller of the two options, and the types/state
   already exist): three generated challenges per local day (e.g., "review 20 cards",
   "90% accuracy", "one batch mode session"), persisted under
   `users/{uid}/stats/gamification`, progressed by the Phase 1 session engine events.
2. **Event-driven achievements:** check achievements when the relevant counters change
   (session engine emits events) instead of only at session end.
3. **Delete the leaderboard skeleton** (`LeaderboardEntry` type) — multi-user features
   are out of scope for a single-user-scoped data model.

**Acceptance:** challenges visible and progressing on Home; `refreshChallenges` no
longer a stub; dead types removed.

## Phase 6 — UX consistency pass

**Goal:** the same interaction taxonomy across content surfaces.

1. Normalize on **tabs for sub-areas** (Reading's library/import/manage pattern) across
   Library (grid/category become tabs) and Import (file/manual already tabs).
2. **Worksheet flow:** make generate → study → results an explicit linear flow
   (`Worksheets.tsx` → `StudyWorksheet.tsx`) with a results screen that offers "send
   misses back to study," reusing the Phase 1 outcome types.
3. Diary's "suggest studied vocabulary" and Import's manual entry should share the
   card-suggestion component rather than divergent pickers.

**Acceptance:** shared tab component used by Library/Reading/Import; worksheet misses
can be re-queued for study.

## Sequencing and PR strategy

Each phase is one PR, in order — Phase 1 and 2 are the learner-facing payoff and come
first; 3 and 4 are refactors that get cheaper after 1 lands; 5 and 6 are leaf work that
can be parallelized or deferred. No phase requires a data migration; all schema changes
are additive or stop-writing-only.

## Verification

- **Per phase:** `npm test` (37 existing suites; extend the co-located suites named in
  each phase). Rules changes (none planned) would need `npm run test:rules` + Java.
- **Phase 1–2 manual pass:** run the app, study a session in each of the five modes,
  confirm wrong answers lapse cards (check `nextReview`/`interval` in the emulator or
  console), confirm Home stats match session results, and confirm a simulated
  `updateCardReview` failure shows the toast without ending the session.
- **Read-amplification check (Phase 2/3):** count Firestore reads on Home load before
  and after (should drop from full-deck + stats to stats-doc only).

## Out of scope

- Reading-mode internals (recently restored and well-factored; only its provider
  mounting moves in Phase 4).
- Auth (recently unified; no known debt).
- New study modes, leaderboards, or any multi-user features.
- Visual design system (recently revamped via theme tokens).
