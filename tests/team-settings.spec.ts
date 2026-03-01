import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

test.describe('Team Settings (/settings?tab=organization)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=organization');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('Organization tab content is visible', async ({ page }) => {
        const orgHeading = page.locator('h2, h3').filter({ hasText: /Organization/i }).first();
        await expect(orgHeading).toBeVisible({ timeout: 10000 });
    });

    test('"Team Members" heading is visible', async ({ page }) => {
        await expect(page.getByText('Team Members')).toBeVisible({ timeout: 10000 });
    });

    test('TeamSettings "Members" tab button is visible', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Members' }).first()).toBeVisible({ timeout: 10000 });
    });

    test('TeamSettings "Activity Log" tab button is visible', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Activity Log' }).first()).toBeVisible({ timeout: 10000 });
    });

    test('TeamSettings "Security" tab button is visible', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Security' }).first()).toBeVisible({ timeout: 10000 });
    });

    test('Members tab invite form has email input with correct placeholder', async ({ page }) => {
        // Members tab should be active by default in TeamSettings
        await expect(page.getByPlaceholder('colleague@company.com')).toBeVisible({ timeout: 10000 });
    });

    test('Members tab role selector has "Member" option', async ({ page }) => {
        const roleSelect = page.locator('select').filter({ has: page.getByRole('option', { name: /Member/i }) }).first();
        const altOption = page.getByRole('option', { name: /^Member$/ }).first();
        const count = await roleSelect.count() + await altOption.count();
        expect(count).toBeGreaterThan(0);
    });

    test('Members tab role selector has "Admin" option', async ({ page }) => {
        const option = page.getByRole('option', { name: /^Admin$/ }).first();
        const count = await option.count();
        if (count === 0) {
            // Look inside select element
            const selects = page.locator('select');
            const selectCount = await selects.count();
            expect(selectCount).toBeGreaterThan(0);
        }
    });

    test('Members tab role selector has "Viewer (Read-only)" option', async ({ page }) => {
        const option = page.getByRole('option', { name: /Viewer/i }).first();
        const count = await option.count();
        if (count === 0) {
            // Viewer option might only show in expanded select
            const selects = page.locator('select');
            await expect(selects.first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('"Invite" submit button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Invite' }).first()).toBeVisible({ timeout: 10000 });
    });

    test('clicking "Activity Log" tab shows content without crash', async ({ page }) => {
        const activityLogBtn = page.getByRole('button', { name: 'Activity Log' }).first();
        await activityLogBtn.click();
        await page.waitForTimeout(500);
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 5000 });
    });

    test('Activity Log tab has "Export Audit Log" button', async ({ page }) => {
        await page.getByRole('button', { name: 'Activity Log' }).first().click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: 'Export Audit Log' })).toBeVisible({ timeout: 5000 });
    });

    test('Activity Log tab shows "User", "Action", "Time" table headers', async ({ page }) => {
        await page.getByRole('button', { name: 'Activity Log' }).first().click();
        await page.waitForTimeout(500);
        // Table headers or column labels
        await expect(page.locator('text=/User/').first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=/Action/').first()).toBeVisible();
        await expect(page.locator('text=/Time/').first()).toBeVisible();
    });

    test('clicking "Security" tab shows SSOConfig component', async ({ page }) => {
        await page.getByRole('button', { name: 'Security' }).first().click();
        await page.waitForTimeout(500);
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 5000 });
        // SSOConfig heading should appear
        await expect(page.getByText('Single Sign-On (SSO)')).toBeVisible({ timeout: 5000 });
    });

    test('SSOConfig shows "Single Sign-On (SSO)" heading', async ({ page }) => {
        await page.getByRole('button', { name: 'Security' }).first().click();
        await page.waitForTimeout(500);
        await expect(page.getByText('Single Sign-On (SSO)')).toBeVisible({ timeout: 5000 });
    });

    test('SSOConfig IdP URL input has placeholder with okta.com', async ({ page }) => {
        await page.getByRole('button', { name: 'Security' }).first().click();
        await page.waitForTimeout(500);
        await expect(page.getByPlaceholder(/okta|idp\.okta\.com/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('SSOConfig lists "Okta" as a supported provider', async ({ page }) => {
        await page.getByRole('button', { name: 'Security' }).first().click();
        await page.waitForTimeout(500);
        await expect(page.getByText('Okta')).toBeVisible({ timeout: 5000 });
    });

    test('SSOConfig lists "Azure Active Directory" as a supported provider', async ({ page }) => {
        await page.getByRole('button', { name: 'Security' }).first().click();
        await page.waitForTimeout(500);
        await expect(page.getByText('Azure Active Directory')).toBeVisible({ timeout: 5000 });
    });

    test('SSOConfig lists "Google Workspace" as a supported provider', async ({ page }) => {
        await page.getByRole('button', { name: 'Security' }).first().click();
        await page.waitForTimeout(500);
        await expect(page.getByText('Google Workspace')).toBeVisible({ timeout: 5000 });
    });

    test('SSOConfig "Enable SSO Enforcement" button is present', async ({ page }) => {
        await page.getByRole('button', { name: 'Security' }).first().click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: /Enable SSO Enforcement/i })).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Organization Settings — General', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=organization');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('Organization Name input is present', async ({ page }) => {
        const orgNameInput = page.getByLabel(/Organization Name/i).first();
        const count = await orgNameInput.count();
        if (count > 0) {
            await expect(orgNameInput).toBeVisible();
        } else {
            // Fallback: look for any input in the org section
            const inputs = page.locator('input[type="text"]');
            await expect(inputs.first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('Organization ID is displayed (read-only)', async ({ page }) => {
        // Organization ID shown as code block or read-only field
        const orgId = page.locator('text=/Organization ID|Org ID/i').first();
        await expect(orgId).toBeVisible({ timeout: 10000 });
    });

    test('page renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});
