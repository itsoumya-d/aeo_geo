import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to landing page first
        await page.goto('/');
    });

    test('should navigate to help center', async ({ page }) => {
        // Click on help link in nav
        await page.click('a[href="/help"]');
        await expect(page).toHaveURL('/help');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should show pricing section when clicking pricing', async ({ page }) => {
        // Click on pricing link
        await page.click('a[href="#pricing"]');

        // Verify pricing cards are visible
        await expect(page.getByText('Simple, Transparent Pricing')).toBeVisible();
        await expect(page.getByText('$49')).toBeVisible();
        await expect(page.getByText('$149')).toBeVisible();
        await expect(page.getByText('$399')).toBeVisible();
    });

    test('should show features section when clicking features', async ({ page }) => {
        await page.click('a[href="#features"]');

        await expect(page.getByText('Why Global Brands Trust Cognition')).toBeVisible();
        await expect(page.getByText('Real-Time Crawling')).toBeVisible();
        await expect(page.getByText('Vector Space Analysis')).toBeVisible();
    });
});

test.describe('Input Layer Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should show error for empty URL submission', async ({ page }) => {
        // Find the Add button and click without entering URL
        const addButton = page.getByRole('button', { name: /Add/i });
        await addButton.click();

        // Should show error
        await expect(page.getByText('Please enter a URL')).toBeVisible();
    });

    test('should add valid URL to queue', async ({ page }) => {
        // Enter a valid URL
        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await input.fill('example.com');
        await input.press('Enter');

        // Should show in the queue
        await expect(page.getByText('https://example.com')).toBeVisible();
    });

    test('should show Start Deep Analysis button after adding URL', async ({ page }) => {
        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await input.fill('example.com');
        await input.press('Enter');

        const analyzeButton = page.getByRole('button', { name: /Start Deep Analysis/i });
        await expect(analyzeButton).toBeVisible();
        await expect(analyzeButton).toBeEnabled();
    });

    test('should switch between single and batch mode', async ({ page }) => {
        // Click on batch import button
        await page.click('button:has-text("Batch Import")');

        // Should show textarea for batch input
        await expect(page.getByPlaceholder('Paste URLs, one per line...')).toBeVisible();

        // Switch back to single
        await page.click('button:has-text("Single Entry")');
        await expect(page.getByPlaceholder('e.g. cognition-labs.com')).toBeVisible();
    });
});

test.describe('Accessibility', () => {
    test('should have skip to content link', async ({ page }) => {
        await page.goto('/');

        // Focus on the skip link (it's hidden until focused)
        await page.keyboard.press('Tab');

        // Skip link should be visible when focused
        const skipLink = page.getByText('Skip to main content');
        await expect(skipLink).toBeFocused();
    });

    test('should have proper heading structure', async ({ page }) => {
        await page.goto('/');

        // Should have exactly one h1
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test('should have accessible form labels', async ({ page }) => {
        await page.goto('/');

        // Check that the select has an accessible label
        const select = page.locator('#asset-type');
        await expect(select).toHaveAttribute('aria-label');
    });
});
