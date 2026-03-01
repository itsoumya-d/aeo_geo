/**
 * Visual Screenshot Tests — Dark Mode
 *
 * These tests capture full-page screenshots of every screen in dark mode
 * and compare against stored baselines using Playwright's built-in visual
 * comparison engine.
 *
 * FIRST RUN: Generate baselines with:
 *   npx playwright test visual-screenshots --update-snapshots --project=chromium
 *
 * SUBSEQUENT RUNS: Compare against baselines:
 *   npx playwright test visual-screenshots --project=chromium
 *
 * IMPORTANT: Chromium-only to ensure consistent rendering across runs.
 */

import { test, expect, Page } from '@playwright/test';

// Chromium-only for deterministic screenshots
test.skip(({ browserName }) => browserName !== 'chromium', 'Screenshots: Chromium only');

// Canonical dark-mode desktop viewport
test.use({
    colorScheme: 'dark',
    viewport: { width: 1440, height: 900 },
});

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';
const SCREENSHOT_OPTS = {
    fullPage: true,
    maxDiffPixelRatio: 0.03, // 3% tolerance for anti-aliasing & animation differences
};

async function setupPage(page: Page) {
    // Suppress cookie consent banner
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
    // Ensure dark mode emulation
    await page.emulateMedia({ colorScheme: 'dark' });
}

async function waitForStable(page: Page, extraMs = 800) {
    await page.waitForLoadState('networkidle');
    // Allow framer-motion animations and lazy-loaded images to settle
    await page.waitForTimeout(extraMs);
    // Disable CSS animations for stable screenshots
    await page.addStyleTag({
        content: `
      *, *::before, *::after {
        animation-duration: 0ms !important;
        transition-duration: 0ms !important;
      }
    `,
    });
}

// ─── PUBLIC PAGES ─────────────────────────────────────────────────────────────

test.describe('Visual — Public Pages', () => {
    test('landing page — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('landing-page.png', SCREENSHOT_OPTS);
    });

    test('login page — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/login');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('login-page.png', SCREENSHOT_OPTS);
    });

    test('signup page — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/signup');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('signup-page.png', SCREENSHOT_OPTS);
    });

    test('reset password page — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/reset-password');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('reset-password-page.png', SCREENSHOT_OPTS);
    });

    test('help center — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/help');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('help-center.png', SCREENSHOT_OPTS);
    });

    test('API documentation — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/docs/api');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('api-docs.png', SCREENSHOT_OPTS);
    });

    test('terms of service — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/terms');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('terms-page.png', SCREENSHOT_OPTS);
    });

    test('privacy policy — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/privacy');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('privacy-page.png', SCREENSHOT_OPTS);
    });

    test('404 not found page — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/this-route-does-not-exist-visual-test');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('not-found-page.png', SCREENSHOT_OPTS);
    });
});

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────

// (Login, Signup, Reset Password already captured above in public pages)

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

test.describe('Visual — Onboarding', () => {
    test('onboarding step 1 — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/onboarding');
        // Wait for bootstrap attempt to settle
        await page.waitForTimeout(3000);
        await waitForStable(page, 500);
        await expect(page).toHaveScreenshot('onboarding-step1.png', SCREENSHOT_OPTS);
    });

    test('onboarding step 2 — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/onboarding');
        await page.waitForTimeout(3000);
        const nextBtn = page.getByRole('button', { name: /Next|Continue/i }).first();
        if (await nextBtn.count() > 0) {
            await nextBtn.click();
            await waitForStable(page, 500);
        }
        await expect(page).toHaveScreenshot('onboarding-step2.png', SCREENSHOT_OPTS);
    });

    test('onboarding step 3 — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/onboarding');
        await page.waitForTimeout(3000);
        const nextBtn = page.getByRole('button', { name: /Next|Continue/i }).first();
        if (await nextBtn.count() > 0) {
            await nextBtn.click();
            await page.waitForTimeout(300);
            const skipBtn = page.getByRole('button', { name: /Skip tour|Skip/i }).first();
            if (await skipBtn.count() > 0) {
                await skipBtn.click();
            }
            await waitForStable(page, 500);
        }
        await expect(page).toHaveScreenshot('onboarding-step3.png', SCREENSHOT_OPTS);
    });
});

// ─── DASHBOARD TABS ───────────────────────────────────────────────────────────

test.describe('Visual — Dashboard Tabs', () => {
    const dashboardTabs = [
        { tab: 'overview', file: 'dashboard-overview.png' },
        { tab: 'pages', file: 'dashboard-pages.png' },
        { tab: 'search', file: 'dashboard-search.png' },
        { tab: 'benchmark', file: 'dashboard-benchmark.png' },
        { tab: 'consistency', file: 'dashboard-consistency.png' },
        { tab: 'optimization', file: 'dashboard-optimization.png' },
        { tab: 'sandbox', file: 'dashboard-sandbox.png' },
        { tab: 'reports', file: 'dashboard-reports.png' },
    ];

    for (const { tab, file } of dashboardTabs) {
        test(`dashboard ${tab} tab — dark mode screenshot`, async ({ page }) => {
            await setupPage(page);
            await page.goto(`/dashboard?tab=${tab}`);
            await waitForStable(page);
            await expect(page).toHaveScreenshot(file, SCREENSHOT_OPTS);
        });
    }
});

