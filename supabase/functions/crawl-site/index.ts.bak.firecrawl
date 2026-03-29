// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry } from "../_shared/retry.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
    action: 'SCRAPE' | 'MAP';
    url: string;
    auditPageId?: string; // Required for SCRAPE
}

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
        // Map = 5 credits (expensive), Scrape = 1 credit
        const cost = action === 'MAP' ? 5 : 1;

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

        // 4. Call Firecrawl
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (!firecrawlKey) {
            await refundCredits(supabaseAdmin, orgId, cost);
            throw new Error("Server Misconfiguration: Missing Firecrawl Key");
        }

        let resultData;

        if (action === 'SCRAPE') {
            if (!auditPageId) {
                await refundCredits(supabaseAdmin, orgId, cost);
                throw new Error("SCRAPE action requires auditPageId");
            }
            resultData = await performScrape(firecrawlKey, url);
        } else if (action === 'MAP') {
            resultData = await performMap(firecrawlKey, url);
        } else {
            await refundCredits(supabaseAdmin, orgId, cost);
            throw new Error("Invalid Action");
        }

        // 5. Handle Success Results
        if (action === 'SCRAPE' && resultData) {
            const { error: dbError } = await supabaseAdmin
                .from("page_contents")
                .insert({
                    audit_page_id: auditPageId,
                    markdown_content: resultData.markdown,
                    html_content: resultData.html,
                    metadata: resultData.metadata
                });

            if (dbError) {
                // Log but don't fail the request, the content is returned anyway
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

// Helper: Refund credits on failure
async function refundCredits(supabase: any, orgId: string, amount: number) {
    // We strictly assume this RPC exists or we manually valid update.
    // For safety, let's use a manual increment since we have service role.
    // Ideally, use an 'increment_credits' RPC.

    // Fallback manual increment using SQL or RPC. 
    // Assuming 'decrement_credits' logic handles over-drafts, manual increment is safe here.
    const { error } = await supabase.rpc('increment_credits', { // Create this RPC if not exists, or just do manual update
        p_org_id: orgId,
        p_amount: amount
    });

    if (error) {
        // Fallback to manual update if RPC missing
        const { data: org } = await supabase.from('organizations').select('audit_credits_remaining').eq('id', orgId).single();
        if (org) {
            await supabase.from('organizations').update({ audit_credits_remaining: org.audit_credits_remaining + amount }).eq('id', orgId);
        }
    }
}

async function performScrape(apiKey: string, url: string) {
    return withRetry(async () => {
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                url: url,
                formats: ["markdown", "html"],
                pageOptions: { onlyMainContent: true }
            }),
        });

        if (!response.ok) throw new Error(`Firecrawl Scrape Failed: ${await response.text()}`);
        const json = await response.json();
        if (!json.success) throw new Error(`Firecrawl Scrape Error: ${json.error}`);
        return json.data;
    });
}

async function performMap(apiKey: string, url: string) {
    return withRetry(async () => {
        const response = await fetch("https://api.firecrawl.dev/v1/map", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                url: url,
                limit: 50
            }),
        });

        if (!response.ok) throw new Error(`Firecrawl Map Failed: ${await response.text()}`);
        const json = await response.json();
        if (!json.success) throw new Error(`Firecrawl Map Error: ${json.error}`);
        return json.data || json.links || [];
    });
}
