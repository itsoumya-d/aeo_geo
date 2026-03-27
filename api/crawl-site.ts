type RequestLike = {
    method?: string;
    body?: unknown;
};

export const config = {
    maxDuration: 45,
};

type ResponseLike = {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
        json: (body: unknown) => void;
    };
};

type CrawlAction = 'SCRAPE' | 'MAP';

type CrawlRequest = {
    action?: CrawlAction;
    url?: string;
};

type CrawlResult = {
    markdown: string;
    metadata: Record<string, unknown>;
};

function parseBody(body: unknown): CrawlRequest {
    if (!body) return {};
    if (typeof body === 'string') return JSON.parse(body) as CrawlRequest;
    if (typeof body === 'object') return body as CrawlRequest;
    return {};
}

function normalizeUrl(input: string): string {
    return input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;
}

async function fetchWithBrowserHeaders(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        return await fetch(url, {
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1',
            },
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function scrapeWithJina(url: string): Promise<CrawlResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 22000);

        try {
            const response = await fetch(`https://r.jina.ai/${url}`, {
                signal: controller.signal,
                headers: {
                    'x-respond-with': 'markdown',
                    'x-no-cache': 'true',
                    'User-Agent': 'Mozilla/5.0',
                },
            });

            if (!response.ok) {
                const message = `Jina Reader failed: ${response.status}`;
                if ((response.status === 429 || response.status >= 500) && attempt === 0) {
                    lastError = new Error(message);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                }
                throw new Error(message);
            }

            const markdown = (await response.text()).trim();
            if (!markdown || markdown.length < 120) {
                throw new Error('Jina Reader returned empty content.');
            }

            return {
                markdown,
                metadata: {
                    source: 'jina-reader',
                },
            };
        } catch (error) {
            lastError = error;
            if (attempt === 1) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } finally {
            clearTimeout(timeoutId);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Jina Reader failed.');
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
    const base = new URL(baseUrl);
    const links = new Set<string>();
    const hrefRegex = /href=["']([^"'#]+)["']/gi;

    for (const match of html.matchAll(hrefRegex)) {
        const href = match[1]?.trim();
        if (!href) continue;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;

        try {
            const resolved = new URL(href, base).toString();
            const parsed = new URL(resolved);
            if (parsed.hostname !== base.hostname) continue;
            if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|mp4|mp3)$/i.test(parsed.pathname)) continue;
            links.add(parsed.toString().replace(/\/$/, ''));
        } catch {
            continue;
        }
    }

    return Array.from(links).filter(Boolean).slice(0, 30);
}

async function performMap(url: string): Promise<string[]> {
    const normalizedUrl = normalizeUrl(url);

    try {
        const sitemapUrl = new URL('/sitemap.xml', normalizedUrl).toString();
        const response = await fetchWithBrowserHeaders(sitemapUrl);
        if (response.ok) {
            const xml = await response.text();
            const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).filter(Boolean);
            if (urls.length > 0) return urls.slice(0, 20);
        }
    } catch {
        // ignore
    }

    try {
        const response = await fetchWithBrowserHeaders(normalizedUrl);
        if (response.ok) {
            const html = await response.text();
            const links = extractInternalLinks(html, normalizedUrl);
            if (links.length > 0) return links;
        }
    } catch {
        // ignore
    }

    return [normalizedUrl];
}

export default async function handler(req: RequestLike, res: ResponseLike) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    let body: CrawlRequest;
    try {
        body = parseBody(req.body);
    } catch {
        return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }

    const action = body.action || 'SCRAPE';
    const targetUrl = typeof body.url === 'string' ? body.url.trim() : '';

    if (!targetUrl) {
        return res.status(400).json({ error: 'A URL is required.' });
    }

    const normalizedUrl = normalizeUrl(targetUrl);

    try {
        if (action === 'MAP') {
            const links = await performMap(normalizedUrl);
            return res.status(200).json({ success: true, data: links });
        }

        const scraped = await scrapeWithJina(normalizedUrl);
        return res.status(200).json({ success: true, data: scraped });
    } catch (error) {
        console.error('[crawl-site] request failed:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Crawl failed.',
        });
    }
}
