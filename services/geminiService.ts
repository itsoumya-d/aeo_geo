import { Asset, Report, AssetType, DiscoveredPage } from "../types";
import { ActionType, SandboxCompareResult } from "../supabase/functions/_shared/types";

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

async function invokeAI<T>(action: ActionType, payload: Record<string, unknown>): Promise<T> {
  let response: Response | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetchWithTimeout('/api/ai-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
      }, 45000);

      if (!isRetriableStatus(response.status) || attempt === 1) {
        break;
      }
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        throw error;
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1200 * (attempt + 1)));
  }

  if (!response) {
    throw lastError instanceof Error ? lastError : new Error('Audit request failed before the server responded.');
  }

  if (response.ok) {
    return await response.json() as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await response.json() as { error?: string };
    throw new Error(body.error || `Gemini audit request failed for ${action}.`);
  }

  const text = await response.text();
  if (/content warning/i.test(text)) {
    throw new Error('Vercel content warning is blocking the Gemini audit route.');
  }

  throw new Error(text || `Gemini audit request failed for ${action}.`);
}

/**
 * Step 1: Discovery Phase
 */
export const discoverSiteStructure = async (url: string): Promise<DiscoveredPage[]> => {
  try {
    return await invokeAI<DiscoveredPage[]>('DISCOVER', { url });
  } catch (error) {
    console.error("Discovery failed", error);
    // Fallback
    return [
      { url: url, type: 'HOMEPAGE', status: 'PENDING' }
    ];
  }
};

/**
 * Step 2: Deep Analysis (Secure Server-Side)
 */
export const analyzeBrandAssets = async (
  assets: Asset[],
  discoveredPages: DiscoveredPage[],
  cachedContent?: Record<string, string>,
  competitors?: string[],
): Promise<Report> => {
  const website = assets.find(a => a.type === AssetType.WEBSITE)?.url || "Unknown Website";

  // Prepare payload
  const mainPageUrl = discoveredPages[0]?.url;
  const mainPageMarkdown = cachedContent && mainPageUrl ? cachedContent[mainPageUrl] : "No content crawled.";
  const otherAssets = assets.filter(a => a.type !== AssetType.WEBSITE).map(a => `${a.type}: ${a.url}`).join(", ");
  const pageContents = discoveredPages
    .map((page) => ({
      url: page.url,
      pageType: page.type,
      content: cachedContent?.[page.url] || '',
    }))
    .filter((page) => page.content.trim().length > 0)
    .slice(0, 8);

  try {
    const report = await invokeAI<Report>('ANALYZE', {
      websiteUrl: website,
      otherAssets,
      mainContent: mainPageMarkdown,
      pageContents,
      competitors
    });
    return report;
  } catch (error) {
    console.error("Analysis failed", error);
    throw error;
  }
};

/**
 * Step 3: Rewrite Simulation (Vector Math on Server)
 */
export const simulateRewriteAnalysis = async (
  original: string,
  rewrite: string,
  context: string,
  goal?: 'SNIPPET' | 'AUTHORITY' | 'CLARITY' | 'CONVERSION',
  tone?: 'PROFESSIONAL' | 'AUTHORITATIVE' | 'CONVERSATIONAL' | 'TECHNICAL'
): Promise<{ rewrite?: string, scoreDelta: number, reasoning: string, vectorShift: number }> => {
  try {
    // Pass 'rewrite' if provided to analyze specific text, otherwise the backend generates one.
    const result = await invokeAI<{ rewrite?: string, scoreDelta: number, reasoning: string, vectorShift: number }>('REWRITE', { original, context, rewrite, goal, tone });
    return result;
  } catch (error) {
    console.error("Rewrite simulation failed", error);
    return {
      scoreDelta: 0,
      vectorShift: 0,
      reasoning: "Analysis failed. Please try again."
    };
  }
}

/**
 * Phase 2: Real-time Visibility Check
 */
export const checkVisibility = async (query: string, domain: string, platform?: string) => {
  try {
    const result = await invokeAI<{
      platform: string,
      rank: number,
      citationFound: boolean,
      sentiment: number,
      answer: string
    }>('CHECK_VISIBILITY', { query, domain, platform });
    return result;
  } catch (error) {
    console.error("Visibility check failed", error);
    return null;
  }
};

export interface VisibilityCheckInput {
  query: string;
  domain: string;
  platform: string;
}

export const checkVisibilityBatch = async (checks: VisibilityCheckInput[]) => {
  try {
    return await invokeAI<Array<{
      platform: string,
      rank: number,
      citationFound: boolean,
      sentiment: number,
      answer?: string,
      error?: string
    }>>('CHECK_VISIBILITY_BATCH', { checks });
  } catch (error) {
    console.error("Batch visibility check failed", error);
    return null;
  }
};

/**
 * Phase 7: Sandbox A/B Simulation
 */
export const simulateSandboxCompare = async (goal: string, variantA: string, variantB: string): Promise<SandboxCompareResult | null> => {
  try {
    return await invokeAI<SandboxCompareResult>('SANDBOX_COMPARE', { goal, variantA, variantB });
  } catch (error) {
    console.error("Sandbox simulation failed", error);
    return null;
  }
};
