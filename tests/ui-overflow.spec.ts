import { test, Page } from '@playwright/test';

const VIEWPORT_WIDTHS = [375, 390, 414, 768, 820, 1024, 1280, 1440, 1920] as const;

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
      const viewportLeft = 0;
      const viewportRight = viewportWidth;

      const defaultAllowed = [
        'pre',
        'code',
        '.overflow-x-auto',
        '.overflow-x-scroll',
        '[data-allow-x-scroll="true"]',
      ];
      const allowedSelectors = [...defaultAllowed, ...(allowSelectors || [])];

      const isVisible = (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0.5 && rect.height > 0.5;
      };

      const isAllowed = (el: HTMLElement) => {
        for (const sel of allowedSelectors) {
          try {
            if (el.matches(sel) || el.closest(sel)) return true;
          } catch {
            // ignore invalid selectors
          }
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
        if (el instanceof HTMLSelectElement) return (el.value || '').trim();
        return (el.innerText || '').trim();
      };

      const toSelector = (el: HTMLElement) => {
        const id = el.getAttribute('id');
        if (id) return `#${CSS.escape(id)}`;
        const classes = (el.getAttribute('class') || '')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 4)
          .map((c) => `.${CSS.escape(c)}`)
          .join('');
        return `${el.tagName.toLowerCase()}${classes || ''}`;
      };

      const violations: OverflowViolation[] = [];

      const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
      for (const el of elements) {
        if (!isVisible(el)) continue;
        const text = getText(el);
        if (!text) continue;
        if (isAllowed(el)) continue;

        const rect = el.getBoundingClientRect();
        const overflowLeft = rect.left < viewportLeft - 1;
        const overflowRight = rect.right > viewportRight + 1;

        if (overflowLeft || overflowRight) {
          const preview = text.replace(/\s+/g, ' ').slice(0, 90);
          violations.push({
            selector: toSelector(el),
            text: preview,
            left: rect.left,
            right: rect.right,
            width: rect.width,
          });
        }
      }

      return {
        viewportWidth,
        violations: violations.slice(0, 30),
      };
    },
    { allowSelectors }
  );

  if (result.violations.length > 0) {
    const details = result.violations
      .slice(0, 12)
      .map(
        (v) =>
          `${v.selector} (${v.left.toFixed(1)}..${v.right.toFixed(1)} w=${v.width.toFixed(
            1
          )}) — "${v.text}"`
      )
      .join('\n');
    throw new Error(
      `Horizontal overflow detected at ${result.viewportWidth}px viewport.\n${details}`
    );
  }
}

test.describe('UI overflow audit', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run overflow audit on Chromium only');

  const routes = [
    '/',
    '/help',
    '/terms',
    '/privacy',
    '/docs/api',
    '/login',
    '/signup',
    '/reset-password',
    '/dashboard',
    '/analysis/00000000-0000-0000-0000-000000000000',
    '/results/00000000-0000-0000-0000-000000000000',
    '/history',
    '/settings',
    '/settings/billing',
    '/settings/integrations',
  ];

  for (const width of VIEWPORT_WIDTHS) {
    test(`no horizontal overflow @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const path of routes) {
        await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate(async () => {
          // Wait for fonts/layout stabilization where supported
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fonts: any = (document as any).fonts;
          if (fonts?.ready) await fonts.ready;
        });

        await expectNoViewportOverflow(page);
      }
    });
  }
});

