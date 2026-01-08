import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E configuration for AI Leak Checker extension.
 * 
 * Tests load the extension in Chrome and verify behavior on real AI chat sites.
 * Note: Some tests may require network access to ChatGPT/Claude.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Extension tests need sequential execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for extension testing
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    actionTimeout: 15000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Load extension in Chrome
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.join(__dirname, 'dist')}`,
            `--load-extension=${path.join(__dirname, 'dist')}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
    },
  ],
  // Build extension before running tests
  webServer: {
    command: 'npm run build',
    reuseExistingServer: true,
    timeout: 120000,
  },
  // Output directory for test artifacts
  outputDir: 'test-results',
});
