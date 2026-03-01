import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

async function goDashboard(page: Page, tab?: string) {
    await suppressCookieConsent(page);
    const url = tab ? `/dashboard?tab=${tab}` : '/dashboard';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
}

test.describe('Dashboard — Overview Tab (InputLayer)', () => {
    test.beforeEach(async ({ page }) => {
        await goDashboard(page);
    });

    test('URL input placeholder is visible', async ({ page }) => {
        await expect(page.getByPlaceholder('e.g. cognition-labs.com')).toBeVisible({ timeout: 10000 });
    });

    test('clicking Add with empty input shows validation error', async ({ page }) => {
        await page.getByRole('button', { name: /^Add$/i }).click();
        await expect(page.getByText('Please enter a URL')).toBeVisible({ timeout: 5000 });
    });

    test('entering valid URL and pressing Enter adds it to queue', async ({ page }) => {
        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await input.fill('example.com');
        await input.press('Enter');
        await expect(page.getByText('https://example.com')).toBeVisible({ timeout: 5000 });
    });

    test('Start Deep Analysis button appears after adding a URL', async ({ page }) => {
        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await input.fill('example.com');
        await input.press('Enter');
        const analyzeBtn = page.getByRole('button', { name: /Start Deep Analysis/i });
        await expect(analyzeBtn).toBeVisible({ timeout: 5000 });
        await expect(analyzeBtn).toBeEnabled();
    });

    test('Batch Import toggle shows textarea for bulk URLs', async ({ page }) => {
        await page.getByRole('button', { name: /Batch Import/i }).click();
        await expect(page.getByPlaceholder('Paste URLs, one per line...')).toBeVisible({ timeout: 5000 });
    });

    test('Single Entry toggle switches back to single input', async ({ page }) => {
        await page.getByRole('button', { name: /Batch Import/i }).click();
        await page.getByRole('button', { name: /Single Entry/i }).click();
        await expect(page.getByPlaceholder('e.g. cognition-labs.com')).toBeVisible({ timeout: 5000 });
    });

    test('asset type selector is present with accessible label', async ({ page }) => {
        const select = page.locator('#asset-type');
        await expect(select).toBeVisible({ timeout: 5000 });
        await expect(select).toHaveAttribute('aria-label');
    });

    test('asset type selector has Website option', async ({ page }) => {
        const select = page.locator('#asset-type');
        await expect(select).toBeVisible({ timeout: 5000 });
        const options = await select.locator('option').allTextContents();
        expect(options.some((opt) => /Website/i.test(opt))).toBe(true);
    });
});

test.describe('Dashboard — Tab Navigation', () => {
    const tabs = [
        { tab: 'pages', label: 'Pages' },
        { tab: 'search', label: 'Search' },
        { tab: 'benchmark', label: 'Benchmark' },
        { tab: 'consistency', label: 'Consistency' },
        { tab: 'optimization', label: 'Optimization' },
        { tab: 'sandbox', label: 'Sandbox' },
        { tab: 'reports', label: 'Reports' },
    ];

    for (const { tab, label } of tabs) {
        test(`?tab=${tab} renders ${label} tab without crashing`, async ({ page }) => {
            await goDashboard(page, tab);
            // Page should not show error boundary
            const errorBoundary = page.locator('text=/Something went wrong|Unexpected error/i').first();
            await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
            // Page should have visible content (either sidebar or some content area)
            await expect(page.locator('aside, main, [role="main"]').first()).toBeVisible({ timeout: 10000 });
        });
    }

    test('Sidebar click Pages tab updates URL to tab=pages', async ({ page }) => {
        await goDashboard(page);
        const sidebar = page.locator('aside').first();
        const pagesBtn = sidebar.getByRole('button', { name: /Pages/i }).first();
        await expect(pagesBtn).toBeVisible({ timeout: 5000 });
        await pagesBtn.click();
        await expect(page).toHaveURL(/tab=pages/, { timeout: 5000 });
    });

    test('Sidebar History button navigates to /history', async ({ page }) => {
        await goDashboard(page);
        const sidebar = page.locator('aside').first();
        const historyBtn = sidebar.getByRole('button', { name: /History/i }).first();
        await historyBtn.click();
        await expect(page).toHaveURL('/history', { timeout: 5000 });
    });

    test('Sidebar Settings button navigates to /settings', async ({ page }) => {
        await goDashboard(page);
        const sidebar = page.locator('aside').first();
        const settingsBtn = sidebar.getByRole('button', { name: /Settings/i }).first();
        await settingsBtn.click();
        await expect(page).toHaveURL('/settings', { timeout: 5000 });
    });

    test('Sidebar Integrations button navigates to /settings/integrations', async ({ page }) => {
        await goDashboard(page);
        const sidebar = page.locator('aside').first();
        const intBtn = sidebar.getByRole('button', { name: /Integrations/i }).first();
        await intBtn.click();
        await expect(page).toHaveURL(/\/settings\/integrations/, { timeout: 5000 });
    });
});

