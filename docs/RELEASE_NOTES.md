# Flashcard Studio v1.0.0

Released: 2026-06-29

Flashcard Studio v1.0.0 marks the first public portfolio release of the app: a
React + Firebase study workspace for turning vocabulary lists, exam packs, and
reading material into repeatable review.

## Highlights

- Personal flashcard library with categories, search, imports, and bulk actions.
- Five study modes: flashcards, multiple choice, fill-in-the-blanks, matching,
  and crossword-style fill-in puzzles.
- Built-in SAT, PTE Academic, and TOEFL iBT vocabulary packs.
- Reading workspace with article import, progress tracking, notes, dictionary
  lookup, and save-to-flashcards flow.
- Progress feedback through streaks, XP, achievements, daily challenges, and
  Pomodoro focus sessions.
- Worksheet generation plus PDF, Word, and flashcard export support.
- Firebase sign-in, private cloud-synced study data, PWA metadata, and offline
  support after the app has loaded.

## Notes For Reviewers

Start with `sample-data/flashcards-sample.csv` or one of the built-in exam packs
to exercise the core import, library, study, progress, reading, and worksheet
flows quickly.

## Verification

Recommended checks before publishing this release:

```bash
npm run test
npm run build
```
