# Flashcard Studio Case Study

## 1. Problem and Product Direction

Many vocabulary tools sit at one of two extremes: quick lists with little review
structure, or heavy classroom systems that are more process than practice.
Flashcard Studio aims for the middle path: a personal learning workspace where a
learner can import real material, review it in several active-recall formats,
and keep enough progress feedback to return tomorrow.

**Goal:** build a study app that feels useful in daily life, not just presentable
in a demo.

## 2. Target User

### Persona: working learner, Mina

- **Profile:** 27-year-old early-career professional improving English for
  client communication.
- **Context:** studies in short sessions before work, during commutes, and at
  night.
- **Pain points:** scattered vocabulary notes, inconsistent review rhythm, and
  low motivation when progress is invisible.
- **Needs:** quick import, short guided sessions, visible progress, and
  low-friction review.

## 3. Product Decisions

### Firebase-first architecture

- **Why:** Firebase made authentication, Firestore, hosting, storage, offline
  persistence, and security rules available without building a custom backend.
- **Tradeoff:** the app is coupled to Firebase's data model, SDK behavior, and
  deployment workflow.

### Multiple study modes

- **Why:** recall improves when learners move between recognition, production,
  and matching tasks instead of repeating one card interaction.
- **Tradeoff:** each mode adds UI state, scoring rules, edge cases, and tests.

### Import and worksheet workflows

- **Why:** most learners already have vocabulary in spreadsheets, notes, or exam
  prep lists. Import removes the blank-page problem; worksheets support offline
  or paper-based practice.
- **Tradeoff:** CSV parsing, duplicate handling, validation, and generated
  document output all require careful boundary tests.

### Gamification as a support layer

- **Why:** streaks, XP, achievements, challenges, and focus timers can help
  learners return without making points the whole product.
- **Tradeoff:** motivational signals need limits so they reinforce learning
  instead of distracting from it.

### Reading practice as vocabulary discovery

- **Why:** learners often discover words in articles, not isolated lists. The
  reading workspace lets notes and dictionary lookups feed back into flashcards.
- **Tradeoff:** article import, progress tracking, and note storage broaden the
  product beyond a pure card app.

## 4. Success Criteria

- A reviewer can import a realistic sample deck in one pass.
- A new user can complete a first study session in under 10 minutes.
- Progress and completion feedback are visible after a session.
- Core study behavior remains covered by tests as features are added.
- Firebase rules preserve user-owned data boundaries.

## 5. Current Strengths

- Clear route-level product areas: Home, Import, Library, Study, Reading,
  Diary, Worksheets, Profile, and Settings.
- Typed service boundaries for Firebase-backed domains.
- Tests around study-mode logic, spaced repetition, i18n, auth persistence,
  settings, gamification, imports, reading services, and Firestore rules.
- Built-in SAT, PTE Academic, and TOEFL iBT packs for fast evaluation.
- Offline and mobile considerations, including PWA metadata and viewport
  helpers.

## 6. Roadmap

### Near term

- Split large route bundles with code splitting.
- Add an import validation report with row-level error export.
- Capture and publish screenshots after the next UI polish pass.
- Expand route-level tests for the highest-traffic workflows.

### Mid term

- Add a review scheduling dashboard with calendar visibility.
- Improve distractor generation for multiple-choice sessions.
- Add more robust generated worksheet previews.

### Long term

- Tune review scheduling with learner performance trends.
- Offer optional shared decks after personal-deck flows are fully hardened.
- Improve commute-friendly offline behavior.

## 7. Interview Talking Points

1. Translating a real study consistency problem into concrete product workflows.
2. Choosing Firebase to accelerate delivery while accepting platform coupling.
3. Keeping study-mode scoring and data writes testable despite a broad feature
   surface.
4. Treating progress and gamification as motivation, not as a replacement for
   learning quality.
