import { defineConfig } from 'vitest/config';

// Component tests with Material and user-event take a few seconds on a cold, busy runner.
export default defineConfig({
  test: {
    testTimeout: 15_000,
  },
});
