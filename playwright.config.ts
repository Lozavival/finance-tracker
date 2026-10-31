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
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
      testMatch: /(transaction-lifecycle|accounts-lifecycle|search|i18n-theming)\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
      },
      testMatch: /(transaction-lifecycle|accounts-lifecycle|search|i18n-theming)\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'node_modules/.bin/vite --port 8444 --logLevel silent',
    port: 8444,
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: 'data/finance-tracker.e2e.db',
      PORT: '8444',
    },
    stdout: 'ignore',
    stderr: 'pipe',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
