import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { buildCorsHeaders } from "../_shared/cors.ts";

// @ts-ignore: Deno runtime
declare const Deno: any;

type JsonPayload = Record<string, unknown>;

function jsonResponse(
    req: Request,
    requestId: string,
    status: number,
    body: JsonPayload
) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...buildCorsHeaders(req.headers.get("origin")),
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
        },
    });
}

serve(async (req: Request) => {
    const requestId = crypto.randomUUID();

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: buildCorsHeaders(req.headers.get("origin")) })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error("Server Misconfiguration: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        }

        const authHeader = req.headers.get('Authorization') ?? ''
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        const isAuthorized =
            token === serviceRoleKey
            || (cronSecret.length > 0 && token === cronSecret)
            || (cronSecret.length === 0 && token === anonKey)

        if (!isAuthorized) {
            return jsonResponse(req, requestId, 401, {
                success: false,
                error: "Unauthorized",
                details: {
                    code: "UNAUTHORIZED",
                    message: "Missing or invalid scheduler token",
                    requestId,
                },
            });
        }

        const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

        // 1. Find scheduled audits due for execution
        const { data: dueAudits, error: fetchError } = await supabaseClient
            .from('scheduled_audits')
            .select('*, organizations(audit_credits_remaining)')
            .eq('enabled', true)
            .lte('next_run_at', new Date().toISOString())

        if (fetchError) throw fetchError

        const results = []

        for (const audit of (dueAudits || [])) {
            // 2. Check credits
            const credits = audit.organizations?.audit_credits_remaining ?? 0
            if (credits <= 0) {
                // Log skip and notify user
                await supabaseClient.from('audit_notifications').insert({
                    organization_id: audit.organization_id,
                    type: 'error',
                    title: 'Scheduled Audit Skipped',
                    message: `Audit for ${audit.domain_url} skipped due to insufficient credits.`
                })

                // Pause scheduling or just wait for next run? Let's keep it active but update next_run
            } else {
                // 3. Initiate Audit (Internal Call to analyze-content)
                console.log(`[Sentinel] Triggering AUTO_AUDIT for ${audit.domain_url} (Org: ${audit.organization_id})`);

                try {
                    const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-content`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            action: 'AUTO_AUDIT',
                            payload: {
                                domainUrl: audit.domain_url,
                                organizationId: audit.organization_id,
                                frequency: audit.frequency
                            }
                        })
                    });

                    if (!analyzeRes.ok) {
                        const err = await analyzeRes.text();
                        console.error(`[Sentinel] AUTO_AUDIT failed for ${audit.domain_url}:`, err);

                        await supabaseClient.from('audit_notifications').insert({
                            organization_id: audit.organization_id,
                            type: 'error',
                            title: 'Scheduled Audit Failed',
                            message: `Internal error processing ${audit.domain_url}. Our team has been notified.`
                        });
                    } else {
                        // Success notification is handled inside AUTO_AUDIT handler in analyze-content
                        console.log(`[Sentinel] AUTO_AUDIT successfully dispatched for ${audit.domain_url}`);
                    }
                } catch (e) {
                    console.error(`[Sentinel] Fetch error for ${audit.domain_url}:`, e);
                }
            }

            // 4. Calculate next run time
            let nextRun = new Date(audit.next_run_at)
            if (audit.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1)
            else if (audit.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7)
            else if (audit.frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1)

            // 5. Update schedule
            await supabaseClient
                .from('scheduled_audits')
                .update({
                    last_run_at: new Date().toISOString(),
                    next_run_at: nextRun.toISOString()
                })
                .eq('id', audit.id)

            results.push({ id: audit.id, domain: audit.domain_url, next_run: nextRun.toISOString() })
        }

        return jsonResponse(req, requestId, 200, {
            success: true,
            data: {
                processed: results.length,
                details: results,
            },
        });

    } catch (error: any) {
        const message = error?.message || "Unknown error";
        return jsonResponse(req, requestId, 500, {
            success: false,
            error: message,
            details: {
                code: "SCHEDULED_AUDIT_PROCESSING_FAILED",
                message,
                requestId,
            },
        });
    }
})
