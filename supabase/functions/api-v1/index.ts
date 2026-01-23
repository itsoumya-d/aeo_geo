// @ts-nocheck
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
// @ts-ignore
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"
// @ts-ignore
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts"

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, x-api-key, content-type',
}

serve(async (req: Request): Promise<Response> => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get API Key from headers
        const apiKey = req.headers.get('x-api-key')
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Missing API key' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Hash the received key to compare with stored hash
        const msgUint8 = new TextEncoder().encode(apiKey)
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // 3. Validate API key in database
        const { data: keyData, error: keyError } = await supabaseClient
            .from('api_keys')
            .select('organization_id, name')
            .eq('key_hash', hashedKey)
            .single()

        if (keyError || !keyData) {
            return new Response(JSON.stringify({ error: 'Invalid API key' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const orgId = keyData.organization_id

        // Log API Usage
        await supabaseClient.rpc('log_api_usage', {
            p_org_id: orgId,
            p_endpoint: req.url,
            p_method: req.method
        })

        // 4. Route Handling (basic CRUD for Audits)
        const url = new URL(req.url)
        const path = url.pathname.replace('/api-v1', '').replace(/\/$/, '')

        // GET /audits - List past audits
        if (path === '/audits' && req.method === 'GET') {
            const { data, error } = await supabaseClient
                .from('audits')
                .select('*')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) throw error
            return new Response(JSON.stringify({ audits: data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // GET /audits/:id - Get specific audit report
        const auditDetailMatch = path.match(/^\/audits\/([a-f0-9-]{36})$/)
        if (auditDetailMatch && req.method === 'GET') {
            const auditId = auditDetailMatch[1]
            const { data, error } = await supabaseClient
                .from('audits')
                .select('*, audit_pages(*)')
                .eq('id', auditId)
                .eq('organization_id', orgId)
                .single()

            if (error) throw error
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // fallback
        return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
