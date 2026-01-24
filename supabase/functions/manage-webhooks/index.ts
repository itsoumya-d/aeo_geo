import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure webhook secret
function generateWebhookSecret(): string {
    const prefix = "whsec_";
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const body = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}${body}`;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { action, url, events, webhookId, isActive } = await req.json();

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Verify user authentication
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            throw new Error("Unauthorized");
        }

        // Get user's organization and role
        const { data: userData } = await supabaseClient
            .from("users")
            .select("organization_id, role")
            .eq("id", user.id)
            .single();

        if (!userData?.organization_id) {
            throw new Error("User has no organization");
        }

        const orgId = userData.organization_id;

        // RBAC Check
        const { data: hasPerm } = await supabaseClient.rpc('check_user_permission', {
            p_user_id: user.id,
            p_permission: 'webhooks.manage'
        });

        if (!hasPerm && action !== 'list') {
            throw new Error("You don't have permission to manage webhooks");
        }

        switch (action) {
            case "create": {
                if (!url || !events || !Array.isArray(events)) {
                    throw new Error("URL and events array are required");
                }

                const secret = generateWebhookSecret();

                const { data, error } = await supabaseAdmin
                    .from("webhooks")
                    .insert({
                        organization_id: orgId,
                        url: url.trim(),
                        events: events,
                        secret: secret,
                        is_active: true
                    })
                    .select()
                    .single();

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, webhook: data }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
                );
            }

            case "list": {
                const { data, error } = await supabaseClient
                    .from("webhooks")
                    .select("*")
                    .eq("organization_id", orgId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, webhooks: data }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
                );
            }

            case "update": {
                if (!webhookId) throw new Error("Webhook ID is required");

                const updateData: any = {};
                if (url) updateData.url = url;
                if (events) updateData.events = events;
                if (typeof isActive === 'boolean') updateData.is_active = isActive;

                const { data, error } = await supabaseAdmin
                    .from("webhooks")
                    .update(updateData)
                    .eq("id", webhookId)
                    .eq("organization_id", orgId)
                    .select()
                    .single();

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, webhook: data }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
                );
            }

            case "delete": {
                if (!webhookId) throw new Error("Webhook ID is required");

                const { error } = await supabaseAdmin
                    .from("webhooks")
                    .delete()
                    .eq("id", webhookId)
                    .eq("organization_id", orgId);

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, message: "Webhook deleted" }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
                );
            }

            case "save_hubspot_token": {
                const { token } = await req.json();
                if (!token) throw new Error("Token is required");

                const { data, error } = await supabaseAdmin
                    .from("organizations")
                    .update({ hubspot_token: token })
                    .eq("id", orgId)
                    .select()
                    .single();

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, message: "HubSpot token saved" }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
                );
            }

            case "get_hubspot_token": {
                const { data, error } = await supabaseAdmin
                    .from("organizations")
                    .select("hubspot_token")
                    .eq("id", orgId)
                    .single();

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, token: data.hubspot_token ? " configured" : null, isConfigured: !!data.hubspot_token }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
                );
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
