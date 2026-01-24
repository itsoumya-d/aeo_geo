import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

export type WebhookEvent =
    | 'audit.completed'
    | 'audit.failed'
    | 'competitor.visibility_change'
    | 'credits.low'
    | 'subscription.updated';

export async function dispatchWebhook(
    organizationId: string,
    event: WebhookEvent,
    payload: any
) {
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Find active webhooks for this organization and event
    const { data: webhooks, error } = await supabaseAdmin
        .from("webhooks")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .contains("events", [event]);

    if (error || !webhooks || webhooks.length === 0) {
        return;
    }

    // 2. Dispatch to each webhook
    const results = await Promise.all(webhooks.map(async (webhook) => {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const body = JSON.stringify({
                id: crypto.randomUUID(),
                event,
                organization_id: organizationId,
                created_at: new Date().toISOString(),
                data: payload
            });

            // 3. Create signature: HMAC-SHA256(secret, timestamp.body)
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                "raw",
                encoder.encode(webhook.secret),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"]
            );
            const signatureBuffer = await crypto.subtle.sign(
                "HMAC",
                key,
                encoder.encode(`${timestamp}.${body}`)
            );
            const signature = hexEncode(new Uint8Array(signatureBuffer));

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cognition-Signature': `t=${timestamp},v1=${signature}`,
                    'User-Agent': 'Cognition-Webhooks/1.0'
                },
                body
            });

            // 4. Update last_triggered_at and failure_count
            if (response.ok) {
                await supabaseAdmin
                    .from("webhooks")
                    .update({
                        last_triggered_at: new Date().toISOString(),
                        failure_count: 0
                    })
                    .eq("id", webhook.id);
            } else {
                await supabaseAdmin
                    .rpc('increment_webhook_failure', { p_webhook_id: webhook.id });
            }

            return { url: webhook.url, status: response.status };
        } catch (err) {
            console.error(`Failed to dispatch webhook to ${webhook.url}:`, err);
            await supabaseAdmin
                .rpc('increment_webhook_failure', { p_webhook_id: webhook.id });
            return { url: webhook.url, error: err.message };
        }
    }));

    return results;
}
