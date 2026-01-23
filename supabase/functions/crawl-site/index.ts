// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CrawlRequest {
    auditPageId: string;
    url: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { auditPageId, url } = await req.json() as CrawlRequest;

        if (!url || !auditPageId) {
            throw new Error("Missing url or auditPageId");
        }

        // 1. Identify User & Organization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // Client for Auth Verification
        const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");

        // Client for Admin Operations (Credits/Crawling)
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get User's Organization
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!userData?.organization_id) throw new Error("User has no organization");
        const orgId = userData.organization_id;

        // 2. Check & Deduct Credits using RPC
        const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('decrement_credits', {
            p_org_id: orgId,
            p_audit_amount: 1,
            p_activity_type: 'CRAWL'
        });

        if (creditError) throw new Error(`Credit error: ${creditError.message}`);

        if (!creditResult.success) {
            return new Response(JSON.stringify({ error: creditResult.error }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 402,
            });
        }

        // 3. Call Firecrawl
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (!firecrawlKey) {
            // Refund on config error
            await supabaseAdmin
                .from('organizations')
                .update({ audit_credits_remaining: (orgData.audit_credits_remaining || 0) })
                .eq('id', orgId);
            throw new Error("Missing FIRECRAWL_API_KEY");
        }

        console.log(`Starting crawl for ${url}...`);

        const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${firecrawlKey}`,
            },
            body: JSON.stringify({
                url: url,
                formats: ["markdown", "html"],
                pageOptions: {
                    onlyMainContent: true
                }
            }),
        });

        if (!firecrawlResponse.ok) {
            // Refund on API error
            await supabaseAdmin
                .from('organizations')
                .update({ audit_credits_remaining: (orgData.audit_credits_remaining || 0) })
                .eq('id', orgId);

            const errText = await firecrawlResponse.text();
            throw new Error(`Firecrawl API Error: ${firecrawlResponse.status} - ${errText}`);
        }

        const crawlData = await firecrawlResponse.json();

        if (!crawlData.success || !crawlData.data) {
            // Refund on data error
            await supabaseAdmin
                .from('organizations')
                .update({ audit_credits_remaining: (orgData.audit_credits_remaining || 0) })
                .eq('id', orgId);
            throw new Error("Firecrawl returned unsuccessful or empty data");
        }

        const { markdown, html, metadata } = crawlData.data;

        // 4. Save to Database
        const { error: dbError } = await supabaseAdmin
            .from("page_contents")
            .insert({
                audit_page_id: auditPageId,
                markdown_content: markdown,
                html_content: html,
                metadata: metadata
            });

        if (dbError) {
            // Refund on Save error? Maybe not, the crawl cost money. 
            // But for user experience, yes.
            await supabaseAdmin
                .from('organizations')
                .update({ audit_credits_remaining: (orgData.audit_credits_remaining || 0) })
                .eq('id', orgId);
            throw new Error(`Database Error: ${dbError.message}`);
        }

        // 5. Update Audit Page Status
        await supabaseAdmin
            .from("audit_pages")
            .update({ status: 'CRAWLED' })
            .eq('id', auditPageId);

        return new Response(JSON.stringify({ success: true, message: "Crawl completed and saved", credits_remaining: (orgData.audit_credits_remaining || 0) - 1 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Crawl Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            // If it was a 402 earlier, we returned early. Here is 500.
            status: 500,
        });
    }
});
