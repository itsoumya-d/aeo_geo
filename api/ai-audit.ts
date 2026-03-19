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
    const model = process.env.GEMINI_CHAT_MODEL?.trim() || 'gemini-1.5-flash';

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

async function callGeminiJson<T>(prompt: string): Promise<T> {
    const text = await callGemini(prompt, 'application/json');
    if (!text) {
        throw new Error('Gemini returned an empty response.');
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as T;
    }
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

    const report = await callGeminiJson<any>(prompt);
    report.platformScores = PLATFORM_LIST.map((platform) => {
        const existing = Array.isArray(report.platformScores)
            ? report.platformScores.find((item: { platform: string }) => item.platform === platform)
            : null;
        return existing || {
            platform,
            score: 55,
            reasoning: `${platform} has partial confidence but limited supporting proof on key commercial pages.`,
        };
    });

    return report;
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
