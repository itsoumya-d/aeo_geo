import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from '../api/crawl-site.ts';

const markdown = 'Synthetic page content for the isolated crawl admission tests. '.repeat(4);

function fixture(t, respond = () => new Response(markdown)) {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, init) => {
        calls.push({ url: String(url), init });
        return respond(String(url), init);
    });
    const response = { headers: {}, status: undefined, body: undefined };
    const res = {
        setHeader(name, value) { response.headers[name] = value; },
        status(code) {
            response.status = code;
            return { json(body) { response.body = body; } };
        },
    };
    return { calls, response, invoke: request => handler(request, res) };
}

function assertRejected(result) {
    assert.equal(result.response.status, 400);
    assert.equal(typeof result.response.body.error, 'string');
    assert.equal(result.response.body.success, undefined);
    assert.equal(result.calls.length, 0, 'invalid requests must not contact a provider or target site');
}

test('rejects malformed JSON before crawling', async t => {
    for (const body of ['{', 'not-json', '']) {
        await t.test(JSON.stringify(body), async t => {
            const result = fixture(t);
            await result.invoke({ method: 'POST', body });
            assertRejected(result);
            assert.match(result.response.body.error, /valid JSON/);
        });
    }
});

test('rejects non-object JSON and parsed body shapes without throwing', async t => {
    for (const [label, body] of [
        ['JSON null', 'null'], ['JSON array', '[]'], ['JSON string', '"example.com"'],
        ['JSON number', '42'], ['JSON boolean', 'true'], ['parsed null', null],
        ['parsed array', []], ['missing body', undefined], ['parsed number', 42],
        ['parsed boolean', false],
    ]) {
        await t.test(label, async t => {
            const result = fixture(t);
            await result.invoke({ method: 'POST', body });
            assertRejected(result);
            assert.match(result.response.body.error, /JSON object/);
        });
    }
});

test('rejects every unsupported configured action before crawling', async t => {
    for (const action of ['SCARPE', 'map', 'scrape', ' MAP ', '', null, false, 0, 1, {}, [], ['MAP']]) {
        await t.test(JSON.stringify(action), async t => {
            const result = fixture(t);
            await result.invoke({ method: 'POST', body: JSON.stringify({ action, url: 'example.com' }) });
            assertRejected(result);
            assert.match(result.response.body.error, /SCRAPE or MAP/);
        });
    }
});

test('keeps the method guard ahead of body parsing and remote work', async t => {
    const result = fixture(t);
    await result.invoke({ method: 'GET', body: '{' });
    assert.equal(result.response.status, 405);
    assert.deepEqual(result.response.headers, { Allow: 'POST' });
    assert.equal(result.calls.length, 0);
});

test('keeps missing, empty and non-string URL validation', async t => {
    for (const url of [undefined, '', '   ', null, 123, {}, []]) {
        await t.test(String(url), async t => {
            const result = fixture(t);
            await result.invoke({ method: 'POST', body: { action: 'MAP', url } });
            assertRejected(result);
            assert.equal(result.response.body.error, 'A URL is required.');
        });
    }
});

test('preserves default and explicit SCRAPE for parsed and serialized objects', async t => {
    for (const action of [undefined, 'SCRAPE']) {
        for (const serialized of [false, true]) {
            await t.test(`${action ?? 'omitted'} / ${serialized ? 'JSON' : 'object'}`, async t => {
                const result = fixture(t);
                const input = { action, url: '  example.com/docs  ', auditPageId: 'fixture-page' };
                await result.invoke({ method: 'POST', body: serialized ? JSON.stringify(input) : input });
                assert.equal(result.response.status, 200);
                assert.deepEqual(result.response.body, { success: true, data: { markdown: markdown.trim(), metadata: { source: 'jina-reader' } } });
                assert.equal(result.calls.length, 1);
                assert.equal(result.calls[0].url, 'https://r.jina.ai/https://example.com/docs');
            });
        }
    }
});

test('preserves MAP sitemap dispatch without invoking the scrape provider', async t => {
    for (const serialized of [false, true]) {
        await t.test(serialized ? 'JSON' : 'object', async t => {
            const result = fixture(t, () => new Response('<urlset><url><loc>https://example.com/page</loc></url></urlset>'));
            const input = { action: 'MAP', url: 'https://example.com' };
            await result.invoke({ method: 'POST', body: serialized ? JSON.stringify(input) : input });
            assert.equal(result.response.status, 200);
            assert.deepEqual(result.response.body, { success: true, data: ['https://example.com/page'] });
            assert.deepEqual(result.calls.map(call => call.url), ['https://example.com/sitemap.xml']);
        });
    }
});

test('preserves the MAP homepage fallback when a sitemap is unavailable', async t => {
    const result = fixture(t, url => url.endsWith('/sitemap.xml')
        ? new Response('', { status: 404 })
        : new Response('<a href="/about">About</a><a href="/image.png">Image</a><a href="https://other.example">External</a>'));
    await result.invoke({ method: 'POST', body: { action: 'MAP', url: 'example.com' } });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.response.body, { success: true, data: ['https://example.com/about'] });
    assert.deepEqual(result.calls.map(call => call.url), ['https://example.com/sitemap.xml', 'https://example.com']);
});
