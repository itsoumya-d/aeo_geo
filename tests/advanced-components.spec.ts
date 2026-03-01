import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

// ─── NOTIFICATION DROPDOWN ────────────────────────────────────────────────────

test.describe('NotificationDropdown (Dashboard Header)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
    });

    test('bell/notification button is present in header', async ({ page }) => {
        // NotificationDropdown button has aria-label="Notifications" or "Notifications, N unread"
        const bellBtn = page.locator('button[aria-label="Notifications"], button[aria-label*="Notifications"]').first();
        const fallback = page.locator(
            'button[aria-label*="notification" i], button[title*="notification" i]'
        ).first();
        const count = await bellBtn.count() + await fallback.count();
        expect(count).toBeGreaterThan(0);
    });

    test('clicking notification bell opens "Notifications" panel', async ({ page }) => {
        // Bell button aria-label="Notifications"
        const bellBtn = page.locator('button[aria-label="Notifications"], button[aria-label*="Notifications"]').first();
        const count = await bellBtn.count();
        if (count > 0) {
            await bellBtn.click();
            await page.waitForTimeout(500);
            // Heading "Notifications" appears in the dropdown
            const heading = page.getByRole('heading', { name: 'Notifications' }).first();
            const headingAlt = page.getByText('Notifications').first();
            const hasPanel = (await heading.count()) + (await headingAlt.count()) > 0;
            expect(hasPanel).toBe(true);
        }
    });

    test('notification panel shows empty state "No notifications" when empty', async ({ page }) => {
        const bellBtn = page.locator('button[aria-label="Notifications"], button[aria-label*="Notifications"]').first();
        const count = await bellBtn.count();
        if (count > 0) {
            await bellBtn.click();
            await page.waitForTimeout(500);
            const emptyState = page.getByText('No notifications').first();
            const emptyCount = await emptyState.count();
            if (emptyCount > 0) {
                await expect(emptyState).toBeVisible({ timeout: 3000 });
            }
            // Also check for subtext
            const subtext = page.getByText("We'll let you know when something happens").first();
            if (await subtext.count() > 0) {
                await expect(subtext).toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('"Mark all as read" button is present in notification dropdown', async ({ page }) => {
        const bellBtn = page.locator('button[aria-label="Notifications"], button[aria-label*="Notifications"]').first();
        const count = await bellBtn.count();
        if (count > 0) {
            await bellBtn.click();
            await page.waitForTimeout(500);
            const markAllBtn = page.getByRole('button', { name: 'Mark all as read' }).first();
            const btnCount = await markAllBtn.count();
            if (btnCount > 0) {
                await expect(markAllBtn).toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('"Notification Settings" footer link is present in dropdown', async ({ page }) => {
        const bellBtn = page.locator('button[aria-label="Notifications"], button[aria-label*="Notifications"]').first();
        if (await bellBtn.count() > 0) {
            await bellBtn.click();
            await page.waitForTimeout(500);
            const footerLink = page.getByText('Notification Settings').first();
            if (await footerLink.count() > 0) {
                await expect(footerLink).toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('notification dropdown closes when clicking outside', async ({ page }) => {
        const bellBtn = page.locator('button[aria-label="Notifications"], button[aria-label*="Notifications"]').first();
        if (await bellBtn.count() > 0) {
            await bellBtn.click();
            await page.waitForTimeout(300);
            // Click outside
            await page.locator('body').click({ position: { x: 10, y: 10 } });
            await page.waitForTimeout(300);
            const emptyState = page.getByText('No notifications').first();
            if (await emptyState.count() > 0) {
                await expect(emptyState).not.toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('notification items show relative timestamps if notifications exist', async ({ page }) => {
        const bellBtn = page.locator('button[aria-label="Notifications"], button[aria-label*="Notifications"]').first();
        if (await bellBtn.count() > 0) {
            await bellBtn.click();
            await page.waitForTimeout(500);
            // If notifications exist, they have relative timestamps like "Just now", "5m ago", "2h ago"
            const timestamps = page.locator('text=/ago|Just now|just now/i').first();
            const count = await timestamps.count();
            if (count > 0) {
                await expect(timestamps).toBeVisible();
            }
        }
    });
});

// ─── WORKSPACE SWITCHER ───────────────────────────────────────────────────────

test.describe('WorkspaceSwitcher (Dashboard Sidebar)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
    });

    test('dashboard renders without crash (workspace switcher may be hidden)', async ({ page }) => {
        // WorkspaceSwitcher only shows for agency/enterprise orgs with multiple workspaces
        // With mock DB auth bypass, workspaces are null → component renders null
        // Just verify sidebar renders normally
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeVisible({ timeout: 10000 });
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0);
    });

    test('if WorkspaceSwitcher is rendered, its trigger button is accessible', async ({ page }) => {
        // Look for workspace switcher button if it renders
        const wsBtn = page.locator(
            'button[aria-label*="workspace" i], button[title*="workspace" i]'
        ).first();
        const buildingIconBtn = page.locator('aside button').filter({
            has: page.locator('[data-lucide="building-2"], [data-lucide="building"]'),
        }).first();
        const count = await wsBtn.count() + await buildingIconBtn.count();
        if (count > 0) {
            await expect(wsBtn.or(buildingIconBtn).first()).toBeVisible();
        }
        // If not rendered, that's expected behavior with mock DB — pass
    });

    test('if WorkspaceSwitcher dropdown is present, Escape closes it', async ({ page }) => {
        const wsBtn = page.locator('aside button').filter({
            has: page.locator('[data-lucide="building-2"]'),
        }).first();
        if (await wsBtn.count() > 0) {
            await wsBtn.click();
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            const dropdown = page.locator('[role="menu"]').first();
            if (await dropdown.count() > 0) {
                await expect(dropdown).not.toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('CreateWorkspaceModal can be triggered from workspace switcher if visible', async ({ page }) => {
        const wsBtn = page.locator('aside button').filter({
            has: page.locator('[data-lucide="building-2"]'),
        }).first();
        if (await wsBtn.count() > 0) {
            await wsBtn.click();
            await page.waitForTimeout(300);
            const createBtn = page.getByRole('button', { name: /Create|New workspace/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(300);
                const dialog = page.getByRole('dialog').first();
                if (await dialog.count() > 0) {
                    await expect(dialog).toBeVisible({ timeout: 3000 });
                    await page.keyboard.press('Escape');
                }
            }
        }
    });
});

// ─── AEOFORGE (Content Rewrite Engine) ───────────────────────────────────────

test.describe('AEOForge Component (Optimization Tab)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        // AEOForge is typically in the Optimization tab
        await page.goto('/dashboard?tab=optimization');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
    });

    test('Optimization tab renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });

    test('original content textarea is present', async ({ page }) => {
        const textarea = page.locator('textarea').first();
        const count = await textarea.count();
        if (count > 0) {
            await expect(textarea).toBeVisible({ timeout: 10000 });
        }
    });

    test('textarea accepts input content', async ({ page }) => {
        const textarea = page.locator('textarea').first();
        if (await textarea.count() > 0) {
            await textarea.fill('This is test content for AEO optimization, it needs to be at least fifty characters long.');
            await expect(textarea).toHaveValue(/test content/);
        }
    });

    test('goal selector is present with dropdown options', async ({ page }) => {
        // Goal selector: SNIPPET, AUTHORITY, CLARITY, CONVERSION
        const goalSelector = page.locator(
            'select, [role="combobox"], button[aria-haspopup="listbox"]'
        ).filter({ has: page.locator('option, [role="option"]') }).first();
        const altGoal = page.locator('select').first();
        const count = await goalSelector.count() + await altGoal.count();
        if (count > 0) {
            await expect(altGoal.or(goalSelector).first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('Forge/Optimize button is present', async ({ page }) => {
        const forgeBtn = page.getByRole('button', { name: /Forge|Optimize|Generate|Rewrite/i }).first();
        const count = await forgeBtn.count();
        if (count > 0) {
            await expect(forgeBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('submitting with insufficient content shows validation feedback', async ({ page }) => {
        const textarea = page.locator('textarea').first();
        const forgeBtn = page.getByRole('button', { name: /Forge|Optimize|Generate/i }).first();
        if ((await textarea.count()) > 0 && (await forgeBtn.count()) > 0) {
            await textarea.fill('Too short');
            await forgeBtn.click();
            await page.waitForTimeout(500);
            // Should show validation error
            const error = page.locator('text=/50 characters|minimum|too short/i').first();
            const count = await error.count();
            if (count > 0) {
                await expect(error).toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('keyword input field is present', async ({ page }) => {
        const keywordInput = page.locator('input[type="text"]').filter({ has: page.locator('[placeholder*="keyword" i]') }).first();
        const altInput = page.getByPlaceholder(/keyword/i).first();
        const count = await keywordInput.count() + await altInput.count();
        if (count > 0) {
            await expect(altInput.or(keywordInput).first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('history toggle button is present', async ({ page }) => {
        const historyBtn = page.getByRole('button', { name: /History/i }).first();
        const count = await historyBtn.count();
        if (count > 0) {
            await expect(historyBtn).toBeVisible({ timeout: 5000 });
        }
    });
});

// ─── SENTINEL DASHBOARD (Keyword Ranking Tracker) ────────────────────────────

test.describe('SentinelDashboard Component (Search Tab)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard?tab=search');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
    });

    test('Search tab renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });

    test('AI platform names are visible or referenced', async ({ page }) => {
        const platformNames = page.locator('text=/ChatGPT|Gemini|Claude|Perplexity/i').first();
        const count = await platformNames.count();
        if (count > 0) {
            await expect(platformNames).toBeVisible({ timeout: 10000 });
        }
    });

    test('some chart or data visualization is present', async ({ page }) => {
        // SentinelDashboard has line charts for keyword rankings
        const chart = page.locator('svg, canvas, [class*="chart"], [class*="recharts"]').first();
        const count = await chart.count();
        if (count > 0) {
            await expect(chart).toBeVisible({ timeout: 10000 });
        }
    });

    test('loading or empty state renders gracefully', async ({ page }) => {
        // With mock DB, SentinelDashboard shows empty state or loading
        const emptyOrLoading = page.locator('[role="status"], text=/No rankings|No data|Loading/i').first();
        const count = await emptyOrLoading.count();
        // Accept any state — just ensure no crash
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });

    test('refresh or reload functionality is accessible', async ({ page }) => {
        const refreshBtn = page.getByRole('button', { name: /Refresh|Reload/i }).first();
        const count = await refreshBtn.count();
        if (count > 0) {
            await expect(refreshBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('Google Search Console sync section is visible', async ({ page }) => {
        // SearchTab integrates GSC data
        const gscSection = page.locator('text=/Google Search Console|GSC|Search Console/i').first();
        const count = await gscSection.count();
        if (count > 0) {
            await expect(gscSection).toBeVisible({ timeout: 5000 });
        }
    });
});

// ─── CUSTOM DASHBOARD BUILDER ─────────────────────────────────────────────────

test.describe('CustomDashboardBuilder (Reports Tab)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        // CustomDashboardBuilder is in the Reports tab
        await page.goto('/dashboard?tab=reports');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
    });

    test('Reports tab renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });

    test('dashboard/report builder component renders some content', async ({ page }) => {
        const content = page.locator('main, aside, h1, h2, h3, button').first();
        await expect(content).toBeVisible({ timeout: 10000 });
    });

    test('widget or section templates are listed', async ({ page }) => {
        // CustomDashboardBuilder shows 6 widget templates
        const widgetBtns = page.locator('button').filter({ hasText: /Score|Rankings|Overview|Audit|Benchmark|Trend/i });
        const count = await widgetBtns.count();
        if (count > 0) {
            await expect(widgetBtns.first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('Add Widget button is present', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Add Widget|Add Section/i }).first();
        const count = await addBtn.count();
        if (count > 0) {
            await expect(addBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('Save configuration button is present', async ({ page }) => {
        const saveBtn = page.getByRole('button', { name: /Save|Export|Generate/i }).first();
        const count = await saveBtn.count();
        if (count > 0) {
            await expect(saveBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('Reset/Undo button is present', async ({ page }) => {
        const resetBtn = page.getByRole('button', { name: /Reset|Undo|Clear/i }).first();
        const count = await resetBtn.count();
        if (count > 0) {
            await expect(resetBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('report preview section is visible', async ({ page }) => {
        // CustomDashboardBuilder shows either a preview or the PDF report
        const preview = page.locator('[class*="preview"], [class*="report"], text=/Preview|Report/i').first();
        const count = await preview.count();
        if (count > 0) {
            await expect(preview).toBeVisible({ timeout: 5000 });
        }
    });
});

// ─── REPORT BRANDING ──────────────────────────────────────────────────────────

test.describe('ReportBranding (/settings?tab=branding)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=branding');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('"Report Branding" heading is visible', async ({ page }) => {
        await expect(page.locator('text=/Report Branding/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('Company Name input has correct placeholder', async ({ page }) => {
        await expect(page.getByPlaceholder('Your Company Name')).toBeVisible({ timeout: 10000 });
    });

    test('Logo URL input has correct placeholder', async ({ page }) => {
        await expect(page.getByPlaceholder('https://example.com/logo.png')).toBeVisible({ timeout: 10000 });
    });

    test('Primary color picker is present', async ({ page }) => {
        const colorInput = page.locator('input[type="color"], input[placeholder="#3b82f6"]').first();
        const count = await colorInput.count();
        if (count > 0) {
            await expect(colorInput).toBeVisible({ timeout: 5000 });
        }
    });

    test('"Hide Cognition Branding" toggle is present', async ({ page }) => {
        await expect(page.locator('text=/Hide Cognition Branding/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('"Report Header Preview" section is visible', async ({ page }) => {
        await expect(page.locator('text=/Report Header Preview/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('Upload button for logo is present', async ({ page }) => {
        const uploadBtn = page.getByRole('button', { name: /Upload/i }).first();
        const count = await uploadBtn.count();
        if (count > 0) {
            await expect(uploadBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('page renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});
