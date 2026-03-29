// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry } from "../_shared/retry.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

declare const Deno: any;

interface RequestBody {
    action: 'SCRAPE' | 'DISCOVER';
    url: string;
    auditPageId?: string; // Required for SCRAPE
}

interface CrawlResult {
    markdown: string;
    html?: string;
    metadata: {
        title?: string;
        description?: string;
        h1?: string;
        h2s?: string[];
        og_title?: string;
        og_description?: string;
        og_image?: string;
        canonical?: string;
    };
}

interface DiscoverResult {
    urls: Array<{ url: string; type?: string }>;
}

// HTML to text fallback (basic)
function basicHtmlToText(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, " ");
    // Decode HTML entities
    text = text
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();
    return text;
}

// Extract metadata from HTML
function extractMetadata(html: string): CrawlResult["metadata"] {
    const metadata: CrawlResult["metadata"] = {};

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = titleMatch[1].trim();

    // Extract meta description
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
        html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
    if (descMatch) metadata.description = descMatch[1];

    // Extract H1
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) metadata.h1 = h1Match[1].trim();

    // Extract H2s
    const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
    if (h2Matches) {
        metadata.h2s = h2Matches.map(h2 => h2.replace(/<[^>]+>/g, "").trim()).filter(h => h);
    }

    // Extract og:title
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i) ||
        html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/i);
    if (ogTitleMatch) metadata.og_title = ogTitleMatch[1];

    // Extract og:description
    const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) ||
        html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i);
    if (ogDescMatch) metadata.og_description = ogDescMatch[1];

    // Extract og:image
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i) ||
        html.match(/<meta\s+content="([^"]*)"\s+property="og:image"/i);
    if (ogImageMatch) metadata.og_image = ogImageMatch[1];

    // Extract canonical
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) ||
        html.match(/<link\s+href="([^"]*)"\s+rel="canonical"/i);
    if (canonicalMatch) metadata.canonical = canonicalMatch[1];

    return metadata;
}

// Fetch HTML with Deno native fetch
async function fetchHtml(url: string): Promise<string> {
    return withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
            }

            const html = await response.text();
            if (!html || html.length === 0) {
                throw new Error("Empty response body");
            }

            return html;
        } finally {
            clearTimeout(timeoutId);
        }
    }, 3, 1000);
}

// Use Gemini to convert HTML to markdown and extract metadata
async function htmlToMarkdownWithGemini(
    html: string,
    geminiKey: string
): Promise<{ markdown: string; metadata: CrawlResult["metadata"] }> {
    return withRetry(async () => {
        const model = "gemini-2.0-flash-exp"; // Fastest and cheapest

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are a web scraping assistant. Convert the following HTML to clean Markdown. Extract and return JSON metadata at the end.

HTML Content:
${html.slice(0, 100000)} <!-- Truncate large HTML -->

Please:
1. Convert main content to clean, well-formatted Markdown
2. Preserve headings, lists, code blocks, links
3. Remove navigation, footers, ads, scripts
4. At the end, include a JSON block with this format:

\`\`\`json
{
  "title": "page title",
  "h1": "main heading",
  "h2s": ["heading 2", "heading 3"],
  "description": "meta description if available"
}
\`\`\`

Return ONLY the markdown and the JSON block. No other text.`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8000,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Extract markdown and JSON
        let markdown = content;
        let extractedMetadata: CrawlResult["metadata"] = {};

        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            try {
                extractedMetadata = JSON.parse(jsonMatch[1]);
                // Remove JSON from markdown output
                markdown = content.replace(/```json\n[\s\S]*?\n```/, "").trim();
            } catch (e) {
                console.warn("Failed to parse JSON metadata from Gemini:", e);
            }
        }

        return {
            markdown: markdown || basicHtmlToText(html),
            metadata: extractedMetadata
        };
    }, 3, 1000);
}

