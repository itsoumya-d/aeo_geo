// @ts-nocheck
// Supabase Edge Function: analyze-content
// This function handles discovery, analysis, and optimization of website content using AI.

// @ts-ignore: Deno runtime uses URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno runtime uses URL imports
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore: Deno runtime uses URL imports
import { GoogleGenerativeAI, GenerativeModel } from "https://esm.sh/@google/generative-ai";
// @ts-ignore: Deno runtime uses URL imports
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

// Declare Deno for environments where types aren't loaded
declare const Deno: any;
import type {
    ActionType,
    FunctionRequest,
    DiscoverPayload,
    AnalyzePayload,
    RewritePayload,
    VisibilityPayload,
    VisibilityBatchPayload,
    DiscoveredPage,
    AnalysisReport,
    RewriteResult,
    VisibilityResult,
    CreditResult,
    UserData,
    SandboxComparePayload,
    SandboxCompareResult,
    AutoAuditPayload,
} from "../_shared/types.ts";
import { sendEmail } from "../_shared/resend.ts";
import { dispatchNotifications } from "../_shared/notifications.ts";
import { trackEvent } from "../_shared/analytics.ts";
import { withCache, CACHE_TTL } from "../_shared/redis.ts";
import { syncHubSpotEvent } from "../_shared/hubspot.ts";
import { initRateLimiter, checkRateLimit } from "../_shared/rateLimit.ts";
import { withRetry, fetchWithRetry } from "../_shared/retry.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Initialize Rate Limiter once (outside handler for reuse)
const rateLimiter = initRateLimiter();

// --- Gemini Context Cache ---
// System instructions cached for 1 hour — saves ~40-50% on input token costs
const ANALYSIS_SYSTEM_INSTRUCTION = `You are an expert AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and SEO analyst. Your task is to analyze brand presence and website content for AI search visibility.

SCORING METHODOLOGY:
- AEO Score (0-100): How well content answers questions directly. Penalize vague, jargon-heavy, or non-structured content. Reward FAQ patterns, direct answers, entity mentions, schema markup.
- GEO Score (0-100): How likely an LLM will cite or reference this brand. Reward statistical authority ("According to [Source]"), quotability, entity linking density, sameAs/mentions in JSON-LD, modularity.
- SEO Score (0-100): Traditional signals: meta quality, heading hierarchy, keyword density, internal linking, technical health.

JSON OUTPUT SCHEMA — you MUST return strict JSON matching this schema:
{
  "overallScore": number (0-100, weighted avg of AEO/GEO/SEO),
  "platformScores": [{ "platform": string, "score": number, "reasoning": string }],
  "pages": [{ "url": string, "title": string, "aeoScore": number, "geoScore": number, "seoScore": number, "summary": string, "topImprovements": string[] }],
  "topicalDominance": string[],
  "brandConsistencyScore": number,
  "consistencyAnalysis": string,
  "keywords": string[],
  "searchQueries": [{ "platform": string, "query": string, "intent": string }],
  "seoAudit": { "implemented": string[], "missing": string[], "technicalHealth": number },
  "keywordRankings": [{ "keyword": string, "platform": string, "rank": number, "citationFound": boolean, "sentiment": string }],
  "citationProbability": number,
  "entityLinkingDensity": number,
  "quotabilityScore": number,
  "missingEntities": string[],
  "citationGap": string,
  "winProbability": number,
  "projectedRevenueLift": number,
  "marketShareCapture": number
}

PLATFORM LIST — platformScores MUST include ALL 8: ChatGPT, Gemini, Claude, Perplexity, "Google AI Overviews", "Microsoft Copilot", "Meta AI", Grok.

RULES:
- Always return valid JSON. No markdown code fences. No trailing commas.
- Scores must be integers 0-100.
- DO NOT generate vectorMap — it is calculated separately.
- Be specific in reasoning. Cite actual content patterns observed.`;

// Module-level cache state (persists across invocations in warm instances)
let _cacheState: { name: string; expiresAt: number } | null = null;

async function getOrCreateAnalysisCache(apiKey: string, model: string): Promise<string | null> {
    // Return cached name if still valid (5-min buffer before expiry)
    if (_cacheState && Date.now() < _cacheState.expiresAt - 300_000) {
        return _cacheState.name;
    }

    try {
        const ttlSeconds = 3600;
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: `models/${model}`,
                    systemInstruction: { parts: [{ text: ANALYSIS_SYSTEM_INSTRUCTION }] },
                    contents: [
                        { role: 'user', parts: [{ text: 'Ready to analyze.' }] },
                        { role: 'model', parts: [{ text: 'Ready. Send me the brand data and I will return strict JSON per the schema.' }] }
                    ],
                    ttl: `${ttlSeconds}s`
                })
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.warn('Context cache creation failed:', err);
            return null;
        }

        const cache = await response.json();
        _cacheState = { name: cache.name, expiresAt: Date.now() + ttlSeconds * 1000 };
        console.log('Context cache created:', cache.name);
        return cache.name;
    } catch (err) {
        console.warn('Context cache error, proceeding without cache:', err);
        return null;
    }
}

// --- Content Hash Helper ---
// Computes SHA-256 hex of normalized content for cache keying
async function computeContentHash(content: string): Promise<string> {
    const normalized = content.trim().replace(/\s+/g, ' ');
    const data = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// --- Vector Math Helpers ---
const dotProduct = (a: number[], b: number[]): number =>
    a.reduce((sum, val, i) => sum + val * b[i], 0);

const magnitude = (v: number[]): number =>
    Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));

const cosineSimilarity = (a: number[], b: number[]): number => {
    if (!a || !b || a.length !== b.length) return 0;
    const mag = magnitude(a) * magnitude(b);
    return mag === 0 ? 0 : dotProduct(a, b) / mag;
};

// --- Type Guards ---
function isDiscoverPayload(payload: unknown): payload is DiscoverPayload {
    return typeof payload === 'object' && payload !== null && 'url' in payload;
}

