/**
 * Health check edge function — GET /functions/v1/health
 *
 * Returns 200 with system status when all critical dependencies are reachable.
 * Returns 503 when one or more checks fail.
 *
 * Intentionally lightweight: no auth required, no rate limiting, no DB writes.
 * Suitable for use by uptime monitors (Betterstack, UptimeRobot, etc.).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';

interface CheckResult {
    ok: boolean;
    latencyMs: number;
    error?: string;
}

interface HealthResponse {
    status: 'ok' | 'degraded';
    timestamp: string;
    version: string;
    checks: {
        database: CheckResult;
    };
}

async function checkDatabase(supabase: ReturnType<typeof createClient>): Promise<CheckResult> {
    const start = Date.now();
    try {
        // Lightweight ping — select a constant from Postgres, no table scan
        const { error } = await supabase.rpc('health_ping').single();
        // Fallback: if the RPC doesn't exist, try a minimal table query
        if (error && error.code === 'PGRST202') {
            const { error: fallbackError } = await supabase
                .from('organizations')
                .select('id')
                .limit(1)
                .maybeSingle();
            if (fallbackError) throw fallbackError;
        } else if (error) {
            throw error;
        }
        return { ok: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
        return {
            ok: false,
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

Deno.serve(async (req: Request) => {
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
        const body: HealthResponse = {
            status: 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            checks: {
                database: { ok: false, latencyMs: 0, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
            },
        };
        return new Response(JSON.stringify(body), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const dbCheck = await checkDatabase(supabase);

    const allOk = dbCheck.ok;
    const body: HealthResponse = {
        status: allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checks: { database: dbCheck },
    };

    return new Response(JSON.stringify(body, null, 2), {
        status: allOk ? 200 : 503,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
    });
});
