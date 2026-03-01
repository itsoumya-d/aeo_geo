import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Generate a secure webhook secret (unhashed, shown once to the user)
function generateWebhookSecret(): string {
    const prefix = "whsec_";
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const body = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}${body}`;
}

serve(async (req) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId };
    const respond = (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), { status, headers: jsonHeaders });
    const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
        respond(status, {
            success: false,
            error: message,
            details: { code, message, requestId },
            ...extra,
        });

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return fail(401, "UNAUTHORIZED", "Missing Authorization header");
        }

        // Parse body once — reading req.json() a second time would throw
        const { action, url, events, webhookId, isActive, token: hubspotToken } = await req.json();
        if (!action || typeof action !== "string") {
            return fail(400, "INVALID_ACTION", "Action is required");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: authHeader },
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
            return fail(401, "UNAUTHORIZED", "Unauthorized");
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
            return fail(403, "FORBIDDEN", "You don't have permission to manage webhooks");
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
                        // Store the signing secret; shown only once on creation.
                        secret: secret,
                        is_active: true
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Return the raw secret ONCE — the client must store it; we never show it again
                return respond(200, {
                    success: true,
                    webhook: { ...data, secret },
                    secret_hint: "Save this — it won't be shown again.",
                    data: {
                        webhook: { ...data, secret },
                        secret_hint: "Save this — it won't be shown again.",
                    },
                });
            }

            case "list": {
                const { data, error } = await supabaseClient
                    .from("webhooks")
                    .select("*")
                    .eq("organization_id", orgId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                return respond(200, {
                    success: true,
                    webhooks: data,
                    data: { webhooks: data },
                });
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

                return respond(200, {
                    success: true,
                    webhook: data,
                    data: { webhook: data },
                });
            }

            case "delete": {
                if (!webhookId) throw new Error("Webhook ID is required");

                const { error } = await supabaseAdmin
                    .from("webhooks")
                    .delete()
                    .eq("id", webhookId)
                    .eq("organization_id", orgId);

                if (error) throw error;

                return respond(200, {
                    success: true,
                    message: "Webhook deleted",
                    data: { message: "Webhook deleted" },
                });
            }

            case "test": {
                if (!webhookId) throw new Error("Webhook ID is required");

                const { data: webhook, error } = await supabaseAdmin
                    .from("webhooks")
                    .select("*")
                    .eq("id", webhookId)
                    .eq("organization_id", orgId)
                    .single();

                if (error || !webhook) return fail(404, "WEBHOOK_NOT_FOUND", "Webhook not found");

                const payload = {
                    id: `evt_test_${crypto.randomUUID().split('-')[0]}`,
                    event: "audit.completed",
                    organization_id: orgId,
                    created_at: new Date().toISOString(),
                    data: {
                        audit_id: `aud_test_${crypto.randomUUID().split('-')[0]}`,
                        domain: "example.com",
                        score: 85,
                        test_event: true
                    }
                };
                const body = JSON.stringify(payload);
                const timestamp = Math.floor(Date.now() / 1000);

                // Sign payload using the same format as dispatchWebhook:
                // HMAC-SHA256(secret, `${timestamp}.${body}`)
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey(
                    "raw",
                    encoder.encode(webhook.secret),
                    { name: "HMAC", hash: "SHA-256" },
                    false,
                    ["sign"]
                );
                const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
                const signatureArray = Array.from(new Uint8Array(signatureBuffer));
                const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");

                try {
                    const response = await fetch(webhook.url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Cognition-Signature": `t=${timestamp},v1=${signatureHex}`,
                            "X-Cognition-Event": "audit.completed"
                        },
                        body: body
                    });

                    return respond(200, {
                        success: true,
                        status: response.status,
                        statusText: response.statusText,
                        data: {
                            status: response.status,
                            statusText: response.statusText,
                        },
                    });
                } catch (fetchError) {
                    // Keep status 200 for UI compatibility, with success=false payload.
                    return respond(200, {
                        success: false,
                        error: fetchError.message,
                        details: {
                            code: "WEBHOOK_TEST_FAILED",
                            message: fetchError.message,
                            requestId,
                        },
                    });
                }
            }

            case "save_hubspot_token": {
                // `hubspotToken` comes from the top-level body parse — do NOT re-call req.json()
                if (!hubspotToken) throw new Error("Token is required");
                const token = hubspotToken;

                const { error } = await supabaseAdmin
                    .from("organizations")
                    .update({ hubspot_token: token })
                    .eq("id", orgId)
                    .select()
                    .single();

                if (error) throw error;

                return respond(200, {
                    success: true,
                    message: "HubSpot token saved",
                    data: { message: "HubSpot token saved" },
                });
            }

            case "get_hubspot_token": {
                const { data, error } = await supabaseAdmin
                    .from("organizations")
                    .select("hubspot_token")
                    .eq("id", orgId)
                    .single();

                if (error) throw error;

                return respond(200, {
                    success: true,
                    token: data.hubspot_token ? "configured" : null,
                    isConfigured: !!data.hubspot_token,
                    data: {
                        token: data.hubspot_token ? "configured" : null,
                        isConfigured: !!data.hubspot_token,
                    },
                });
            }

            default:
                return fail(400, "INVALID_ACTION", `Unknown action: ${action}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return fail(400, "MANAGE_WEBHOOKS_FAILED", message);
    }
});
