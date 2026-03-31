// @ts-nocheck
// Supabase Edge Function: analyze-social
// Crawls public social media profiles and scores brand consistency vs website content.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { withRetry } from "../_shared/retry.ts";

declare const Deno: any;

const GEMINI_FLASH = "gemini-2.5-flash";

interface SocialUrls {
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
}

interface SocialPlatformResult {
    platform: string;
    url: string;
    present: boolean;
    activityScore: number;
    brandConsistency: number;
    bio?: string;
    issues?: string[];
}

interface SocialAnalysis {
    overallPresenceScore: number;
    activityScore: number;
    brandConsistencyScore: number;
    platforms: SocialPlatformResult[];
    platformCoverage: number;
    keyMismatches: string[];
    recommendations: string[];
}

async function fetchPublicProfile(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CognitionBot/1.0; +https://cognition.ai/bot)',
                'Accept': 'text/html,application/xhtml+xml'
            },
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) return '';
        const html = await response.text();
        // Extract readable text — strip tags, limit to 2000 chars
        const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 2000);
        return text;
    } catch {
        return '';
    }
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

serve(async (req: Request): Promise<Response> => {
    const corsHeaders = buildCorsHeaders(req.headers.get('origin'));
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { websiteUrl, websiteContent, socialUrls } = await req.json() as {
            websiteUrl: string;
            websiteContent: string;
            socialUrls: SocialUrls;
        };

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

        // Crawl each provided social profile in parallel
        const profileFetches = Object.entries(socialUrls)
            .filter(([, url]) => url)
            .map(async ([platform, url]) => ({
                platform,
                url: url as string,
                content: await fetchPublicProfile(url as string)
            }));

        const profiles = await Promise.all(profileFetches);

        // Build analysis prompt
        const PLATFORM_NAMES: Record<string, string> = {
            twitter: 'Twitter/X',
            linkedin: 'LinkedIn',
            youtube: 'YouTube',
            instagram: 'Instagram',
            facebook: 'Facebook'
        };

        const profilesSection = profiles.map(p =>
            `=== ${PLATFORM_NAMES[p.platform] || p.platform} (${p.url}) ===\n${p.content || 'Could not fetch profile (may require auth)'}`
        ).join('\n\n');

        const prompt = `You are a brand consistency analyst. Analyze these social media profiles against the brand's website content.

WEBSITE: ${websiteUrl}
WEBSITE CONTENT (excerpt): ${(websiteContent || '').slice(0, 3000)}

SOCIAL PROFILES:
${profilesSection}

MAJOR PLATFORMS TO CHECK: Twitter/X, LinkedIn, YouTube, Instagram, Facebook
Active platforms provided: ${profiles.map(p => PLATFORM_NAMES[p.platform] || p.platform).join(', ') || 'none'}

Return JSON:
{
  "overallPresenceScore": number (0-100, weighted: activity 40%, consistency 40%, coverage 20%),
  "activityScore": number (0-100, based on profile completeness and recent content signals),
  "brandConsistencyScore": number (0-100, how well all profiles align with each other and the website),
  "platformCoverage": number (0-100, % of 5 major platforms active),
  "platforms": [
    {
      "platform": "Twitter/X" | "LinkedIn" | "YouTube" | "Instagram" | "Facebook",
      "url": string (empty string if not provided),
      "present": boolean,
      "activityScore": number (0-100),
      "brandConsistency": number (0-100),
      "bio": string (extracted bio if found, else empty),
      "issues": string[] (specific mismatches like "Bio uses different value prop than website homepage")
    }
  ],
  "keyMismatches": string[] (top 3 most impactful brand consistency issues found),
  "recommendations": string[] (top 3 specific, actionable fixes)
}

Include ALL 5 major platforms in the "platforms" array, setting "present": false for ones not provided.`;

        const raw = await withRetry(() => callGemini(apiKey, prompt));
        let analysis: SocialAnalysis;
        try {
            analysis = JSON.parse(raw);
        } catch {
            const clean = raw.replace(/```json/g, '').replace(/```/g, '');
            analysis = JSON.parse(clean);
        }

        return new Response(JSON.stringify(analysis), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('analyze-social error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
