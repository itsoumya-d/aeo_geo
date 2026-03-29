// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { originalText, instruction, targetPlatform = 'Generic' } = await req.json();

        if (!originalText || !instruction) {
            throw new Error("Missing text or instruction");
        }

        const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || "");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an expert AEO (Answer Engine Optimization) copywriter.
            Your goal is to rewrite the provided text to better align with AI search algorithms (like Gemini, Perplexity, and ChatGPT).
            
            Original Content:
            """
            ${originalText}
            """
            
            Optimization Requirement:
            ${instruction}
            
            Target Platform Focus: ${targetPlatform}
            
            Guidelines:
            1. Maintain the brand voice and factual accuracy.
            2. Optimize for "Direct Answerability" - lead with clear, entity-rich answers.
            3. Use structured formatting (bullet points, clear headings) if it helps clarity.
            4. Keep the length similar to the original unless instructed otherwise.
            
            Return ONLY the optimized text. No preamble, no explanation.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const optimizedText = response.text();

        return new Response(JSON.stringify({
            success: true,
            optimizedText,
            data: { optimizedText },
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 200,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({
            success: false,
            error: message,
            details: {
                code: "REWRITE_CONTENT_FAILED",
                message,
                requestId,
            },
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
            status: 400,
        });
    }
});
