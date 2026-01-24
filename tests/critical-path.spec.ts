import { test, expect } from '@playwright/test';

test.describe('Critical Path', () => {
    test('should load the landing page successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Cognition/);
        // "The AI Visibility Command Center" is split across lines/spans, so matching "The AI Visibility" is safer.
        await expect(page.getByText('The AI Visibility')).toBeVisible();
    });

    test('should start discovery process', async ({ page }) => {
        await page.goto('/');

        // Find input and type domain
        const input = page.getByPlaceholder('e.g. cognition-labs.com');
        await input.fill('example.com');
        await input.press('Enter');

        // After adding asset, the "Start Deep Analysis" button should be available
        await expect(page.getByRole('button', { name: /Start Deep Analysis/i })).toBeVisible();
    });
});
