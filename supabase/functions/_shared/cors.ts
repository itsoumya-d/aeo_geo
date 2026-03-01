// Shared CORS headers for all Edge Functions.
// In production, set ALLOWED_ORIGINS env var to a comma-separated list of allowed origins.
// Falls back to '*' when unset (useful for local development).
const rawAllowedOrigins = (typeof Deno !== 'undefined' && (Deno as any).env?.get('ALLOWED_ORIGINS')) ?? '';
const allowedOrigins = rawAllowedOrigins ? rawAllowedOrigins.split(',').map((o: string) => o.trim()) : [];

export function buildCorsHeaders(requestOrigin?: string | null): Record<string, string> {
    const origin =
        allowedOrigins.length === 0
            ? '*'
            : (requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0]);

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Vary': 'Origin',
    };
}

// Convenience: static headers for functions that don't need per-request origin negotiation.
export const corsHeaders = buildCorsHeaders();
