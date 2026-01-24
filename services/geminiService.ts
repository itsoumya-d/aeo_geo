import { Asset, Report, AssetType, DiscoveredPage } from "../types";
import { ActionType, SandboxCompareResult } from "../supabase/functions/_shared/types";
import { supabase } from "./supabase";


/**
 * Invoke the secure Edge Function for AI operations with rate limiting.
 */
async function invokeAI<T>(action: ActionType, payload: Record<string, unknown>): Promise<T> {
  // Map action to rate limit endpoint
  const endpointMap: Record<string, string> = {
    'DISCOVER': 'discover',
    'ANALYZE': 'analyze',
    'REWRITE': 'rewrite',
    'CHECK_VISIBILITY': 'visibility',
    'SANDBOX_COMPARE': 'rewrite',
  };

  const endpoint = endpointMap[action] || 'default';



  const { data, error } = await supabase.functions.invoke('analyze-content', {
    body: { action, payload }
  });

  if (error) {
    console.error(`AI Service Error (${action}):`, error);
    // Handle Supabase Function Errors (including our manual 429)
    if (error.message?.includes("Rate limit exceeded") || error.context?.status === 429) {
      throw new Error("You're moving too fast! Please wait a moment before trying again.");
    }
    throw new Error(error.message || "AI Service Unavailable");
  }

  return data as T;
}

/**
 * Step 1: Discovery Phase
 */
import { discoverLinks } from "./crawlService";

/**
 * Step 1: Discovery Phase
 */
export const discoverSiteStructure = async (url: string): Promise<DiscoveredPage[]> => {
  try {
    // Use Firecrawl to map the site
    const links = await discoverLinks(url);

    // Convert links to DiscoveredPage objects
    // Heuristic: Check URL patterns to guess type
    return links.map(link => {
      let type: DiscoveredPage['type'] = 'OTHER';
      const lower = link.toLowerCase();
      if (link === url || link === url + '/') type = 'HOMEPAGE';
      else if (lower.includes('about')) type = 'ABOUT';
      else if (lower.includes('pricing')) type = 'PRICING';
      else if (lower.includes('blog') || lower.includes('news')) type = 'BLOG';
      else if (lower.includes('product') || lower.includes('feature')) type = 'PRODUCT';
      else if (lower.includes('contact')) type = 'CONTACT';

      return {
        url: link,
        type,
        status: 'PENDING'
      };
    });
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
  llmProvider: 'gemini' | 'claude' | 'openai' = 'gemini'
): Promise<Report> => {
  const website = assets.find(a => a.type === AssetType.WEBSITE)?.url || "Unknown Website";

  // Prepare payload
  const mainPageUrl = discoveredPages[0]?.url;
  const mainPageMarkdown = cachedContent && mainPageUrl ? cachedContent[mainPageUrl] : "No content crawled.";
  const otherAssets = assets.filter(a => a.type !== AssetType.WEBSITE).map(a => `${a.type}: ${a.url}`).join(", ");

  try {
    const report = await invokeAI<Report>('ANALYZE', {
      websiteUrl: website,
      otherAssets,
      mainContent: mainPageMarkdown,
      competitors,
      llmProvider
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
export const checkVisibility = async (query: string, domain: string) => {
  try {
    const result = await invokeAI<{
      platform: string,
      rank: number,
      citationFound: boolean,
      sentiment: number,
      answer: string
    }>('CHECK_VISIBILITY', { query, domain });
    return result;
  } catch (error) {
    console.error("Visibility check failed", error);
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


