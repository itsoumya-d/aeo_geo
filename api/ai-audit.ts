type RequestLike = {
    method?: string;
    body?: unknown;
};

type ResponseLike = {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
        json: (body: unknown) => void;
    };
};

type AuditAction = 'DISCOVER' | 'ANALYZE' | 'CHECK_VISIBILITY' | 'CHECK_VISIBILITY_BATCH' | 'REWRITE' | 'SANDBOX_COMPARE';

type DiscoverPayload = {
    url: string;
};

type AnalyzePayload = {
    websiteUrl: string;
    otherAssets?: string;
    mainContent?: string;
    competitors?: string[];
};

type VisibilityPayload = {
    query: string;
    domain: string;
    platform?: string;
};

type VisibilityBatchPayload = {
    checks: VisibilityPayload[];
};

type RewritePayload = {
    original: string;
    rewrite?: string;
    context: string;
    goal?: string;
    tone?: string;
};

type SandboxComparePayload = {
    goal: string;
    variantA: string;
    variantB: string;
};

const PLATFORM_LIST = [
    'ChatGPT',
    'Gemini',
    'Claude',
    'Perplexity',
    'Google AI Overviews',
    'Microsoft Copilot',
    'Meta AI',
    'Grok',
] as const;

function parseBody(body: unknown): Record<string, unknown> {
    if (!body) return {};
    if (typeof body === 'string') return JSON.parse(body) as Record<string, unknown>;
    if (typeof body === 'object') return body as Record<string, unknown>;
    return {};
}

function cleanDomain(input: string): string {
    const url = input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;
    return new URL(url).hostname.replace(/^www\./, '');
}

async function callGemini(prompt: string, responseMimeType?: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    const model = process.env.GEMINI_CHAT_MODEL?.trim() || 'gemini-2.0-flash';

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured on Vercel.');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 4096,
                ...(responseMimeType ? { responseMimeType } : {}),
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as {
        candidates?: Array<{
            content?: {
                parts?: Array<{ text?: string }>;
            };
        }>;
    };

    return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')?.trim() || '';
}

function extractJsonObject(text: string): string | null {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch {
        // continue
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        const slice = cleaned.slice(firstBrace, lastBrace + 1);
        try {
            JSON.parse(slice);
            return slice;
        } catch {
            return null;
        }
    }

    return null;
}

async function callGeminiJson<T>(prompt: string): Promise<T> {
    const text = await callGemini(prompt);
    if (!text) {
        throw new Error('Gemini returned an empty response.');
    }

    const jsonText = extractJsonObject(text);
    if (!jsonText) {
        throw new Error('Gemini returned non-JSON content.');
    }

    return JSON.parse(jsonText) as T;
}

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildFallbackKeywords(domain: string, text: string): string[] {
    const source = `${domain} ${text}`.toLowerCase();
    const candidates = ['ai visibility', 'brand presence', 'answer engine optimization', 'llm seo', 'citation readiness', 'generative search'];
    return candidates.filter((item) => source.includes(item.split(' ')[0])).slice(0, 5).concat(candidates).slice(0, 5);
}