function isAnalyzePayload(payload: unknown): payload is AnalyzePayload {
    return typeof payload === 'object' && payload !== null && 'websiteUrl' in payload;
}

function isRewritePayload(payload: unknown): payload is RewritePayload {
    return typeof payload === 'object' && payload !== null && 'original' in payload && 'context' in payload;
}

function isVisibilityPayload(payload: unknown): payload is VisibilityPayload {
    return typeof payload === 'object' && payload !== null && 'platform' in payload && 'query' in payload && 'domain' in payload;
}

function isVisibilityBatchPayload(payload: unknown): payload is VisibilityBatchPayload {
    return typeof payload === 'object'
        && payload !== null
        && 'checks' in payload
        && Array.isArray((payload as VisibilityBatchPayload).checks);
}

function isSandboxPayload(payload: unknown): payload is SandboxComparePayload {
    return typeof payload === 'object' && payload !== null && 'goal' in payload && 'variantA' in payload && 'variantB' in payload;
}

function isAutoAuditPayload(payload: unknown): payload is AutoAuditPayload {
    return typeof payload === 'object' && payload !== null && 'domainUrl' in payload && 'organizationId' in payload;
}

serve(async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const corsHeaders: Record<string, string> = {
        ...buildCorsHeaders(req.headers.get("origin")),
        "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-Id",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json() as FunctionRequest;
        const { action, payload } = body;

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            throw new Error("Server Misconfiguration: Missing Supabase environment variables");
        }

        const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

        let orgId: string | null = null;
        let isServiceRole = false;

        const authHeader = req.headers.get("Authorization") ?? "";
        const apiKeyHeader = req.headers.get("x-api-key");

        // 1. API Key Auth (External)
        if (apiKeyHeader) {
            // Hash the provided key
            const encoder = new TextEncoder();
            const data = encoder.encode(apiKeyHeader);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

            // Validate Key
            const { data: keyData, error: keyError } = await supabaseAdmin
                .from('api_keys')
                .select('id, organization_id, usage_count, rate_limit, revoked_at')
                .eq('key_hash', keyHash)
                .single();

            if (keyError || !keyData) {
                console.error("Invalid API Key attempt", keyHash.slice(0, 8));
                throw new Error("Invalid API Key");
            }
            if (keyData.revoked_at) throw new Error("API Key has been revoked");
            if (keyData.usage_count >= keyData.rate_limit) throw new Error("API Key rate limit exceeded");

            orgId = keyData.organization_id;

            // Async Usage Update (Non-blocking)
            supabaseAdmin.from('api_keys').update({
                usage_count: keyData.usage_count + 1,
                last_used_at: new Date().toISOString()
            }).eq('id', keyData.id).then();

            // Usage Log
            supabaseAdmin.from('api_usage_logs').insert({
                api_key_id: keyData.id,
                organization_id: orgId,
                endpoint: action,
                status_code: 200
            }).then();

        }
        // 2. Service Role Auth (Internal)
        else if (authHeader.replace("Bearer ", "") === serviceRoleKey || authHeader === serviceRoleKey) {
            isServiceRole = true;
            if (action === "AUTO_AUDIT") {
                orgId = payload.organizationId;
            }
        }
        // 3. User JWT Auth (Dashboard)
        else {
            const supabase: SupabaseClient = createClient(supabaseUrl, anonKey, {
                global: { headers: { Authorization: authHeader } },
            });

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error("Unauthorized");
            }

            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single() as { data: UserData | null };

            if (!userData?.organization_id) {
                throw new Error("User has no organization");
            }
            orgId = userData.organization_id;
        }

        // 3. Rate Limiting (Server-Side)
        if (orgId && rateLimiter) {
            const { success, limit, remaining, reset } = await checkRateLimit(rateLimiter, orgId, action);

            if (!success) {
                return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": remaining.toString(),
                        "X-RateLimit-Reset": reset.toString(),
                        "X-Request-Id": requestId,
                    },
                    status: 429
                });
            }
        }

        // 4. Validate credit-billed payloads before charging
        if (action === "ANALYZE" && !isAnalyzePayload(payload)) {
            throw new Error("Invalid payload for ANALYZE action");
        }
        if (action === "REWRITE" && !isRewritePayload(payload)) {
            throw new Error("Invalid payload for REWRITE action");
        }
        if (action === "SANDBOX_COMPARE" && !isSandboxPayload(payload)) {
            throw new Error("Invalid payload for SANDBOX_COMPARE action");
        }

        // 5. Credit Management
        if (action === "ANALYZE" || action === "REWRITE" || action === "SANDBOX_COMPARE") {
            const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('decrement_credits', {
                p_org_id: orgId,
                p_audit_amount: action === "ANALYZE" ? 1 : 0,
                p_rewrite_amount: (action === "REWRITE" || action === "SANDBOX_COMPARE") ? 1 : 0,
                p_activity_type: action
            }) as { data: CreditResult | null; error: Error | null };

            if (creditError) {
                throw new Error(`Credit process failed: ${creditError.message}`);
            }
            if (creditResult && !creditResult.success) {
                return new Response(JSON.stringify({ error: creditResult.error }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                    status: 402,
                });
            }
        }

        // --- 4. Enqueue Logic (Background Jobs) ---
        if (action === "ENQUEUE_ANALYZE") {
            if (!isAnalyzePayload(payload)) throw new Error("Invalid payload for ENQUEUE");

            // Check Credit Again (Optional, but good for validation before queueing)
            const { data: creditBalance } = await supabaseAdmin
                .from('organizations')
                .select('audit_credits_remaining')
                .eq('id', orgId)
                .single();

            if ((creditBalance?.audit_credits_remaining || 0) < 1) {
                throw new Error("Insufficient credits to queue analysis");
            }

            const { error: jobError } = await supabaseAdmin
                .from('background_jobs')
                .insert({
                    organization_id: orgId,
                    job_type: 'ANALYZE_BATCH',
                    payload: payload,
                    status: 'PENDING'
                });

            if (jobError) throw jobError;

            return new Response(JSON.stringify({ success: true, message: "Job queued for AI processing" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
                status: 202
            });
        }

        // 4. Init AI Providers (Gemini-only)
        // Model routing: SUMMARIZE actions → Flash-Lite (cheap), all others → Flash (standard)
        const GEMINI_FLASH = "gemini-2.5-flash";
        const GEMINI_FLASH_LITE = "gemini-2.5-flash-lite";

        const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

        const requiresAI = action === "ANALYZE"
            || action === "REWRITE"
            || action === "CHECK_VISIBILITY"
            || action === "CHECK_VISIBILITY_BATCH"
            || action === "SANDBOX_COMPARE"
            || action === "AUTO_AUDIT";

        if (requiresAI && !geminiKey) {
            throw new Error("Server Misconfiguration: GEMINI_API_KEY not configured");
        }

        const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
        const geminiModel: GenerativeModel | null = genAI ? genAI.getGenerativeModel({ model: GEMINI_FLASH }) : null;
        const geminiLiteModel: GenerativeModel | null = genAI ? genAI.getGenerativeModel({ model: GEMINI_FLASH_LITE }) : null;
        const geminiEmbeddingModel: GenerativeModel | null = genAI ? genAI.getGenerativeModel({ model: "text-embedding-004" }) : null;

        // isBatch: scheduled audits use Flash-Lite + reduced token budget for 50% cost savings
        const isBatch = (payload as any)?.isBatch === true;
        const activeModel = isBatch ? GEMINI_FLASH_LITE : GEMINI_FLASH;

        // Attempt to get/create context cache for ANALYZE action (saves 40-50% on system prompt tokens)
        let analysisCacheName: string | null = null;
        if (action === "ANALYZE" || action === "AUTO_AUDIT") {
            analysisCacheName = await getOrCreateAnalysisCache(geminiKey, activeModel);
        }

        const generateJson = async (prompt: string) => {
            if (analysisCacheName) {
                try {
                    return await withRetry(() => generateWithCache(geminiKey, activeModel, prompt, analysisCacheName!));
                } catch (cacheErr) {
                    console.warn('Cache hit failed, falling back to direct call:', cacheErr);
                    analysisCacheName = null; // invalidate local cache ref
                }
            }
            return await generateWithGemini(prompt, geminiModel);
        };
        const generateJsonLite = async (prompt: string) => await generateWithGemini(prompt, geminiLiteModel);
        const embedText = async (text: string) => await embedWithGemini(text, geminiEmbeddingModel);
        const generateForPlatform = async (_platform: string, prompt: string) => {
            return await generateWithGemini(prompt, geminiModel);
        };

        let result: DiscoveredPage[] | AnalysisReport | RewriteResult | VisibilityResult | VisibilityResult[] | SandboxCompareResult | null;

        // 5. Route to handlers
        switch (action) {
            case "DISCOVER":
                if (!isDiscoverPayload(payload)) {
                    throw new Error("Invalid payload for DISCOVER action");
                }
                // Cache Key: discover:{url}
                const cacheKeyDiscover = `discover:${payload.url}`;

                result = await withCache(
                    cacheKeyDiscover,
                    CACHE_TTL.DISCOVERY,
                    async () => await handleDiscovery(payload.url)
                );
                break;

            case "ANALYZE":
                if (!isAnalyzePayload(payload)) {
                    throw new Error("Invalid payload for ANALYZE action");
                }

                // --- Supabase Content-Hash Cache ---
                // Skip AI call entirely when content hasn't changed within 24h
                let analyzeFromCache = false;
                if (!payload.forceRefresh && payload.mainContent) {
                    const contentHash = await computeContentHash(payload.mainContent);
                    const domain = (() => {
                        try { return new URL(payload.websiteUrl).hostname; } catch { return payload.websiteUrl; }
                    })();

                    const { data: cachedEntry } = await supabaseAdmin
                        .from('analysis_cache')
                        .select('result_json, created_at')
                        .eq('content_hash', contentHash)
                        .gt('expires_at', new Date().toISOString())
                        .maybeSingle();

                    if (cachedEntry) {
                        // Cache hit — return stored result, skip Gemini entirely
                        result = {
                            ...(cachedEntry.result_json as AnalysisReport),
                            _fromCache: true,
                            _cachedAt: cachedEntry.created_at,
                        };
                        analyzeFromCache = true;

                        // Increment hit counter async (non-blocking, raw SQL for atomic increment)
                        supabaseAdmin
                            .rpc('increment_cache_hit', { p_content_hash: contentHash })
                            .then();

                        console.log(`[Cache HIT] ${domain} — skipped Gemini call`);
                    } else {
                        // Cache miss — run analysis then store result
                        const cacheKeyAnalyze = `analyze:${payload.websiteUrl}`;
                        result = await withCache(
                            cacheKeyAnalyze,
                            CACHE_TTL.ANALYSIS,
                            async () => await handleAnalysis(generateJson, embedText, payload)
                        );

                        // Store in Supabase cache for 24h (non-blocking)
                        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                        supabaseAdmin
                            .from('analysis_cache')
                            .upsert({
                                content_hash: contentHash,
                                domain,
                                result_json: result,
                                expires_at: expiresAt,
                                hit_count: 0,
                            }, { onConflict: 'content_hash' })
                            .then();

                        console.log(`[Cache MISS] ${domain} — stored new entry`);
                    }
                } else {
                    // No content to hash (or forceRefresh) — call Gemini directly
                    const cacheKeyAnalyze = `analyze:${payload.websiteUrl}`;
                    result = await withCache(
                        cacheKeyAnalyze,
                        CACHE_TTL.ANALYSIS,
                        async () => await handleAnalysis(generateJson, embedText, payload)
                    );
                }

                // Add notification (only for fresh analyses to avoid noise)
                if (!analyzeFromCache) {
                    await supabaseAdmin.from('audit_notifications').insert({
                        organization_id: orgId,
                        type: 'success',
                        title: 'Analysis Complete',
                        message: `Report for ${payload.websiteUrl} is ready.`
                    });
                }

                // Track Event
                await trackEvent(orgId || 'anonymous', 'audit_completed', {
                    domain: payload.websiteUrl,
                    score: result.overallScore
                });

                // Sync to HubSpot
                if (orgId) {
                    // Fetch user email an HubSpot token
                    const { data: orgData } = await supabaseAdmin
                        .from('organizations')
                        .select('hubspot_token')
                        .eq('id', orgId)
                        .single();

                    const { data: userData } = await supabaseAdmin
                        .from('users')
                        .select('email')
                        .eq('organization_id', orgId)
                        .eq('role', 'owner')
                        .limit(1)
                        .maybeSingle();

                    if (userData?.email && orgData?.hubspot_token) {
                        await syncHubSpotEvent(
                            orgData.hubspot_token,
                            userData.email,
                            'audit_completed',
                            {
                                domain: payload.websiteUrl,
                                score: result.overallScore
                            }
                        );
                    }
                }
                break;

            case "REWRITE":
                if (!isRewritePayload(payload)) {
                    throw new Error("Invalid payload for REWRITE action");
                }
                result = await handleRewrite(generateJson, embedText, payload);
                break;

            case "CHECK_VISIBILITY":
                if (!isVisibilityPayload(payload)) {
                    throw new Error("Invalid payload for CHECK_VISIBILITY action");
                }
                result = await handleVisibilityCheck(generateForPlatform, payload);
                break;

            case "CHECK_VISIBILITY_BATCH":
                if (!isVisibilityBatchPayload(payload)) {
                    throw new Error("Invalid payload for CHECK_VISIBILITY_BATCH action");
                }
                result = await handleVisibilityBatch(generateForPlatform, payload);
                break;

            case "SANDBOX_COMPARE":
                if (!isSandboxPayload(payload)) {
                    throw new Error("Invalid payload for SANDBOX_COMPARE action");
                }
                result = await handleSandboxCompare(generateJson, embedText, payload);
                break;

            case "AUTO_AUDIT":
                if (!isAutoAuditPayload(payload)) {
                    throw new Error("Invalid payload for AUTO_AUDIT action");
                }
                if (!isServiceRole) {
                    throw new Error("AUTO_AUDIT can only be triggered by system scheduler");
                }
                result = await handleAutoAudit(supabaseAdmin, generateJson, embedText, payload);
                break;

            case "VALIDATE_SCHEMA": {
                const schemaPayload = payload as { urls: string[]; websiteContent?: string };
                if (!Array.isArray(schemaPayload.urls) || schemaPayload.urls.length === 0) {
                    throw new Error("VALIDATE_SCHEMA requires a non-empty urls array");
                }
                result = await handleValidateSchema(generateJson, schemaPayload.urls, schemaPayload.websiteContent || '');
                break;
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 200,
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error:", errorMessage);
        return new Response(JSON.stringify({
            success: false,
            error: errorMessage,
            details: {
                code: "ANALYZE_CONTENT_FAILED",
                message: errorMessage,
                requestId
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 500,
        });
    }
});

async function handleDiscovery(url: string): Promise<DiscoveredPage[]> {
    console.log(`Starting real discovery for: ${url}`);

    // 1. Try Sitemap First
    try {
        const sitemapUrl = new URL("/sitemap.xml", url).toString();
        const sitemapRes = await fetch(sitemapUrl);
        if (sitemapRes.ok) {
            const xml = await sitemapRes.text();
            const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]).slice(0, 10);
            if (urls.length > 0) {
                return urls.map(u => ({
                    url: u,
                    type: u === url || u === url + '/' ? 'HOMEPAGE' : 'OTHER',
                    status: 'PENDING'
                }));
            }
        }
    } catch (e) {
        console.warn("Sitemap fetch failed, falling back to HTML crawl", e);
    }

    // 2. Fallback to Homepage HTML Scan
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'CognitionBot/1.0 (AI Visibility Engine)' }
        });

        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const discovered = new Set<string>();
        const results: DiscoveredPage[] = [];

        results.push({ url, type: 'HOMEPAGE', status: 'PENDING' });
        discovered.add(url);

        $('a').each((_index: number, el: any) => {
            const href = $(el).attr('href');
            if (href && (href.startsWith('/') || href.includes(url))) {
                try {
                    const fullUrl = new URL(href, url).toString();
                    if (!discovered.has(fullUrl)) {
                        const lower = fullUrl.toLowerCase();
                        let type: DiscoveredPage['type'] = 'OTHER';
                        if (lower.includes('price') || lower.includes('plan')) type = 'PRICING';
                        else if (lower.includes('about')) type = 'ABOUT';
                        else if (lower.includes('blog') || lower.includes('news')) type = 'BLOG';
                        else if (lower.includes('docs') || lower.includes('api')) type = 'DOCS';

                        results.push({ url: fullUrl, type, status: 'PENDING' });
                        discovered.add(fullUrl);
                    }
                } catch {
                    // Invalid URL, skip
                }
            }
        });

        return results.slice(0, 15);

    } catch (error) {
        console.error("Real discovery failed:", error);
        return [{ url, type: 'HOMEPAGE', status: 'PENDING' }];
    }
}


