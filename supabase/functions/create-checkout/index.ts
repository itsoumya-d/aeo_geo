// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { priceId, successUrl, cancelUrl, mode = "subscription", credits = 0, rewrites = 0 } = await req.json();

        if (!priceId) {
            throw new Error("Missing priceId");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        // Get the user from the authorization header
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error("Unauthorized");
        }

        // Get the user's organization
        const { data: userData } = await supabaseClient
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!userData || !userData.organization_id) {
            throw new Error("User has no organization");
        }

        const orgId = userData.organization_id;

        // Initialize Stripe
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
            httpClient: Stripe.createFetchHttpClient(),
        });

        // Check if org already has a stripe customer id
        const { data: orgData } = await supabaseClient
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', orgId)
            .single();

        let customerId = orgData?.stripe_customer_id;

        if (!customerId) {
            // Create new Stripe Customer
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabaseOrgId: orgId
                }
            });
            customerId = customer.id;

            // Save it to DB
            await createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
            ).from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId);
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: mode,
            success_url: successUrl || `${req.headers.get("origin")}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.get("origin")}/pricing`,
            metadata: {
                orgId: orgId,
                creditsToAdd: credits.toString(),
                rewritesToAdd: rewrites.toString(),
                type: mode === 'payment' ? 'TOPUP' : 'SUBSCRIPTION'
            }
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
