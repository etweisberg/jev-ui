import { defineConfig, devices } from '@playwright/test';

/**
 * The demo runs under JEV_TRANSPORT=replay, so every page is deterministic and no API
 * key is needed. The absence of a key in this environment is itself the proof that
 * replay is genuinely serving the judgments rather than quietly going live.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3111',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run --filter demo dev',
    url: 'http://localhost:3111',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      JEV_TRANSPORT: 'replay',
      // Deliberately absent: TYPESAFE_API_KEY. Replay must not need it.
    },
  },
});