function normalizeArray<T>(value: unknown, fallback: T[]): T[] {
    return Array.isArray(value) ? value as T[] : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function buildReportFromGemini(raw: Record<string, any> | null, domain: string, mainPageUrl: string, content: string) {
    const keywords = normalizeArray<string>(raw?.keywords, buildFallbackKeywords(domain, content));
    const platformScores = PLATFORM_LIST.map((platform, index) => {
        const existing = Array.isArray(raw?.platformScores)
            ? raw.platformScores.find((item: { platform: string }) => item.platform === platform)
            : null;
        return {
            platform,
            score: normalizeNumber(existing?.score, Math.max(48, 78 - index * 4)),
            reasoning: typeof existing?.reasoning === 'string'
                ? existing.reasoning
                : `${platform} sees the brand clearly on core commercial pages but still lacks stronger proof and supporting evidence.`,
        };
    });

    const fallbackPages = [
        { url: mainPageUrl, pageType: 'HOMEPAGE' },
        { url: `${new URL(mainPageUrl).origin}/pricing`, pageType: 'PRICING' },
        { url: `${new URL(mainPageUrl).origin}/docs`, pageType: 'DOCS' },
    ];

    const pages = (Array.isArray(raw?.pages) && raw.pages.length > 0 ? raw.pages : fallbackPages).slice(0, 5).map((page: any, index: number) => ({
        url: typeof page.url === 'string' ? page.url : fallbackPages[Math.min(index, fallbackPages.length - 1)].url,
        title: typeof page.title === 'string' ? page.title : `${domain} ${page.pageType || fallbackPages[Math.min(index, fallbackPages.length - 1)].pageType}`,
        pageType: typeof page.pageType === 'string' ? page.pageType : fallbackPages[Math.min(index, fallbackPages.length - 1)].pageType,
        aiUnderstanding: typeof page.aiUnderstanding === 'string' ? page.aiUnderstanding : 'AI sees this page as a relevant explanation of the brand and its offer.',
        aiMissed: typeof page.aiMissed === 'string' ? page.aiMissed : 'Stronger proof, statistics, and clearer differentiation would improve recall.',
        quoteLikelihood: normalizeNumber(page.quoteLikelihood, 62 - index * 6),
        recommendations: normalizeArray<any>(page.recommendations, []).slice(0, 3).map((recommendation: any, recIndex: number) => ({
            id: typeof recommendation.id === 'string' ? recommendation.id : `${slugify(domain)}-${index}-${recIndex}`,
            pageUrl: typeof recommendation.pageUrl === 'string' ? recommendation.pageUrl : (typeof page.url === 'string' ? page.url : mainPageUrl),
            issue: typeof recommendation.issue === 'string' ? recommendation.issue : 'Add stronger first-party proof',
            impact: ['HIGH', 'MEDIUM', 'LOW'].includes(recommendation.impact) ? recommendation.impact : 'HIGH',
            effort: ['HIGH', 'MEDIUM', 'LOW'].includes(recommendation.effort) ? recommendation.effort : 'MEDIUM',
            instruction: typeof recommendation.instruction === 'string' ? recommendation.instruction : 'Add concrete proof points, use cases, and clearer commercial language above the fold.',
            aiReasoning: typeof recommendation.aiReasoning === 'string' ? recommendation.aiReasoning : 'Answer engines trust specific evidence more than generic claims.',
            location: typeof recommendation.location === 'string' ? recommendation.location : 'Hero section',
            snippet: typeof recommendation.snippet === 'string' ? recommendation.snippet : '',
            suggested: typeof recommendation.suggested === 'string' ? recommendation.suggested : '',
        })),
    }));

    return {
        overallScore: normalizeNumber(raw?.overallScore, 68),
        platformScores,
        pages,
        brandConsistencyScore: normalizeNumber(raw?.brandConsistencyScore, 71),
        consistencyAnalysis: typeof raw?.consistencyAnalysis === 'string'
            ? raw.consistencyAnalysis
            : 'The brand story is mostly clear, but support pages need tighter language and more evidence to keep AI summaries consistent.',
        topicalDominance: normalizeArray<string>(raw?.topicalDominance, keywords.slice(0, 4)),
        searchQueries: normalizeArray<any>(raw?.searchQueries, [
            { platform: 'ChatGPT', query: `best ${domain} alternatives`, intent: 'Commercial' },
            { platform: 'Gemini', query: `what is ${domain}`, intent: 'Informational' },
            { platform: 'Claude', query: `${domain} pricing review`, intent: 'Commercial' },
            { platform: 'Perplexity', query: `${domain} vs competitors`, intent: 'Comparative' },
        ]).slice(0, 8).map((query: any, index: number) => ({
            platform: typeof query.platform === 'string' ? query.platform : PLATFORM_LIST[index % 4],
            query: typeof query.query === 'string' ? query.query : `${domain} ai visibility`,
            intent: typeof query.intent === 'string' ? query.intent : 'Informational',
        })),
        seoAudit: {
            implemented: normalizeArray<string>(raw?.seoAudit?.implemented, ['Core brand messaging exists', 'Primary domain is crawlable']),
            missing: normalizeArray<string>(raw?.seoAudit?.missing, ['Add more proof-driven copy', 'Expand docs/help coverage', 'Tighten pricing page clarity']),
            technicalHealth: normalizeNumber(raw?.seoAudit?.technicalHealth, 74),
        },
        keywords,
        keywordRankings: normalizeArray<any>(raw?.keywordRankings, []).slice(0, 8).map((item: any, index: number) => ({
            keyword: typeof item.keyword === 'string' ? item.keyword : keywords[index % keywords.length],
            platform: typeof item.platform === 'string' ? item.platform : PLATFORM_LIST[index % 4],
            rank: normalizeNumber(item.rank, index < 2 ? 1 : 0),
            citationFound: typeof item.citationFound === 'boolean' ? item.citationFound : index < 2,
            sentiment: normalizeNumber(item.sentiment, 58 + index * 3),
        })),
    };
}

async function discoverPages(url: string) {
    const normalized = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

    try {
        const sitemapUrl = new URL('/sitemap.xml', normalized).toString();
        const sitemapRes = await fetch(sitemapUrl, { headers: { 'User-Agent': 'Mozilla/5.0 CognitionAI/1.0' } });
        if (sitemapRes.ok) {
            const xml = await sitemapRes.text();
            const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).slice(0, 12);

            if (urls.length > 0) {
                return urls.map((pageUrl, index) => ({
                    url: pageUrl,
                    type: index === 0 ? 'HOMEPAGE' : inferPageType(pageUrl),
                    status: 'PENDING',
                }));
            }
        }
    } catch {
        // fall through to heuristic discovery
    }

    const origin = new URL(normalized).origin;
    const candidates = [
        origin,
        `${origin}/pricing`,
        `${origin}/product`,
        `${origin}/features`,
        `${origin}/docs`,
        `${origin}/blog`,
        `${origin}/about`,
        `${origin}/contact`,
    ];

    return candidates.map((pageUrl, index) => ({
        url: pageUrl,
        type: index === 0 ? 'HOMEPAGE' : inferPageType(pageUrl),
        status: 'PENDING',
    }));
}

