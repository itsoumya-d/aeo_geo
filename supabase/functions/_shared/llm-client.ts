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

// Default model configurations
const DEFAULT_MODELS: Record<LLMProvider, { chat: string; embedding: string }> = {
    gemini: {
        chat: 'gemini-2.0-flash-exp',
        embedding: 'text-embedding-004'
    },
    claude: {
        chat: 'claude-3-5-sonnet-20241022',
        embedding: 'voyage-3'  // Voyage AI for Claude embeddings
    },
    openai: {
        chat: 'gpt-4o',
        embedding: 'text-embedding-3-small'
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

/**
 * Generate text using Claude
 */
async function generateWithClaude(
    prompt: string,
    systemPrompt?: string,
    config?: LLMConfig
): Promise<LLMResponse> {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const model = config?.model || DEFAULT_MODELS.claude.chat;
    const url = 'https://api.anthropic.com/v1/messages';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: config?.maxTokens ?? 4096,
            system: systemPrompt || undefined,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return {
        text,
        usage: {
            promptTokens: data.usage?.input_tokens || 0,
            completionTokens: data.usage?.output_tokens || 0,
            totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
    };
}

/**
 * Generate text using OpenAI
 */
async function generateWithOpenAI(
    prompt: string,
    systemPrompt?: string,
    config?: LLMConfig
): Promise<LLMResponse> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const model = config?.model || DEFAULT_MODELS.openai.chat;
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: config?.temperature ?? 0.7,
            max_tokens: config?.maxTokens ?? 4096
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
        text,
        usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
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

/**
 * Generate embeddings using OpenAI
 */
async function embedWithOpenAI(text: string): Promise<EmbeddingResponse> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const model = DEFAULT_MODELS.openai.embedding;
    const url = 'https://api.openai.com/v1/embeddings';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            input: text
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI Embedding API error: ${error}`);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding || [];

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
     * Generate text completion
     */
    async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
        switch (this.config.provider) {
            case 'gemini':
                return generateWithGemini(prompt, systemPrompt, this.config);
            case 'claude':
                return generateWithClaude(prompt, systemPrompt, this.config);
            case 'openai':
                return generateWithOpenAI(prompt, systemPrompt, this.config);
            default:
                throw new Error(`Unsupported provider: ${this.config.provider}`);
        }
    }

    /**
     * Generate text embedding vector
     */
    async embed(text: string): Promise<EmbeddingResponse> {
        // For embeddings, we default to Gemini or OpenAI (Claude uses Voyage which is separate)
        switch (this.config.provider) {
            case 'gemini':
                return embedWithGemini(text);
            case 'openai':
            case 'claude':  // Claude users can use OpenAI embeddings as fallback
                return embedWithOpenAI(text);
            default:
                throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
        }
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
     * Get available providers
     */
    static getAvailableProviders(): LLMProvider[] {
        const providers: LLMProvider[] = [];

        if (Deno.env.get('GEMINI_API_KEY')) providers.push('gemini');
        if (Deno.env.get('ANTHROPIC_API_KEY')) providers.push('claude');
        if (Deno.env.get('OPENAI_API_KEY')) providers.push('openai');

        return providers;
    }

    /**
     * Create client with automatic provider selection
     */
    static createWithFallback(): LLMClient {
        const available = LLMClient.getAvailableProviders();
        if (available.length === 0) {
            throw new Error('No LLM API keys configured');
        }
        // Prefer Gemini, then Claude, then OpenAI
        const preferredOrder: LLMProvider[] = ['gemini', 'claude', 'openai'];
        const provider = preferredOrder.find(p => available.includes(p)) || available[0];
        return new LLMClient({ provider });
    }
}

export { DEFAULT_MODELS };
