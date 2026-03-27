interface CrawlResult {
    markdown: string;
    metadata: any;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function isRetriableStatus(status: number): boolean {
    return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Triggers the Supabase Edge Function to crawl a specific URL.
 * Requires an existing AuditPage ID to link the content to.
 */
/**
 * Triggers the Supabase Edge Function to crawl a specific URL.
 * Requires an existing AuditPage ID to link the content to.
 */
export const crawlPage = async (url: string, auditPageId: string): Promise<CrawlResult> => {
    let response: Response | null = null;
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            response = await fetchWithTimeout('/api/crawl-site', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'SCRAPE', url, auditPageId }),
            }, 30000);

            if (!isRetriableStatus(response.status) || attempt === 1) {
                break;
            }
        } catch (error) {
            lastError = error;
            if (attempt === 1) {
                throw error;
            }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
    }

    if (!response) {
        throw lastError instanceof Error ? lastError : new Error('Crawl request failed before the server responded.');
    }

    let result: { data?: CrawlResult; error?: string } | null = null;
    try {
        result = await response.json() as { data?: CrawlResult; error?: string };
    } catch {
        result = null;
    }

    if (!response.ok || !result?.data) {
        throw new Error(result?.error || 'Crawl failed.');
    }

    return {
        markdown: result.data.markdown,
        metadata: result.data.metadata
    };
};

/**
 * Discovery Phase: Uses Firecrawl /map via Edge Function
 */
export const discoverLinks = async (url: string): Promise<string[]> => {
    try {
        const response = await fetchWithTimeout('/api/crawl-site', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'MAP', url })
        }, 25000);

        let result: { data?: string[]; error?: string } | null = null;
        try {
            result = await response.json() as { data?: string[]; error?: string };
        } catch {
            result = null;
        }

        if (!response.ok) {
            throw new Error(result?.error || 'Discovery failed.');
        }

        if (result && Array.isArray(result.data)) {
            return result.data.slice(0, 50); // Limit to 50 pages for now
        }

        return [url];
    } catch (e) {
        console.error("Discovery map failed", e);
        return [url]; // Fallback to just the home page
    }
};
