import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/flows',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  use: {
    baseURL: 'http://localhost:8444',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'DATABASE_PATH="data/finance-tracker.e2e.db" PORT=8444 node_modules/.bin/vite --port 8444',
    port: 8444,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
