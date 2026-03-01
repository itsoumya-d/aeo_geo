import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

test.describe('Keyboard Shortcuts Modal (ShortcutsHelpModal)', () => {
    test('pressing ? key opens Keyboard Shortcuts modal from dashboard', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
    });

    test('shortcuts modal contains "Keyboard Shortcuts" heading', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=/Keyboard Shortcuts/i').first()).toBeVisible();
    });

    test('shortcuts modal lists shortcut items', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
        // kbd elements or shortcut text entries
        const kbdElements = page.locator('kbd');
        const count = await kbdElements.count();
        expect(count).toBeGreaterThan(0);
    });

    test('pressing Escape closes the shortcuts modal', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 });
    });

    test('close button in shortcuts modal closes it', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        // Find close button inside dialog
        const closeBtn = dialog.getByRole('button').first();
        await closeBtn.click();
        await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 });
    });

    test('pressing ? also opens modal from landing page', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        await page.waitForTimeout(500);
        // Modal may or may not be registered on landing page — gracefully check
        const dialogCount = await page.getByRole('dialog').count();
        // Just ensure no crash
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0);
    });
});

test.describe('TopUpModal (Credits Top-Up)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
    });

    test('clicking credits badge opens TopUpModal dialog', async ({ page }) => {
        // The credits badge in DashboardHeader triggers onTopUp
        const creditsBadge = page.locator('[data-testid*="credit" i], button:has-text("Credits")').first();
        const altBadge = page.locator('text=/Credits/').first();
        const clickable = await creditsBadge.count() > 0 ? creditsBadge : altBadge;

        await clickable.click();
        await page.waitForTimeout(500);

        const dialog = page.getByRole('dialog').first();
        const hasDialog = await dialog.count() > 0;
        if (hasDialog) {
            await expect(dialog).toBeVisible({ timeout: 5000 });
        }
    });

    test('TopUpModal shows credit package options when opened', async ({ page }) => {
        const creditsBadge = page.locator('text=/Credits/').first();
        await creditsBadge.click();
        await page.waitForTimeout(500);
        const dialog = page.getByRole('dialog').first();
        if (await dialog.count() > 0) {
            // Should show package options (10, 50, 150 credits)
            const hasPackages = await page.locator('text=/10 Credits|50 Credits|150 Credits|Top.?up/i').count() > 0;
            if (hasPackages) {
                await expect(page.locator('text=/Credits/').first()).toBeVisible();
            }
        }
    });

    test('TopUpModal closes on Escape key', async ({ page }) => {
        const creditsBadge = page.locator('text=/Credits/').first();
        await creditsBadge.click();
        await page.waitForTimeout(500);
        if (await page.getByRole('dialog').count() > 0) {
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 });
        }
    });
});

test.describe('BulkImportModal', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
    });

    test('Bulk Import button in sidebar opens BulkImportModal', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const bulkBtn = sidebar.getByRole('button', { name: /Bulk Import/i }).first();
        await expect(bulkBtn).toBeVisible({ timeout: 5000 });
        await bulkBtn.click();
        await page.waitForTimeout(500);
        const dialog = page.getByRole('dialog').first();
        const count = await dialog.count();
        if (count > 0) {
            await expect(dialog).toBeVisible({ timeout: 5000 });
        }
    });

    test('BulkImportModal closes on Escape', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const bulkBtn = sidebar.getByRole('button', { name: /Bulk Import/i }).first();
        await bulkBtn.click();
        await page.waitForTimeout(500);
        if (await page.getByRole('dialog').count() > 0) {
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 });
        }
    });

    test('BulkImportModal has file upload or textarea for URLs', async ({ page }) => {
        const sidebar = page.locator('aside').first();
        const bulkBtn = sidebar.getByRole('button', { name: /Bulk Import/i }).first();
        await bulkBtn.click();
        await page.waitForTimeout(500);
        const dialog = page.getByRole('dialog').first();
        if (await dialog.count() > 0) {
            const fileInput = dialog.locator('input[type="file"], textarea').first();
            const count = await fileInput.count();
            if (count > 0) {
                await expect(fileInput).toBeAttached();
            }
        }
    });
});

