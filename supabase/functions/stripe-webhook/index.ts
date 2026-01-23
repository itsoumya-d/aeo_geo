// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    if (!signature || !endpointSecret) {
        return new Response("Missing signature or secret", { status: 400 });
    }

    let event;
    try {
        const body = await req.text();
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
        switch (event.type) {
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer as string;

                await supabase
                    .from('organizations')
                    .update({
                        subscription_status: subscription.status,
                        stripe_subscription_id: subscription.id,
                    })
                    .eq('stripe_customer_id', customerId);
                break;
            }

            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.metadata?.type === 'TOPUP') {
                    const orgId = session.metadata.orgId;
                    const creditsToAdd = parseInt(session.metadata.creditsToAdd || '0');
                    const rewritesToAdd = parseInt(session.metadata.rewritesToAdd || '0');

                    const { data: org } = await supabase
                        .from('organizations')
                        .select('audit_credits_remaining, rewrite_credits_remaining')
                        .eq('id', orgId)
                        .single();

                    if (org) {
                        await supabase
                            .from('organizations')
                            .update({
                                audit_credits_remaining: (org.audit_credits_remaining || 0) + creditsToAdd,
                                rewrite_credits_remaining: (org.rewrite_credits_remaining || 0) + rewritesToAdd
                            })
                            .eq('id', orgId);

                        await supabase.from('billing_usage').insert({
                            organization_id: orgId,
                            activity_type: 'TOPUP_PURCHASED',
                            credits_deducted: -creditsToAdd,
                            provider_cost_est: session.amount_total / 100
                        });
                    }
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (!invoice.subscription) break;

                const customerId = invoice.customer as string;
                const amountPaid = invoice.amount_paid; // in cents

                let creditsToAdd = 0;
                let rewriteCreditsToAdd = 0;
                let planName = 'free';

                if (amountPaid >= 39900) {
                    creditsToAdd = 1000;
                    rewriteCreditsToAdd = 10000;
                    planName = 'agency';
                } else if (amountPaid >= 14900) {
                    creditsToAdd = 200;
                    rewriteCreditsToAdd = 2000;
                    planName = 'pro';
                } else if (amountPaid >= 4900) {
                    creditsToAdd = 50;
                    rewriteCreditsToAdd = 500;
                    planName = 'starter';
                }

                const { data: org } = await supabase
                    .from('organizations')
                    .select('audit_credits_remaining, rewrite_credits_remaining, id')
                    .eq('stripe_customer_id', customerId)
                    .single();

                if (org && creditsToAdd > 0) {
                    await supabase
                        .from('organizations')
                        .update({
                            audit_credits_remaining: (org.audit_credits_remaining || 0) + creditsToAdd,
                            rewrite_credits_remaining: (org.rewrite_credits_remaining || 0) + rewriteCreditsToAdd,
                            plan: planName
                        })
                        .eq('stripe_customer_id', customerId);

                    await supabase.from('billing_usage').insert({
                        organization_id: org.id,
                        activity_type: 'SUBSCRIPTION_RENEWED',
                        credits_deducted: -creditsToAdd,
                        provider_cost_est: amountPaid / 100
                    });
                }
                break;
            }
        }
        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err) {
        return new Response(`Server Error: ${err.message}`, { status: 500 });
    }
});
