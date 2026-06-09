module.exports = {
  preset: 'ts-jest',
  // Default to the lightweight node environment. UI/component/hook tests opt
  // into jsdom per-file with a `@jest-environment jsdom` docblock, so the pure
  // unit tests don't pay for a DOM they don't need.
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
};
