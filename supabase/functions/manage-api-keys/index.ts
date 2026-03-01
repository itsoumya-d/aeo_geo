import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Generate a secure random API key
function generateApiKey(): string {
    const prefix = "cog_";
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const keyBody = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}${keyBody}`;
}

// Hash the API key for storage
async function hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { action, name, keyId } = await req.json();
        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Unauthorized",
                    details: {
                        code: "UNAUTHORIZED",
                        message: "Missing Authorization header",
                        requestId,
                    },
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                    status: 401,
                }
            );
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

        // Check if user is owner or admin
        if (!["owner", "admin"].includes(userData.role)) {
            throw new Error("Only owners and admins can manage API keys");
        }

        const orgId = userData.organization_id;

        switch (action) {
            case "create": {
                if (!name || typeof name !== "string") {
                    throw new Error("Key name is required");
                }

                // Generate and hash the key
                const apiKey = generateApiKey();
                const keyHash = await hashApiKey(apiKey);
                const keyPreview = apiKey.slice(-4);

                // Store the hashed key
                const { error } = await supabaseAdmin
                    .from("api_keys")
                    .insert({
                        organization_id: orgId,
                        name: name.trim(),
                        key_hash: keyHash,
                        key_preview: keyPreview,
                        created_by: user.id,
                        permissions: ["read:audits", "write:audits"],
                    });

                if (error) throw error;

                // Return the raw key (only time it's visible)
                return new Response(
                    JSON.stringify({
                        success: true,
                        apiKey: apiKey, // Only returned once
                        preview: keyPreview,
                        data: {
                            apiKey,
                            preview: keyPreview,
                        },
                    }),
                    {
                        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                        status: 200,
                    }
                );
            }

            case "list": {
                const { data, error } = await supabaseClient
                    .from("api_keys")
                    .select("id, name, key_preview, permissions, created_at, last_used_at, usage_count, rate_limit")
                    .eq("organization_id", orgId)
                    .is("revoked_at", null)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({
                        success: true,
                        keys: data,
                        data: { keys: data },
                    }),
                    {
                        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                        status: 200,
                    }
                );
            }

            case "rotate": {
                if (!keyId) {
                    throw new Error("Key ID is required");
                }

                // Verify the key belongs to the organization
                const { data: existingKey, error: fetchError } = await supabaseAdmin
                    .from("api_keys")
                    .select("id, name")
                    .eq("id", keyId)
                    .eq("organization_id", orgId)
                    .single();

                if (fetchError || !existingKey) {
                    throw new Error("Key not found");
                }

                // Generate and hash the new key
                const newApiKey = generateApiKey();
                const newKeyHash = await hashApiKey(newApiKey);
                const newKeyPreview = newApiKey.slice(-4);

                // Update the key in database
                const { error: updateError } = await supabaseAdmin
                    .from("api_keys")
                    .update({
                        key_hash: newKeyHash,
                        key_preview: newKeyPreview,
                        created_at: new Date().toISOString(), // Optional: reset creation date
                        usage_count: 0 // Reset usage on rotation
                    })
                    .eq("id", keyId);

                if (updateError) throw updateError;

                return new Response(
                    JSON.stringify({
                        success: true,
                        apiKey: newApiKey,
                        preview: newKeyPreview,
                        message: "Key rotated successfully",
                        data: {
                            apiKey: newApiKey,
                            preview: newKeyPreview,
                            message: "Key rotated successfully",
                        },
                    }),
                    {
                        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                        status: 200,
                    }
                );
            }

            case "revoke": {
                if (!keyId) {
                    throw new Error("Key ID is required");
                }

                const { error } = await supabaseAdmin
                    .from("api_keys")
                    .update({ revoked_at: new Date().toISOString() })
                    .eq("id", keyId)
                    .eq("organization_id", orgId);

                if (error) throw error;

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: "Key revoked",
                        data: { message: "Key revoked" },
                    }),
                    {
                        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                        status: 200,
                    }
                );
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({
                success: false,
                error: message,
                details: {
                    code: "MANAGE_API_KEYS_FAILED",
                    message,
                    requestId,
                },
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                status: 400,
            }
        );
    }
});
