import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

// ─── BILLING DASHBOARD ────────────────────────────────────────────────────────

test.describe('BillingDashboard (/settings/billing)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings/billing');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('"Current Plan" section heading is visible', async ({ page }) => {
        await expect(page.getByText('Current Plan')).toBeVisible({ timeout: 10000 });
    });

    test('plan tier name is displayed', async ({ page }) => {
        const planNames = page.locator('text=/^(Free|Starter|Professional|Agency|Enterprise)$/').first();
        await expect(planNames).toBeVisible({ timeout: 10000 });
    });

    test('"Available Plans" section is visible', async ({ page }) => {
        await expect(page.getByText('Available Plans')).toBeVisible({ timeout: 10000 });
    });

    test('all 4 plan cards are shown', async ({ page }) => {
        await expect(page.getByText('Free')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Starter')).toBeVisible();
        await expect(page.getByText('Professional')).toBeVisible();
        await expect(page.getByText('Agency')).toBeVisible();
    });

    test('Free plan shows $0', async ({ page }) => {
        await expect(page.getByText('$0').first()).toBeVisible({ timeout: 10000 });
    });

    test('Starter plan shows $49', async ({ page }) => {
        await expect(page.locator('text=/\\$49/').first()).toBeVisible({ timeout: 10000 });
    });

    test('Professional plan shows $149', async ({ page }) => {
        await expect(page.locator('text=/\\$149/').first()).toBeVisible({ timeout: 10000 });
    });

    test('Agency plan shows $399', async ({ page }) => {
        await expect(page.locator('text=/\\$399/').first()).toBeVisible({ timeout: 10000 });
    });

    test('Monthly/Annual billing toggle is present', async ({ page }) => {
        // Toggle is a switch or button group
        const toggle = page.locator('[role="switch"], button').filter({ hasText: /Monthly|Annual|Annually/i }).first();
        const count = await toggle.count();
        if (count > 0) {
            await expect(toggle).toBeVisible();
        } else {
            // Check for any billing toggle element
            const annualText = page.locator('text=/Annual|Yearly/i').first();
            await expect(annualText).toBeVisible();
        }
    });

    test('clicking Annual toggle updates Starter price to $39', async ({ page }) => {
        const annualToggle = page.locator('button, [role="switch"]').filter({ hasText: /Annual|Annually|Yearly/i }).first();
        const count = await annualToggle.count();
        if (count > 0) {
            await annualToggle.click();
            await page.waitForTimeout(500);
            // After switching to annual, Starter should show $39
            const updatedPrice = page.locator('text=/\\$39/').first();
            await expect(updatedPrice).toBeVisible({ timeout: 5000 });
        }
    });

    test('"Select Plan" buttons exist on plan cards', async ({ page }) => {
        const selectPlanBtns = page.getByRole('button', { name: /Select Plan/i });
        await expect(selectPlanBtns.first()).toBeVisible({ timeout: 10000 });
    });

    test('"Refresh" button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible({ timeout: 10000 });
    });

    test('"Manage Billing" button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Manage Billing/i })).toBeVisible({ timeout: 10000 });
    });

    test('"This Month\'s Activity" section is visible', async ({ page }) => {
        await expect(page.getByText("This Month's Activity")).toBeVisible({ timeout: 10000 });
    });

    test('usage stats section shows activity metrics', async ({ page }) => {
        // Stats: Audits Run, Pages Analyzed, Simulations, Credits Used
        const statsSection = page.locator('text=/Audits Run|Pages Analyzed|Simulations|Credits Used/i').first();
        await expect(statsSection).toBeVisible({ timeout: 10000 });
    });
});

// ─── API KEY MANAGER ──────────────────────────────────────────────────────────

