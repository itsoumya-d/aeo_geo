interface CrawlResult {
    markdown: string;
    metadata: any;
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
    const response = await fetch('/api/crawl-site', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'SCRAPE', url, auditPageId }),
    });

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
        const response = await fetch('/api/crawl-site', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'MAP', url })
        });

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
