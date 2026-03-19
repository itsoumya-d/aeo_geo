import { supabase } from './supabase';

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('You must be signed in to run a crawl.');
    }

    const response = await fetch('/api/crawl-site', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'SCRAPE', url, auditPageId }),
    });

    let result: { data?: CrawlResult; error?: string } | null = null;
    try {
        result = await response.json() as { data?: CrawlResult; error?: string };
    } catch {
        result = null;
    }

    if (!response.ok) {
        throw new Error(result?.error || `Failed to crawl ${url}.`);
    }

    if (result?.data) {
        return {
            markdown: result.data.markdown,
            metadata: result.data.metadata
        };
    }

    const { data: contentData, error: contentError } = await supabase
        .from('page_contents')
        .select('markdown_content, metadata')
        .eq('audit_page_id', auditPageId)
        .single();

    if (contentError || !contentData) {
        throw new Error("Content was not saved correctly after crawl.");
    }

    return {
        markdown: contentData.markdown_content,
        metadata: contentData.metadata
    };
};

/**
 * Discovery Phase: Uses Firecrawl /map via Edge Function
 */
export const discoverLinks = async (url: string): Promise<string[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            throw new Error('You must be signed in to discover links.');
        }

        const response = await fetch('/api/crawl-site', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
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
