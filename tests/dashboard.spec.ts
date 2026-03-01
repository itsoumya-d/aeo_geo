import { test, expect } from '@playwright/test';

test.describe('Marketing Landing', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display hero section with CTA', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1, name: /Discover How AI Search Engines See Your Brand/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Start free audit/i }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible();
    });

    test('should show pricing section when clicking pricing', async ({ page }) => {
        await page.click('a[href="#pricing"]');
        await expect(page.getByRole('heading', { name: /Start free, then scale/i })).toBeVisible();
    });
});

test.describe('Settings Page Navigation', () => {
    test('should navigate to settings via URL', async ({ page }) => {
        await page.goto('/settings');

        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible();
    });

    test('should navigate to help center', async ({ page }) => {
        await page.goto('/help');
        await expect(page.getByRole('heading', { level: 1, name: /Help Center/i })).toBeVisible();
    });
});

test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Hero should still be visible
        await expect(page.getByRole('heading', { level: 1, name: /Discover How AI Search Engines See Your Brand/i })).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        await expect(page.getByRole('heading', { level: 1, name: /Discover How AI Search Engines See Your Brand/i })).toBeVisible();
    });

    test('should work on desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        await expect(page.getByRole('heading', { level: 1, name: /Discover How AI Search Engines See Your Brand/i })).toBeVisible();

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
        await page.goto('/dashboard');

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

        await expect(page.getByRole('heading', { level: 1, name: /Page not found/i })).toBeVisible();
    });
});
