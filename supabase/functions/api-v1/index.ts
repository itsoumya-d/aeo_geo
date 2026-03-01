// @ts-nocheck
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
// @ts-ignore
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"
import { withCache, CACHE_TTL } from "../_shared/redis.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

declare const Deno: any;

serve(async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get('origin'));
    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId };
    const respond = (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), { status, headers: jsonHeaders });
    const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
        respond(status, {
            success: false,
            error: message,
            details: { code, message, requestId },
            ...extra,
        });

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
            return fail(401, 'MISSING_API_KEY', 'Missing API key')
        }

        // 2. Hash the received key to compare with stored hash
        const msgUint8 = new TextEncoder().encode(apiKey)
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // 3. Validate API key in database
        const { data: keyData, error: keyError } = await supabaseClient
            .from('api_keys')
            .select('id, organization_id, name, revoked_at, usage_count, rate_limit')
            .eq('key_hash', hashedKey)
            .is('revoked_at', null)
            .single()

        if (keyError || !keyData) {
            return fail(401, 'INVALID_API_KEY', 'Invalid API key')
        }
        if (keyData.rate_limit && keyData.usage_count >= keyData.rate_limit) {
            return fail(429, 'API_KEY_RATE_LIMIT', 'API key rate limit exceeded')
        }

        const orgId = keyData.organization_id

        // Non-blocking usage update for API key analytics/rate limiting
        supabaseClient
            .from('api_keys')
            .update({
                usage_count: (keyData.usage_count || 0) + 1,
                last_used_at: new Date().toISOString(),
            })
            .eq('id', keyData.id)
            .then();

        // Log API Usage
        await supabaseClient.rpc('log_api_usage', {
            p_org_id: orgId,
            p_endpoint: req.url,
            p_method: req.method
        })

        // 4. Route Handling
        const url = new URL(req.url)
        const marker = '/api-v1'
        const markerIndex = url.pathname.lastIndexOf(marker)
        const rawPath = markerIndex >= 0
            ? url.pathname.slice(markerIndex + marker.length)
            : url.pathname
        const path = (rawPath || '/').replace(/\/$/, '') || '/'

        // 0. GET /spec - Serve OpenAPI 3.0 Specification
        if (path === '/spec' && req.method === 'GET') {
            const openApiSpec = {
                openapi: "3.0.0",
                info: {
                    title: "Cognition AI Visibility Engine API",
                    version: "1.0.0",
                    description: "Programmatic access to Cognition's AI visibility auditing and tracking engine.",
                    contact: {
                        email: "support@cognition-ai.com"
                    }
                },
                servers: [
                    {
                        url: "https://api.cognition-ai.com/v1",
                        description: "Production Server"
                    }
                ],
                components: {
                    securitySchemes: {
                        ApiKeyAuth: {
                            type: "apiKey",
                            in: "header",
                            name: "x-api-key"
                        }
                    },
                    schemas: {
                        Audit: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                domain_url: { type: "string" },
                                overall_score: { type: "integer" },
                                status: { type: "string", enum: ["pending", "processing", "complete", "failed"] },
                                created_at: { type: "string", format: "date-time" }
                            }
                        },
                        Competitor: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string" },
                                domain_url: { type: "string" }
                            }
                        },
                        Usage: {
                            type: "object",
                            properties: {
                                credits: {
                                    type: "object",
                                    properties: {
                                        audits: { type: "integer" },
                                        rewrites: { type: "integer" }
                                    }
                                },
                                usage_this_month: { type: "integer" },
                                plan: { type: "string" }
                            }
                        }
                    }
                },
                security: [{ ApiKeyAuth: [] }],
                paths: {
                    "/usage": {
                        get: {
                            summary: "Get Usage & Credits",
                            description: "Retrieve current credit balance and monthly usage statistics.",
                            responses: {
                                "200": {
                                    description: "Successful response",
                                    content: { "application/json": { schema: { $ref: "#/components/schemas/Usage" } } }
                                }
                            }
                        }
                    },
                    "/audits": {
                        get: {
                            summary: "List Audits",
                            description: "Get a list of the most recent audits.",
                            parameters: [
                                { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
                            ],
                            responses: {
                                "200": {
                                    description: "List of audits",
                                    content: { "application/json": { schema: { type: "object", properties: { audits: { type: "array", items: { $ref: "#/components/schemas/Audit" } } } } } }
                                }
                            }
                        },
                        post: {
                            summary: "Create Audit",
                            description: "Trigger a new analysis for a domain.",
                            requestBody: {
                                required: true,
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object",
                                            required: ["url"],
                                            properties: {
                                                url: { type: "string", example: "https://example.com" },
                                                otherAssets: { type: "string" }
                                            }
                                        }
                                    }
                                },
                            },
                            responses: {
                                "200": {
                                    description: "Audit created",
                                    content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, audit: { $ref: "#/components/schemas/Audit" } } } } }
                                }
                            }
                        }
                    },
                    "/competitors": {
                        get: {
                            summary: "List Competitors",
                            responses: {
                                "200": {
                                    description: "List of competitors",
                                    content: { "application/json": { schema: { type: "object", properties: { competitors: { type: "array", items: { $ref: "#/components/schemas/Competitor" } } } } } }
                                }
                            }
                        },
                        post: {
                            summary: "Add Competitor",
                            requestBody: {
                                required: true,
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object",
                                            required: ["domain"],
                                            properties: {
                                                domain: { type: "string" },
                                                name: { type: "string" }
                                            }
                                        }
                                    }
                                },
                            },
                            responses: {
                                "200": {
                                    description: "Competitor added",
                                    content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, competitor: { $ref: "#/components/schemas/Competitor" } } } } }
                                }
                            }
                        }
                    }
                }
            };

            return respond(200, {
                success: true,
                ...openApiSpec,
                spec: openApiSpec,
                data: { spec: openApiSpec },
            })
        }

        // GET /usage - Get current credit balance and monthly usage
        if (path === '/usage' && req.method === 'GET') {
            const cacheKeyUsage = `api:usage:${orgId}`;

            const cachedResponse = await withCache(
                cacheKeyUsage,
                CACHE_TTL.API_USAGE,
                async () => {
                    const { data: org, error: orgError } = await supabaseClient
                        .from('organizations')
                        .select('audit_credits_remaining, rewrite_credits_remaining, plan')
                        .eq('id', orgId)
                        .single()

                    if (orgError) throw orgError

                    // Get usage this month
                    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
                    const { count, error: usageError } = await supabaseClient
                        .from('audits')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', orgId)
                        .gte('created_at', firstDayOfMonth)

                    if (usageError) throw usageError

                    return {
                        credits: {
                            audits: org.audit_credits_remaining,
                            rewrites: org.rewrite_credits_remaining
                        },
                        usage_this_month: count,
                        plan: org.plan
                    }
                }
            );

            return respond(200, {
                success: true,
                ...cachedResponse,
                data: cachedResponse,
            })
        }

        // GET /audits - List past audits
        if (path === '/audits' && req.method === 'GET') {
            const cacheKeyAudits = `api:audits:${orgId}`;
            const limitParam = Number(url.searchParams.get('limit') || '20');
            const limit = Number.isFinite(limitParam)
                ? Math.min(Math.max(Math.floor(limitParam), 1), 100)
                : 20;

            const cachedData = await withCache(
                `${cacheKeyAudits}:${limit}`,
                CACHE_TTL.API_LIST,
                async () => {
                    const { data, error } = await supabaseClient
                        .from('audits')
                        .select('*')
                        .eq('organization_id', orgId)
                        .order('created_at', { ascending: false })
                        .limit(limit)

                    if (error) throw error
                    return { audits: data };
                }
            );

            return respond(200, {
                success: true,
                ...cachedData,
                data: cachedData,
            })
        }

        // POST /audits - Start a new audit
        if (path === '/audits' && req.method === 'POST') {
            const body = await req.json()
            if (!body.url) {
                return fail(400, 'URL_REQUIRED', 'URL is required')
            }

            // Trigger analyze-content (ANALYZE)
            const { data: analysisResult, error: analysisError } = await supabaseClient.functions.invoke('analyze-content', {
                body: {
                    action: 'ANALYZE',
                    payload: {
                        websiteUrl: body.url,
                        otherAssets: body.otherAssets || '',
                        mainContent: body.mainContent || ''
                    }
                }
            })

            if (analysisError) throw analysisError

            // Save the audit result
            const { data: audit, error: auditError } = await supabaseClient
                .from('audits')
                .insert({
                    organization_id: orgId,
                    domain_url: body.url,
                    overall_score: analysisResult.overallScore,
                    status: 'complete',
                    report: analysisResult,
                    completed_at: new Date().toISOString()
                })
                .select()
                .single()

            if (auditError) throw auditError

            return respond(200, {
                success: true,
                audit,
                data: { audit },
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
            return respond(200, {
                success: true,
                ...data,
                data,
            })
        }

        // GET /competitors - List competitors
        if (path === '/competitors' && req.method === 'GET') {
            const { data, error } = await supabaseClient
                .from('competitor_domains')
                .select('id, domain, name, is_active, created_at, last_audited_at')
                .eq('organization_id', orgId)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            const competitors = (data || []).map((c: any) => ({
                ...c,
                domain_url: c.domain,
            }));
            return respond(200, {
                success: true,
                competitors,
                data: {
                    competitors,
                }
            })
        }

        // POST /competitors - Add a new competitor
        if (path === '/competitors' && req.method === 'POST') {
            const body = await req.json()
            if (!body.domain) {
                return fail(400, 'DOMAIN_REQUIRED', 'Domain is required')
            }

            const { data, error } = await supabaseClient
                .from('competitor_domains')
                .insert({
                    organization_id: orgId,
                    domain: body.domain,
                    name: body.name || body.domain
                })
                .select()
                .single()

            if (error) throw error
            return respond(200, {
                success: true,
                competitor: data,
                data: { competitor: data },
            })
        }

        // POST /rewrite - AI content rewrite for AEO optimization
        if (path === '/rewrite' && req.method === 'POST') {
            const body = await req.json()
            if (!body.content) {
                return fail(400, 'CONTENT_REQUIRED', 'content is required')
            }

            // Check rewrite credits
            const { data: org } = await supabaseClient
                .from('organizations')
                .select('rewrite_credits_remaining')
                .eq('id', orgId)
                .single()

            if (!org || org.rewrite_credits_remaining <= 0) {
                return fail(402, 'NO_REWRITE_CREDITS', 'No rewrite credits remaining')
            }

            const { data: rewriteResult, error: rewriteError } = await supabaseClient.functions.invoke('analyze-content', {
                body: {
                    action: 'REWRITE',
                    payload: {
                        original: body.content,
                        rewrite: body.content,
                        context: body.context || '',
                        goal: body.goal || 'CLARITY',
                        tone: body.tone || 'PROFESSIONAL',
                    }
                }
            })

            if (rewriteError) throw rewriteError

            return respond(200, {
                success: true,
                result: rewriteResult,
                data: { result: rewriteResult },
            })
        }

        // DELETE /competitors/:id - Remove a competitor
        const competitorDeleteMatch = path.match(/^\/competitors\/([a-f0-9-]{36})$/)
        if (competitorDeleteMatch && req.method === 'DELETE') {
            const competitorId = competitorDeleteMatch[1]
            const { error } = await supabaseClient
                .from('competitor_domains')
                .update({ is_active: false })
                .eq('id', competitorId)
                .eq('organization_id', orgId)

            if (error) throw error
            return respond(200, {
                success: true,
                data: { success: true },
            })
        }

        // fallback
        return fail(404, 'NOT_FOUND', 'Not Found', {
            available_endpoints: ['GET /spec', 'GET /usage', 'GET /audits', 'POST /audits', 'GET /audits/:id', 'GET /competitors', 'POST /competitors', 'DELETE /competitors/:id', 'POST /rewrite']
        })

    } catch (error: any) {
        const message = error?.message || 'Unknown error';
        return fail(500, 'API_V1_FAILED', message)
    }
})
