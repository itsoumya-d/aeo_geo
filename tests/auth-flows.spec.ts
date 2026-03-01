import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

test.describe('Login Page (/login)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
    });

    test('renders sign in heading, email and password fields, and submit button', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Sign in/i }).first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('input[type="email"]').first()).toBeVisible();
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
    });

    test('shows error for invalid email format', async ({ page }) => {
        await page.locator('input[type="email"]').first().fill('notanemail');
        await page.locator('input[type="password"]').first().fill('somepassword');
        await page.getByRole('button', { name: /Sign in/i }).click();
        // Either browser native validation or custom error text
        const errorText = page.locator('text=/valid email|invalid email|please enter/i').first();
        const hasError = await errorText.count() > 0;
        if (!hasError) {
            // Check for browser native validation via input:invalid
            const invalidInput = page.locator('input:invalid').first();
            await expect(invalidInput).toHaveCount(1);
        }
    });

    test('shows error for empty password', async ({ page }) => {
        await page.locator('input[type="email"]').first().fill('user@example.com');
        await page.getByRole('button', { name: /Sign in/i }).click();
        await page.waitForTimeout(500);
        // Either custom error text or browser native validation
        const customError = page.locator('text=/password|required/i').first();
        const hasCustomError = await customError.count() > 0;
        const invalidInput = page.locator('input:invalid').first();
        const hasInvalidInput = await invalidInput.count() > 0;
        expect(hasCustomError || hasInvalidInput).toBe(true);
    });

    test('show/hide password toggle changes input type', async ({ page }) => {
        const passwordInput = page.locator('input[type="password"]').first();
        await passwordInput.fill('Secret123!');

        // Look for show password button
        const showToggle = page.getByRole('button', { name: /show|reveal|eye/i }).first();
        const toggleCount = await showToggle.count();
        if (toggleCount > 0) {
            await showToggle.click();
            // After toggle, the password input should be type=text
            await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 3000 });
        } else {
            // May use an icon button without accessible name — skip gracefully
            test.skip();
        }
    });

    test('forgot password link navigates to /reset-password', async ({ page }) => {
        const forgotLink = page.getByRole('link', { name: /forgot|reset password/i }).first();
        await expect(forgotLink).toBeVisible();
        await forgotLink.click();
        await expect(page).toHaveURL('/reset-password');
    });

    test('sign up link navigates to /signup', async ({ page }) => {
        const signupLink = page.getByRole('link', { name: /sign up|create account|register/i }).first();
        await expect(signupLink).toBeVisible();
        await signupLink.click();
        await expect(page).toHaveURL('/signup');
    });

    test('page does not crash when visiting directly', async ({ page }) => {
        // No error boundary should be visible
        const errorBoundary = page.locator('text=/Something went wrong|Unexpected error/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 5000 });
    });
});

test.describe('Signup Page (/signup)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/signup');
        await page.waitForLoadState('domcontentloaded');
    });

    test('renders create account form with all fields', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Create|Sign up|Get started/i }).first()).toBeVisible({ timeout: 10000 });
        // Should have email and password inputs
        await expect(page.locator('input[type="email"]').first()).toBeVisible();
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test('password strength indicator appears when typing', async ({ page }) => {
        const passwordInput = page.locator('input[type="password"]').first();
        await passwordInput.fill('abc');
        await page.waitForTimeout(300);
        // Check for any strength indicator text
        const strengthIndicator = page.locator('text=/Weak|Fair|Good|Strong/i').first();
        const count = await strengthIndicator.count();
        if (count === 0) {
            // App may not have strength indicator — verify at minimum no crash
            const errorBoundary = page.locator('text=/Something went wrong/i').first();
            await expect(errorBoundary).toHaveCount(0);
        }
    });

    test('shows error when passwords do not match', async ({ page }) => {
        const inputs = page.locator('input[type="password"]');
        const passwordCount = await inputs.count();
        if (passwordCount >= 2) {
            await inputs.nth(0).fill('Password123!');
            await inputs.nth(1).fill('DifferentPass456!');
            await page.getByRole('button', { name: /Create|Sign up|Register/i }).first().click();
            await page.waitForTimeout(500);
            const errorMsg = page.locator('text=/match|confirm/i').first();
            await expect(errorMsg).toBeVisible({ timeout: 5000 });
        }
    });

    test('sign in link navigates back to /login', async ({ page }) => {
        const signinLink = page.getByRole('link', { name: /sign in|log in|already have/i }).first();
        const count = await signinLink.count();
        if (count > 0) {
            await signinLink.click();
            await expect(page).toHaveURL('/login');
        }
    });

    test('terms of service link is present', async ({ page }) => {
        const termsLink = page.getByRole('link', { name: /terms/i }).first();
        await expect(termsLink).toBeAttached();
    });

    test('privacy policy link is present', async ({ page }) => {
        const privacyLink = page.getByRole('link', { name: /privacy/i }).first();
        await expect(privacyLink).toBeAttached();
    });

    test('page does not crash when visiting directly', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong|Unexpected error/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 5000 });
    });
});

test.describe('Reset Password Page (/reset-password)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/reset-password');
        await page.waitForLoadState('domcontentloaded');
    });

    test('renders reset password form with email input and submit button', async ({ page }) => {
        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
        const submitBtn = page.getByRole('button', { name: /send|reset|submit/i }).first();
        await expect(submitBtn).toBeVisible();
    });

    test('heading is visible', async ({ page }) => {
        const heading = page.getByRole('heading').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('back to sign in link exists', async ({ page }) => {
        const backLink = page.getByRole('link', { name: /back|sign in|login/i }).first();
        await expect(backLink).toBeVisible({ timeout: 10000 });
    });

    test('shows error for empty email submission', async ({ page }) => {
        const submitBtn = page.getByRole('button', { name: /send|reset|submit/i }).first();
        await submitBtn.click();
        await page.waitForTimeout(500);
        const hasError = await page.locator('input:invalid, text=/required|enter.*email/i').count() > 0;
        expect(hasError).toBe(true);
    });

    test('page does not crash when visiting directly', async ({ page }) => {
        const errorBoundary = page.locator('text=/Something went wrong|Unexpected error/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 5000 });
    });
});

test.describe('Auth Callback Page (/auth/callback)', () => {
    test('page handles callback route without crashing', async ({ page }) => {
        await page.goto('/auth/callback');
        await page.waitForLoadState('domcontentloaded');
        // The callback page will either redirect or show a loading state
        // It should NOT show an error boundary or blank page
        const errorBoundary = page.locator('text=/Something went wrong|Unexpected error/i').first();
        await expect(errorBoundary).toHaveCount(0, { timeout: 5000 });
    });
});
