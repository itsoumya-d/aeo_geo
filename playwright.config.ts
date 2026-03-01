import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Global per-test timeout (ms). Visual/screenshot tests are slower than
     functional tests, so we bump from 60 s to 90 s. */
  timeout: 90000,
  /* Default assertion timeout (ms). Lazy-loaded pages need more time than the
     Playwright default of 5 s to resolve their Suspense boundaries. */
  expect: { timeout: 15000 },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Capture screenshot on failure for debugging */
    screenshot: 'only-on-failure',

    /* Record video on first retry for debugging */
    video: 'on-first-retry',

    /* Enforce dark color scheme globally — the app ships a dark theme */
    colorScheme: 'dark',

    /* Canonical desktop viewport for screenshot baselines */
    viewport: { width: 1440, height: 900 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], colorScheme: 'dark' },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], colorScheme: 'dark' },
    },

    /* Mobile projects — scoped to responsive-mobile spec only */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], colorScheme: 'dark' },
      testMatch: '**/responsive-mobile.spec.ts',
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'], colorScheme: 'dark' },
      testMatch: '**/responsive-mobile.spec.ts',
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      VITE_E2E_AUTH_BYPASS: process.env.VITE_E2E_AUTH_BYPASS ?? 'true',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'anon',
    },
  },
});