// Discover URLs from a website (use Gemini URL context or fallback to fetch sitemap)
async function discoverUrls(url: string, geminiKey: string): Promise<DiscoverResult> {
    return withRetry(async () => {
        // Try to fetch sitemap first
        const baseUrl = new URL(url).origin;
        const sitemapUrls: Set<string> = new Set();

        try {
            // Try sitemap.xml
            const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`, {
                signal: AbortSignal.timeout(10000)
            }).catch(() => null);

            if (sitemapResponse?.ok) {
                const sitemapText = await sitemapResponse.text();
                const urlMatches = sitemapText.match(/<loc>([^<]+)<\/loc>/g);
                if (urlMatches) {
                    urlMatches.forEach(match => {
                        const urlStr = match.replace(/<loc>|<\/loc>/g, "").trim();
                        if (urlStr.startsWith("http")) {
                            sitemapUrls.add(urlStr);
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Sitemap fetch failed:", e);
        }

        // Use Gemini to discover more links from the homepage
        if (sitemapUrls.size < 5) {
            try {
                const homeHtml = await fetchHtml(url);
                const model = "gemini-2.0-flash-exp";

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: `Extract all internal links from this HTML. Return ONLY a JSON array of URLs.

HTML:
${homeHtml.slice(0, 50000)}

Return format:
["https://domain.com/page1", "https://domain.com/page2"]

Only include full URLs starting with ${baseUrl}`
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.1,
                                maxOutputTokens: 2000,
                            },
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    const jsonMatch = content.match(/\[([\s\S]*?)\]/);
                    if (jsonMatch) {
                        try {
                            const urls = JSON.parse(`[${jsonMatch[1]}]`);
                            urls.forEach((u: string) => {
                                if (typeof u === "string" && u.startsWith(baseUrl)) {
                                    sitemapUrls.add(u);
                                }
                            });
                        } catch (e) {
                            console.warn("Failed to parse URLs from Gemini:", e);
                        }
                    }
                }
            } catch (e) {
                console.warn("Gemini URL discovery failed:", e);
            }
        }

        // Fallback: extract links from robots.txt
        if (sitemapUrls.size === 0) {
            try {
                const robotsResponse = await fetch(`${baseUrl}/robots.txt`, {
                    signal: AbortSignal.timeout(5000)
                }).catch(() => null);

                if (robotsResponse?.ok) {
                    const robotsText = await robotsResponse.text();
                    const sitemapMatch = robotsText.match(/Sitemap:\s*(\S+)/i);
                    if (sitemapMatch) {
                        const sitemapUrl = sitemapMatch[1];
                        const sitemapRes = await fetch(sitemapUrl, {
                            signal: AbortSignal.timeout(10000)
                        }).catch(() => null);

                        if (sitemapRes?.ok) {
                            const sitemapXml = await sitemapRes.text();
                            const urlMatches = sitemapXml.match(/<loc>([^<]+)<\/loc>/g);
                            if (urlMatches) {
                                urlMatches.forEach(match => {
                                    const urlStr = match.replace(/<loc>|<\/loc>/g, "").trim();
                                    if (urlStr.startsWith(baseUrl)) {
                                        sitemapUrls.add(urlStr);
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("robots.txt parsing failed:", e);
            }
        }

        return {
            urls: Array.from(sitemapUrls).slice(0, 100).map(url => ({ url }))
        };
    }, 2, 1000);
}

// Main handler
serve(async (req) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { action = 'SCRAPE', url, auditPageId } = await req.json() as RequestBody;

        if (!url) {
            throw new Error("Missing URL");
        }

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const authHeader = req.headers.get("Authorization");

        if (!authHeader) throw new Error("Missing Authorization header");

        const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 2. Identify Organization
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData?.organization_id) throw new Error("User has no organization");
        const orgId = userData.organization_id;

        // 3. Deduct Credits (Atomic)
        // DISCOVER = 5 credits (expensive), SCRAPE = 1 credit
        const cost = action === 'DISCOVER' ? 5 : 1;

        const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('decrement_credits', {
            p_org_id: orgId,
            p_audit_amount: cost,
            p_activity_type: action
        });

        if (creditError) throw new Error(`Credit transaction failed: ${creditError.message}`);
        if (!creditResult.success) {
            return new Response(JSON.stringify({
                success: false,
                error: "Insufficient credits",
                details: { code: "INSUFFICIENT_CREDITS", requestId },
                required: cost
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 402,
            });
        }

        // 4. Get Gemini API Key
        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiKey) {
            await refundCredits(supabaseAdmin, orgId, cost);
            throw new Error("Server Misconfiguration: Missing Gemini API Key");
        }

        let resultData: CrawlResult | DiscoverResult;

        if (action === 'SCRAPE') {
            if (!auditPageId) {
                await refundCredits(supabaseAdmin, orgId, cost);
                throw new Error("SCRAPE action requires auditPageId");
            }
            resultData = await performScrape(url, geminiKey);
        } else if (action === 'DISCOVER') {
            resultData = await discoverUrls(url, geminiKey);
        } else {
            await refundCredits(supabaseAdmin, orgId, cost);
            throw new Error("Invalid Action");
        }

        // 5. Handle Success Results
        if (action === 'SCRAPE' && resultData && 'markdown' in resultData) {
            const scrapeResult = resultData as CrawlResult;
            const { error: dbError } = await supabaseAdmin
                .from("page_contents")
                .insert({
                    audit_page_id: auditPageId,
                    markdown_content: scrapeResult.markdown,
                    html_content: scrapeResult.html || "",
                    metadata: scrapeResult.metadata
                });

            if (dbError) {
                console.error("DB Save Error:", dbError);
            }

            await supabaseAdmin
                .from("audit_pages")
                .update({ status: 'CRAWLED' })
                .eq('id', auditPageId);
        }

        return new Response(JSON.stringify({ success: true, data: resultData }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 200,
        });

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            details: {
                code: "CRAWL_SITE_FAILED",
                message: error.message,
                requestId,
            },
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 500,
        });
    }
});

// Helper: Perform scrape action
async function performScrape(url: string, geminiKey: string): Promise<CrawlResult> {
    // Fetch HTML
    const html = await fetchHtml(url);

    // Extract basic metadata from HTML as fallback
    const basicMetadata = extractMetadata(html);

    // Use Gemini to convert to markdown
    const { markdown, metadata: geminiMetadata } = await htmlToMarkdownWithGemini(html, geminiKey);

    // Merge metadata (Gemini takes precedence)
    const finalMetadata = {
        ...basicMetadata,
        ...geminiMetadata
    };

    return {
        markdown,
        html,
        metadata: finalMetadata
    };
}

// Helper: Refund credits on failure
async function refundCredits(supabase: any, orgId: string, amount: number) {
    try {
        const { error } = await supabase.rpc('increment_credits', {
            p_org_id: orgId,
            p_amount: amount
        });

        if (error) {
            // Fallback manual increment
            const { data: org } = await supabase
                .from('organizations')
                .select('audit_credits_remaining')
                .eq('id', orgId)
                .single();

            if (org) {
                await supabase
                    .from('organizations')
                    .update({ audit_credits_remaining: org.audit_credits_remaining + amount })
                    .eq('id', orgId);
            }
        }
    } catch (e) {
        console.error("Credit refund failed:", e);
    }
}
