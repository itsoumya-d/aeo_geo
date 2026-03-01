// @ts-nocheck
// Supabase Edge Function: gsc-sync
// Integrates with Google Search Console API to fetch real search performance data
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Google Search Console API endpoint
const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

serve(async (req) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const action = url.searchParams.get("action");

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        if (action === "authorize") {
            // Step 1: Generate OAuth URL for user to authorize
            const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
            const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI") || `${supabaseUrl}/functions/v1/gsc-sync?action=callback`;

            if (!clientId) {
                throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured");
            }

            const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            authUrl.searchParams.set("client_id", clientId);
            authUrl.searchParams.set("redirect_uri", redirectUri);
            authUrl.searchParams.set("response_type", "code");
            authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/webmasters.readonly");
            authUrl.searchParams.set("access_type", "offline");
            authUrl.searchParams.set("prompt", "consent");
            authUrl.searchParams.set("state", req.headers.get("authorization")?.split(" ")[1] || "");

            return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            });
        }

        if (action === "callback") {
            // Step 2: Exchange authorization code for tokens
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state"); // This should contain the user's JWT

            if (!code) {
                throw new Error("No authorization code provided");
            }

            const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
            const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
            const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI") || `${supabaseUrl}/functions/v1/gsc-sync?action=callback`;

            if (!clientId || !clientSecret) {
                throw new Error("Google OAuth credentials not configured");
            }

            // Exchange code for tokens
            const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                }),
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                throw new Error(`Token exchange failed: ${errorText}`);
            }

            const tokens = await tokenResponse.json();

            // Get user from state (JWT token)
            const { data: { user }, error: userError } = await supabase.auth.getUser(state);
            if (userError || !user) {
                throw new Error("Invalid user token");
            }

            // Get organization ID from user profile
            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                throw new Error("User has no organization");
            }

            // Store refresh token securely
            const { error: upsertError } = await supabase
                .from('gsc_auth')
                .upsert({
                    organization_id: profile.organization_id,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'organization_id' });

            if (upsertError) throw upsertError;

            // Redirect back to app
            return new Response(null, {
                status: 302,
                headers: {
                    ...corsHeaders,
                    "Location": `${Deno.env.get("VITE_APP_URL") || "http://localhost:5173"}/settings?gsc=connected`,
                    "X-Request-Id": requestId,
                },
            });
        }

        if (action === "sync") {
            const { organizationId, domainUrl } = await req.json();

            console.log(`[GSC-Sync] Fetching real data for ${domainUrl} (Org: ${organizationId})`);

            // 1. Fetch Auth Tokens
            const { data: auth, error: authError } = await supabase
                .from('gsc_auth')
                .select('*')
                .eq('organization_id', organizationId)
                .maybeSingle();

            if (authError || !auth) {
                return new Response(JSON.stringify({
                    success: false,
                    error: "Google Search Console not connected. Please authorize first.",
                    needsAuth: true,
                    details: {
                        code: "GSC_NOT_CONNECTED",
                        message: "Google Search Console not connected. Please authorize first.",
                        requestId,
                    },
                }), {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                });
            }

            // 2. Refresh token if expired
            let accessToken = auth.access_token;
            const expiresAt = new Date(auth.expires_at);

            if (expiresAt < new Date()) {
                console.log("[GSC-Sync] Refreshing expired access token");

                const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
                const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

                const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        refresh_token: auth.refresh_token,
                        grant_type: "refresh_token",
                    }),
                });

                if (!refreshResponse.ok) {
                    throw new Error("Failed to refresh access token. User needs to re-authorize.");
                }

                const newTokens = await refreshResponse.json();
                accessToken = newTokens.access_token;

                // Update stored tokens
                await supabase
                    .from('gsc_auth')
                    .update({
                        access_token: accessToken,
                        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('organization_id', organizationId);
            }

            // 3. Fetch Search Analytics from Google Search Console
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - 1); // Yesterday

            const siteUrl = domainUrl.startsWith('http') ? domainUrl : `https://${domainUrl}`;

            const analyticsResponse = await fetch(
                `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0],
                        dimensions: ["date"],
                        rowLimit: 25000,
                    }),
                }
            );

            if (!analyticsResponse.ok) {
                const errorText = await analyticsResponse.text();
                throw new Error(`GSC API Error: ${analyticsResponse.status} - ${errorText}`);
            }

            const analyticsData = await analyticsResponse.json();

            if (!analyticsData.rows || analyticsData.rows.length === 0) {
                return new Response(JSON.stringify({
                    success: true,
                    count: 0,
                    message: "No data available for this domain. Ensure it's verified in Google Search Console.",
                    data: {
                        count: 0,
                        message: "No data available for this domain. Ensure it's verified in Google Search Console.",
                    }
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                });
            }

            // 4. Transform and store metrics
            const metrics = analyticsData.rows.map((row: any) => ({
                organization_id: organizationId,
                domain_url: domainUrl,
                date: row.keys[0],
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: row.ctr || 0,
                position: row.position || 0,
            }));

            // 5. Upsert metrics into database
            const { error: upsertError } = await supabase
                .from('gsc_metrics')
                .upsert(metrics, { onConflict: 'organization_id,domain_url,date' });

            if (upsertError) throw upsertError;

            console.log(`[GSC-Sync] Successfully synced ${metrics.length} days of data for ${domainUrl}`);

            return new Response(JSON.stringify({
                success: true,
                count: metrics.length,
                dateRange: {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0],
                },
                data: {
                    count: metrics.length,
                    dateRange: {
                        start: startDate.toISOString().split('T')[0],
                        end: endDate.toISOString().split('T')[0],
                    },
                },
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            });
        }

        if (action === "disconnect") {
            const { organizationId } = await req.json();

            const { error } = await supabase
                .from('gsc_auth')
                .delete()
                .eq('organization_id', organizationId);

            if (error) throw error;

            return new Response(JSON.stringify({
                success: true,
                data: { success: true },
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            });
        }

        return new Response(JSON.stringify({
            success: false,
            error: "Invalid action. Use: authorize, callback, sync, or disconnect",
            details: {
                code: "INVALID_ACTION",
                message: "Invalid action. Use: authorize, callback, sync, or disconnect",
                requestId,
            },
        }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
        });

    } catch (error) {
        console.error("[GSC-Sync] Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({
            success: false,
            error: message,
            details: {
                code: "GSC_SYNC_FAILED",
                message,
                requestId,
            },
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
        });
    }
});
