import { test, expect } from '@playwright/test';

test.describe('Critical Path', () => {
    test('should load the landing page successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Cognition/);
        await expect(page.getByRole('heading', { level: 1, name: /Discover How AI Search Engines See Your Brand/i })).toBeVisible();
    });

    test('should navigate to signup from primary CTA', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: /Start free audit/i }).first().click();
        await expect(page).toHaveURL(/\/signup$/);
    });
});
