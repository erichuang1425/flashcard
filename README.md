# Flashcard Studio

A production-ready study platform for creating, reviewing, and organizing flashcards with modern learning workflows.

## Overview

Flashcard Studio is a React + TypeScript web application designed for focused learning sessions. It combines classic flashcard review with worksheets, import/export utilities, spaced repetition helpers, and gamification features.

### Core capabilities
- Authentication and protected user areas.
- Personal flashcard library management.
- Multiple study modes (standard cards, matching, multiple choice, fill-in-the-blanks).
- Progress tracking, study feedback, and gamification mechanics.
- Import/export tooling for external study content.
- Worksheet generation for printable learning workflows.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** Material UI, Framer Motion
- **Routing:** React Router
- **Backend services:** Firebase Authentication, Firestore, Cloud Storage
- **Testing:** Jest + ts-jest

## Project structure

```text
src/
  components/       Reusable UI and feature components
  context/          App-level providers (auth, settings, gamification)
  hooks/            Custom React hooks
  pages/            Route-level pages
  services/         Firebase and domain service logic
  theme/            Theme and responsive styling setup
  types/            Shared TypeScript types
  utils/            Pure utility modules and algorithms
```

## Getting started

### 1) Prerequisites
- Node.js 20+
- npm 10+
- Firebase project configured for Auth, Firestore, and Storage

### 2) Environment configuration

Copy the example file and fill in your Firebase credentials:

```bash
cp .env.example .env
```

### 3) Install dependencies

```bash
npm install
```

### 4) Start development server

```bash
npm run dev
```

The app runs locally with Vite on the default port unless overridden.

## Scripts

- `npm run dev` — Start local development server.
- `npm run build` — Type-check and build for production.
- `npm run preview` — Preview production build.
- `npm run serve` — Alias for dev server.
- `npm run test` — Run unit tests.

## Deployment notes

This repository includes Firebase configuration files:
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`

Before deploying, verify environment variables and Firebase project targets.

## Quality expectations

For portfolio presentation quality:
- Keep components focused and reusable.
- Prefer typed service boundaries over ad-hoc data access in UI layers.
- Cover utility logic with tests where practical.
- Maintain readable docs and clear commit history.

## License

This project is licensed under the terms in [LICENSE](./LICENSE).


## Personal narrative

### Why I built this
I built Flashcard Studio to solve my own consistency problem: I had vocabulary notes everywhere, but no reliable review loop. I wanted one workspace where I could import terms quickly and actually practice them in short, focused sessions.

### What I learned
- Product clarity matters as much as code quality; users need a guided first-run experience.
- A small set of well-defined study modes is better than many shallow features.
- Data structure decisions early on (especially around Firestore documents) strongly shape future velocity.

### Tradeoffs I made
- I chose Firebase to ship faster, accepting some platform coupling.
- I prioritized a broad learning workflow (import + study + progress) before deep optimization.
- I kept gamification lightweight so it supports, rather than replaces, real learning outcomes.

## Quick evaluator workflow (5–10 minutes)

Use this path so reviewers can experience the product quickly:

1. Start the app (`npm run dev`) and log in.
2. Go to **Import** and upload `sample-data/flashcards-sample.csv`.
3. Assign one or two categories during import (for example: `work`, `communication`).
4. Open **Library** to confirm cards were saved.
5. Start a session in **Study** using two different modes (e.g., flashcard + multiple choice).
6. Review progress metrics and streak/XP feedback.
7. Optionally generate a worksheet from imported cards.

## Case-study documentation

For product reasoning and roadmap, see:
- [`docs/CASE_STUDY.md`](./docs/CASE_STUDY.md)