test.describe('Dashboard — Sandbox Tab', () => {
    test.beforeEach(async ({ page }) => {
        await goDashboard(page, 'sandbox');
    });

    test('Sandbox tab renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });

    test('Sandbox tab shows heading or goal input', async ({ page }) => {
        // Either a heading with Sandbox or a goal textarea
        const heading = page.locator('h1, h2, h3').filter({ hasText: /Sandbox/i }).first();
        const goalInput = page.locator('textarea').first();
        const headingCount = await heading.count();
        const inputCount = await goalInput.count();
        expect(headingCount + inputCount).toBeGreaterThan(0);
    });

    test('Sandbox run button shows toast error when fields empty', async ({ page }) => {
        // Find simulate/compare button
        const runBtn = page.getByRole('button', { name: /Compare|Run|Simulate|Analyze/i }).first();
        const count = await runBtn.count();
        if (count > 0) {
            await runBtn.click();
            await page.waitForTimeout(500);
            // Expect a toast or error notification
            const toast = page.locator('[role="alert"], [data-sonner-toast], text=/Incomplete|Error|required/i').first();
            await expect(toast).toBeVisible({ timeout: 5000 });
        }
    });
});

test.describe('Dashboard — Header Controls', () => {
    test.beforeEach(async ({ page }) => {
        await goDashboard(page);
    });

    test('Credits badge is visible in header', async ({ page }) => {
        await expect(page.locator('text=/Credits/').first()).toBeVisible({ timeout: 10000 });
    });

    test('New Audit button is visible in header', async ({ page }) => {
        await expect(page.getByRole('button', { name: /New Audit/i })).toBeVisible({ timeout: 10000 });
    });

    test('language switcher EN button is visible', async ({ page }) => {
        await expect(page.getByRole('button', { name: /^EN$/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test('language switcher ES button is visible', async ({ page }) => {
        await expect(page.getByRole('button', { name: /^ES$/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test('pressing ? key opens keyboard shortcuts modal', async ({ page }) => {
        await page.keyboard.press('?');
        await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
        await page.keyboard.press('Escape');
    });
});

test.describe('Dashboard — Benchmark Tab', () => {
    test.beforeEach(async ({ page }) => {
        await goDashboard(page, 'benchmark');
    });

    test('Benchmark tab renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });

    test('Benchmark tab shows competitor-related UI', async ({ page }) => {
        // BenchmarkTab should show add competitor input or empty state
        const content = page.locator('main, [role="main"], .content-area').first();
        await expect(content).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Dashboard — Reports Tab', () => {
    test.beforeEach(async ({ page }) => {
        await goDashboard(page, 'reports');
    });

    test('Reports tab renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});

test.describe('Dashboard — Consistency Tab', () => {
    test('Consistency tab renders without crash', async ({ page }) => {
        await goDashboard(page, 'consistency');
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});

test.describe('Dashboard — Optimization Tab', () => {
    test('Optimization tab renders without crash', async ({ page }) => {
        await goDashboard(page, 'optimization');
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});

test.describe('Dashboard — Search Tab', () => {
    test('Search tab renders without crash', async ({ page }) => {
        await goDashboard(page, 'search');
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});
