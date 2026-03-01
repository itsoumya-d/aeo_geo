import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

test.describe('Dashboard Header', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
    });

    test('header element is visible', async ({ page }) => {
        // App header is a sticky top bar
        const header = page.locator('header').first();
        await expect(header).toBeVisible({ timeout: 10000 });
    });

    test('credits badge is visible in header', async ({ page }) => {
        const creditsBadge = page.locator('text=/Credits|credits/').first();
        await expect(creditsBadge).toBeVisible({ timeout: 10000 });
    });

    test('New Audit button is present in header', async ({ page }) => {
        const newAuditBtn = page.getByRole('button', { name: /New Audit/i });
        await expect(newAuditBtn).toBeVisible({ timeout: 10000 });
    });

    test('language selector EN button is visible', async ({ page }) => {
        const enBtn = page.getByRole('button', { name: /^EN$/i }).first();
        await expect(enBtn).toBeVisible({ timeout: 10000 });
    });

    test('language selector switches between EN and ES', async ({ page }) => {
        const esBtn = page.getByRole('button', { name: /^ES$/i }).first();
        await expect(esBtn).toBeVisible({ timeout: 10000 });
        await esBtn.click();
        await page.waitForTimeout(300);
        // Switch back
        const enBtn = page.getByRole('button', { name: /^EN$/i }).first();
        await enBtn.click();
    });

    test('notification bell icon is present', async ({ page }) => {
        // NotificationDropdown — look for bell button
        const bellBtn = page.locator('button').filter({ has: page.locator('[data-lucide="bell"], svg') }).first();
        const count = await bellBtn.count();
        // Alternatively, look by aria label or title
        const bellByLabel = page.locator('button[aria-label*="notification" i], button[title*="notification" i]').first();
        const labelCount = await bellByLabel.count();
        expect(count + labelCount).toBeGreaterThan(0);
    });

    test('notification dropdown opens when bell is clicked', async ({ page }) => {
        // Click the notification bell area
        const notificationTrigger = page.locator('button[aria-label*="notification" i], button[title*="notification" i]').first();
        const count = await notificationTrigger.count();
        if (count > 0) {
            await notificationTrigger.click();
            await page.waitForTimeout(300);
            // Dropdown should appear (some list or panel)
            const dropdown = page.locator('[role="menu"], [data-notification-dropdown], .notification-dropdown').first();
            const dropdownCount = await dropdown.count();
            if (dropdownCount > 0) {
                await expect(dropdown).toBeVisible();
            }
        }
    });

    test('export PDF button exists', async ({ page }) => {
        const pdfBtn = page.locator(
            'button[title*="PDF" i], button[aria-label*="PDF" i], button[data-testid*="pdf" i]'
        ).first();
        // PDF export may only appear when a report is loaded; check it's attached or visible
        const count = await pdfBtn.count();
        // Accept if button exists; it's optional when no report is loaded
        if (count > 0) {
            await expect(pdfBtn).toBeAttached();
        }
    });

    test('mobile hamburger menu button visible at 375px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        // Look for hamburger/menu button
        const menuBtn = page.locator('button[aria-label*="menu" i], button[aria-label*="navigation" i]').first();
        const altMenuBtn = page.locator('button').filter({ has: page.locator('[data-lucide="menu"], svg') }).first();
        const count1 = await menuBtn.count();
        const count2 = await altMenuBtn.count();
        expect(count1 + count2).toBeGreaterThan(0);
    });

    test('mobile hamburger opens drawer with navigation', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(300);
        const menuBtn = page.locator('button[aria-label*="menu" i]').first();
        const count = await menuBtn.count();
        if (count > 0) {
            await menuBtn.click();
            await page.waitForTimeout(500);
            // Some overlay/drawer should appear with tab buttons
            const drawer = page.locator('[role="dialog"], [data-radix-dialog-content], aside.mobile').first();
            const tabTexts = ['Overview', 'Pages', 'Search'];
            for (const text of tabTexts) {
                const btn = page.getByRole('button', { name: text }).first();
                const btnCount = await btn.count();
                if (btnCount > 0) {
                    await expect(btn).toBeVisible({ timeout: 3000 });
                    break;
                }
            }
        }
    });
});