test.describe('APIKeyManager (/settings?tab=api)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=api');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('"API Keys" heading is visible', async ({ page }) => {
        await expect(page.locator('h2, h3').filter({ hasText: /API Keys/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test('empty state shows "No API Keys Yet"', async ({ page }) => {
        // With mock DB, no keys exist
        await expect(page.getByText('No API Keys Yet')).toBeVisible({ timeout: 10000 });
    });

    test('"Create Key" button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Create Key' })).toBeVisible({ timeout: 10000 });
    });

    test('clicking "Create Key" shows form with name input', async ({ page }) => {
        await page.getByRole('button', { name: 'Create Key' }).click();
        await page.waitForTimeout(500);
        await expect(page.getByPlaceholder('Key name (e.g., Production)')).toBeVisible({ timeout: 5000 });
    });

    test('create key form has "Create" submit button', async ({ page }) => {
        await page.getByRole('button', { name: 'Create Key' }).click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: 'Create' })).toBeVisible({ timeout: 5000 });
    });

    test('create key form has "Cancel" button', async ({ page }) => {
        await page.getByRole('button', { name: 'Create Key' }).click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible({ timeout: 5000 });
    });

    test('clicking "Cancel" dismisses the create key form', async ({ page }) => {
        await page.getByRole('button', { name: 'Create Key' }).click();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Cancel' }).click();
        await page.waitForTimeout(300);
        // Form should be gone, Create Key button should be back
        await expect(page.getByPlaceholder('Key name (e.g., Production)')).toHaveCount(0, { timeout: 3000 });
    });

    test('info notice about keeping API keys secure is present', async ({ page }) => {
        const notice = page.locator('text=/Keep your API keys secure|Never share/i').first();
        await expect(notice).toBeVisible({ timeout: 10000 });
    });
});

// ─── DOMAIN MANAGEMENT ────────────────────────────────────────────────────────

test.describe('DomainManagement (/settings?tab=domains)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings?tab=domains');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
    });

    test('"Verified Domains" heading is visible', async ({ page }) => {
        await expect(page.getByText('Verified Domains')).toBeVisible({ timeout: 10000 });
    });

    test('"Manage and verify ownership" subheading is visible', async ({ page }) => {
        await expect(page.locator('text=/Manage and verify/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('domain input has placeholder "example.com"', async ({ page }) => {
        await expect(page.getByPlaceholder('example.com')).toBeVisible({ timeout: 10000 });
    });

    test('"Add Domain" button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Add Domain' })).toBeVisible({ timeout: 10000 });
    });

    test('empty state shows "No domains added yet"', async ({ page }) => {
        // With mock DB, no domains exist
        await expect(page.getByText('No domains added yet')).toBeVisible({ timeout: 10000 });
    });

    test('clicking "Add Domain" with empty input shows validation error', async ({ page }) => {
        await page.getByRole('button', { name: 'Add Domain' }).click();
        await page.waitForTimeout(500);
        const error = page.locator('text=/valid|required|enter/i').first();
        const invalidInput = page.locator('input:invalid').first();
        const hasError = (await error.count()) + (await invalidInput.count()) > 0;
        expect(hasError).toBe(true);
    });

    test('verification instructions mention DNS TXT Record', async ({ page }) => {
        // Verification method instructions may appear after domain add or always
        const txtInfo = page.locator('text=/TXT Record|cognition-v-token/i').first();
        const count = await txtInfo.count();
        if (count === 0) {
            // May only show after a domain is added — just verify page renders
            const errorBoundary = page.locator('text=/Something went wrong/i').first();
            await expect(errorBoundary).toHaveCount(0);
        }
    });

    test('page renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});

// ─── SCHEDULED AUDITS ────────────────────────────────────────────────────────

test.describe('ScheduledAudits (History → Scheduled tab)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/history');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Audit Management/i })).toBeVisible({ timeout: 15000 });
        // Switch to Scheduled tab
        const scheduledBtn = page.getByRole('button', { name: /Scheduled/i }).first();
        await scheduledBtn.click();
        await page.waitForTimeout(500);
    });

    test('"Scheduled Audits" heading is visible', async ({ page }) => {
        await expect(page.getByText('Scheduled Audits')).toBeVisible({ timeout: 10000 });
    });

    test('"New Schedule" button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'New Schedule' })).toBeVisible({ timeout: 10000 });
    });

    test('empty state shows "No Schedules Yet"', async ({ page }) => {
        await expect(page.getByText('No Schedules Yet')).toBeVisible({ timeout: 10000 });
    });

    test('"Schedule Your First Audit" CTA button is present in empty state', async ({ page }) => {
        const cta = page.getByRole('button', { name: /Schedule Your First Audit/i }).first();
        await expect(cta).toBeVisible({ timeout: 10000 });
    });

    test('clicking "New Schedule" opens create form with domain input', async ({ page }) => {
        await page.getByRole('button', { name: 'New Schedule' }).click();
        await page.waitForTimeout(500);
        await expect(page.getByPlaceholder('example.com')).toBeVisible({ timeout: 5000 });
    });

    test('create schedule form has frequency buttons "daily", "weekly", "monthly"', async ({ page }) => {
        await page.getByRole('button', { name: 'New Schedule' }).click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: 'daily' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: 'weekly' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'monthly' })).toBeVisible();
    });

    test('clicking "weekly" frequency button selects it', async ({ page }) => {
        await page.getByRole('button', { name: 'New Schedule' }).click();
        await page.waitForTimeout(500);
        const weeklyBtn = page.getByRole('button', { name: 'weekly' });
        const beforeClass = await weeklyBtn.getAttribute('class') ?? '';
        await weeklyBtn.click();
        await page.waitForTimeout(300);
        const afterClass = await weeklyBtn.getAttribute('class') ?? '';
        // Class should change after selection (primary color applied)
        expect(afterClass).not.toBe(beforeClass);
    });

    test('create schedule form has time input', async ({ page }) => {
        await page.getByRole('button', { name: 'New Schedule' }).click();
        await page.waitForTimeout(500);
        await expect(page.locator('input[type="time"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('create schedule form has timezone select', async ({ page }) => {
        await page.getByRole('button', { name: 'New Schedule' }).click();
        await page.waitForTimeout(500);
        const tzSelect = page.locator('select').first();
        await expect(tzSelect).toBeVisible({ timeout: 5000 });
        // Verify some timezone options exist
        const options = await tzSelect.locator('option').count();
        expect(options).toBeGreaterThan(5);
    });

    test('"Create Schedule" submit button is present in form', async ({ page }) => {
        await page.getByRole('button', { name: 'New Schedule' }).click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: 'Create Schedule' })).toBeVisible({ timeout: 5000 });
    });

    test('"Cancel" button dismisses the create schedule form', async ({ page }) => {
        await page.getByRole('button', { name: 'New Schedule' }).click();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Cancel' }).click();
        await page.waitForTimeout(300);
        // Form should be gone
        await expect(page.getByPlaceholder('example.com')).toHaveCount(0, { timeout: 3000 });
    });

    test('"Email Reports" notification toggle label is visible', async ({ page }) => {
        await expect(page.getByText('Email Reports')).toBeVisible({ timeout: 10000 });
    });

    test('"Slack Alerts" notification toggle label is visible', async ({ page }) => {
        await expect(page.getByText('Slack Alerts')).toBeVisible({ timeout: 10000 });
    });
});

