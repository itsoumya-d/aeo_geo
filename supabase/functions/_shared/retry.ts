
/**
 * Shared utility for exponential backoff retries.
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

        console.warn(`Operation failed, retrying in ${delay}ms... (${retries} retries left). Error: ${error instanceof Error ? error.message : String(error)}`);

        await new Promise(resolve => setTimeout(resolve, delay));

        return withRetry(fn, retries - 1, delay * backoff, backoff);
    }
}

/**
 * Fetch with retry included
 */
export async function fetchWithRetry(
    input: RequestInfo | URL,
    init?: RequestInit,
    retries: number = 3
): Promise<Response> {
    return withRetry(async () => {
        const res = await fetch(input, init);
        // Only retry on 5xx errors or network failures, not 4xx client errors
        if (!res.ok && res.status >= 500) {
            throw new Error(`Request failed with status ${res.status}`);
        }
        return res;
    }, retries);
}
