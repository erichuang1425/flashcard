module.exports = {
  preset: 'ts-jest',
  // Default to the lightweight node environment. UI/component/hook tests opt
  // into jsdom per-file with a `@jest-environment jsdom` docblock, so the pure
  // unit tests don't pay for a DOM they don't need.
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Security-rules tests need the Firestore emulator running, so they are not
  // part of the default `npm test`. Run them with `npm run test:rules`, which
  // boots the emulator first (see jest.rules.config.cjs).
  testPathIgnorePatterns: ['/node_modules/', '\\.rules\\.test\\.ts$']
};
