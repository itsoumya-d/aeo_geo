// Supabase Edge Function: looker-connector
// Google Looker Studio Community Connector for Cognition AI
// Provides 4 primary endpoints: audits, trends, competitors, recommendations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Redis } from "https://esm.sh/@upstash/redis@1.25.1";
import { corsHeaders } from "../_shared/cors.ts";

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
    LOOKER_AUDITS: 3600,        // 1 hour (dashboards refresh hourly)
    LOOKER_TRENDS: 7200,         // 2 hours (trends stable)
    LOOKER_COMPETITORS: 3600,    // 1 hour
    LOOKER_RECS: 3600            // 1 hour
};

// Rate limit: 100 requests/hour for BI queries
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const RATE_LIMIT_MAX = 100;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split('/').pop();

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // Extract and validate API key
        const apiKey = req.headers.get("x-api-key");
        if (!apiKey) {
            return new Response(JSON.stringify({
                error: "Missing API key. Include x-api-key header."
            }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Validate API key and get organization
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('organization_id, permissions, rate_limit')
            .eq('key_hash', await hashApiKey(apiKey))
            .is('revoked_at', null)
            .maybeSingle();

        if (keyError || !keyData) {
            return new Response(JSON.stringify({
                error: "Invalid API key"
            }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Check permissions
        if (!keyData.permissions?.includes('read:audits')) {
            return new Response(JSON.stringify({
                error: "API key does not have read:audits permission"
            }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const organizationId = keyData.organization_id;

        // Initialize Redis for caching and rate limiting
        const redis = initRedis();

        // Check rate limit
        const rateLimitKey = `looker:ratelimit:${organizationId}`;
        if (redis) {
            const current = await redis.incr(rateLimitKey);
            if (current === 1) {
                await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
            }
            if (current > RATE_LIMIT_MAX) {
                return new Response(JSON.stringify({
                    error: "Rate limit exceeded. Maximum 100 requests per hour for Looker Studio connector.",
                    limit: RATE_LIMIT_MAX,
                    window: "1 hour"
                }), {
                    status: 429,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        // Parse query parameters
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        const platform = url.searchParams.get("platform");
        const domain = url.searchParams.get("domain");
        const limit = parseInt(url.searchParams.get("limit") || "1000");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        // Route to appropriate endpoint
        let data;
        let cacheKey;
        let cacheTTL;

        switch (endpoint) {
            case "audits":
                cacheKey = `looker:audits:${organizationId}:${startDate}:${endDate}:${platform}:${domain}:${limit}:${offset}`;
                cacheTTL = CACHE_TTL.LOOKER_AUDITS;
                data = await getAuditsData(supabase, organizationId, { startDate, endDate, platform, domain, limit, offset });
                break;

            case "trends":
                cacheKey = `looker:trends:${organizationId}:${startDate}:${endDate}:${platform}:${domain}:${limit}:${offset}`;
                cacheTTL = CACHE_TTL.LOOKER_TRENDS;
                data = await getTrendsData(supabase, organizationId, { startDate, endDate, platform, domain, limit, offset });
                break;

            case "competitors":
                cacheKey = `looker:competitors:${organizationId}:${startDate}:${endDate}:${platform}:${domain}:${limit}:${offset}`;
                cacheTTL = CACHE_TTL.LOOKER_COMPETITORS;
                data = await getCompetitorsData(supabase, organizationId, { startDate, endDate, platform, domain, limit, offset });
                break;

            case "recommendations":
                cacheKey = `looker:recommendations:${organizationId}:${startDate}:${endDate}:${domain}:${limit}:${offset}`;
                cacheTTL = CACHE_TTL.LOOKER_RECS;
                data = await getRecommendationsData(supabase, organizationId, { startDate, endDate, domain, limit, offset });
                break;

            default:
                return new Response(JSON.stringify({
                    error: "Invalid endpoint. Use: /audits, /trends, /competitors, or /recommendations"
                }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
        }

        // Cache the result
        if (redis && cacheKey) {
            await redis.setex(cacheKey, cacheTTL, JSON.stringify(data));
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("[Looker Connector] Error:", error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

// Helper: Initialize Redis connection
function initRedis() {
    const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

    if (!url || !token) {
        console.warn("[Looker Connector] Redis not configured, caching disabled");
        return null;
    }

    return new Redis({ url, token });
}

// Helper: Hash API key with SHA-256
async function hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Data Fetchers

interface QueryParams {
    startDate?: string | null;
    endDate?: string | null;
    platform?: string | null;
    domain?: string | null;
    limit: number;
    offset: number;
}

async function getAuditsData(supabase: any, organizationId: string, params: QueryParams) {
    let query = supabase
        .from('audits')
        .select(`
            id,
            domain_url,
            status,
            created_at,
            report
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

    // Apply filters
    if (params.startDate) {
        query = query.gte('created_at', params.startDate);
    }
    if (params.endDate) {
        query = query.lte('created_at', params.endDate);
    }
    if (params.domain) {
        query = query.eq('domain_url', params.domain);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform to Looker Studio format
    return data.map((audit: any) => {
        const report = audit.report || {};
        const platformScores = report.platform_scores || [];

        // Create a row for each platform score
        if (params.platform) {
            const platformData = platformScores.find((ps: any) => ps.platform === params.platform);
            return {
                domain: audit.domain_url,
                platform: params.platform,
                created_at: audit.created_at,
                status: audit.status,
                overall_score: platformData?.score || 0,
                quote_likelihood: platformData?.quote_likelihood || 0,
                citations_found: platformData?.citations_found || 0
            };
        }

        // If no platform filter, return aggregate
        const avgScore = platformScores.length > 0
            ? platformScores.reduce((sum: number, ps: any) => sum + (ps.score || 0), 0) / platformScores.length
            : 0;

        return {
            domain: audit.domain_url,
            platform: 'All Platforms',
            created_at: audit.created_at,
            status: audit.status,
            overall_score: Math.round(avgScore),
            quote_likelihood: report.quote_likelihood || 0,
            citations_found: platformScores.reduce((sum: number, ps: any) => sum + (ps.citations_found || 0), 0)
        };
    }).filter(Boolean);
}

async function getTrendsData(supabase: any, organizationId: string, params: QueryParams) {
    let query = supabase
        .from('audits')
        .select(`
            id,
            domain_url,
            created_at,
            report
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .range(params.offset, params.offset + params.limit - 1);

    // Apply filters
    if (params.startDate) {
        query = query.gte('created_at', params.startDate);
    }
    if (params.endDate) {
        query = query.lte('created_at', params.endDate);
    }
    if (params.domain) {
        query = query.eq('domain_url', params.domain);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch competitor benchmarks for comparison
    let compQuery = supabase
        .from('competitor_benchmarks')
        .select('*')
        .eq('organization_id', organizationId);

    if (params.startDate) {
        compQuery = compQuery.gte('captured_at', params.startDate);
    }
    if (params.endDate) {
        compQuery = compQuery.lte('captured_at', params.endDate);
    }

    const { data: competitors } = await compQuery;

    // Transform to time-series format
    const trends: any[] = [];

    data.forEach((audit: any) => {
        const report = audit.report || {};
        const platformScores = report.platform_scores || [];
        const date = audit.created_at.split('T')[0]; // YYYY-MM-DD

        platformScores.forEach((ps: any) => {
            if (params.platform && ps.platform !== params.platform) return;

            // Calculate competitor average for this platform/date
            const competitorAvg = competitors
                ?.filter((c: any) =>
                    c.captured_at.split('T')[0] === date &&
                    c.platform === ps.platform
                )
                .reduce((sum: number, c: any, _: number, arr: any[]) => sum + (c.score || 0) / arr.length, 0) || 0;

            trends.push({
                date,
                platform: ps.platform,
                domain: audit.domain_url,
                score: ps.score || 0,
                competitor_avg_score: Math.round(competitorAvg),
                delta: ps.score - competitorAvg
            });
        });
    });

    return trends;
}

async function getCompetitorsData(supabase: any, organizationId: string, params: QueryParams) {
    let query = supabase
        .from('competitor_benchmarks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('captured_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

    // Apply filters
    if (params.startDate) {
        query = query.gte('captured_at', params.startDate);
    }
    if (params.endDate) {
        query = query.lte('captured_at', params.endDate);
    }
    if (params.platform) {
        query = query.eq('platform', params.platform);
    }
    if (params.domain) {
        query = query.eq('competitor_domain', params.domain);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map((comp: any) => ({
        competitor_domain: comp.competitor_domain,
        platform: comp.platform,
        captured_at: comp.captured_at,
        score: comp.score || 0,
        keywords_tracked: comp.keywords_tracked || 0,
        citations_found: comp.citations_found || 0
    }));
}

async function getRecommendationsData(supabase: any, organizationId: string, params: QueryParams) {
    let query = supabase
        .from('audits')
        .select(`
            id,
            domain_url,
            created_at,
            report
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

    // Apply filters
    if (params.startDate) {
        query = query.gte('created_at', params.startDate);
    }
    if (params.endDate) {
        query = query.lte('created_at', params.endDate);
    }
    if (params.domain) {
        query = query.eq('domain_url', params.domain);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Extract recommendations from JSONB report
    const recommendations: any[] = [];

    data.forEach((audit: any) => {
        const report = audit.report || {};
        const pages = report.pages || [];

        pages.forEach((page: any) => {
            const pageRecs = page.recommendations || [];

            pageRecs.forEach((rec: any) => {
                recommendations.push({
                    page_url: page.url || audit.domain_url,
                    impact: rec.impact || 'medium',
                    effort: rec.effort || 'medium',
                    status: rec.status || 'pending',
                    recommendation: rec.text || rec.recommendation || '',
                    quote_likelihood: page.quote_likelihood || 0,
                    captured_at: audit.created_at
                });
            });
        });
    });

    return recommendations;
}