// --- Gemini-Only Helpers ---
async function generateWithGemini(
    prompt: string,
    geminiModel: GenerativeModel | null
): Promise<string> {
    if (!geminiModel) throw new Error("Gemini model not configured");
    const result = await withRetry(async () => {
        return await geminiModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
    });
    return result.response.text();
}

// Generates content using a cached system instruction — 40-50% cheaper on cached tokens
async function generateWithCache(
    apiKey: string,
    model: string,
    userPrompt: string,
    cacheName: string
): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cachedContent: cacheName,
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini cached generate error: ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function embedWithGemini(
    text: string,
    geminiEmbeddingModel: GenerativeModel | null
): Promise<number[]> {
    if (!geminiEmbeddingModel) throw new Error("Gemini embedding model not configured");
    const result = await withRetry(async () => {
        return await geminiEmbeddingModel.embedContent(text);
    });
    return (result.embedding.values as number[]) || [];
}

/**
 * Calculate content authority score (0-100) based on quality signals
 * Higher scores indicate more authoritative, citation-worthy content
 */
function calculateContentAuthority(content: string, report: AnalysisReport): number {
    let score = 50; // Base score

    // 1. Content Depth (0-20 points)
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 2000) score += 20;
    else if (wordCount > 1000) score += 15;
    else if (wordCount > 500) score += 10;
    else if (wordCount > 200) score += 5;

    // 2. Structured Data / Schema Markup (0-15 points)
    const hasJsonLd = content.includes('application/ld+json') || content.includes('"@type"');
    if (hasJsonLd) score += 15;

    // 3. Statistical Authority (0-15 points)
    const statPatterns = [
        /\d+%/g, // Percentages
        /\b\d{1,3}(,\d{3})*\b/g, // Numbers with commas
        /(according to|research shows|studies indicate|data reveals)/gi, // Authority phrases
    ];
    const statCount = statPatterns.reduce((sum, pattern) => {
        const matches = content.match(pattern);
        return sum + (matches ? matches.length : 0);
    }, 0);
    if (statCount > 10) score += 15;
    else if (statCount > 5) score += 10;
    else if (statCount > 2) score += 5;

    // 4. Entity Linking Density (0-15 points)
    const entityMarkers = [
        /"sameAs"/gi,
        /"mentions"/gi,
        /"@id"/gi,
        /https?:\/\/[^\s"]+/g, // External links
    ];
    const entityCount = entityMarkers.reduce((sum, pattern) => {
        const matches = content.match(pattern);
        return sum + (matches ? matches.length : 0);
    }, 0);
    if (entityCount > 15) score += 15;
    else if (entityCount > 8) score += 10;
    else if (entityCount > 3) score += 5;

    // 5. Content Structure (0-10 points)
    const hasHeadings = /<h[1-6]>/i.test(content);
    const hasList = /<(ul|ol)>/i.test(content);
    const hasTable = /<table>/i.test(content);
    if (hasHeadings) score += 4;
    if (hasList) score += 3;
    if (hasTable) score += 3;

    // 6. Citation-Friendly Formatting (0-10 points)
    const quotablePatterns = [
        /<blockquote>/gi,
        /^> /gm, // Markdown quotes
        /"[^"]{30,}"/g, // Long quoted strings
    ];
    const quotableCount = quotablePatterns.reduce((sum, pattern) => {
        const matches = content.match(pattern);
        return sum + (matches ? matches.length : 0);
    }, 0);
    if (quotableCount > 3) score += 10;
    else if (quotableCount > 1) score += 5;

    // 7. SEO Technical Health Bonus (0-5 points)
    if (report.seoAudit && report.seoAudit.technicalHealth > 80) {
        score += 5;
    } else if (report.seoAudit && report.seoAudit.technicalHealth > 60) {
        score += 3;
    }

    // 8. Quote Likelihood Bonus (0-10 points)
    // Average quote likelihood across pages
    if (report.pages && report.pages.length > 0) {
        const avgQuoteLikelihood = report.pages.reduce((sum, p) => sum + (p.quoteLikelihood || 0), 0) / report.pages.length;
        if (avgQuoteLikelihood > 80) score += 10;
        else if (avgQuoteLikelihood > 60) score += 7;
        else if (avgQuoteLikelihood > 40) score += 4;
    }

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, score));
}

