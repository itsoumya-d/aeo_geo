import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    testMatch: 'report-template-workflow.spec.ts',
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } } }],
    webServer: {
        command: 'npm run demo:reports',
        url: 'http://127.0.0.1:5174/demo/report-templates.html',
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
