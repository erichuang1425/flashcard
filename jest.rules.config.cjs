// Jest config for Firestore security-rules tests. These run against the
// Firestore emulator (booted by `firebase emulators:exec` — see the
// `test:rules` npm script), separate from the default unit-test run so the
// regular `npm test` needs no emulator.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.rules.test.ts'],
  // The emulator can be slow to answer the first request after boot.
  testTimeout: 20000
};