// ─── ANALYSIS & RESULTS ───────────────────────────────────────────────────────

test.describe('Visual — Analysis & Results', () => {
    test('analysis page (failed/not-found state) — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto(`/analysis/${FAKE_UUID}`);
        // Wait longer for failed state to render
        await page.waitForTimeout(5000);
        await waitForStable(page, 500);
        await expect(page).toHaveScreenshot('analysis-failed.png', SCREENSHOT_OPTS);
    });

    test('results page — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto(`/results/${FAKE_UUID}`);
        await waitForStable(page);
        await expect(page).toHaveScreenshot('results-page.png', SCREENSHOT_OPTS);
    });
});

// ─── HISTORY ─────────────────────────────────────────────────────────────────

test.describe('Visual — History Page', () => {
    test('history — audit history tab — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/history');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('history-audit.png', SCREENSHOT_OPTS);
    });

    test('history — scheduled audits tab — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/history');
        await page.waitForLoadState('domcontentloaded');
        const scheduledBtn = page.getByRole('button', { name: /Scheduled/i }).first();
        if (await scheduledBtn.count() > 0) {
            await scheduledBtn.click();
        }
        await waitForStable(page, 500);
        await expect(page).toHaveScreenshot('history-scheduled.png', SCREENSHOT_OPTS);
    });
});

// ─── SETTINGS TABS ───────────────────────────────────────────────────────────

test.describe('Visual — Settings Tabs', () => {
    const settingsTabs = [
        { url: '/settings', file: 'settings-profile.png' },
        { url: '/settings?tab=security', file: 'settings-security.png' },
        { url: '/settings/billing', file: 'settings-billing.png' },
        { url: '/settings?tab=api', file: 'settings-api.png' },
        { url: '/settings?tab=branding', file: 'settings-branding.png' },
        { url: '/settings?tab=notifications', file: 'settings-notifications.png' },
        { url: '/settings/integrations', file: 'settings-integrations.png' },
        { url: '/settings?tab=domains', file: 'settings-domains.png' },
        { url: '/settings?tab=organization', file: 'settings-organization.png' },
    ];

    for (const { url, file } of settingsTabs) {
        test(`settings ${file.replace('.png', '')} — dark mode screenshot`, async ({ page }) => {
            await setupPage(page);
            await page.goto(url);
            await waitForStable(page);
            await expect(page).toHaveScreenshot(file, SCREENSHOT_OPTS);
        });
    }
});

// ─── REPORT BUILDER ──────────────────────────────────────────────────────────

test.describe('Visual — Report Builder', () => {
    test('report builder page — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/reports/builder');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('report-builder.png', SCREENSHOT_OPTS);
    });
});

// ─── MODALS ──────────────────────────────────────────────────────────────────

test.describe('Visual — Modals & Dialogs', () => {
    test('keyboard shortcuts modal — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        await page.keyboard.press('?');
        await page.waitForTimeout(500);
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        await waitForStable(page, 300);
        await expect(page).toHaveScreenshot('shortcuts-modal.png', SCREENSHOT_OPTS);
        await page.keyboard.press('Escape');
    });

    test('bulk import modal — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        const bulkBtn = page.locator('aside').first().getByRole('button', { name: /Bulk Import/i }).first();
        await expect(bulkBtn).toBeVisible({ timeout: 10000 });
        await bulkBtn.click();
        await page.waitForTimeout(500);
        if (await page.getByRole('dialog').count() > 0) {
            await waitForStable(page, 300);
            await expect(page).toHaveScreenshot('bulk-import-modal.png', SCREENSHOT_OPTS);
            await page.keyboard.press('Escape');
        }
    });
});

// ─── MOBILE VIEWS ────────────────────────────────────────────────────────────

test.describe('Visual — Mobile Dark Mode', () => {
    test('landing page mobile (375px) — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('landing-mobile.png', SCREENSHOT_OPTS);
    });

    test('dashboard mobile (375px) — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/dashboard');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('dashboard-mobile.png', SCREENSHOT_OPTS);
    });

    test('settings mobile (375px) — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/settings');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('settings-mobile.png', SCREENSHOT_OPTS);
    });

    test('help center mobile (375px) — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/help');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('help-center-mobile.png', SCREENSHOT_OPTS);
    });

    test('login page mobile (375px) — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/login');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('login-mobile.png', SCREENSHOT_OPTS);
    });

    test('dashboard tablet (768px) — dark mode screenshot', async ({ page }) => {
        await setupPage(page);
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/dashboard');
        await waitForStable(page);
        await expect(page).toHaveScreenshot('dashboard-tablet.png', SCREENSHOT_OPTS);
    });
});
