// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { sendEmail } from "../_shared/resend.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
    const jsonResponse = (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
        });

    // Cron trigger will send a POST request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const cronSecret = Deno.env.get('CRON_SECRET') ?? '';

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error("Server Misconfiguration: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        }

        const authHeader = req.headers.get('Authorization') ?? '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const isAuthorized =
            token === serviceRoleKey
            || (cronSecret.length > 0 && token === cronSecret)
            || (cronSecret.length === 0 && token === anonKey);

        if (!isAuthorized) {
            return jsonResponse(401, {
                success: false,
                error: "Unauthorized",
                details: {
                    code: "UNAUTHORIZED",
                    message: "Missing or invalid scheduler token",
                    requestId,
                },
            });
        }

        const supabase = createClient(
            supabaseUrl,
            serviceRoleKey
        )

        // 1. Pick next job
        const { data: jobs, error: pickError } = await supabase.rpc('pick_next_job')

        if (pickError) throw pickError

        if (!jobs || jobs.length === 0) {
            return jsonResponse(200, {
                success: true,
                data: {
                    processed: 0,
                    message: 'No pending jobs',
                },
            });
        }

        const job = jobs[0]
        console.log(`Processing Job ${job.id} (${job.job_type})...`)

        let result = null
        let success = true
        let errorMessage = null

        try {
            // 2. Process Job based on Type
            switch (job.job_type) {
                case 'CRAWL':
                    throw new Error('CRAWL jobs are not supported by this worker.');

                case 'ANALYZE_BATCH':
                    const { urls, organizationId } = job.payload;
                    const results = [];

                    console.log(`Starting Batch Analysis for ${urls.length} URLs (Org: ${organizationId})`);

                    for (const url of urls) {
                        try {
                            // Call analyze-content internally
                            const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-content`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    action: 'ANALYZE',
                                    payload: {
                                        websiteUrl: url,
                                        // We don't have competitors/assets in bulk mode yet, optional
                                    }
                                })
                            });

                            if (analyzeRes.ok) {
                                const data = await analyzeRes.json();
                                results.push({ url, status: 'success', score: data.overallScore });
                            } else {
                                const errText = await analyzeRes.text();
                                results.push({ url, status: 'failed', error: errText });
                            }

                            // Rate limiting / Politeness delay
                            await new Promise(r => setTimeout(r, 2000));

                        } catch (err: any) {
                            results.push({ url, status: 'failed', error: err.message });
                        }
                    }

                    result = {
                        total: urls.length,
                        succeeded: results.filter(r => r.status === 'success').length,
                        failed: results.filter(r => r.status === 'failed').length,
                        details: results
                    };

                    // Email Notification
                    if (organizationId) {
                        try {
                            const { data: userData } = await supabase
                                .from('users')
                                .select('email')
                                .eq('organization_id', organizationId)
                                .eq('role', 'owner')
                                .limit(1)
                                .maybeSingle();

                            if (userData?.email) {
                                await sendEmail({
                                    to: userData.email,
                                    subject: `Batch Analysis Complete: ${result.succeeded}/${result.total} Domains Processed`,
                                    html: `
                                        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                                            <h2 style="color: #6366f1;">Batch Analysis Complete</h2>
                                            <p>Your bulk import job has finished processing.</p>
                                            
                                            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                                <p><strong>Total Domains:</strong> ${result.total}</p>
                                                <p style="color: #10b981;"><strong>Successful:</strong> ${result.succeeded}</p>
                                                <p style="color: #f43f5e;"><strong>Failed:</strong> ${result.failed}</p>
                                            </div>

                                            <p>Log in to your dashboard to view the detailed reports.</p>
                                            <a href="https://cognition-ai.com/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
                                        </div>
                                    `
                                });
                                console.log(`Batch notification sent to ${userData.email}`);
                            }
                        } catch (emailErr) {
                            console.error("Failed to send batch notification:", emailErr);
                        }
                    }

                    // If all failed, consider the job failed? Or just completed with errors?
                    // Let's keep job 'COMPLETED' but with error details, unless 0 processed.
                    if (result.succeeded === 0 && result.total > 0) {
                        // success = false; // Optional: mark job as failed if everything failed
                    }
                    break;

                default:
                    throw new Error(`Unknown job type: ${job.job_type}`)
            }
        } catch (e: any) {
            success = false
            errorMessage = e.message
            console.error(`Job ${job.id} Failed:`, e)
        }

        // 3. Update Job Status
        const { error: updateError } = await supabase
            .from('background_jobs')
            .update({
                status: success ? 'COMPLETED' : 'FAILED',
                result: success ? result : null,
                error_message: errorMessage,
                processed_at: new Date().toISOString()
            })
            .eq('id', job.id)

        if (updateError) throw updateError

        return jsonResponse(200, {
            success: true,
            job_id: job.id,
            status: success ? 'COMPLETED' : 'FAILED',
            data: {
                job_id: job.id,
                status: success ? 'COMPLETED' : 'FAILED',
            },
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResponse(500, {
            success: false,
            error: message,
            details: {
                code: "PROCESS_JOB_FAILED",
                message,
                requestId,
            },
        });
    }
})
