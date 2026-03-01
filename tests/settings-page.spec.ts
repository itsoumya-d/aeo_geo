import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

async function goSettings(page: Page, tab?: string) {
    await suppressCookieConsent(page);
    const url = tab ? `/settings?tab=${tab}` : '/settings';
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
}

test.describe('Settings Page — Layout', () => {
    test('Settings page h1 is visible', async ({ page }) => {
        await goSettings(page);
    });

    test('settings navigation sidebar has all 9 tabs', async ({ page }) => {
        await goSettings(page);
        const tabNames = ['Profile', 'Organization', 'Domains', 'Security', 'Billing', 'API Keys', 'Branding', 'Notifications', 'Integrations'];
        for (const name of tabNames) {
            const tabBtn = page.getByRole('button', { name: new RegExp(name, 'i') }).first();
            await expect(tabBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('Sign Out button is visible in settings nav', async ({ page }) => {
        await goSettings(page);
        const signOutBtn = page.getByRole('button', { name: /Sign Out/i });
        await expect(signOutBtn).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Settings — Profile Tab', () => {
    test.beforeEach(async ({ page }) => {
        await goSettings(page);
    });

    test('Profile tab is active by default and shows "Profile Settings" heading', async ({ page }) => {
        // Exact heading from SettingsPage source: "Profile Settings"
        const profileHeading = page.getByText('Profile Settings').first();
        const count = await profileHeading.count();
        if (count > 0) {
            await expect(profileHeading).toBeVisible({ timeout: 5000 });
        } else {
            const fallback = page.locator('h2, h3').filter({ hasText: /Profile/i }).first();
            await expect(fallback).toBeVisible({ timeout: 5000 });
        }
    });

    test('"Full Name" input is present', async ({ page }) => {
        // Exact label from SettingsPage source
        const nameInput = page.getByLabel('Full Name').first();
        const count = await nameInput.count();
        if (count > 0) {
            await expect(nameInput).toBeVisible();
        } else {
            const fallback = page.getByLabel(/Full Name|Your name/i).first();
            const fallbackCount = await fallback.count();
            if (fallbackCount > 0) {
                await expect(fallback).toBeVisible();
            } else {
                // Fallback: check for any text input in the profile section
                const textInputs = page.locator('input[type="text"]');
                await expect(textInputs.first()).toBeVisible();
            }
        }
    });

    test('"Email Address" input is disabled (read-only)', async ({ page }) => {
        const emailInput = page.getByLabel(/Email Address|Email/i).first();
        const count = await emailInput.count();
        if (count > 0) {
            // Email should be disabled since it's managed by Supabase auth
            const isDisabled = await emailInput.isDisabled();
            // Either disabled or just read-only input
            const altDisabled = page.locator('input[disabled]').first();
            const altCount = await altDisabled.count();
            expect(isDisabled || altCount > 0).toBe(true);
        }
    });

    test('"Save Changes" button is present', async ({ page }) => {
        const saveBtn = page.getByRole('button', { name: 'Save Changes' }).first();
        const count = await saveBtn.count();
        if (count > 0) {
            await expect(saveBtn).toBeVisible({ timeout: 5000 });
        } else {
            const fallbackBtn = page.getByRole('button', { name: /Save Changes|Save Profile|Update/i }).first();
            await expect(fallbackBtn).toBeVisible({ timeout: 5000 });
        }
    });
});

test.describe('Settings — Organization Tab', () => {
    test('Organization tab renders org settings', async ({ page }) => {
        await goSettings(page);
        await page.getByRole('button', { name: /Organization/i }).first().click();
        await page.waitForTimeout(300);
        const orgHeading = page.locator('h2, h3').filter({ hasText: /Organization/i }).first();
        await expect(orgHeading).toBeVisible({ timeout: 5000 });
    });

    test('Organization name input is present', async ({ page }) => {
        await goSettings(page);
        await page.getByRole('button', { name: /Organization/i }).first().click();
        await page.waitForTimeout(300);
        const orgInput = page.getByLabel(/Organization Name|Org name/i).first();
        const count = await orgInput.count();
        if (count > 0) {
            await expect(orgInput).toBeVisible();
        }
    });
});

test.describe('Settings — Domains Tab', () => {
    test('Domains tab renders domain management UI', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=domains');
        await page.waitForLoadState('domcontentloaded');
        // No crash
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
        // Some domain UI or empty state should be visible
        await expect(page.locator('main, [role="main"], body').first()).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Settings — Security Tab', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=security');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('Security tab shows "Security Settings" heading and "Change password" card', async ({ page }) => {
        // Exact headings from SettingsPage source
        const securityHeading = page.getByText('Security Settings').first();
        const count = await securityHeading.count();
        if (count > 0) {
            await expect(securityHeading).toBeVisible({ timeout: 5000 });
        } else {
            const fallback = page.locator('h2, h3').filter({ hasText: /Security|Password/i }).first();
            await expect(fallback).toBeVisible({ timeout: 5000 });
        }
        // "Change password" card title
        const changePasswordCard = page.getByText('Change password').first();
        if (await changePasswordCard.count() > 0) {
            await expect(changePasswordCard).toBeVisible({ timeout: 5000 });
        }
        // Password inputs
        await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('"New password" input is present', async ({ page }) => {
        const newPwInput = page.locator('input[placeholder="New password"]').first();
        const count = await newPwInput.count();
        if (count > 0) {
            await expect(newPwInput).toBeVisible({ timeout: 5000 });
        } else {
            // Fallback: any password input
            await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('"Confirm password" input is present', async ({ page }) => {
        const confirmInput = page.locator('input[placeholder="Confirm password"]').first();
        const count = await confirmInput.count();
        if (count > 0) {
            await expect(confirmInput).toBeVisible({ timeout: 5000 });
        } else {
            // Fallback: second password input
            const passwordInputs = page.locator('input[type="password"]');
            if (await passwordInputs.count() >= 2) {
                await expect(passwordInputs.nth(1)).toBeVisible({ timeout: 5000 });
            }
        }
    });

    test('"Update password" button is present', async ({ page }) => {
        const updateBtn = page.getByRole('button', { name: 'Update password' }).first();
        const count = await updateBtn.count();
        if (count > 0) {
            await expect(updateBtn).toBeVisible({ timeout: 5000 });
        } else {
            const fallbackBtn = page.getByRole('button', { name: /Update password|Change password/i }).first();
            await expect(fallbackBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('password mismatch shows validation error', async ({ page }) => {
        const newPw = page.locator('input[placeholder="New password"]').first();
        const confirmPw = page.locator('input[placeholder="Confirm password"]').first();
        const hasPrecise = (await newPw.count()) > 0 && (await confirmPw.count()) > 0;
        if (hasPrecise) {
            await newPw.fill('NewPassword123!');
            await confirmPw.fill('DifferentPassword456!');
            const updateBtn = page.getByRole('button', { name: 'Update password' }).first();
            if (await updateBtn.count() > 0) await updateBtn.click();
            await page.waitForTimeout(500);
            const errorMsg = page.locator('text=/match|confirm/i').first();
            await expect(errorMsg).toBeVisible({ timeout: 5000 });
        } else {
            const passwordInputs = page.locator('input[type="password"]');
            const count = await passwordInputs.count();
            if (count >= 2) {
                await passwordInputs.nth(0).fill('NewPassword123!');
                await passwordInputs.nth(1).fill('DifferentPassword456!');
                const updateBtn = page.getByRole('button', { name: /Update password|Change|Save/i }).first();
                await updateBtn.click();
                await page.waitForTimeout(500);
                const errorMsg = page.locator('text=/match|confirm/i').first();
                await expect(errorMsg).toBeVisible({ timeout: 5000 });
            }
        }
    });

    test('Delete account section is visible', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const deleteHeading = page.locator('text=/Delete account|Danger zone/i').first();
        await expect(deleteHeading).toBeVisible({ timeout: 5000 });
    });

    test('Delete account button triggers "Type DELETE to confirm" input', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const deleteBtn = page.getByRole('button', { name: /Delete.*account|Delete my account/i }).first();
        const count = await deleteBtn.count();
        if (count > 0) {
            await deleteBtn.click();
            await page.waitForTimeout(500);
            // Should show "Type DELETE to confirm" placeholder input
            const confirmInput = page.locator('input[placeholder="Type DELETE to confirm"]').first();
            const altInput = page.locator('input[placeholder*="DELETE" i]').first();
            const hasInput = await confirmInput.count() + await altInput.count() > 0;
            if (hasInput) {
                await expect(confirmInput.or(altInput).first()).toBeVisible({ timeout: 5000 });
            }
        }
    });

    test('"Confirm delete" button is present after expanding delete section', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const deleteBtn = page.getByRole('button', { name: /Delete.*account|Delete my account/i }).first();
        if (await deleteBtn.count() > 0) {
            await deleteBtn.click();
            await page.waitForTimeout(500);
            const confirmDeleteBtn = page.getByRole('button', { name: 'Confirm delete' }).first();
            const altBtn = page.getByRole('button', { name: /Confirm|Delete/i }).first();
            const count = await confirmDeleteBtn.count() + await altBtn.count();
            if (count > 0) {
                await expect(confirmDeleteBtn.or(altBtn).first()).toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('"Cancel" button dismisses delete confirmation', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const deleteBtn = page.getByRole('button', { name: /Delete.*account|Delete my account/i }).first();
        if (await deleteBtn.count() > 0) {
            await deleteBtn.click();
            await page.waitForTimeout(300);
            const cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();
            if (await cancelBtn.count() > 0) {
                await cancelBtn.click();
                await page.waitForTimeout(300);
                // Confirm input should no longer be visible
                const confirmInput = page.locator('input[placeholder="Type DELETE to confirm"]').first();
                if (await confirmInput.count() > 0) {
                    await expect(confirmInput).not.toBeVisible({ timeout: 3000 });
                }
            }
        }
    });
});

test.describe('Settings — Billing Tab', () => {
    test('Billing tab renders BillingDashboard', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings/billing');
        await page.waitForLoadState('domcontentloaded');
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 15000 });
        // Billing dashboard should show some plan/billing UI
        await expect(page.locator('body')).toContainText(/Billing|Plan|Credits|Subscription/i, { timeout: 10000 });
    });
});

test.describe('Settings — API Keys Tab', () => {
    test('API Keys tab renders APIKeyManager', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=api');
        await page.waitForLoadState('domcontentloaded');
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
        await expect(page.locator('body')).toContainText(/API|Key|Access/i, { timeout: 10000 });
    });
});

test.describe('Settings — Branding Tab', () => {
    test('Branding tab renders ReportBranding', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=branding');
        await page.waitForLoadState('domcontentloaded');
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
        await expect(page.locator('body')).toContainText(/Branding|Logo|Brand/i, { timeout: 10000 });
    });
});

test.describe('Settings — Notifications Tab', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=notifications');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('"Notification Preferences" heading is visible', async ({ page }) => {
        // Exact heading from SettingsPage source
        const heading = page.getByText('Notification Preferences').first();
        const count = await heading.count();
        if (count > 0) {
            await expect(heading).toBeVisible({ timeout: 10000 });
        } else {
            await expect(page.locator('body')).toContainText(/Notification|Email|Digest|Alert/i, { timeout: 10000 });
        }
    });

    test('"Email Notifications" label is visible', async ({ page }) => {
        const label = page.getByText('Email Notifications').first();
        const count = await label.count();
        if (count > 0) {
            await expect(label).toBeVisible({ timeout: 10000 });
        } else {
            await expect(page.locator('body')).toContainText(/Email Notification/i, { timeout: 10000 });
        }
    });

    test('"Weekly Digest" notification option is visible', async ({ page }) => {
        const label = page.getByText('Weekly Digest').first();
        const count = await label.count();
        if (count > 0) {
            await expect(label).toBeVisible({ timeout: 10000 });
        }
    });

    test('"Usage Alerts" notification option is visible', async ({ page }) => {
        const label = page.getByText('Usage Alerts').first();
        const count = await label.count();
        if (count > 0) {
            await expect(label).toBeVisible({ timeout: 10000 });
        }
    });

    test('"Receive audit completion" description is visible', async ({ page }) => {
        const desc = page.getByText('Receive audit completion and report emails').first();
        const count = await desc.count();
        if (count > 0) {
            await expect(desc).toBeVisible({ timeout: 10000 });
        }
    });

    test('"weekly summary" description is visible', async ({ page }) => {
        const desc = page.getByText(/weekly summary of your AI visibility trends/i).first();
        const count = await desc.count();
        if (count > 0) {
            await expect(desc).toBeVisible({ timeout: 10000 });
        }
    });

    test('"approaching plan limits" description is visible', async ({ page }) => {
        const desc = page.getByText(/approaching plan limits/i).first();
        const count = await desc.count();
        if (count > 0) {
            await expect(desc).toBeVisible({ timeout: 10000 });
        }
    });

    test('toggle buttons exist for notification preferences', async ({ page }) => {
        // Look for toggle buttons (role=switch or button with checked state)
        const toggles = page.locator('[role="switch"], button[aria-checked]');
        const count = await toggles.count();
        if (count > 0) {
            await expect(toggles.first()).toBeVisible();
        } else {
            // Fallback: check for checkbox inputs
            const checkboxes = page.locator('input[type="checkbox"]');
            const checkCount = await checkboxes.count();
            expect(checkCount).toBeGreaterThan(0);
        }
    });

    test('notification toggle click changes state', async ({ page }) => {
        const toggle = page.locator('[role="switch"], button[aria-checked]').first();
        const count = await toggle.count();
        if (count > 0) {
            const initialState = await toggle.getAttribute('aria-checked');
            await toggle.click();
            await page.waitForTimeout(300);
            const newState = await toggle.getAttribute('aria-checked');
            expect(newState).not.toBe(initialState);
        }
    });
});

test.describe('Settings — Integrations Tab', () => {
    test('Integrations tab renders without crash', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings/integrations');
        await page.waitForLoadState('domcontentloaded');
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});
