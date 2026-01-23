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
        const { domainId } = await req.json();

        // 1. Auth & Admin Setup
        const authHeader = req.headers.get("Authorization");
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const { data: domainData, error: domainError } = await supabaseAdmin
            .from('domains')
            .select('*')
            .eq('id', domainId)
            .single();

        if (domainError || !domainData) throw new Error("Domain not found");

        const domain = domainData.domain;
        const token = domainData.verification_token;

        let verified = false;
        let method = "DNS";

        // 2. Check DNS TXT Record (Cloudflare DoH)
        try {
            const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`;
            const dnsRes = await fetch(dnsUrl, { headers: { "Accept": "application/dns-json" } });
            const dnsData = await dnsRes.json();

            if (dnsData.Answer) {
                for (const record of dnsData.Answer) {
                    const txtValue = record.data.replace(/"/g, '');
                    if (txtValue === `cognition-v-token=${token}`) {
                        verified = true;
                        break;
                    }
                }
            }
        } catch (e) {
            console.error("DNS check failed", e);
        }

        // 3. Check Meta Tag (Fallback)
        if (!verified) {
            method = "HTML";
            try {
                const htmlRes = await fetch(`https://${domain}`, { headers: { 'User-Agent': 'CognitionBot/1.0' } });
                const html = await htmlRes.text();
                if (html.includes(`name="cognition-verification" content="${token}"`)) {
                    verified = true;
                }
            } catch (e) {
                console.error("HTML check failed", e);
            }
        }

        // 4. Update Status
        if (verified) {
            await supabaseAdmin
                .from('domains')
                .update({ verified: true, updated_at: new Date().toISOString() })
                .eq('id', domainId);
        }

        return new Response(JSON.stringify({
            success: verified,
            method,
            message: verified ? "Domain verified successfully!" : "Verification record not found. Please check your settings and try again in a few minutes."
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
