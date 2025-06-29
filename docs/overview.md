# Project Overview

This repository contains the source code for the Flashcard application. The project is divided into two main parts:

- **Web App** (`src/`): a React application bootstrapped with Vite.
- **Cloud Functions** (`functions/`): Firebase Functions written in TypeScript.

## Directory Structure
- `public/` – static assets served by the web app
- `src/` – React components, pages and services
- `functions/` – backend Cloud Functions
- `dist/` – production build output

## Development
Use Node.js 18 or later. After installing dependencies and creating a `.env` file, start the development server with `npm run dev`.

For details on deploying Firebase Functions, see the commands in the root `README.md`.
