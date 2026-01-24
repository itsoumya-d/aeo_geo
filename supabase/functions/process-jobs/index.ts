// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Cron trigger will send a POST request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Pick next job
        const { data: jobs, error: pickError } = await supabase.rpc('pick_next_job')

        if (pickError) throw pickError

        if (!jobs || jobs.length === 0) {
            return new Response(JSON.stringify({ message: 'No pending jobs' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
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
                    // Mock Long Running Task
                    await new Promise(r => setTimeout(r, 2000))
                    result = { crawled_pages: 5, status: 'success' }
                    break

                case 'ANALYZE_BATCH':
                    // Example: Call analyze-content for multiple pages
                    result = { processed: true }
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

        return new Response(JSON.stringify({
            success: true,
            job_id: job.id,
            status: success ? 'COMPLETED' : 'FAILED'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
