import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, x-api-key, content-type',
}

// @ts-ignore: Deno runtime
declare const Deno: any;

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

        // 1. Find scheduled audits due for execution
        const { data: dueAudits, error: fetchError } = await supabaseClient
            .from('scheduled_audits')
            .select('*, organizations(audit_credits_remaining)')
            .eq('status', 'active')
            .lte('next_run_at', new Date().toISOString())

        if (fetchError) throw fetchError

        const results = []

        for (const audit of dueAudits) {
            // 2. Check credits
            const credits = audit.organizations?.audit_credits_remaining ?? 0
            if (credits <= 0) {
                // Log skip and notify user
                await supabaseClient.from('audit_notifications').insert({
                    organization_id: audit.organization_id,
                    type: 'error',
                    title: 'Scheduled Audit Skipped',
                    message: `Audit for ${audit.domain} skipped due to insufficient credits.`
                })

                // Pause scheduling or just wait for next run? Let's keep it active but update next_run
            } else {
                // 3. Initiate Audit (Internal Call to analyze-content)
                console.log(`[Sentinel] Triggering AUTO_AUDIT for ${audit.domain_url} (Org: ${audit.organization_id})`);

                try {
                    const analyzeRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-content`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
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

            results.push({ id: audit.id, domain: audit.domain, next_run: nextRun.toISOString() })
        }

        return new Response(JSON.stringify({ processed: results.length, details: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
