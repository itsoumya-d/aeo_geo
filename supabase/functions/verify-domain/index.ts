// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { domainId } = await req.json();
        if (!domainId || typeof domainId !== "string") {
            throw new Error("Missing or invalid domainId");
        }

        // 1. Auth & Admin Setup
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({
                success: false,
                error: "Unauthorized",
                details: {
                    code: "UNAUTHORIZED",
                    message: "Missing Authorization header",
                    requestId,
                },
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                status: 401,
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData?.user) {
            return new Response(JSON.stringify({
                success: false,
                error: "Unauthorized",
                details: {
                    code: "UNAUTHORIZED",
                    message: "Invalid user token",
                    requestId,
                },
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                status: 401,
            });
        }

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('organization_id')
            .eq('id', authData.user.id)
            .single();

        if (userError || !userData?.organization_id) {
            throw new Error("User has no organization");
        }

        const { data: domainData, error: domainError } = await supabaseAdmin
            .from('domains')
            .select('*')
            .eq('id', domainId)
            .eq('organization_id', userData.organization_id)
            .single();

        if (domainError || !domainData) {
            return new Response(JSON.stringify({
                success: false,
                error: "Domain not found",
                details: {
                    code: "DOMAIN_NOT_FOUND",
                    message: "Domain not found for this organization",
                    requestId,
                },
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                status: 404,
            });
        }

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

        const message = verified
            ? "Domain verified successfully!"
            : "Verification record not found. Please check your settings and try again in a few minutes.";

        const body = verified
            ? {
                success: true,
                verified: true,
                method,
                message,
                data: { verified: true, method, message },
            }
            : {
                success: false,
                verified: false,
                method,
                message,
                data: { verified: false, method, message },
                error: message,
                details: {
                    code: "VERIFICATION_NOT_FOUND",
                    message,
                    requestId,
                },
            };

        return new Response(JSON.stringify(body), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 200,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({
            success: false,
            error: message,
            details: {
                code: "VERIFY_DOMAIN_FAILED",
                message,
                requestId,
            },
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 500,
        });
    }
});
