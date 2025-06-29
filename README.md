# Flashcard App

A flashcard web application built with [React](https://reactjs.org/), [Vite](https://vitejs.dev/) and [Firebase](https://firebase.google.com/). It allows you to create, import and study flashcards with optional translation support via Google Cloud.

## Requirements
- Node.js 18+
- npm

## Getting Started
1. Copy `.env.example` to `.env` and fill in your Firebase and Google Cloud credentials.
   The application expects `VITE_GOOGLE_TRANSLATE_API_KEY` for translation features.
2. Install dependencies:
   ```bash
   npm install
   cd functions && npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production
```
npm run build
```
The compiled app will be placed in the `dist/` directory.

### Firebase Functions
Functions source code lives under `functions/`. A legacy copy exists in `functions1425/` but is not required.
Use the Firebase CLI to emulate or deploy cloud functions:
```
cd functions
npm run build
firebase deploy --only functions
```

## Documentation
Additional documentation can be found in the [docs](docs/) directory.

## License
This project is licensed under the terms of the ISC license. See the [LICENSE](LICENSE) file for details.
