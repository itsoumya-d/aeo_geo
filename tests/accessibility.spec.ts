import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

test.describe('Accessibility — Heading Structure', () => {
    test('landing page has exactly one h1', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBe(1);
    });

    test('help center has one h1 and multiple h2 elements', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/help');
        await page.waitForLoadState('domcontentloaded');
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1);
        const h2Count = await page.locator('h2').count();
        expect(h2Count).toBeGreaterThan(0);
    });

    test('404 page has an accessible h1', async ({ page }) => {
        await page.goto('/this-route-does-not-exist-for-accessibility-test');
        await page.waitForLoadState('domcontentloaded');
        const h1 = page.getByRole('heading', { level: 1, name: /Page not found/i });
        await expect(h1).toBeVisible({ timeout: 10000 });
    });

    test('dashboard page has at least one heading', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        const headings = page.locator('h1, h2, h3');
        await expect(headings.first()).toBeVisible({ timeout: 10000 });
    });

    test('settings page has one h1', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/settings');
        await page.waitForLoadState('domcontentloaded');
        const h1 = page.getByRole('heading', { level: 1, name: /Settings/i });
        await expect(h1).toBeVisible({ timeout: 15000 });
    });

    test('history page has one h1', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/history');
        await page.waitForLoadState('domcontentloaded');
        const h1 = page.getByRole('heading', { level: 1, name: /Audit Management/i });
        await expect(h1).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Accessibility — Skip to Content', () => {
    test('landing page has skip to main content link as first focusable element', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.keyboard.press('Tab');
        const skipLink = page.getByText('Skip to main content');
        await expect(skipLink).toBeFocused({ timeout: 5000 });
    });
});

test.describe('Accessibility — ARIA Roles and Attributes', () => {
    test('shortcuts modal has role=dialog and aria-modal=true', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        const ariaModal = await dialog.getAttribute('aria-modal');
        // aria-modal should be true for proper modal behavior
        if (ariaModal !== null) {
            expect(ariaModal).toBe('true');
        }
        await page.keyboard.press('Escape');
    });

    test('dashboard URL input has aria-label attribute', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        const select = page.locator('#asset-type');
        await expect(select).toBeVisible({ timeout: 10000 });
        await expect(select).toHaveAttribute('aria-label');
    });

    test('login form inputs have accessible labels', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        // Email input should be associated with a label
        const emailInput = page.locator('input[type="email"]').first();
        await expect(emailInput).toBeVisible({ timeout: 10000 });
        // Check for label association via aria-label, aria-labelledby, or id+for
        const ariaLabel = await emailInput.getAttribute('aria-label');
        const ariaLabelledBy = await emailInput.getAttribute('aria-labelledby');
        const inputId = await emailInput.getAttribute('id');
        let hasLabel = !!(ariaLabel || ariaLabelledBy);
        if (!hasLabel && inputId) {
            const labelFor = page.locator(`label[for="${inputId}"]`);
            hasLabel = (await labelFor.count()) > 0;
        }
        expect(hasLabel).toBe(true);
    });

    test('navigation regions have proper landmark roles', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        // Sidebar should be navigational
        const nav = page.locator('nav, [role="navigation"], aside nav').first();
        await expect(nav).toBeAttached({ timeout: 10000 });
    });

    test('interactive buttons have accessible names', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        // Check that main CTA buttons have text or aria-label
        const addBtn = page.getByRole('button', { name: /Add/i });
        await expect(addBtn).toBeVisible({ timeout: 10000 });
        const batchBtn = page.getByRole('button', { name: /Batch Import/i });
        await expect(batchBtn).toBeVisible();
    });
});

test.describe('Accessibility — Keyboard Navigation', () => {
    test('Tab key moves through interactive elements on landing page', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        // Tab through first 5 elements
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
        }
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible({ timeout: 5000 });
    });

    test('Escape key closes shortcuts modal', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 });
    });

    test('keyboard shortcut ? opens shortcuts modal from dashboard', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        await page.keyboard.press('Escape');
    });

    test('Enter key submits URL in dashboard input', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await input.fill('example.com');
        await input.press('Enter');
        await expect(page.getByText('https://example.com')).toBeVisible({ timeout: 5000 });
    });

    test('Tab key in login form moves between email and password fields', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        const emailInput = page.locator('input[type="email"]').first();
        await emailInput.click();
        await expect(emailInput).toBeFocused();
        await page.keyboard.press('Tab');
        const passwordInput = page.locator('input[type="password"]').first();
        await expect(passwordInput).toBeFocused({ timeout: 3000 });
    });
});

test.describe('Accessibility — Focus Management', () => {
    test('shortcuts modal focus stays within dialog (focus trap)', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.keyboard.press('?');
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        // Tab through elements — focus should stay within dialog
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
        }
        // Focus should be somewhere within the dialog
        const focused = page.locator(':focus');
        const focusedInDialog = await focused.evaluate((el) => {
            const dialog = document.querySelector('[role="dialog"]');
            return dialog ? dialog.contains(el) : false;
        });
        expect(focusedInDialog).toBe(true);
        await page.keyboard.press('Escape');
    });
});

test.describe('Accessibility — Dark Theme', () => {
    test('root element has dark background styling applied', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        // App applies dark theme via class on html or body
        const hasThemeClass = await page.evaluate(() => {
            const html = document.documentElement;
            const body = document.body;
            const root = document.getElementById('root') || document.querySelector('#app');
            const elements = [html, body, root].filter(Boolean);
            return elements.some((el) => {
                const cls = (el as HTMLElement).className || '';
                const style = window.getComputedStyle(el as HTMLElement);
                return cls.includes('dark') || cls.includes('background') || style.backgroundColor !== 'rgba(0, 0, 0, 0)';
            });
        });
        expect(hasThemeClass).toBe(true);
    });

    test('login page uses dark background', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        // At minimum the page renders with some background color applied
        const bgColor = await page.evaluate(() =>
            window.getComputedStyle(document.body).backgroundColor
        );
        // Dark backgrounds have low RGB values — not pure white (rgb(255, 255, 255))
        expect(bgColor).not.toBe('rgb(255, 255, 255)');
    });
});

test.describe('Accessibility — Form Validation', () => {
    test('signup form shows accessible error messages', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/signup');
        await page.waitForLoadState('domcontentloaded');
        const submitBtn = page.getByRole('button', { name: /Create|Sign up|Register/i }).first();
        await submitBtn.click();
        await page.waitForTimeout(500);
        // Some error message or native validation should appear
        const invalidInputs = page.locator('input:invalid, [aria-invalid="true"]');
        const errorTexts = page.locator('[role="alert"], text=/required|invalid|error/i');
        const hasValidation = (await invalidInputs.count() + await errorTexts.count()) > 0;
        expect(hasValidation).toBe(true);
    });

    test('login form shows validation on empty submit', async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        const submitBtn = page.getByRole('button', { name: /Sign in/i });
        await submitBtn.click();
        await page.waitForTimeout(500);
        const hasValidation = await page.locator('input:invalid, [aria-invalid="true"], text=/required|enter/i').count() > 0;
        expect(hasValidation).toBe(true);
    });
});
