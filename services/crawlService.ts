import { supabase } from './supabase';

interface CrawlResult {
    markdown: string;
    metadata: any;
}

/**
 * Triggers the Supabase Edge Function to crawl a specific URL.
 * Requires an existing AuditPage ID to link the content to.
 */
export const crawlPage = async (url: string, auditPageId: string): Promise<CrawlResult> => {
    const { data, error } = await supabase.functions.invoke('crawl-site', {
        body: { url, auditPageId },
    });

    if (error) {
        console.error("Crawl function error:", error);
        throw new Error(`Failed to crawl ${url}: ${error.message}`);
    }

    // The function returns success message, but we might want to fetch the content immediately
    // Or we can rely on the function returning it if we modify the function.
    // For now, let's fetch the stored content from the DB to be sure.

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
 * Discovery Phase: Uses the real crawler (Firecrawl /map or just homepage links)
 * For now, we might simulate discovery or implement a 'map-site' function later.
 */
export const discoverLinks = async (url: string): Promise<string[]> => {
    // TODO: Implement 'map-site' Edge Function for Firecrawl /map
    // For now, return the url itself to start
    return [url];
};
