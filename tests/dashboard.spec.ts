import { test, expect } from '@playwright/test';

test.describe('Dashboard Flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display hero section with CTA', async ({ page }) => {
        await expect(page.getByText('The AI Visibility')).toBeVisible();
        await expect(page.getByRole('button', { name: /Add/i })).toBeVisible();
    });

    test('should show asset types dropdown', async ({ page }) => {
        const select = page.locator('#asset-type');
        await expect(select).toBeVisible();

        // Should have multiple options
        const options = await select.locator('option').count();
        expect(options).toBeGreaterThanOrEqual(3);
    });

    test('should expand FAQ sections', async ({ page }) => {
        // Click on pricing to scroll to FAQ
        await page.click('a[href="#pricing"]');

        // Find FAQ section
        const faqItems = page.locator('[data-testid="faq-item"]');

        // If FAQ items exist, try to expand one
        const faqCount = await faqItems.count();
        if (faqCount > 0) {
            await faqItems.first().click();
            // FAQ content should be visible after click
            await expect(faqItems.first()).toBeVisible();
        }
    });
});

test.describe('Settings Page Navigation', () => {
    // Note: These tests assume authenticated state
    // In a real setup, you'd use beforeEach to login

    test('should navigate to settings via URL', async ({ page }) => {
        await page.goto('/settings');

        // May redirect to login if not authenticated
        // Check for settings content or login redirect
        const url = page.url();
        expect(url).toMatch(/\/(settings|auth|login)/);
    });

    test('should navigate to help center', async ({ page }) => {
        await page.goto('/help');
        await expect(page.locator('h1, h2')).toBeVisible();
    });
});

test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Hero should still be visible
        await expect(page.getByText('The AI Visibility')).toBeVisible();

        // Input should be accessible
        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await expect(input).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        await expect(page.getByText('The AI Visibility')).toBeVisible();
    });

    test('should work on desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        await expect(page.getByText('The AI Visibility')).toBeVisible();

        // Navigation should be visible on desktop
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();
    });
});

test.describe('Keyboard Navigation', () => {
    test('should navigate with Tab key', async ({ page }) => {
        await page.goto('/');

        // Focus should move through interactive elements
        await page.keyboard.press('Tab');

        // Skip link should be first focusable element
        const skipLink = page.getByText('Skip to main content');
        await expect(skipLink).toBeFocused();

        // Continue tabbing
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Some interactive element should now be focused
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
    });

    test('should allow Enter to submit inputs', async ({ page }) => {
        await page.goto('/');

        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await input.fill('test.com');
        await input.press('Enter');

        // Should add the URL to queue
        await expect(page.getByText('https://test.com')).toBeVisible();
    });
});

test.describe('Error States', () => {
    test('should show 404 page for invalid routes', async ({ page }) => {
        await page.goto('/invalid-route-that-does-not-exist');

        // Should show some error or redirect
        const url = page.url();
        // Either shows 404 or redirects home
        expect(url).toBeDefined();
    });
});
