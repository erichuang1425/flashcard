# Flashcard Studio Case Study

## 1) Problem and product direction

Most vocabulary tools are either too lightweight (simple lists with no review structure) or too rigid (heavy LMS-style systems). I wanted a middle path: a personal learning workspace where learners can import real study material, practice in multiple modes, and track momentum over time.

**Goal:** build a study app that feels practical for daily use, not just a demo.

## 2) Target user persona

### Persona: Working learner “Mina”
- **Profile:** 27-year-old early-career professional improving English for client communication.
- **Context:** studies in short sessions before work and at night.
- **Pain points:** inconsistent study rhythm, hard to convert notes into reusable cards, low motivation when progress is unclear.
- **Needs:** quick import, short guided sessions, visible progress, and low-friction review.

## 3) Product decisions and rationale

### Decision A: Firebase-first architecture
- **Why:** fast iteration with authentication, Firestore, and storage under one platform.
- **Tradeoff:** tight coupling to Firebase data patterns and security rules.

### Decision B: Multiple study modes (not flashcards only)
- **Why:** recall quality improves when learners switch between recognition and production tasks.
- **Tradeoff:** more UI/logic complexity and larger test surface area.

### Decision C: Import and worksheet workflows
- **Why:** users already have vocabulary in spreadsheets or notes; import removes blank-page friction.
- **Tradeoff:** CSV parsing and validation edge cases require stronger UX/error handling.

### Decision D: Gamification as support, not core loop
- **Why:** streaks/XP can reinforce consistency, but should not distract from learning quality.
- **Tradeoff:** balancing motivational signals without turning study into pure point-chasing.

## 4) Success criteria

Current quality signals used during development:
- App can ingest a realistic sample dataset in one pass.
- Learner can complete a first study session in under 10 minutes.
- Progress and completion feedback are visible after each session.
- Build and tests remain stable after feature additions.

## 5) Roadmap

### Near-term (next 1–2 releases)
- Split large bundles with route-level code-splitting.
- Add import validation report with row-level error export.
- Improve accessibility: keyboard flow and screen-reader labels.

### Mid-term
- Add review scheduling dashboard with calendar view.
- Add smarter distractor generation for multiple-choice mode.
- Add optional collaborative shared decks.

### Long-term
- Adaptive review policy tuned by learner performance trends.
- Mobile-first offline workflow for commute-friendly sessions.

## 6) Portfolio talking points

If you present this project in interviews, emphasize:
1. How you translated a real user problem into concrete product decisions.
2. How architecture choices accelerated delivery while preserving maintainability.
3. What tradeoffs you accepted and what you plan to improve next.
