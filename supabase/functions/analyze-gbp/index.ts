// @ts-nocheck
// Supabase Edge Function: analyze-gbp
// Extracts NAP (Name, Address, Phone) from website content and scores local/GBP optimization.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { withRetry } from "../_shared/retry.ts";

declare const Deno: any;

const GEMINI_FLASH = "gemini-2.5-flash";

interface GBPAnalysis {
    businessName: string;
    address: string;
    phone: string;
    rating: number;
    reviewCount: number;
    hours?: Record<string, string>;
    photosCount: number;
    sentimentSummary: string;
    napConsistencyScore: number;
    overallScore: number;
    issues: string[];
    recommendations: string[];
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
        const { websiteUrl, websiteContent } = await req.json() as {
            websiteUrl: string;
            websiteContent: string;
        };

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

        const prompt = `You are a Local SEO and Google Business Profile (GBP) optimization expert. Analyze this website's content for local presence signals.

WEBSITE URL: ${websiteUrl}
WEBSITE CONTENT (excerpt): ${(websiteContent || '').slice(0, 4000)}

Your task:
1. Extract the business's NAP (Name, Address, Phone) from the content
2. Identify business hours if mentioned
3. Look for review/rating mentions
4. Assess how well this website is optimized for local AI citations and GBP
5. Score NAP consistency and overall local presence quality

Return a JSON object in exactly this format:
{
  "businessName": string (business name found on site, or "" if not found),
  "address": string (full address found, or "" if not found),
  "phone": string (phone number found, or "" if not found),
  "rating": number (rating out of 5 if mentioned anywhere, else 0),
  "reviewCount": number (number of reviews if mentioned, else 0),
  "hours": {
    "Monday": "9:00 AM - 5:00 PM",
    "Tuesday": "9:00 AM - 5:00 PM"
  } (only include days explicitly found; omit this field entirely if no hours found),
  "photosCount": number (estimated visual content richness 0-50 based on image references in content),
  "sentimentSummary": string (1-2 sentence summary of how the business presents itself and likely customer perception),
  "napConsistencyScore": number (0-100: how complete and consistent the NAP data is on this website),
  "overallScore": number (0-100: overall local presence optimization score, weighted: NAP completeness 30%, hours present 20%, review signals 20%, local keywords 15%, schema signals 15%),
  "issues": string[] (up to 5 specific local SEO issues found, e.g. "Phone number missing from homepage", "No business hours found", "Address not in schema markup"),
  "recommendations": string[] (up to 5 specific, actionable improvements ordered by impact)
}

Be specific and accurate. Only report data that you can actually find in the content.`;

        const raw = await withRetry(() => callGemini(apiKey, prompt));
        let analysis: GBPAnalysis;
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
        console.error('analyze-gbp error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
