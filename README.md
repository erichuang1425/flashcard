# Flashcard Studio

<p align="center">
  <img src="public/icons/icon.svg" alt="Flashcard Studio icon" width="88" height="88">
</p>

Flashcard Studio is a full-stack study workspace for turning vocabulary lists,
articles, and exam prep material into focused review sessions. It combines
flashcards, active-recall exercises, reading notes, worksheet generation, and
lightweight progress loops in one React + Firebase app.

It is built as a practical learning product rather than a static demo: users can
sign in, import real study data, organize a personal library, practice in
multiple modes, and keep studying offline after the app has loaded.

## Highlights

- Personal flashcard library with categories, search, bulk deletion, and import
  flows.
- Five study modes: classic cards, multiple choice, fill-in-the-blanks,
  matching, and crossword-style fill-in puzzles.
- SM-2 inspired scheduling helpers, streaks, XP, achievements, daily challenges,
  and Pomodoro focus support.
- Ready-made SAT, PTE Academic, and TOEFL iBT vocabulary packs with Traditional
  Chinese support.
- Reading workspace for importing articles, tracking progress, saving notes, and
  looking up words.
- Browser text-to-speech pronunciation controls with voice, speed, and
  auto-speak settings.
- Worksheet and export tooling for printable study material.
- Firebase Authentication, Firestore rules, offline caching, and PWA metadata.
- Broad Jest coverage for core learning logic, contexts, hooks, i18n, import
  utilities, and Firestore rule behavior.

## Tech Stack

| Area | Tools |
| --- | --- |
| App | React 18, TypeScript, Vite |
| UI | Material UI, Framer Motion |
| Routing | React Router |
| Backend | Firebase Authentication, Firestore, Storage |
| Offline | Service worker, Firestore persistent local cache |
| Documents | pdfmake, jsPDF, docx |
| Testing | Jest, Testing Library, ts-jest, Firebase rules emulator |

## Product Tour

1. Import vocabulary from CSV, manual entry, or built-in exam packs.
2. Organize cards by category in the Library.
3. Practice due cards in one of the study modes.
4. Track streaks, XP, daily challenges, and mastery signals.
5. Import articles for reading practice, save notes, and add discovered words
   back into the flashcard loop.
6. Generate printable worksheets when offline or paper-based review is useful.

Screenshots are intentionally not checked in yet. The project includes a local
sample data path below so reviewers can run the product and capture the current
UI from their own Firebase project.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A Firebase project with Authentication, Firestore, and Storage enabled
- Java, only if you plan to run the Firestore emulator rule tests

### Configure Environment

Copy the example environment file and fill in your Firebase web app values:

```bash
cp .env.example .env
```

The app currently reads Firebase settings from these Vite environment keys:

```text
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
```

### Install and Run

```bash
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

### Try a Reviewer Flow

Use this path to see the main product loop in about 10 minutes:

1. Sign in with your Firebase-backed account.
2. Open Import and upload `sample-data/flashcards-sample.csv`, or import one of
   the built-in SAT, PTE, or TOEFL packs.
3. Assign a category during import, such as `exam-prep` or `business-english`.
4. Open Library and confirm the new cards are searchable.
5. Start a Study session and try flashcards plus one active-recall mode.
6. Check progress, XP, challenge, and streak feedback after review.
7. Open Reading, import an article, save a note, and add a looked-up word to the
   flashcard library.

## Scripts

```bash
npm run dev        # Start the Vite development server
npm run build      # Type-check and build production assets
npm run preview    # Preview the production build locally
npm run test       # Run the default Jest suite
npm run test:rules # Run Firestore rule tests through Firebase emulators
npm run typecheck  # Type-check without emitting files
```

## Project Structure

```text
src/
  components/        Reusable UI and feature components
  context/           App-level providers for auth, settings, study state, i18n
  hooks/             Custom React hooks
  i18n/              English and Traditional Chinese translations
  pages/             Route-level experiences
  services/          Firebase and domain service boundaries
  theme/             Theme tokens and mobile styling
  types/             Shared TypeScript models
  utils/             Pure learning, import, speech, viewport, and text helpers

public/              PWA assets and built-in vocabulary CSV packs
sample-data/         Small CSV for reviewer/evaluator import testing
docs/                Case study, auth persistence notes, and coverage plan
scripts/             Local development helpers
```

## Testing Notes

The default suite focuses on deterministic app behavior: study logic,
spaced-repetition helpers, crossword generation, import parsing, i18n,
authentication flows, settings, gamification, reading-mode services, and key UI
interactions.

Firestore rule tests are separated because they require the Firebase emulator:

```bash
npm run test:rules
```

See `docs/TEST_COVERAGE_ANALYSIS.md` for what is covered and what remains on the
test roadmap.

## Deployment

The repository includes Firebase Hosting and security-rule configuration:

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`

Build before deployment:

```bash
npm run build
```

Then deploy with the Firebase CLI from an authenticated environment:

```bash
firebase deploy
```

The configured hosting target is `vocabmaster1425`. Confirm the active Firebase
project and public URL before publishing the GitHub About website field.

## Roadmap

- Add route-level code splitting for faster first load.
- Add an import validation report with row-level error export.
- Capture polished screenshots for the README after the next UI pass.
- Expand route-level tests for Login, Register, Study, Import, Library, and
  Reading workflows.
- Add a review scheduling dashboard with calendar-style visibility.
- Explore optional shared decks once personal-deck flows are fully hardened.

## Documentation

- `docs/CASE_STUDY.md` explains the product decisions and tradeoffs.
- `docs/AUTH_PERSISTENCE.md` documents the sign-in persistence contract.
- `docs/TEST_COVERAGE_ANALYSIS.md` tracks current coverage and remaining test
  priorities.
- `docs/core-features-redesign-plan.md` captures deeper architecture planning.

## License

This project is available under the ISC License. See `LICENSE` for details.
