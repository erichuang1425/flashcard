# Flashcard App

This project is a React and Firebase based flashcard application. It uses Vite for development and build tooling.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or newer is recommended)
- [npm](https://www.npmjs.com/)

## Installation

1. Install the project dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and provide your Firebase configuration. This application expects the following variables:

   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

   These values can be obtained from your Firebase console under **Project settings**.

## Running the app

Start the development server with:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000) and automatically reload on changes.

## Testing

Run the unit tests using Jest:

```bash
npm test
```

## Building for production

To generate a production build, run:

```bash
npm run build
```

The output will be placed in the `dist` directory.

## Deploying to Firebase Hosting

1. Install the Firebase CLI if you haven't already:

   ```bash
   npm install -g firebase-tools
   ```

2. Authenticate and deploy:

   ```bash
   firebase login
   firebase deploy
   ```

Update the `target` in `firebase.json` if you want to deploy to a different Firebase project.

