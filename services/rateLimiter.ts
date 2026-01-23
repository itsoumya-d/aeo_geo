/**
 * Rate Limiter Service
 * Provides client-side rate limiting to prevent API abuse and respect server limits
 */

interface RateLimitConfig {
    maxRequests: number;       // Maximum requests allowed
    windowMs: number;          // Time window in milliseconds
    queueEnabled?: boolean;    // Whether to queue exceeded requests
    maxQueueSize?: number;     // Maximum queue size before rejecting
}

interface RateLimitState {
    requests: number[];        // Timestamps of recent requests
    queue: Array<{
        resolve: () => void;
        reject: (err: Error) => void;
        timestamp: number;
    }>;
}

// Default configurations for different API endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // Gemini API - be conservative
    'analyze': { maxRequests: 5, windowMs: 60000, queueEnabled: true, maxQueueSize: 10 },
    'rewrite': { maxRequests: 10, windowMs: 60000, queueEnabled: true, maxQueueSize: 20 },
    'discover': { maxRequests: 10, windowMs: 60000, queueEnabled: false },

    // Perplexity API
    'visibility': { maxRequests: 5, windowMs: 60000, queueEnabled: true, maxQueueSize: 5 },

    // General API calls
    'default': { maxRequests: 30, windowMs: 60000, queueEnabled: false },
};

class RateLimiter {
    private states: Map<string, RateLimitState> = new Map();
    private configs: Map<string, RateLimitConfig> = new Map();

    constructor() {
        // Initialize with default configs
        Object.entries(RATE_LIMITS).forEach(([key, config]) => {
            this.configs.set(key, config);
            this.states.set(key, { requests: [], queue: [] });
        });
    }

    /**
     * Check if a request can proceed, optionally queuing if not
     */
    async acquire(endpoint: string = 'default'): Promise<void> {
        const config = this.configs.get(endpoint) || RATE_LIMITS.default;
        let state = this.states.get(endpoint);

        if (!state) {
            state = { requests: [], queue: [] };
            this.states.set(endpoint, state);
        }

        // Clean up old requests outside the window
        const now = Date.now();
        state.requests = state.requests.filter(ts => now - ts < config.windowMs);

        // Check if we can proceed
        if (state.requests.length < config.maxRequests) {
            state.requests.push(now);
            return;
        }

        // Rate limit exceeded
        if (!config.queueEnabled) {
            throw new RateLimitError(
                `Rate limit exceeded for ${endpoint}. Max ${config.maxRequests} requests per ${config.windowMs / 1000}s.`,
                this.getRetryAfter(state.requests[0], config.windowMs)
            );
        }

        // Check queue size
        if (config.maxQueueSize && state.queue.length >= config.maxQueueSize) {
            throw new RateLimitError(
                `Request queue full for ${endpoint}. Please try again later.`,
                this.getRetryAfter(state.requests[0], config.windowMs)
            );
        }

        // Add to queue and wait
        return new Promise((resolve, reject) => {
            state!.queue.push({ resolve, reject, timestamp: now });
            this.processQueue(endpoint);
        });
    }

    /**
     * Process queued requests as slots become available
     */
    private processQueue(endpoint: string): void {
        const config = this.configs.get(endpoint) || RATE_LIMITS.default;
        const state = this.states.get(endpoint);

        if (!state || state.queue.length === 0) return;

        const now = Date.now();
        state.requests = state.requests.filter(ts => now - ts < config.windowMs);

        // Process as many queued requests as we have slots
        while (state.queue.length > 0 && state.requests.length < config.maxRequests) {
            const queued = state.queue.shift();
            if (queued) {
                state.requests.push(now);
                queued.resolve();
            }
        }

        // Schedule next check if queue still has items
        if (state.queue.length > 0) {
            const oldestRequest = state.requests[0];
            const waitTime = (oldestRequest + config.windowMs) - now + 100; // +100ms buffer
            setTimeout(() => this.processQueue(endpoint), Math.max(waitTime, 1000));
        }
    }

    /**
     * Calculate retry-after time in seconds
     */
    private getRetryAfter(oldestTimestamp: number, windowMs: number): number {
        const now = Date.now();
        const retryAfterMs = (oldestTimestamp + windowMs) - now;
        return Math.ceil(Math.max(retryAfterMs, 1000) / 1000);
    }

    /**
     * Get current rate limit status for an endpoint
     */
    getStatus(endpoint: string = 'default'): {
        remaining: number;
        limit: number;
        resetInMs: number;
        queueSize: number;
    } {
        const config = this.configs.get(endpoint) || RATE_LIMITS.default;
        const state = this.states.get(endpoint);

        if (!state) {
            return { remaining: config.maxRequests, limit: config.maxRequests, resetInMs: 0, queueSize: 0 };
        }

        const now = Date.now();
        const validRequests = state.requests.filter(ts => now - ts < config.windowMs);
        const oldestRequest = validRequests[0] || now;
        const resetInMs = Math.max(0, (oldestRequest + config.windowMs) - now);

        return {
            remaining: Math.max(0, config.maxRequests - validRequests.length),
            limit: config.maxRequests,
            resetInMs,
            queueSize: state.queue.length
        };
    }

    /**
     * Clear rate limit state for an endpoint (useful for testing)
     */
    reset(endpoint?: string): void {
        if (endpoint) {
            this.states.set(endpoint, { requests: [], queue: [] });
        } else {
            this.states.clear();
            Object.keys(RATE_LIMITS).forEach(key => {
                this.states.set(key, { requests: [], queue: [] });
            });
        }
    }

    /**
     * Update rate limit config dynamically (e.g., from server headers)
     */
    updateConfig(endpoint: string, config: Partial<RateLimitConfig>): void {
        const existing = this.configs.get(endpoint) || RATE_LIMITS.default;
        this.configs.set(endpoint, { ...existing, ...config });
    }
}

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
    public readonly retryAfter: number;
    public readonly isRateLimit = true;

    constructor(message: string, retryAfter: number) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * HOC to wrap async functions with rate limiting
 */
export function withRateLimit<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    endpoint: string = 'default'
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs) => {
        await rateLimiter.acquire(endpoint);
        return fn(...args);
    };
}

/**
 * React hook for rate limit status
 */
export function useRateLimitStatus(endpoint: string = 'default') {
    const getStatus = () => rateLimiter.getStatus(endpoint);
    return { getStatus };
}

/**
 * Parse rate limit headers from API response
 */
export function parseRateLimitHeaders(headers: Headers): {
    limit?: number;
    remaining?: number;
    resetAt?: Date;
} {
    return {
        limit: headers.get('X-RateLimit-Limit')
            ? parseInt(headers.get('X-RateLimit-Limit')!, 10)
            : undefined,
        remaining: headers.get('X-RateLimit-Remaining')
            ? parseInt(headers.get('X-RateLimit-Remaining')!, 10)
            : undefined,
        resetAt: headers.get('X-RateLimit-Reset')
            ? new Date(parseInt(headers.get('X-RateLimit-Reset')!, 10) * 1000)
            : undefined,
    };
}

export default rateLimiter;
