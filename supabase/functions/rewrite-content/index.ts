// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { originalText, instruction, targetPlatform = 'Generic' } = await req.json();

        if (!originalText || !instruction) {
            throw new Error("Missing text or instruction");
        }

        const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || "");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

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

        return new Response(JSON.stringify({ optimizedText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
