// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

/**
 * Create Checkout Edge Function (Paddle)
 *
 * With Paddle, checkout is primarily handled client-side via Paddle.js overlay.
 * This function handles server-side operations like creating Paddle customers
 * and returning customer portal info.
 */
serve(async (req) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const {
            portal = false,
            priceId,
            mode = "subscription",
        } = await req.json();

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

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            throw new Error("Unauthorized");
        }

        const { data: userData } = await supabaseClient
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!userData || !userData.organization_id) {
            throw new Error("User has no organization");
        }

        const orgId = userData.organization_id;

        const paddleApiKey = Deno.env.get("PADDLE_API_KEY");
        if (!paddleApiKey) {
            throw new Error("Paddle API key not configured");
        }

        const paddleBaseUrl = "https://api.paddle.com";

        // Get or create Paddle customer
        const { data: orgData } = await supabaseClient
            .from('organizations')
            .select('paddle_customer_id')
            .eq('id', orgId)
            .single();

        let customerId = orgData?.paddle_customer_id;

        if (!customerId && user.email) {
            const customerRes = await fetch(`${paddleBaseUrl}/customers`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${paddleApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email.split("@")[0],
                    custom_data: { supabase_org_id: orgId },
                }),
            });

            if (customerRes.ok) {
                const customerData = await customerRes.json();
                customerId = customerData.data?.id;

                const adminClient = createClient(
                    Deno.env.get("SUPABASE_URL") ?? "",
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
                );
                await adminClient
                    .from('organizations')
                    .update({ paddle_customer_id: customerId })
                    .eq('id', orgId);
            }
        }

        if (portal) {
            // Paddle customer management is handled via Paddle.js client-side
            const message = customerId
                ? "Use Paddle.Update.open() with this customer ID"
                : "No subscription found";
            return new Response(JSON.stringify({
                success: true,
                customerId,
                message,
                data: { customerId, message },
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                status: 200,
            });
        }

        if (!priceId) {
            throw new Error("Missing priceId");
        }

        // Create a Paddle transaction for server-side checkout
        const txnRes = await fetch(`${paddleBaseUrl}/transactions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${paddleApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                items: [{ price_id: priceId, quantity: 1 }],
                ...(customerId ? { customer_id: customerId } : {}),
                custom_data: { org_id: orgId, type: mode === 'payment' ? 'TOPUP' : 'SUBSCRIPTION' },
            }),
        });

        if (!txnRes.ok) {
            const errBody = await txnRes.text();
            throw new Error(`Paddle API error: ${errBody}`);
        }

        const txnData = await txnRes.json();

        return new Response(JSON.stringify({
            success: true,
            transactionId: txnData.data?.id,
            url: txnData.data?.checkout?.url || null,
            data: {
                transactionId: txnData.data?.id,
                url: txnData.data?.checkout?.url || null,
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 200,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const status = message.toLowerCase().includes("unauthorized") ? 401 : 400;
        return new Response(JSON.stringify({
            success: false,
            error: message,
            details: {
                code: "CREATE_CHECKOUT_FAILED",
                message,
                requestId,
            },
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status,
        });
    }
});
