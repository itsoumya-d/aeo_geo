import { createClient } from '@supabase/supabase-js';

type RequestLike = {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
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
    auditPageId?: string;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function parseBody(body: unknown): CrawlRequest {
    if (!body) return {};
    if (typeof body === 'string') return JSON.parse(body) as CrawlRequest;
    if (typeof body === 'object') return body as CrawlRequest;
    return {};
}

function normalizeUrl(input: string): string {
    return input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toMarkdownFromHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<(h[1-6]|p|li|section|article|div|br|tr|td|th|blockquote)[^>]*>/gi, '\n')
        .replace(/<\/(h[1-6]|p|li|section|article|div|tr|td|th|blockquote)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

function extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match?.[1]?.replace(/\s+/g, ' ').trim() || null;
}

function extractDescription(html: string): string | null {
    const match = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i)
        || html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["'][^>]*>/i);
    return match?.[1]?.replace(/\s+/g, ' ').trim() || null;
}

function isLikelyBotBlock(html: string, url: string): boolean {
    const lower = html.toLowerCase();
    const hostname = new URL(url).hostname.toLowerCase();

    return (
        lower.includes('attention required') ||
        lower.includes('verify you are human') ||
        lower.includes('checking your browser before accessing') ||
        lower.includes('captcha') ||
        lower.includes('access denied') ||
        lower.includes('bot verification') ||
        lower.includes('enable javascript and cookies') ||
        (lower.includes('cloudflare') && lower.includes('ray id')) ||
        (lower.includes(hostname) === false && lower.length < 500)
    );
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
            links.add(parsed.toString().replace(/\/$/, '') || parsed.toString());
        } catch {
            continue;
        }
    }

    return Array.from(links).slice(0, 50);
}

async function fetchWithBrowserHeaders(url: string): Promise<Response> {
    return fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Upgrade-Insecure-Requests': '1',
        },
    });
}

async function scrapeWithJina(url: string): Promise<{ markdown: string; metadata: Record<string, unknown> } | null> {
    const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
            'x-respond-with': 'markdown',
            'x-no-cache': 'true',
            'User-Agent': 'Mozilla/5.0',
        },
    });

    if (!response.ok) {
        throw new Error(`Jina Reader scrape failed: ${response.status} ${await response.text()}`);
    }

    const markdown = (await response.text()).trim();
    if (!markdown || markdown.length < 200) {
        return null;
    }

    return {
        markdown,
        metadata: {
            source: 'jina-reader',
        },
    };
}

async function performScrape(url: string) {
    let directHtml = '';
    let title: string | null = null;
    let description: string | null = null;

    try {
        const response = await fetchWithBrowserHeaders(url);
        if (response.ok) {
            directHtml = await response.text();
            title = extractTitle(directHtml);
            description = extractDescription(directHtml);
            const markdown = toMarkdownFromHtml(directHtml);

            if (!isLikelyBotBlock(directHtml, url) && markdown.length > 400) {
                return {
                    markdown,
                    html: directHtml,
                    metadata: {
                        source: 'browser-fetch',
                        title,
                        description,
                        status: response.status,
                    },
                };
            }
        }
    } catch (error) {
        console.warn('[crawl-site] Direct scrape failed before Jina fallback:', error);
    }

    const jinaResult = await scrapeWithJina(url);
    if (jinaResult?.markdown) {
        return {
            markdown: jinaResult.markdown,
            html: directHtml,
            metadata: {
                source: 'jina-reader',
                title,
                description,
            },
        };
    }

    if (directHtml) {
        const markdown = toMarkdownFromHtml(directHtml);
        if (markdown.length > 80) {
            return {
                markdown,
                html: directHtml,
                metadata: {
                    source: 'browser-fetch-fallback',
                    title,
                    description,
                },
            };
        }
    }

    throw new Error('Could not scrape this website. The site appears to block automated access.');
}

async function performMap(url: string): Promise<string[]> {
    const normalizedUrl = normalizeUrl(url);

    try {
        const sitemapUrl = new URL('/sitemap.xml', normalizedUrl).toString();
        const response = await fetchWithBrowserHeaders(sitemapUrl);
        if (response.ok) {
            const xml = await response.text();
            const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).filter(Boolean);
            if (urls.length > 0) return urls.slice(0, 30);
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

async function refundCredits(supabase: any, orgId: string, amount: number) {
    const { error } = await supabase.rpc('increment_credits', {
        p_org_id: orgId,
        p_amount: amount,
    });

    if (!error) return;

    const { data: org } = await supabase
        .from('organizations')
        .select('audit_credits_remaining')
        .eq('id', orgId)
        .single();

    if (!org) return;

    await supabase
        .from('organizations')
        .update({ audit_credits_remaining: org.audit_credits_remaining + amount })
        .eq('id', orgId);
}

export default async function handler(req: RequestLike, res: ResponseLike) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
        return res.status(500).json({ error: 'Server configuration is incomplete.' });
    }

    const authHeader = req.headers?.authorization;
    if (!authHeader || Array.isArray(authHeader)) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    let body: CrawlRequest;
    try {
        body = parseBody(req.body);
    } catch {
        return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }

    const action = body.action || 'SCRAPE';
    const targetUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const auditPageId = typeof body.auditPageId === 'string' ? body.auditPageId.trim() : '';

    if (!targetUrl) {
        return res.status(400).json({ error: 'A URL is required.' });
    }

    const normalizedUrl = normalizeUrl(targetUrl);

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: authHeader,
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { data: userRow, error: userError } = await supabaseAdmin
        .from('users')
        .select('organization_id')
        .eq('id', authData.user.id)
        .single();

    if (userError || !userRow?.organization_id) {
        return res.status(400).json({ error: 'User has no organization.' });
    }

    const cost = action === 'MAP' ? 5 : 1;
    const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('decrement_credits', {
        p_org_id: userRow.organization_id,
        p_audit_amount: cost,
        p_activity_type: action,
    });

    if (creditError) {
        return res.status(500).json({ error: `Credit transaction failed: ${creditError.message}` });
    }

    if (!creditResult?.success) {
        return res.status(402).json({ error: 'Insufficient credits.', required: cost });
    }

    try {
        if (action === 'MAP') {
            const links = await performMap(normalizedUrl);
            return res.status(200).json({ success: true, data: links });
        }

        if (!auditPageId) {
            await refundCredits(supabaseAdmin, userRow.organization_id, cost);
            return res.status(400).json({ error: 'SCRAPE action requires auditPageId.' });
        }

        const scraped = await performScrape(normalizedUrl);

        const { error: insertError } = await supabaseAdmin
            .from('page_contents')
            .insert({
                audit_page_id: auditPageId,
                markdown_content: scraped.markdown,
                html_content: scraped.html,
                metadata: scraped.metadata,
            });

        if (insertError) {
            console.error('[crawl-site] page_contents insert failed:', insertError);
        }

        await supabaseAdmin
            .from('audit_pages')
            .update({ status: 'CRAWLED' })
            .eq('id', auditPageId);

        return res.status(200).json({
            success: true,
            data: scraped,
        });
    } catch (error) {
        await refundCredits(supabaseAdmin, userRow.organization_id, cost);
        console.error('[crawl-site] request failed:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Crawl failed.',
        });
    }
}
