// @ts-nocheck
/**
 * Multi-LLM Provider Abstraction Layer
 * Supports: Google Gemini, Anthropic Claude, OpenAI GPT-4
 */

// Declare Deno for type checking
declare const Deno: any;

// ===== Types =====

export type LLMProvider = 'gemini' | 'claude' | 'openai';

export interface LLMConfig {
    provider: LLMProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LLMResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface EmbeddingResponse {
    embedding: number[];
    dimensions: number;
}

// Default model configurations (Gemini-only)
const DEFAULT_MODELS: Record<LLMProvider, { chat: string; embedding: string }> = {
    gemini: {
        chat: 'gemini-2.5-flash',
        embedding: 'text-embedding-004'
    },
    claude: {
        chat: 'gemini-2.5-flash',  // Redirects to Gemini
        embedding: 'text-embedding-004'
    },
    openai: {
        chat: 'gemini-2.5-flash',  // Redirects to Gemini
        embedding: 'text-embedding-004'
    }
};

// ===== Provider Implementations =====

/**
 * Generate text using Gemini
 */
async function generateWithGemini(
    prompt: string,
    systemPrompt?: string,
    config?: LLMConfig
): Promise<LLMResponse> {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const model = config?.model || DEFAULT_MODELS.gemini.chat;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    if (systemPrompt) {
        contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            generationConfig: {
                temperature: config?.temperature ?? 0.7,
                maxOutputTokens: config?.maxTokens ?? 4096
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
        text,
        usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0
        }
    };
}

// ===== Embedding Implementations =====

/**
 * Generate embeddings using Gemini
 */
async function embedWithGemini(text: string): Promise<EmbeddingResponse> {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const model = DEFAULT_MODELS.gemini.embedding;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: { parts: [{ text }] }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini Embedding API error: ${error}`);
    }

    const data = await response.json();
    const embedding = data.embedding?.values || [];

    return {
        embedding,
        dimensions: embedding.length
    };
}

// ===== Main Export: LLM Client =====

export class LLMClient {
    private config: LLMConfig;

    constructor(config: LLMConfig = { provider: 'gemini' }) {
        this.config = config;
    }

    /**
     * Generate text completion (Gemini only)
     */
    async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
        return generateWithGemini(prompt, systemPrompt, this.config);
    }

    /**
     * Generate text embedding vector (Gemini only)
     */
    async embed(text: string): Promise<EmbeddingResponse> {
        return embedWithGemini(text);
    }

    /**
     * Get the provider name
     */
    get provider(): LLMProvider {
        return this.config.provider;
    }

    /**
     * Get the model being used
     */
    get model(): string {
        return this.config.model || DEFAULT_MODELS[this.config.provider].chat;
    }

    /**
     * Get available providers (always Gemini)
     */
    static getAvailableProviders(): LLMProvider[] {
        return Deno.env.get('GEMINI_API_KEY') ? ['gemini'] : [];
    }

    /**
     * Create client — always uses Gemini
     */
    static createWithFallback(): LLMClient {
        if (!Deno.env.get('GEMINI_API_KEY')) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        return new LLMClient({ provider: 'gemini' });
    }
}

export { DEFAULT_MODELS };
