import { expect, test as base } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const test = base.extend<{ isolatedNetwork: void }>({
    isolatedNetwork: [async ({ page }, use) => {
        const unexpectedRequests: string[] = [];
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin === 'http://127.0.0.1:5174') return route.continue();
            unexpectedRequests.push(url.origin);
            return route.abort();
        });
        await use();
        expect(unexpectedRequests, 'Demo must not call external services').toEqual([]);
    }, { auto: true }],
});

test.afterEach(async ({ page }, testInfo) => {
    if (!page.isClosed()) {
        await testInfo.attach('report-template-workflow', {
            body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
        });
    }
});

test.beforeEach(async ({ page }) => {
    await page.goto('/demo/report-templates.html');
    await expect(page.getByRole('heading', { name: 'Report Builder' })).toBeVisible();
});

test('creates, edits, reorders, exports, and restores the actual report layout', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Template name' }).fill('Client Māori report');
    await page.getByRole('button', { name: 'Add Visibility Trends' }).click();
    await page.getByRole('button', { name: 'Remove Score Overview' }).click();
    const handle = page.getByRole('button', { name: 'Move Visibility Trends' });
    await handle.focus();
    await page.keyboard.press('Space');
    await expect(handle).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect(page.getByRole('listitem')).toHaveText(['Executive Summary', 'Visibility Trends', 'Key Recommendations']);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Client-M-ori-report-template.json');
    const text = await readFile((await download.path())!, 'utf8');
    const template = JSON.parse(text);
    expect(template).toEqual({
        format: 'cognition-report-template', version: 1, name: 'Client Māori report',
        layout: [
            { type: 'summary', title: 'Executive Summary' },
            { type: 'trends', title: 'Visibility Trends' },
            { type: 'recommendations', title: 'Key Recommendations' },
        ],
    });

    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Template name' })).toHaveValue('My Custom Report');
    await page.getByLabel('Import template JSON').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
    await expect(page.getByRole('textbox', { name: 'Template name' })).toHaveValue(template.name);
    await expect(page.getByRole('listitem')).toHaveText(['Executive Summary', 'Visibility Trends', 'Key Recommendations']);
    await page.getByRole('button', { name: 'Save Template' }).click();
    await expect(page.getByText('Last simulated save: Client Māori report')).toBeVisible();
});

test('rejects malformed, unsupported, and oversized imports without losing the draft; same file can retry', async ({ page }) => {
    const name = page.getByRole('textbox', { name: 'Template name' });
    await name.fill('Keep this draft');
    const input = page.getByLabel('Import template JSON');
    for (const [text, error] of [
        ['{', 'Could not read JSON'],
        [JSON.stringify({ format: 'cognition-report-template', version: 2 }), 'not a supported'],
        ['x'.repeat(65 * 1024), 'smaller than 64 KB'],
    ]) {
        await input.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
        await expect(page.getByRole('alert')).toContainText(error);
        await expect(name).toHaveValue('Keep this draft');
        await expect(page.getByRole('listitem')).toHaveCount(3);
    }
    const valid = { format: 'cognition-report-template', version: 1, name: 'Recovered', layout: [{ type: 'score', title: 'Score Overview' }] };
    await input.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(valid)) });
    await expect(name).toHaveValue('Recovered');
    await expect(page.getByRole('alert')).toHaveCount(0);
});

test('validates empty names and sections, preserves failed saves, then retries successfully', async ({ page }) => {
    const name = page.getByRole('textbox', { name: 'Template name' });
    await name.fill('  ');
    await page.getByRole('button', { name: 'Save Template' }).click();
    await expect(page.getByRole('alert')).toContainText('Template name');
    await name.fill('Retry report');
    for (const title of ['Executive Summary', 'Score Overview', 'Key Recommendations']) {
        await page.getByRole('button', { name: `Remove ${title}` }).click();
    }
    await page.getByRole('button', { name: 'Export JSON' }).click();
    await expect(page.getByRole('alert')).toContainText('1–50 sections');
    await page.getByRole('button', { name: 'Add Executive Summary' }).click();
    await page.getByRole('checkbox', { name: 'Simulate save failure' }).check();
    await page.getByRole('button', { name: 'Save Template' }).click();
    await expect(page.getByRole('alert')).toContainText('Your changes are still here');
    await expect(name).toHaveValue('Retry report');
    await expect(page.getByRole('listitem')).toHaveText(['Executive Summary']);
    await page.getByRole('checkbox', { name: 'Simulate save failure' }).uncheck();
    await page.getByRole('button', { name: 'Save Template' }).click();
    await expect(page.getByText('Last simulated save: Retry report')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
});

test('cancelled keyboard drag keeps section order and rapid duplicate modules remain independent', async ({ page }) => {
    await page.getByRole('button', { name: 'Move Executive Summary' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Move Executive Summary' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listitem')).toHaveText(['Executive Summary', 'Score Overview', 'Key Recommendations']);
    await page.getByRole('button', { name: 'Add Visibility Trends' }).dblclick();
    await expect(page.getByRole('button', { name: 'Remove Visibility Trends' })).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove Visibility Trends' }).first().click();
    await expect(page.getByRole('button', { name: 'Remove Visibility Trends' })).toHaveCount(1);
});

test('mobile controls remain usable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import JSON', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Add Visibility Trends' }).click();
    await expect(page.getByRole('button', { name: 'Remove Visibility Trends' })).toBeVisible();
});