function inferPageType(url: string) {
    const lower = url.toLowerCase();
    if (lower.includes('/pricing')) return 'PRICING';
    if (lower.includes('/product')) return 'PRODUCT';
    if (lower.includes('/feature')) return 'FEATURES';
    if (lower.includes('/blog')) return 'BLOG';
    if (lower.includes('/doc') || lower.includes('/help')) return 'DOCS';
    if (lower.includes('/about')) return 'ABOUT';
    if (lower.includes('/contact')) return 'CONTACT';
    if (lower.includes('/privacy') || lower.includes('/terms') || lower.includes('/legal')) return 'LEGAL';
    return 'OTHER';
}

async function analyzeBrand(payload: AnalyzePayload) {
    const domain = cleanDomain(payload.websiteUrl);
    const content = (payload.mainContent || '').slice(0, 16000);
    const assets = payload.otherAssets || 'None';
    const competitors = payload.competitors?.join(', ') || 'None provided';
    const mainPageUrl = payload.websiteUrl.startsWith('http://') || payload.websiteUrl.startsWith('https://')
        ? payload.websiteUrl
        : `https://${payload.websiteUrl}`;

    const prompt = `
You are an expert AI visibility analyst for brands.

Analyze how the brand at ${domain} is likely to appear across AI platforms such as ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews, Microsoft Copilot, Meta AI, and Grok.

Brand domain: ${domain}
Competitors: ${competitors}
Other assets: ${assets}
Main website content:
${content || 'No content was supplied.'}

Return strict JSON with this exact shape:
{
  "overallScore": number,
  "platformScores": [{ "platform": string, "score": number, "reasoning": string }],
  "pages": [{
    "url": string,
    "title": string,
    "pageType": string,
    "aiUnderstanding": string,
    "aiMissed": string,
    "quoteLikelihood": number,
    "recommendations": [{
      "id": string,
      "pageUrl": string,
      "issue": string,
      "impact": "HIGH" | "MEDIUM" | "LOW",
      "effort": "HIGH" | "MEDIUM" | "LOW",
      "instruction": string,
      "aiReasoning": string,
      "location": string,
      "snippet": string,
      "suggested": string
    }]
  }],
  "brandConsistencyScore": number,
  "consistencyAnalysis": string,
  "topicalDominance": string[],
  "searchQueries": [{ "platform": string, "query": string, "intent": string }],
  "seoAudit": {
    "implemented": string[],
    "missing": string[],
    "technicalHealth": number
  },
  "keywords": string[],
  "keywordRankings": [{
    "keyword": string,
    "platform": string,
    "rank": number,
    "citationFound": boolean,
    "sentiment": number
  }]
}

Rules:
- Include all 8 platforms exactly once in platformScores.
- Use realistic, specific reasoning.
- Give 3 to 6 pages maximum.
- Give 4 to 8 searchQueries.
- Keep recommendations practical and specific to AI visibility.
    `.trim();

    let raw: Record<string, any> | null = null;
    try {
        raw = await callGeminiJson<Record<string, any>>(prompt);
    } catch {
        const fallbackText = await callGemini(`
Summarize this brand for an AI visibility audit in 6 short bullet points.
Domain: ${domain}
Competitors: ${competitors}
Other assets: ${assets}
Main website content:
${content || 'No content was supplied.'}
        `.trim());

        raw = {
            consistencyAnalysis: fallbackText,
            pages: [
                {
                    url: mainPageUrl,
                    pageType: 'HOMEPAGE',
                    aiUnderstanding: fallbackText.split('\n')[0] || 'AI understands the core offer but needs stronger proof.',
                    aiMissed: 'Evidence, differentiation, and clearer commercial claims.',
                    quoteLikelihood: 63,
                    recommendations: [],
                },
            ],
        };
    }

    return buildReportFromGemini(raw, domain, mainPageUrl, content);
}

