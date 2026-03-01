// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET");

/**
 * Verify Paddle webhook signature (Paddle Billing v2)
 *
 * Paddle signs webhooks using an HMAC-SHA256 of the raw body, delivered
 * in the `Paddle-Signature` header as `ts=<timestamp>;h1=<hash>`.
 */
async function verifySignature(body: string, header: string | null): Promise<boolean> {
    if (!header || !WEBHOOK_SECRET) return false;

    const parts = Object.fromEntries(
        header.split(";").map((p) => {
            const [k, ...v] = p.split("=");
            return [k, v.join("=")];
        })
    );

    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    const signedPayload = `${ts}:${body}`;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return computed === h1;
}

/**
 * Derive plan name and credit allocation from a Paddle price ID.
 *
 * Reads price IDs from env vars so they can be changed without a deploy.
 */
function planFromPriceId(priceId: string): { plan: string; audits: number; rewrites: number } | null {
    const map: Record<string, { plan: string; audits: number; rewrites: number }> = {
        [Deno.env.get("PADDLE_STARTER_PRICE_ID") ?? ""]: { plan: "starter", audits: 25, rewrites: 250 },
        [Deno.env.get("PADDLE_PRO_PRICE_ID") ?? ""]: { plan: "pro", audits: 100, rewrites: 1000 },
        [Deno.env.get("PADDLE_AGENCY_PRICE_ID") ?? ""]: { plan: "agency", audits: 500, rewrites: 5000 },
    };
    return map[priceId] ?? null;
}

serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.text();
    const signature = req.headers.get("Paddle-Signature");

    const valid = await verifySignature(body, signature);
    if (!valid) {
        return new Response("Invalid signature", { status: 401 });
    }

    let event: any;
    try {
        event = JSON.parse(body);
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const eventType: string = event.event_type;
    const data = event.data;

    try {
        switch (eventType) {
            // ── Subscription lifecycle ────────────────────────────────
            case "subscription.created":
            case "subscription.updated": {
                const customerId: string = data.customer_id;
                const status: string = data.status; // active | paused | canceled | past_due | trialing
                const priceId: string = data.items?.[0]?.price?.id ?? "";
                const planInfo = planFromPriceId(priceId);

                const update: Record<string, any> = {
                    paddle_subscription_id: data.id,
                    subscription_status: status,
                };

                if (planInfo && status === "active") {
                    update.plan = planInfo.plan;
                }

                await supabase
                    .from("organizations")
                    .update(update)
                    .eq("paddle_customer_id", customerId);

                // On first activation, provision credits
                if (eventType === "subscription.created" && planInfo && status === "active") {
                    const { data: org } = await supabase
                        .from("organizations")
                        .select("id, audit_credits_remaining, rewrite_credits_remaining")
                        .eq("paddle_customer_id", customerId)
                        .single();

                    if (org) {
                        await supabase
                            .from("organizations")
                            .update({
                                audit_credits_remaining: (org.audit_credits_remaining || 0) + planInfo.audits,
                                rewrite_credits_remaining: (org.rewrite_credits_remaining || 0) + planInfo.rewrites,
                            })
                            .eq("id", org.id);

                        await supabase.from("billing_usage").insert({
                            organization_id: org.id,
                            activity_type: "SUBSCRIPTION_CREATED",
                            credits_deducted: -planInfo.audits,
                            provider_cost_est: 0,
                        });
                    }
                }
                break;
            }

            case "subscription.canceled": {
                const customerId: string = data.customer_id;
                await supabase
                    .from("organizations")
                    .update({
                        subscription_status: "canceled",
                    })
                    .eq("paddle_customer_id", customerId);
                break;
            }

            // ── Transactions (one-time top-ups & subscription renewals) ─
            case "transaction.completed": {
                const customData = data.custom_data ?? {};
                const orgId: string | undefined = customData.org_id ?? customData.supabase_org_id;
                const customerId: string | undefined = data.customer_id;

                // Determine org to credit
                let targetOrgId = orgId;
                if (!targetOrgId && customerId) {
                    const { data: org } = await supabase
                        .from("organizations")
                        .select("id")
                        .eq("paddle_customer_id", customerId)
                        .single();
                    targetOrgId = org?.id;
                }

                if (!targetOrgId) {
                    console.error("paddle-webhook: cannot resolve org for transaction", data.id);
                    break;
                }

                if (customData.type === "TOPUP") {
                    // One-time credit top-up
                    const creditsToAdd = parseInt(customData.credits ?? "0", 10);
                    const rewritesToAdd = parseInt(customData.rewrites ?? "0", 10);

                    if (creditsToAdd > 0 || rewritesToAdd > 0) {
                        const { data: org } = await supabase
                            .from("organizations")
                            .select("audit_credits_remaining, rewrite_credits_remaining")
                            .eq("id", targetOrgId)
                            .single();

                        if (org) {
                            await supabase
                                .from("organizations")
                                .update({
                                    audit_credits_remaining: (org.audit_credits_remaining || 0) + creditsToAdd,
                                    rewrite_credits_remaining: (org.rewrite_credits_remaining || 0) + rewritesToAdd,
                                })
                                .eq("id", targetOrgId);

                            const totalAmount = data.details?.totals?.total
                                ? parseInt(data.details.totals.total, 10) / 100
                                : 0;

                            await supabase.from("billing_usage").insert({
                                organization_id: targetOrgId,
                                activity_type: "TOPUP_PURCHASED",
                                credits_deducted: -creditsToAdd,
                                provider_cost_est: totalAmount,
                            });
                        }
                    }
                } else if (customData.type === "SUBSCRIPTION") {
                    // Recurring subscription payment — provision monthly credits
                    const priceId: string = data.items?.[0]?.price?.id ?? "";
                    const planInfo = planFromPriceId(priceId);

                    if (planInfo) {
                        const { data: org } = await supabase
                            .from("organizations")
                            .select("audit_credits_remaining, rewrite_credits_remaining")
                            .eq("id", targetOrgId)
                            .single();

                        if (org) {
                            await supabase
                                .from("organizations")
                                .update({
                                    audit_credits_remaining: (org.audit_credits_remaining || 0) + planInfo.audits,
                                    rewrite_credits_remaining: (org.rewrite_credits_remaining || 0) + planInfo.rewrites,
                                    plan: planInfo.plan,
                                })
                                .eq("id", targetOrgId);

                            const totalAmount = data.details?.totals?.total
                                ? parseInt(data.details.totals.total, 10) / 100
                                : 0;

                            await supabase.from("billing_usage").insert({
                                organization_id: targetOrgId,
                                activity_type: "SUBSCRIPTION_RENEWED",
                                credits_deducted: -planInfo.audits,
                                provider_cost_est: totalAmount,
                            });
                        }
                    }
                }
                break;
            }

            case "transaction.payment_failed": {
                const customerId: string | undefined = data.customer_id;
                if (customerId) {
                    await supabase
                        .from("organizations")
                        .update({ subscription_status: "past_due" })
                        .eq("paddle_customer_id", customerId);
                }
                break;
            }

            default:
                // Unhandled event — acknowledge receipt
                break;
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        console.error("paddle-webhook error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});