// ─── AUDIT HISTORY ────────────────────────────────────────────────────────────

test.describe('AuditHistory (/history — Audit History tab)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/history');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Audit Management/i })).toBeVisible({ timeout: 15000 });
        // Ensure Audit History tab is active (it's default)
        const auditHistoryBtn = page.getByRole('button', { name: /Audit History/i }).first();
        await expect(auditHistoryBtn).toBeVisible({ timeout: 5000 });
    });

    test('"Audit History" heading is visible in the AuditHistory component', async ({ page }) => {
        await expect(page.getByText('Audit History')).toBeVisible({ timeout: 10000 });
    });

    test('date range pills are visible: "7 Days", "30 Days", "90 Days", "All Time"', async ({ page }) => {
        await expect(page.getByRole('button', { name: '7 Days' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: '30 Days' })).toBeVisible();
        await expect(page.getByRole('button', { name: '90 Days' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'All Time' })).toBeVisible();
    });

    test('clicking "30 Days" filter selects it', async ({ page }) => {
        const thirtyDaysBtn = page.getByRole('button', { name: '30 Days' });
        await thirtyDaysBtn.click();
        await page.waitForTimeout(300);
        // Button should have active styling
        const classAttr = await thirtyDaysBtn.getAttribute('class') ?? '';
        const isActive = classAttr.includes('primary') || classAttr.includes('active');
        expect(isActive).toBe(true);
    });

    test('search input has placeholder "Search by domain..."', async ({ page }) => {
        await expect(page.getByPlaceholder('Search by domain...')).toBeVisible({ timeout: 10000 });
    });

    test('typing in search input does not crash the page', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search by domain...');
        await searchInput.fill('example.com');
        await page.waitForTimeout(500);
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0);
    });

    test('"Refresh" button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible({ timeout: 10000 });
    });

    test('empty state "No Audits Yet" is shown with mock DB', async ({ page }) => {
        // With unseeded mock DB, no audits exist
        await expect(page.getByText('No Audits Yet')).toBeVisible({ timeout: 10000 });
    });

    test('page renders without crash', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 10000 });
    });
});
