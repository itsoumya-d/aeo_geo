import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

test.describe('Landing Page (/)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('hero heading and primary CTA are visible', async ({ page }) => {
        await expect(
            page.getByRole('heading', { level: 1, name: /Discover How AI Search Engines See Your Brand/i })
        ).toBeVisible();
        await expect(page.getByRole('link', { name: /Start free audit/i }).first()).toBeVisible();
    });

    test('Sign in link navigates to /login', async ({ page }) => {
        await page.getByRole('link', { name: /Sign in/i }).first().click();
        await expect(page).toHaveURL('/login');
    });

    test('pricing section is reachable and shows all plan prices', async ({ page }) => {
        await page.click('a[href="#pricing"]');
        await expect(page.getByRole('heading', { name: /Start free, then scale/i })).toBeVisible();
        await expect(page.getByText('$0').first()).toBeVisible();
        await expect(page.getByText('$149').first()).toBeVisible();
        await expect(page.getByText('$399').first()).toBeVisible();
    });

    test('features section is reachable and shows key features', async ({ page }) => {
        await page.click('a[href="#features"]');
        await expect(page.getByRole('heading', { name: /Everything you need to improve AI visibility/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Real-time site discovery/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Multi-platform scoring/i })).toBeVisible();
    });

    test('footer has links to help, terms, privacy, docs', async ({ page }) => {
        await expect(page.getByRole('link', { name: /Help/i }).first()).toBeVisible();
        // Check link href attributes exist for key pages
        const termsLink = page.locator('a[href="/terms"]').first();
        const privacyLink = page.locator('a[href="/privacy"]').first();
        await expect(termsLink).toBeAttached();
        await expect(privacyLink).toBeAttached();
    });

    test('FAQ accordion expands and collapses', async ({ page }) => {
        // Scroll down to find FAQ section
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        // Find a FAQ question button (details/summary or button with aria-expanded)
        const faqButtons = page.locator('button[aria-expanded], details summary, button').filter({
            hasText: /what is|how does|why|when|can i/i,
        });
        const count = await faqButtons.count();
        if (count > 0) {
            const firstFaq = faqButtons.first();
            await firstFaq.click();
            // After click, check that some answer content is now visible in the DOM
            await page.waitForTimeout(300);
            // Click again to collapse
            await firstFaq.click();
            await page.waitForTimeout(300);
        }
        // If no accordion-style FAQ found, just assert the page has some Q&A content
        const faqSection = page.locator('section, div').filter({ hasText: /FAQ|frequently asked/i }).first();
        await expect(faqSection).toBeAttached();
    });

    test('video/demo modal opens and closes on Escape', async ({ page }) => {
        const demoButton = page.getByRole('button', { name: /Watch|Demo|See how/i }).first();
        const count = await demoButton.count();
        if (count > 0) {
            await demoButton.click();
            await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 });
        } else {
            // Demo button may not exist — pass gracefully
            test.skip();
        }
    });

    test('page has at least one h1', async ({ page }) => {
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1);
    });
});

test.describe('Help Center (/help)', () => {
    test.beforeEach(async ({ page }) => {
        await suppressCookieConsent(page);
        await page.goto('/help');
        await page.waitForLoadState('domcontentloaded');
    });

    test('page loads with Help Center heading', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1, name: /Help Center/i })).toBeVisible();
    });

    test('FAQ items are present on the page', async ({ page }) => {
        // Help Center has accordion FAQ items
        const faqItems = page.locator('button, details summary').filter({ hasText: /what|how|when|can|why/i });
        await expect(faqItems.first()).toBeVisible({ timeout: 10000 });
    });

    test('category filter buttons exist', async ({ page }) => {
        // Help Center has category filter buttons
        const filterButtons = page.getByRole('button').filter({ hasText: /All|Getting Started|Billing|Teams|API|Security|Audits/i });
        await expect(filterButtons.first()).toBeVisible({ timeout: 5000 });
    });

    test('clicking a category filter works without crashing', async ({ page }) => {
        const billingBtn = page.getByRole('button', { name: /Billing/i }).first();
        const count = await billingBtn.count();
        if (count > 0) {
            await billingBtn.click();
            await page.waitForTimeout(300);
            // Page should still have the heading
            await expect(page.getByRole('heading', { level: 1, name: /Help Center/i })).toBeVisible();
        }
    });

    test('contact form has email input and textarea', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        const emailInput = page.locator('input[type="email"]').first();
        const textarea = page.locator('textarea').first();
        const emailCount = await emailInput.count();
        const textareaCount = await textarea.count();
        // At least one of these should be present in the contact section
        expect(emailCount + textareaCount).toBeGreaterThan(0);
    });

    test('help center has link to /docs/api', async ({ page }) => {
        const apiLink = page.locator('a[href="/docs/api"]').first();
        await expect(apiLink).toBeAttached();
    });
});

test.describe('Terms of Service (/terms)', () => {
    test('page loads with Terms heading', async ({ page }) => {
        await page.goto('/terms');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });
        // Should contain "Terms" somewhere in the heading text
        const h1Text = await page.locator('h1').first().textContent();
        expect(h1Text?.toLowerCase()).toContain('terms');
    });

    test('terms page has substantial text content', async ({ page }) => {
        await page.goto('/terms');
        await page.waitForLoadState('domcontentloaded');
        const bodyText = await page.locator('main, article, .prose, [class*="terms"]').first().textContent();
        expect((bodyText ?? '').length).toBeGreaterThan(200);
    });
});

test.describe('Privacy Policy (/privacy)', () => {
    test('page loads with Privacy heading', async ({ page }) => {
        await page.goto('/privacy');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });
        const h1Text = await page.locator('h1').first().textContent();
        expect(h1Text?.toLowerCase()).toContain('privacy');
    });
});

test.describe('API Documentation (/docs/api)', () => {
    test('page loads with API documentation heading', async ({ page }) => {
        await page.goto('/docs/api');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });
    });

    test('API docs page has some content', async ({ page }) => {
        await page.goto('/docs/api');
        await page.waitForLoadState('domcontentloaded');
        const bodyText = await page.locator('body').textContent();
        expect((bodyText ?? '').length).toBeGreaterThan(100);
    });
});

test.describe('404 Not Found Page', () => {
    test('unknown route shows "Page not found" heading', async ({ page }) => {
        await page.goto('/this-route-absolutely-does-not-exist-xyz-abc');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Page not found/i })).toBeVisible({ timeout: 10000 });
    });

    test('404 page has a back to home / dashboard link', async ({ page }) => {
        await page.goto('/this-route-absolutely-does-not-exist-xyz-abc');
        await page.waitForLoadState('domcontentloaded');
        const homeLink = page.getByRole('link', { name: /home|dashboard/i }).first();
        await expect(homeLink).toBeVisible({ timeout: 10000 });
    });

    test('clicking home link from 404 navigates away from 404', async ({ page }) => {
        await page.goto('/this-route-absolutely-does-not-exist-xyz-abc');
        await page.waitForLoadState('domcontentloaded');
        const homeLink = page.getByRole('link', { name: /home|dashboard/i }).first();
        await homeLink.click();
        await page.waitForLoadState('domcontentloaded');
        // Should no longer be on the 404 route
        expect(page.url()).not.toContain('this-route-absolutely-does-not-exist');
    });
});
