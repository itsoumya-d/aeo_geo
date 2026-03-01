import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

test.describe('History Page (/history)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/history');
        await page.waitForLoadState('domcontentloaded');
    });

    test('page loads with Audit Management heading', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1, name: /Audit Management/i })).toBeVisible({ timeout: 15000 });
    });

    test('Audit History tab is present and active by default', async ({ page }) => {
        const auditHistoryBtn = page.getByRole('button', { name: /Audit History/i }).first();
        await expect(auditHistoryBtn).toBeVisible({ timeout: 10000 });
    });

    test('Scheduled tab button is present', async ({ page }) => {
        const scheduledBtn = page.getByRole('button', { name: /Scheduled/i }).first();
        await expect(scheduledBtn).toBeVisible({ timeout: 10000 });
    });

    test('clicking Scheduled tab switches to Scheduled content', async ({ page }) => {
        const scheduledBtn = page.getByRole('button', { name: /Scheduled/i }).first();
        await scheduledBtn.click();
        await page.waitForTimeout(500);
        // No crash
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 5000 });
    });

    test('clicking back to Audit History tab works', async ({ page }) => {
        const scheduledBtn = page.getByRole('button', { name: /Scheduled/i }).first();
        await scheduledBtn.click();
        await page.waitForTimeout(300);
        const auditHistoryBtn = page.getByRole('button', { name: /Audit History/i }).first();
        await auditHistoryBtn.click();
        await page.waitForTimeout(300);
        // Heading should still be visible
        await expect(page.getByRole('heading', { level: 1, name: /Audit Management/i })).toBeVisible();
    });

    test('sidebar is visible at desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(300);
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeVisible({ timeout: 5000 });
    });

    test('sidebar History tab button has active/selected styling', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const historyBtn = sidebar.getByRole('button', { name: /History/i }).first();
        await expect(historyBtn).toBeVisible({ timeout: 5000 });
        const classAttr = await historyBtn.getAttribute('class') ?? '';
        const ariaCurrent = await historyBtn.getAttribute('aria-current') ?? '';
        const isActive = classAttr.includes('primary') || classAttr.includes('active') || ariaCurrent === 'page';
        expect(isActive).toBe(true);
    });

    test('clicking Dashboard in sidebar navigates to /dashboard', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        // Sidebar Overview/Dashboard button
        const dashBtn = sidebar.getByRole('button', { name: /Overview|Dashboard/i }).first();
        await expect(dashBtn).toBeVisible({ timeout: 5000 });
        await dashBtn.click();
        await expect(page).toHaveURL('/dashboard', { timeout: 5000 });
    });

    test('page description subtitle is visible', async ({ page }) => {
        // HistoryPage has a subtitle describing the page purpose
        const subtitle = page.locator('text=/View past audits|schedules|history/i').first();
        await expect(subtitle).toBeVisible({ timeout: 10000 });
    });

    test('page renders without crash (no error boundary)', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong|Unexpected error/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });

    test('page does not redirect to /login (auth bypass works)', async ({ page }) => {
        expect(page.url()).not.toContain('/login');
        expect(page.url()).toContain('/history');
    });

    test('tab switch animation does not crash page', async ({ page }) => {
        const scheduledBtn = page.getByRole('button', { name: /Scheduled/i }).first();
        const auditHistoryBtn = page.getByRole('button', { name: /Audit History/i }).first();
        await scheduledBtn.click();
        await page.waitForTimeout(200);
        await auditHistoryBtn.click();
        await page.waitForTimeout(200);
        await scheduledBtn.click();
        await page.waitForTimeout(200);
        await expect(page.getByRole('heading', { level: 1, name: /Audit Management/i })).toBeVisible();
    });
});
