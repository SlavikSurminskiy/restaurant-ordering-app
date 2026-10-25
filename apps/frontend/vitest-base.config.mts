import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Component tests with Material and user-event take a few seconds on a cold, busy runner.
    testTimeout: 30_000,
    // Node's own `localStorage` (on by default since Node 25) is `undefined` without
    // `--localstorage-file` and hides jsdom's, which the cart store needs.
    execArgv: ['--no-experimental-webstorage'],
  },
});
