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
    // Action 'SCRAPE' is default, but let's be explicit
    const { data: result, error } = await supabase.functions.invoke('crawl-site', {
        body: { action: 'SCRAPE', url, auditPageId },
    });

    if (error) {
        console.error("Crawl function error:", error);
        throw new Error(`Failed to crawl ${url}: ${error.message}`);
    }

    // The function returns data directly now
    if (result && result.data) {
        return {
            markdown: result.data.markdown,
            metadata: result.data.metadata
        };
    }

    // Fallback: Fetch from DB if function didn't return data (legacy compat)
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
        const { data: result, error } = await supabase.functions.invoke('crawl-site', {
            body: { action: 'MAP', url }
        });

        if (error) throw error;

        // Result data should be a list of strings (links)
        if (result && Array.isArray(result.data)) {
            // Filter to only include subpaths or same domain?
            // Firecrawl /map usually respects the domain.
            return result.data.slice(0, 50); // Limit to 50 pages for now
        }

        return [url];
    } catch (e) {
        console.error("Discovery map failed", e);
        return [url]; // Fallback to just the home page
    }
};
