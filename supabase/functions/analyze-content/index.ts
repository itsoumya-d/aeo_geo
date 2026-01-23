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

const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    return typeof payload === 'object' && payload !== null && 'query' in payload && 'domain' in payload;
}

function isSandboxPayload(payload: unknown): payload is SandboxComparePayload {
    return typeof payload === 'object' && payload !== null && 'goal' in payload && 'variantA' in payload && 'variantB' in payload;
}

function isAutoAuditPayload(payload: unknown): payload is AutoAuditPayload {
    return typeof payload === 'object' && payload !== null && 'domainUrl' in payload && 'organizationId' in payload;
}

serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json() as FunctionRequest;
        const { action, payload } = body;

        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

        let orgId: string | null = null;
        let isServiceRole = false;

        // Check if the auth header is the service role key (internal call)
        if (authHeader.replace("Bearer ", "") === serviceRoleKey || authHeader === serviceRoleKey) {
            isServiceRole = true;
            // For service calls, orgId must be in the payload (like AUTO_AUDIT)
            if (action === "AUTO_AUDIT") {
                orgId = payload.organizationId;
            }
        } else {
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

        // 3. Credit Management
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
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 402,
                });
            }
        }

        // 4. Init AI Models
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (!apiKey) {
            throw new Error("Server Misconfiguration: Missing GEMINI_API_KEY");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const embeddingModel: GenerativeModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

        let result: DiscoveredPage[] | AnalysisReport | RewriteResult | VisibilityResult | SandboxCompareResult | null;

        // 5. Route to handlers
        switch (action) {
            case "DISCOVER":
                if (!isDiscoverPayload(payload)) {
                    throw new Error("Invalid payload for DISCOVER action");
                }
                result = await handleDiscovery(payload.url);
                break;

            case "ANALYZE":
                if (!isAnalyzePayload(payload)) {
                    throw new Error("Invalid payload for ANALYZE action");
                }
                result = await handleAnalysis(model, payload);
                // Add notification
                await supabaseAdmin.from('audit_notifications').insert({
                    organization_id: orgId,
                    type: 'success',
                    title: 'Analysis Complete',
                    message: `Report for ${payload.websiteUrl} is ready.`
                });
                break;

            case "REWRITE":
                if (!isRewritePayload(payload)) {
                    throw new Error("Invalid payload for REWRITE action");
                }
                result = await handleRewrite(model, embeddingModel, payload);
                break;

            case "CHECK_VISIBILITY":
                if (!isVisibilityPayload(payload)) {
                    throw new Error("Invalid payload for CHECK_VISIBILITY action");
                }
                result = await handleVisibilityCheck(payload);
                break;

            case "SANDBOX_COMPARE":
                if (!isSandboxPayload(payload)) {
                    throw new Error("Invalid payload for SANDBOX_COMPARE action");
                }
                result = await handleSandboxCompare(model, embeddingModel, payload);
                break;

            case "AUTO_AUDIT":
                if (!isAutoAuditPayload(payload)) {
                    throw new Error("Invalid payload for AUTO_AUDIT action");
                }
                if (!isServiceRole) {
                    throw new Error("AUTO_AUDIT can only be triggered by system scheduler");
                }
                result = await handleAutoAudit(supabaseAdmin, model, payload);
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
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

async function handleAnalysis(model: GenerativeModel, payload: AnalyzePayload): Promise<AnalysisReport> {
    const { websiteUrl, otherAssets, mainContent } = payload;

    const prompt = `
    Analyze this brand presence.
    Domain: ${websiteUrl}
    Assets: ${otherAssets || 'None'}
    Content Snippet: ${mainContent?.slice(0, 15000) || "No content"}

    Return a JSON object with:
    - overallScore (0-100)
    - platformScores (array of {platform, score, reasoning})
    - pages (array of page analysis)
    - topicalDominance (array of strings)
    - brandConsistnecyScore (0-100)
    - consistencyAnalysis (string)
    - keywords (array of strings)
    - searchQueries (array of {platform, query, intent})
    - seoAudit ({implemented: [], missing: [], technicalHealth: number})
    - vectorMap (array of {x, y, label, type: 'brand'|'competitor'|'keyword'})

    Ensure strict JSON format.
    `;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText) as AnalysisReport;
}

async function handleRewrite(
    model: GenerativeModel,
    embeddingModel: GenerativeModel,
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

        const genResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const genData = JSON.parse(genResult.response.text()) as { rewrite: string; reasoning: string };
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
        const genResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        reasoning = (JSON.parse(genResult.response.text()) as { reasoning: string }).reasoning;
    }

    // 2. Calculate Vector Shift
    const [contextEmb, originalEmb, rewriteEmb] = await Promise.all([
        embeddingModel.embedContent(context),
        embeddingModel.embedContent(original),
        embeddingModel.embedContent(targetRewrite || original)
    ]);

    const vContext = contextEmb.embedding.values as number[];
    const vOriginal = originalEmb.embedding.values as number[];
    const vRewrite = rewriteEmb.embedding.values as number[];

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

async function handleVisibilityCheck(payload: VisibilityPayload): Promise<VisibilityResult> {
    const { query, domain } = payload;
    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!apiKey) {
        console.warn("Missing PERPLEXITY_API_KEY, using mock response");
        return {
            platform: "Perplexity",
            rank: 0,
            citationFound: false,
            sentiment: 0,
            answer: "Perplexity API key not configured."
        };
    }

    try {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-sonar-small-128k-online",
                messages: [
                    { role: "system", content: "You are a helpful search assistant." },
                    { role: "user", content: query }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Perplexity API Error: ${response.status}`);
        }

        const data = await response.json() as {
            choices: Array<{ message: { content: string } }>;
            citations?: string[];
        };

        const content = data.choices[0]?.message?.content || "";
        const citations = data.citations || [];

        let citationFound = citations.some((c: string) => c.includes(domain));
        if (!citationFound) {
            citationFound = content.toLowerCase().includes(domain.toLowerCase());
        }

        return {
            platform: "Perplexity",
            rank: citationFound ? 1 : 0,
            citationFound,
            sentiment: 0.5,
            answer: content
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Perplexity check failed:", errorMessage);
        return {
            platform: "Perplexity",
            rank: -1,
            citationFound: false,
            sentiment: 0,
            error: errorMessage
        };
    }
}

async function handleSandboxCompare(
    model: GenerativeModel,
    embeddingModel: GenerativeModel,
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

    const [genResult, goalEmb, aEmb, bEmb] = await Promise.all([
        model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        }),
        embeddingModel.embedContent(goal),
        embeddingModel.embedContent(variantA),
        embeddingModel.embedContent(variantB)
    ]);

    const responseText = genResult.response.text();
    const comparison = JSON.parse(responseText) as { a: any, b: any };

    // Calculate alignment via vector similarity
    const vGoal = goalEmb.embedding.values as number[];
    const vA = aEmb.embedding.values as number[];
    const vB = bEmb.embedding.values as number[];

    const alignmentA = cosineSimilarity(vGoal, vA);
    const alignmentB = cosineSimilarity(vGoal, vB);

    return {
        a: { ...comparison.a, alignment: alignmentA },
        b: { ...comparison.b, alignment: alignmentB }
    };
}

async function handleAutoAudit(
    supabaseAdmin: SupabaseClient,
    model: GenerativeModel,
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
    const report = await handleAnalysis(model, { websiteUrl: domainUrl, mainContent });

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
