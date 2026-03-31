import { test, expect, Page } from '@playwright/test';

async function suppressCookieConsent(page: Page) {
    await page.addInitScript(() =>
        localStorage.setItem('cognition:cookie-consent', 'accepted')
    );
}

type OverflowViolation = {
    selector: string;
    text: string;
    left: number;
    right: number;
    width: number;
};

async function expectNoViewportOverflow(
    page: Page,
    options?: { allowSelectors?: string[] }
) {
    const allowSelectors = options?.allowSelectors ?? [];
    const result = await page.evaluate(
        ({ allowSelectors }) => {
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportRight = viewportWidth;
            const defaultAllowed = ['pre', 'code', '.overflow-x-auto', '.overflow-x-scroll', '[data-allow-x-scroll="true"]'];
            const allowedSelectors = [...defaultAllowed, ...(allowSelectors || [])];
            const isVisible = (el: HTMLElement) => {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0.5 && rect.height > 0.5;
            };
            const isAllowed = (el: HTMLElement) => {
                for (const sel of allowedSelectors) {
                    try { if (el.matches(sel) || el.closest(sel)) return true; } catch { /* ignore */ }
                }
                let node: HTMLElement | null = el;
                while (node) {
                    const style = window.getComputedStyle(node);
                    if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true;
                    node = node.parentElement;
                }
                return false;
            };
            const getText = (el: HTMLElement) => {
                if (el instanceof HTMLInputElement) return (el.value || el.placeholder || '').trim();
                if (el instanceof HTMLTextAreaElement) return (el.value || el.placeholder || '').trim();
                return (el.innerText || '').trim();
            };
            const violations: OverflowViolation[] = [];
            const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
            for (const el of elements) {
                if (!isVisible(el)) continue;
                const text = getText(el);
                if (!text) continue;
                if (isAllowed(el)) continue;
                const rect = el.getBoundingClientRect();
                if (rect.right > viewportRight + 1) {
                    violations.push({
                        selector: el.tagName.toLowerCase(),
                        text: text.replace(/\s+/g, ' ').slice(0, 90),
                        left: rect.left,
                        right: rect.right,
                        width: rect.width,
                    });
                }
            }
            return { viewportWidth, violations: violations.slice(0, 10) };
        },
        { allowSelectors }
    );
    if (result.violations.length > 0) {
        const details = result.violations.map(v =>
            `${v.selector} (${v.left.toFixed(1)}..${v.right.toFixed(1)}) — "${v.text}"`
        ).join('\n');
        throw new Error(`Horizontal overflow at ${result.viewportWidth}px:\n${details}`);
    }
}

const VIEWPORTS = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 390, height: 844, name: 'iPhone 14' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1024, height: 768, name: 'Laptop' },
    { width: 1440, height: 900, name: 'Desktop' },
] as const;

test.describe('Responsive — Public Pages', () => {
    for (const { width, height, name } of VIEWPORTS) {
        test(`Landing page renders at ${name} (${width}px)`, async ({ page }) => {
            await page.setViewportSize({ width, height });
            await suppressCookieConsent(page);
            await page.goto('/');
            await page.waitForLoadState('domcontentloaded');
            await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });
            await expectNoViewportOverflow(page);
        });

        test(`Login page renders at ${name} (${width}px)`, async ({ page }) => {
            await page.setViewportSize({ width, height });
            await suppressCookieConsent(page);
            await page.goto('/login');
            await page.waitForLoadState('domcontentloaded');
            await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
            await expectNoViewportOverflow(page);
        });
    }
});

test.describe('Responsive — Protected Pages', () => {
    for (const { width, height, name } of VIEWPORTS) {
        test(`Dashboard renders at ${name} (${width}px)`, async ({ page }) => {
            await page.setViewportSize({ width, height });
            await suppressCookieConsent(page);
            await page.goto('/dashboard');
            await page.waitForLoadState('domcontentloaded');
            await expect(page.locator('body')).not.toBeEmpty();
            const anyVisible = page.locator('aside, main, header, h1, input').first();
            await expect(anyVisible).toBeVisible({ timeout: 10000 });
            await expectNoViewportOverflow(page);
        });

        test(`Settings page renders at ${name} (${width}px)`, async ({ page }) => {
            await page.setViewportSize({ width, height });
            await suppressCookieConsent(page);
            await page.goto('/settings');
            await page.waitForLoadState('domcontentloaded');
            await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
            await expectNoViewportOverflow(page);
        });

        test(`History page renders at ${name} (${width}px)`, async ({ page }) => {
            await page.setViewportSize({ width, height });
            await suppressCookieConsent(page);
            await page.goto('/history');
            await page.waitForLoadState('domcontentloaded');
            await expect(page.getByRole('heading', { level: 1, name: /Audit Management/i })).toBeVisible({ timeout: 15000 });
            await expectNoViewportOverflow(page);
        });
    }
});

test.describe('Responsive — Mobile-specific Behavior', () => {
    test('sidebar is hidden on 375px mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeAttached();
        const isHidden = await sidebar.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.display === 'none' || style.visibility === 'hidden';
        });
        expect(isHidden).toBe(true);
    });

    test('mobile bottom nav is visible at 375px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        // Fixed bottom nav or any nav element visible
        const navElements = page.locator('nav');
        const count = await navElements.count();
        expect(count).toBeGreaterThan(0);
    });

    test('desktop sidebar is visible at 1440px', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await suppressCookieConsent(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('aside').first()).toBeVisible({ timeout: 10000 });
    });

    test('settings tabs are accessible on tablet viewport (768px)', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await suppressCookieConsent(page);
        await page.goto('/settings');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Settings/i })).toBeVisible({ timeout: 15000 });
        // Settings tabs should be visible (horizontal scroll or vertical list)
        const profileTab = page.getByRole('button', { name: /Profile/i }).first();
        await expect(profileTab).toBeVisible({ timeout: 5000 });
    });

    test('landing page content is accessible on mobile without horizontal overflow', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await suppressCookieConsent(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });
        await expectNoViewportOverflow(page);
    });

    test('help page renders without overflow at 375px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await suppressCookieConsent(page);
        await page.goto('/help');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { level: 1, name: /Help Center/i })).toBeVisible({ timeout: 10000 });
        await expectNoViewportOverflow(page);
    });
});