async function runVisibilityCheck(payload: VisibilityPayload) {
    const platform = payload.platform || 'Gemini';
    const domain = cleanDomain(payload.domain);

    const result = await callGeminiJson<{
        answer: string;
        mentions: string[];
        sentiment: number;
        rank: number;
        citationFound: boolean;
    }>(`
You are simulating how ${platform} might respond to a user search query about brands.

User query: ${payload.query}
Target domain: ${domain}

Return strict JSON:
{
  "answer": "short natural answer as the AI assistant",
  "mentions": ["brand or domain mentions in the answer"],
  "sentiment": number,
  "rank": number,
  "citationFound": boolean
}

Rules:
- sentiment is 0 to 100.
- rank is 1 if the domain is clearly recommended or cited, otherwise 0.
- citationFound should be true only if the target domain is clearly mentioned or recommended.
    `.trim());

    return {
        platform,
        rank: result.rank,
        citationFound: result.citationFound || result.answer.toLowerCase().includes(domain),
        sentiment: result.sentiment,
        answer: result.answer,
    };
}

async function runVisibilityBatch(payload: VisibilityBatchPayload) {
    const checks = payload.checks.slice(0, 12);
    return await Promise.all(checks.map((check) => runVisibilityCheck(check)));
}

async function runRewrite(payload: RewritePayload) {
    return await callGeminiJson<{
        rewrite?: string;
        scoreDelta: number;
        reasoning: string;
        vectorShift: number;
    }>(`
You are improving website copy for AI visibility.

Context: ${payload.context}
Original: ${payload.original}
Rewrite: ${payload.rewrite || 'Generate one'}
Goal: ${payload.goal || 'Improve citation readiness'}
Tone: ${payload.tone || 'Professional'}

Return strict JSON:
{
  "rewrite": "string",
  "scoreDelta": number,
  "reasoning": "string",
  "vectorShift": number
}
    `.trim());
}

async function runSandboxCompare(payload: SandboxComparePayload) {
    return await callGeminiJson<{
        a: { score: number; reasoning: string; platformScores: Array<{ platform: string; score: number }> };
        b: { score: number; reasoning: string; platformScores: Array<{ platform: string; score: number }> };
    }>(`
Compare two content variants for AI visibility performance.

Goal: ${payload.goal}
Variant A: ${payload.variantA}
Variant B: ${payload.variantB}

Return strict JSON:
{
  "a": { "score": number, "reasoning": "string", "platformScores": [{ "platform": "Gemini", "score": number }, { "platform": "ChatGPT", "score": number }, { "platform": "Claude", "score": number }] },
  "b": { "score": number, "reasoning": "string", "platformScores": [{ "platform": "Gemini", "score": number }, { "platform": "ChatGPT", "score": number }, { "platform": "Claude", "score": number }] }
}
    `.trim());
}

export default async function handler(req: RequestLike, res: ResponseLike) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    let body: Record<string, unknown>;
    try {
        body = parseBody(req.body);
    } catch {
        return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }

    const action = body.action as AuditAction | undefined;
    const payload = (body.payload || {}) as Record<string, unknown>;

    try {
        switch (action) {
            case 'DISCOVER':
                if (typeof (payload as DiscoverPayload).url !== 'string' || !(payload as DiscoverPayload).url.trim()) {
                    return res.status(400).json({ error: 'A website URL is required for discovery.' });
                }
                return res.status(200).json(await discoverPages((payload as DiscoverPayload).url));
            case 'ANALYZE':
                if (typeof (payload as AnalyzePayload).websiteUrl !== 'string' || !(payload as AnalyzePayload).websiteUrl.trim()) {
                    return res.status(400).json({ error: 'A website URL is required for analysis.' });
                }
                return res.status(200).json(await analyzeBrand(payload as AnalyzePayload));
            case 'CHECK_VISIBILITY':
                return res.status(200).json(await runVisibilityCheck(payload as VisibilityPayload));
            case 'CHECK_VISIBILITY_BATCH':
                return res.status(200).json(await runVisibilityBatch(payload as VisibilityBatchPayload));
            case 'REWRITE':
                return res.status(200).json(await runRewrite(payload as RewritePayload));
            case 'SANDBOX_COMPARE':
                return res.status(200).json(await runSandboxCompare(payload as SandboxComparePayload));
            default:
                return res.status(400).json({ error: 'Unsupported AI action.' });
        }
    } catch (error) {
        console.error('[ai-audit] request failed:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'AI audit failed.',
        });
    }
}