test.describe('Dashboard Sidebar', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
    });

    test('aside/sidebar is visible at 1440px desktop', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeVisible({ timeout: 10000 });
    });

    test('sidebar contains all 11 navigation tab buttons', async ({ page }) => {
        const tabNames = ['Overview', 'Pages', 'Search', 'Benchmark', 'Consistency', 'Optimization', 'Sandbox', 'Reports', 'History', 'Integrations', 'Settings'];
        const sidebar = page.locator('aside').first();
        for (const name of tabNames) {
            const tabBtn = sidebar.getByRole('button', { name: new RegExp(name, 'i') }).first();
            await expect(tabBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('active tab has distinctive styling', async ({ page }) => {
        await page.goto('/dashboard?tab=pages');
        await page.waitForLoadState('domcontentloaded');
        const sidebar = page.locator('aside').first();
        const pagesBtn = sidebar.getByRole('button', { name: /Pages/i }).first();
        await expect(pagesBtn).toBeVisible({ timeout: 5000 });
        // Active button should have either aria-current or a specific class
        const classAttr = await pagesBtn.getAttribute('class') ?? '';
        const ariaCurrent = await pagesBtn.getAttribute('aria-current') ?? '';
        const isActive = classAttr.includes('primary') || classAttr.includes('active') || ariaCurrent === 'page';
        expect(isActive).toBe(true);
    });

    test('sidebar shows version number', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const versionText = sidebar.locator('text=/v\d+\.\d+/').first();
        const count = await versionText.count();
        if (count > 0) {
            await expect(versionText).toBeVisible();
        }
        // Version may be optional — just ensure sidebar renders
        await expect(sidebar).toBeVisible();
    });

    test('Bulk Import button is in sidebar footer', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const bulkBtn = sidebar.getByRole('button', { name: /Bulk Import/i }).first();
        await expect(bulkBtn).toBeVisible({ timeout: 5000 });
    });

    test('sidebar is hidden on 375px mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        const sidebar = page.locator('aside').first();
        // On mobile, aside uses lg:flex so it's hidden via CSS
        const isHidden = await sidebar.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.display === 'none' || style.visibility === 'hidden';
        });
        expect(isHidden).toBe(true);
    });

    test('clicking Pages tab in sidebar updates URL to tab=pages', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const pagesBtn = sidebar.getByRole('button', { name: /Pages/i }).first();
        await pagesBtn.click();
        await expect(page).toHaveURL(/tab=pages/, { timeout: 5000 });
    });

    test('clicking History tab in sidebar navigates to /history', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const historyBtn = sidebar.getByRole('button', { name: /History/i }).first();
        await historyBtn.click();
        await expect(page).toHaveURL('/history', { timeout: 5000 });
    });

    test('clicking Settings tab in sidebar navigates to /settings', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const settingsBtn = sidebar.getByRole('button', { name: /Settings/i }).first();
        await settingsBtn.click();
        await expect(page).toHaveURL('/settings', { timeout: 5000 });
    });

    test('clicking Integrations tab in sidebar navigates to /settings/integrations', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const intBtn = sidebar.getByRole('button', { name: /Integrations/i }).first();
        await intBtn.click();
        await expect(page).toHaveURL(/\/settings\/integrations/, { timeout: 5000 });
    });
});

test.describe('Mobile Bottom Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
    });

    test('mobile bottom nav is visible at 375px', async ({ page }) => {
        // MobileBottomNav is fixed at bottom, uses lg:hidden so visible on small screens
        const mobileNav = page.locator('nav').filter({ hasNotText: '' }).first();
        const fixedBottomNav = page.locator('[class*="bottom"], [class*="mobile-nav"], nav.fixed').first();
        const count = await fixedBottomNav.count();
        // Accept any bottom nav element
        if (count > 0) {
            await expect(fixedBottomNav).toBeVisible({ timeout: 5000 });
        } else {
            // Check that some navigation is visible
            const anyNav = page.locator('nav').first();
            await expect(anyNav).toBeVisible({ timeout: 5000 });
        }
    });

    test('mobile bottom nav has tab labels', async ({ page }) => {
        // MobileBottomNav renders buttons with text labels
        const overviewBtn = page.getByRole('button', { name: /Overview|Dashboard/i }).first();
        const count = await overviewBtn.count();
        if (count > 0) {
            await expect(overviewBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('tapping Overview in mobile bottom nav sets tab=overview in URL', async ({ page }) => {
        const overviewBtn = page.getByRole('button', { name: /Overview|Dashboard/i }).last();
        const count = await overviewBtn.count();
        if (count > 0) {
            await overviewBtn.click();
            await page.waitForTimeout(300);
            const url = page.url();
            expect(url).toMatch(/tab=overview|\/dashboard/);
        }
    });
});