async function generateVectorMap(
    embedText: (text: string) => Promise<number[]>,
    mainContent: string,
    report: AnalysisReport,
    competitors?: string[]
): Promise<AnalysisReport['vectorMap']> {
    try {
        const topKeyword = report.keywords?.[0] || "SEO";

        // 1. Generate Embeddings
        const [vContent, vKeyword] = await Promise.all([
            embedText(mainContent.slice(0, 8000)), // Limit context
            embedText(topKeyword)
        ]);

        // 2. Calculate Similarity
        const similarity = cosineSimilarity(vContent, vKeyword);

        // 3. Project to 3D Visualization Space (Simplified)
        // Target (Keyword) is always at top-right (90, 90)
        // Content is positioned on the diagonal line towards Target based on similarity

        const targetX = 90;
        const targetY = 90;
        const targetZ = 800;

        // Map similarity (0.6 to 0.9 range typically) to 20-80 range on chart
        // We boost the raw cosine similarity because typically embeddings are 0.7-0.8 for relevant text
        const relevance = Math.max(10, Math.min(95, (similarity - 0.5) * 200));

        const contentX = relevance;

        // Calculate authority score based on content quality signals
        const authority = calculateContentAuthority(mainContent || "", report);
        const contentY = Math.min(100, relevance + (authority - 50) / 5); // Authority affects Y-axis position

        // @ts-ignore
        const map: AnalysisReport['vectorMap'] = [
            { x: targetX, y: targetY, z: targetZ, label: `Target: ${topKeyword}`, type: 'gold_standard' },
            { x: contentX, y: contentY, z: 400, label: 'Your Content', type: 'your_content' }
        ];

        // Add real competitor analysis
        if (competitors && competitors.length > 0) {
            // Fetch homepage content from top 3 competitors and position them on the map
            const competitorPromises = competitors.slice(0, 3).map(async (compUrl, idx) => {
                try {
                    // Fetch competitor homepage
                    const response = await fetchWithRetry(compUrl.startsWith('http') ? compUrl : `https://${compUrl}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; CognitionBot/1.0; +https://cognition.ai)'
                        }
                    }, 2, 3000); // 2 retries, 3s timeout

                    if (!response.ok) {
                        console.warn(`Failed to fetch competitor ${compUrl}: ${response.status}`);
                        return null;
                    }

                    const html = await response.text();

                    // Extract main content (simplified - strip scripts/styles)
                    const compContent = html
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, 5000); // Limit to 5K chars for embedding

                    // Embed competitor content
                    const compEmbedding = await embedText(compContent);

                    // Calculate similarity to target keyword
                    const compSimilarity = cosineSimilarity(compEmbedding, vKeyword);
                    const compRelevance = Math.max(10, Math.min(95, (compSimilarity - 0.5) * 200));

                    // Calculate competitor authority
                    const compAuthority = calculateContentAuthority(html, {
                        seoAudit: { implemented: [], missing: [], technicalHealth: 50 },
                        pages: [],
                    } as any);

                    return {
                        x: compRelevance,
                        y: Math.min(100, compRelevance + (compAuthority - 50) / 5),
                        z: 600,
                        label: compUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
                        type: 'competitor' as const
                    };
                } catch (error) {
                    console.error(`Error analyzing competitor ${compUrl}:`, error);
                    return null;
                }
            });

            const competitorResults = await Promise.all(competitorPromises);
            const validCompetitors = competitorResults.filter(c => c !== null);
            map.push(...validCompetitors);
        }

        return map;

    } catch (e) {
        console.error("Vector map generation failed:", e);
        return [];
    }
}

async function handleAnalysis(
    generateJson: (prompt: string) => Promise<string>,
    embedText: (text: string) => Promise<number[]>,
    payload: AnalyzePayload
): Promise<AnalysisReport> {
    const { websiteUrl, otherAssets, mainContent, competitors } = payload;

    // When context cache is active, only send variable data — system instructions are cached
    const prompt = `Analyze this brand for AEO/GEO/SEO visibility.

Domain: ${websiteUrl}
Competitors: ${competitors ? competitors.join(', ') : 'None provided'}
Assets: ${otherAssets || 'None'}
Content (truncated to 15k chars): ${mainContent?.slice(0, 15000) || "No content provided"}

Return strict JSON per the schema. DO NOT generate vectorMap.`;

    const responseText = await generateJson(prompt);
    let report: AnalysisReport;
    try {
        report = JSON.parse(responseText) as AnalysisReport;
    } catch (e) {
        // Fallback: try to clean markdown code blocks
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '');
        report = JSON.parse(cleanJson) as AnalysisReport;
    }

    // Enhance with Vector Map
    try {
        report.vectorMap = await generateVectorMap(embedText, mainContent || "", report, competitors);
    } catch (vecErr) {
        console.warn("Vector map generation failed, skipping:", vecErr);
    }
    return report;
}

async function handleRewrite(
    generateJson: (prompt: string) => Promise<string>,
    embedText: (text: string) => Promise<number[]>,
    payload: RewritePayload
): Promise<RewriteResult> {
    const { original, context, rewrite: userRewrite, goal, tone } = payload;

    let targetRewrite = userRewrite;
    let reasoning = "Analysis of provided rewrite.";

    // 1. Generate Rewrite only if not provided
    if (!targetRewrite) {
        const goalInstructions = {
            'SNIPPET': 'Focus on a 40-60 word "Answer First" approach. Use declarative statements and lists where possible to maximize chance of being featured in AI snippets.',
            'AUTHORITY': 'Inject specific statistics, expert citation hooks, or references to original research. Use authoritative phrases like "According to recent datasets" or "The primary evidence suggests".',
            'CLARITY': 'Minimize sentence length (<20 words), remove all technical jargon, and focus on extreme semantic simplicity for low-confidence RAG retrieval.',
            'CONVERSION': 'Maintain brand tone but emphasize value proposition and direct calls-to-visibility. Optimize for user-click intent while staying citatable.'
        };

        const toneInstruction = tone ? `Use a ${tone.toLowerCase()} tone of voice.` : 'Use a professional, authoritative tone.';
        const goalInstruction = goal ? goalInstructions[goal] : 'Optimize for AI citation and authoritative retrieval.';

        const prompt = `
        Context/Goal: "${context}"
        Original Content: "${original}"
        Optimization Goal: ${goalInstruction}
        Tone: ${toneInstruction}

        Task: Rewrite the original content to achieve the Optimization Goal.
        Return strict JSON: { "rewrite": "string", "reasoning": "string" }
        `;

        const responseText = await generateJson(prompt);
        const genData = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '')) as { rewrite: string; reasoning: string };

        targetRewrite = genData.rewrite;
        reasoning = genData.reasoning;
    } else {
        const prompt = `
        Context/Goal: "${context}"
        Original: "${original}"
        Rewrite: "${targetRewrite}"
        Task: Explain why the rewrite is better (or worse). Keep it under 15 words.
        Return strict JSON: { "reasoning": "string" }
        `;

        const responseText = await generateJson(prompt);
        const genData = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '')) as { reasoning: string };
        reasoning = genData.reasoning;
    }

    // 2. Calculate semantic shift using embeddings
    const [vContext, vOriginal, vRewrite] = await Promise.all([
        embedText(context),
        embedText(original),
        embedText(targetRewrite || original)
    ]);

    const simOriginal = cosineSimilarity(vContext, vOriginal);
    const simRewrite = cosineSimilarity(vContext, vRewrite);

    const scoreOriginal = Math.max(0, simOriginal * 100);
    const scoreRewrite = Math.max(0, simRewrite * 100);
    const scoreDelta = Math.round(scoreRewrite - scoreOriginal);
    const vectorShift = Math.abs(simRewrite - simOriginal);

    return {
        rewrite: targetRewrite,
        reasoning,
        scoreDelta,
        vectorShift: parseFloat(vectorShift.toFixed(4))
    };
}

async function handleVisibilityCheck(
    generateForPlatform: (platform: string, prompt: string) => Promise<string>,
    payload: VisibilityPayload
): Promise<VisibilityResult> {
    const { platform, query, domain } = payload;
    const platformLabel = platform || 'Perplexity';
    const cleanDomain = domain.toLowerCase().replace('www.', '').replace('https://', '').replace('http://', '').split('/')[0];

    // 1. Perplexity (Live Search)
    if (platformLabel.toLowerCase() === 'perplexity') {
        const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
        if (!apiKey) {
            return {
                platform: platformLabel,
                rank: -1,
                citationFound: false,
                sentiment: 0,
                error: "Perplexity API key not configured."
            };
        }

        try {
            const response = await fetchWithRetry("https://api.perplexity.ai/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.1-sonar-small-128k-online",
                    messages: [
                        { role: "system", content: "You are a helpful search assistant. Include citations when available." },
                        { role: "user", content: query }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Perplexity API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json() as {
                choices: Array<{ message: { content: string } }>;
                citations?: string[];
            };

            const retrievedAnswer = data.choices[0]?.message?.content || "";
            const citations = data.citations || [];

            const citationFound =
                citations.some((c: string) => c.toLowerCase().includes(cleanDomain)) ||
                retrievedAnswer.toLowerCase().includes(cleanDomain);

            // Simple positive sentiment heuristic
            const sentiment = retrievedAnswer.toLowerCase().includes('best') || retrievedAnswer.toLowerCase().includes('recommend') ? 80 : 50;

            return {
                platform: 'Perplexity',
                rank: citationFound ? 1 : 0,
                citationFound,
                sentiment,
                answer: retrievedAnswer
            };

        } catch (error: unknown) {
            console.error("Perplexity Check Error:", error instanceof Error ? error.message : error);
            return {
                platform: 'Perplexity',
                rank: -1,
                citationFound: false,
                sentiment: 0,
                answer: "Could not retrieve live results.",
                error: "API Error"
            };
        }
    }

    // 2. ChatGPT / Claude / Gemini (Direct Knowledge Check)
    try {
        const prompt = `
        Answer this user query naturally as an AI assistant.
        Do not use any external tools or search, just use your internal knowledge.
        Query: "${query}"
        
        After your answer, add a separator "###METADATA###" and provide a JSON object with:
        - "mentions": ["list", "of", "brands", "or", "websites", "mentioned"],
        - "sentiment": number (0-100, where 50 is neutral),
        
        Keep the metadata strict JSON.
        `;

        const rawResponse = await generateForPlatform(platformLabel, prompt);

        const [answerPart, metadataPart] = rawResponse.split('###METADATA###');
        const answer = answerPart ? answerPart.trim() : "";
        let metadata = { mentions: [], sentiment: 50 };

        if (metadataPart) {
            try {
                const cleanJson = metadataPart.replace(/```json/g, '').replace(/```/g, '').trim();
                metadata = JSON.parse(cleanJson);
            } catch (e) {
                console.warn("Failed to parse visibility metadata", e);
            }
        }

        const directMention = metadata.mentions?.some((m: string) => m.toLowerCase().includes(cleanDomain));
        const textMention = answer.toLowerCase().includes(cleanDomain);
        const citationFound = directMention || textMention;

        return {
            platform: platformLabel,
            rank: citationFound ? 1 : 0,
            citationFound: citationFound,
            sentiment: metadata.sentiment || 50,
            answer: answer
        };

    } catch (error: unknown) {
        console.error(`${platformLabel} Check Error:`, error instanceof Error ? error.message : error);
        return {
            platform: platformLabel,
            rank: -1,
            citationFound: false,
            sentiment: 0,
            answer: `Could not verify with ${platformLabel}.`,
            error: "Platform Check Failed"
        };
    }
}

async function handleVisibilityBatch(
    generateForPlatform: (platform: string, prompt: string) => Promise<string>,
    payload: VisibilityBatchPayload
): Promise<VisibilityResult[]> {
    const checks = payload.checks.slice(0, 20);
    const results = await Promise.all(
        checks.map((check) => handleVisibilityCheck(generateForPlatform, check))
    );
    return results;
}

async function handleSandboxCompare(
    generateJson: (prompt: string) => Promise<string>,
    embedText: (text: string) => Promise<number[]>,
    payload: SandboxComparePayload
): Promise<SandboxCompareResult> {
    const { goal, variantA, variantB } = payload;

    const prompt = `
    Compare two content variants against a specific AEO (Answer Engine Optimization) goal.
    Goal: "${goal}"
    Variant A: "${variantA}"
    Variant B: "${variantB}"

    For each variant, provide:
    1. A score (0-100) on how well it predicts to perform in AI search (citability, clarity, authority).
    2. A brief reasoning (max 20 words).
    3. platformScores (array of {platform: string, score: number}) for Gemini, ChatGPT, and Claude.

    Return strict JSON:
    {
        "a": { "score": number, "reasoning": "string", "platformScores": [{ "platform": "string", "score": number }] },
        "b": { "score": number, "reasoning": "string", "platformScores": [{ "platform": "string", "score": number }] }
    }
    `;

    const responseText = await generateJson(prompt);
    const comparison = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '')) as { a: any, b: any };

    const [vGoal, vA, vB] = await Promise.all([
        embedText(goal),
        embedText(variantA),
        embedText(variantB)
    ]);

    const alignmentA = cosineSimilarity(vGoal, vA);
    const alignmentB = cosineSimilarity(vGoal, vB);

    return {
        a: { ...comparison.a, alignment: alignmentA },
        b: { ...comparison.b, alignment: alignmentB }
    };
}

async function handleAutoAudit(
    supabaseAdmin: SupabaseClient,
    generateJson: (prompt: string) => Promise<string>,
    embedText: (text: string) => Promise<number[]>,
    payload: AutoAuditPayload
): Promise<{ success: boolean; auditId?: string }> {
    const { domainUrl, organizationId, frequency } = payload;

    console.log(`[Sentinel] Generating scheduled audit for ${domainUrl} (Org: ${organizationId})`);

    // 1. Discovery
    const pages = await handleDiscovery(domainUrl);

    // 2. Crawl Homepage
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    let mainContent = "No content crawled.";
    if (firecrawlKey) {
        try {
            const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${firecrawlKey}`,
                },
                body: JSON.stringify({
                    url: domainUrl,
                    formats: ["markdown"],
                    pageOptions: { onlyMainContent: true }
                }),
            });
            if (fcRes.ok) {
                const fcData = await fcRes.json();
                mainContent = fcData.data?.markdown || mainContent;
            } else {
                console.error(`Firecrawl failed: ${fcRes.status} ${await fcRes.text()}`);
            }
        } catch (e) {
            console.error("Auto-audit crawl failed:", e);
        }
    }

    // 3. Analysis
    const report = await handleAnalysis(generateJson, embedText, { websiteUrl: domainUrl, mainContent });

    // 4. Save Audit
    const { data: audit, error: auditError } = await supabaseAdmin
        .from('audits')
        .insert({
            organization_id: organizationId,
            domain_url: domainUrl,
            overall_score: report.overallScore,
            status: 'complete',
            report: report as any,
            completed_at: new Date().toISOString()
        })
        .select()
        .single();

    if (auditError) throw auditError;

    // 4.1 Save Keyword Rankings (Sentinel Data)
    if (report.keywordRankings && Array.isArray(report.keywordRankings)) {
        try {
            const rankingInserts = report.keywordRankings.map((k: any) => ({
                audit_id: audit.id,
                keyword: k.keyword,
                platform: k.platform,
                rank: k.rank,
                citation_found: k.citationFound,
                sentiment_score: k.sentiment,
                created_at: new Date().toISOString()
            }));

            if (rankingInserts.length > 0) {
                await supabaseAdmin.from('keyword_rankings').insert(rankingInserts);
            }
        } catch (e) {
            console.error("Failed to save keyword rankings:", e);
        }
    }

    // 5. Compare with Previous Audit for Delta
    const { data: previousAudit } = await supabaseAdmin
        .from('audits')
        .select('overall_score')
        .eq('organization_id', organizationId)
        .eq('domain_url', domainUrl)
        .eq('status', 'complete')
        .lt('created_at', audit.created_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const delta = previousAudit ? report.overallScore - previousAudit.overall_score : 0;

    // 6. Send Email Notification
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('organization_id', organizationId)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();

    if (user?.email) {
        const { success: emailSuccess, error: emailError } = await sendEmail({
            to: user.email,
            subject: `Sentinel Report: ${domainUrl} (${frequency} update)`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h1 style="color: #6366f1;">Sentinel Visibility Update</h1>
                    <p>Your scheduled audit for <strong>${domainUrl}</strong> has been completed.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: bold;">Overall AEO Score</p>
                        <h2 style="margin: 10px 0; font-size: 48px; color: #0f172a;">${report.overallScore}</h2>
                        <p style="margin: 0; font-size: 16px; color: ${delta >= 0 ? '#10b981' : '#f43f5e'}; font-weight: bold;">
                            ${delta > 0 ? '▲' : delta < 0 ? '▼' : ''} ${Math.abs(delta)}% change since last audit
                        </p>
                    </div>
                    <p>Log in to your dashboard to view the full neural breakdown and platform-specific insights.</p>
                    <a href="https://cognition-ai.com/history" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Delta Analysis</a>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #94a3b8;">This is an automated report from Cognition Sentinel. You can manage your alert preferences in Settings.</p>
                </div>
            `
        });

        if (!emailSuccess) {
            console.error(`Failed to send sentinel email: ${emailError}`);
        }
    }

    // 7. Dispatch to Slack/Webhooks
    await dispatchNotifications(supabaseAdmin, {
        organizationId,
        domainUrl,
        report,
        delta
    });

    return { success: true, auditId: audit.id };
}

// --- Schema Validation Handler ---
async function handleValidateSchema(
    generateJson: (prompt: string) => Promise<string>,
    urls: string[],
    websiteContent: string
): Promise<object> {
    // Fetch each URL and extract JSON-LD blocks
    const pageData = await Promise.all(
        urls.slice(0, 20).map(async (url) => {
            try {
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'CognitionBot/1.0', 'Accept': 'text/html' },
                    signal: AbortSignal.timeout(8000)
                });
                if (!response.ok) return { url, html: '', schemas: [] };
                const html = await response.text();
                // Extract all JSON-LD script blocks
                const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
                const schemas = matches.map(m => {
                    try { return JSON.parse(m[1].trim()); } catch { return null; }
                }).filter(Boolean);
                // Also get a text excerpt for context
                const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
                return { url, schemas, text };
            } catch {
                return { url, schemas: [], text: '' };
            }
        })
    );

    const pagesSection = pageData.map(p => {
        const schemaTypes = p.schemas.map((s: any) => s['@type'] || 'Unknown').join(', ');
        return `URL: ${p.url}\nExisting schema types: ${schemaTypes || 'NONE'}\nPage text: ${p.text?.slice(0, 500) || 'N/A'}`;
    }).join('\n\n---\n\n');

    const prompt = `You are a schema markup expert. Validate the existing JSON-LD schema on these pages and generate missing ones.

WEBSITE CONTEXT: ${websiteContent.slice(0, 1000)}

PAGES:
${pagesSection}

For each page, determine:
1. What schema types are present and if they are valid
2. What critical schema types are MISSING (focus on: Organization, WebPage, Article, FAQPage, BreadcrumbList, Product, LocalBusiness, HowTo)
3. Generate complete, valid JSON-LD for the most impactful missing type

Return JSON:
{
  "overallHealth": number (0-100, 100 = all pages have comprehensive schema),
  "pagesAnalyzed": number,
  "pagesWithSchema": number,
  "missingTypesAcrossSite": string[] (schema types missing on 50%+ of pages),
  "pages": [
    {
      "url": string,
      "existingSchemas": string[] (@type values found),
      "issues": string[] (validation problems found),
      "missingTypes": string[] (recommended missing types),
      "generatedSchema": string (complete JSON-LD string for the highest-impact missing type, valid and copy-ready),
      "impactStatement": string (one sentence: impact of adding the generated schema on AI citations)
    }
  ]
}`;

    const raw = await generateJson(prompt);
    try {
        return JSON.parse(raw);
    } catch {
        return JSON.parse(raw.replace(/```json/g, '').replace(/```/g, ''));
    }
}