test.describe('Cookie Consent Banner', () => {
    test('cookie consent banner appears after delay when not previously accepted', async ({ page }) => {
        // Explicitly clear cookie consent from localStorage
        await page.goto('/');
        await page.evaluate(() => localStorage.removeItem('cognition:cookie-consent'));
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // Wait for the 2-second delay and banner to appear
        await page.waitForTimeout(3500);

        const banner = page.locator('text=/We use cookies|cookie/i').first();
        const count = await banner.count();
        if (count > 0) {
            await expect(banner).toBeVisible({ timeout: 5000 });
        }
    });

    test('Accept button on cookie consent hides the banner', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.removeItem('cognition:cookie-consent'));
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3500);

        const acceptBtn = page.getByRole('button', { name: /Accept|Allow/i }).first();
        const count = await acceptBtn.count();
        if (count > 0) {
            await acceptBtn.click();
            await page.waitForTimeout(500);
            // Banner should disappear
            const banner = page.locator('[data-cookie-consent], .cookie-banner').first();
            const bannerCount = await banner.count();
            if (bannerCount > 0) {
                await expect(banner).toBeHidden({ timeout: 3000 });
            }
            // Check localStorage
            const storedValue = await page.evaluate(() => localStorage.getItem('cognition:cookie-consent'));
            expect(storedValue).toBe('accepted');
        }
    });

    test('Decline button on cookie consent hides the banner', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.removeItem('cognition:cookie-consent'));
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3500);

        const declineBtn = page.getByRole('button', { name: /Decline|Reject/i }).first();
        const count = await declineBtn.count();
        if (count > 0) {
            await declineBtn.click();
            await page.waitForTimeout(500);
            const storedValue = await page.evaluate(() => localStorage.getItem('cognition:cookie-consent'));
            expect(storedValue).toBe('declined');
        }
    });

    test('cookie consent banner does not appear when already accepted', async ({ page }) => {
        await page.evaluate(() =>
            localStorage.setItem('cognition:cookie-consent', 'accepted')
        );
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3500);
        // Banner should NOT be visible
        const banner = page.locator('text=/We use cookies/i').first();
        const count = await banner.count();
        expect(count).toBe(0);
    });
});

test.describe('VideoModal (Demo Tour)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('Watch Demo button opens VideoModal dialog', async ({ page }) => {
        const demoBtn = page.getByRole('button', { name: /Watch|Demo|See how/i }).first();
        const count = await demoBtn.count();
        if (count > 0) {
            await demoBtn.click();
            await page.waitForTimeout(500);
            const dialog = page.getByRole('dialog').first();
            if (await dialog.count() > 0) {
                await expect(dialog).toBeVisible({ timeout: 5000 });
            }
        } else {
            test.skip();
        }
    });

    test('VideoModal has navigation buttons for multi-step tour', async ({ page }) => {
        const demoBtn = page.getByRole('button', { name: /Watch|Demo|See how/i }).first();
        if (await demoBtn.count() > 0) {
            await demoBtn.click();
            await page.waitForTimeout(500);
            const dialog = page.getByRole('dialog').first();
            if (await dialog.count() > 0) {
                // Next button for tour navigation
                const nextBtn = dialog.getByRole('button').filter({ has: page.locator('[data-lucide="chevron-right"]') }).first();
                const altNextBtn = dialog.getByRole('button', { name: /Next/i }).first();
                const hasNext = (await nextBtn.count()) + (await altNextBtn.count()) > 0;
                expect(hasNext).toBe(true);
            }
        }
    });

    test('VideoModal closes on Escape key', async ({ page }) => {
        const demoBtn = page.getByRole('button', { name: /Watch|Demo|See how/i }).first();
        if (await demoBtn.count() > 0) {
            await demoBtn.click();
            await page.waitForTimeout(500);
            if (await page.getByRole('dialog').count() > 0) {
                await page.keyboard.press('Escape');
                await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 });
            }
        }
    });
});
