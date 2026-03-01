/**
 * Shared utility for exponential backoff retries with jitter.
 * Useful for flaky external APIs (Firecrawl, Gemini, Perplexity).
 */

export async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000,
    backoff: number = 2
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;

        // Add up to 10% jitter to spread out stampeding retries
        const jitter = Math.random() * delay * 0.1;
        const actualDelay = delay + jitter;

        console.warn(`Operation failed, retrying in ${Math.round(actualDelay)}ms… (${retries} retries left). Error: ${error instanceof Error ? error.message : String(error)}`);

        await new Promise(resolve => setTimeout(resolve, actualDelay));

        return withRetry(fn, retries - 1, delay * backoff, backoff);
    }
}

/**
 * Fetch with retry included — only retries on 5xx / network errors.
 */
export async function fetchWithRetry(
    input: RequestInfo | URL,
    init?: RequestInit,
    retries: number = 3
): Promise<Response> {
    return withRetry(async () => {
        const res = await fetch(input, init);
        // Only retry on server-side errors, not 4xx client errors
        if (!res.ok && res.status >= 500) {
            throw new Error(`Request failed with status ${res.status}`);
        }
        return res;
    }, retries);
}

/**
 * Build a standard RFC 7807 "Problem Details" JSON error response.
 */
export function problemResponse(
    status: number,
    title: string,
    detail?: string,
    corsHeaders?: Record<string, string>
): Response {
    const body: Record<string, unknown> = {
        type: `https://cognition-ai.com/errors/${title.toLowerCase().replace(/\s+/g, '-')}`,
        title,
        status,
        ...(detail ? { detail } : {}),
    };

    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/problem+json',
            ...(corsHeaders ?? {}),
        },
    });
}
