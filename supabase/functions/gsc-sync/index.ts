// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const action = url.searchParams.get("action");

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        if (action === "sync") {
            const { organizationId, domainUrl } = await req.json();

            console.log(`[GSC-Sync] Syncing data for ${domainUrl} (Org: ${organizationId})`);

            // 1. Fetch Auth
            const { data: auth } = await supabase
                .from('gsc_auth')
                .select('*')
                .eq('organization_id', organizationId)
                .maybeSingle();

            // 2. Generate/Simulate Data
            // In a real app, we would use the access_token to fetch from Google Search Console API
            // For this prototype, we simulate a realistic correlation between traditional clicks and AI scores
            const { data: audits } = await supabase
                .from('audits')
                .select('created_at, overall_score')
                .eq('organization_id', organizationId)
                .eq('domain_url', domainUrl)
                .order('created_at', { ascending: true });

            const metrics = [];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            for (let i = 0; i < 30; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];

                // Find closest audit for correlation simulation
                const closestAudit = audits?.find(a => a.created_at.startsWith(dateStr)) || audits?.[audits.length - 1];
                const aiScore = closestAudit?.overall_score || 50;

                // Traditional SEO often lags or correlates with AI visibility
                // Logic: Higher AI score (authority) usually correlates with better clicks over time
                const baseClicks = 100 + (aiScore * 5);
                const variance = Math.random() * 20 - 10;

                metrics.push({
                    organization_id: organizationId,
                    domain_url: domainUrl,
                    date: dateStr,
                    clicks: Math.floor(baseClicks + variance),
                    impressions: Math.floor((baseClicks + variance) * 12.5),
                    ctr: parseFloat((0.08 + (aiScore / 1000)).toFixed(4)),
                    position: parseFloat((14 - (aiScore / 10)).toFixed(1))
                });
            }

            // 3. Upsert Metrics
            const { error: upsertError } = await supabase
                .from('gsc_metrics')
                .upsert(metrics, { onConflict: 'organization_id,domain_url,date' });

            if (upsertError) throw upsertError;

            return new Response(JSON.stringify({ success: true, count: metrics.length }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("[GSC-Sync] Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
