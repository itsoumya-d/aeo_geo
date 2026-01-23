/**
 * Retry helper with exponential backoff
 * Handles transient failures in API calls
 */

export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};

/**
 * Wraps an async function with exponential backoff retry logic
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options };

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on client errors (4xx) except rate limiting
            if (isNonRetryableError(lastError)) {
                throw lastError;
            }

            // If this was the last attempt, throw the error
            if (attempt === maxAttempts) {
                throw lastError;
            }

            // Calculate delay with exponential backoff and jitter
            const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 0.3 * exponentialDelay;
            const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

            // Rate limiting gets a longer delay
            if (isRateLimitError(lastError)) {
                const rateLimitDelay = Math.max(delay, 5000); // At least 5 seconds
                options.onRetry?.(attempt, lastError);
                await sleep(rateLimitDelay);
            } else {
                options.onRetry?.(attempt, lastError);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Check if error is a rate limit (429)
 */
function isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('quota exceeded');
}

/**
 * Check if error should not be retried
 * - Client errors (400, 401, 403, 404) except 429
 * - Invalid API key errors
 */
function isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Rate limit should be retried
    if (isRateLimitError(error)) {
        return false;
    }

    // Auth errors - don't retry
    if (message.includes('401') ||
        message.includes('403') ||
        message.includes('unauthorized') ||
        message.includes('api key') ||
        message.includes('invalid key')) {
        return true;
    }

    // Bad request - don't retry
    if (message.includes('400') || message.includes('bad request')) {
        return true;
    }

    // Not found - don't retry
    if (message.includes('404') || message.includes('not found')) {
        return true;
    }

    return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
    return (...args: TArgs) => withRetry(() => fn(...args), options);
}
