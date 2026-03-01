import { Redis } from "https://esm.sh/@upstash/redis@1.25.1";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@0.4.4";

// Define Rate Limit Configurations
export const RATE_LIMITS = {
    ANALYZE: { limit: 5, window: "60 s", windowMs: 60000 },
    REWRITE: { limit: 10, window: "60 s", windowMs: 60000 },
    DISCOVER: { limit: 10, window: "60 s", windowMs: 60000 },
    CHECK_VISIBILITY: { limit: 5, window: "60 s", windowMs: 60000 },
    CHECK_VISIBILITY_BATCH: { limit: 3, window: "60 s", windowMs: 60000 },
    SANDBOX_COMPARE: { limit: 5, window: "60 s", windowMs: 60000 },
    DEFAULT: { limit: 20, window: "60 s", windowMs: 60000 },
};

// In-memory rate limit store (fallback when Redis unavailable)
// Maps identifier -> { count: number, resetAt: number }
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of inMemoryStore.entries()) {
        if (value.resetAt < now) {
            inMemoryStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Initializes the Rate Limiter
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Edge Config
 */
export function initRateLimiter() {
    const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

    if (!url || !token) {
        console.warn("Missing Upstash Redis credentials. Rate limiting disabled (Permissive Mode).");
        return null; // Return null to indicate fallback/disabled
    }

    const redis = new Redis({ url, token });

    // Create a MultiRegionRatelimit if needed, or standard Ratelimit
    return new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(10, "10 s"), // Default fallback, overridden per call
        analytics: true,
        prefix: "@upstash/ratelimit",
    });
}

/**
 * In-memory rate limit check (fallback when Redis unavailable)
 * Uses conservative limits to prevent abuse
 */
function checkInMemoryRateLimit(identifier: string, action: string) {
    const config = RATE_LIMITS[action as keyof typeof RATE_LIMITS] || RATE_LIMITS.DEFAULT;
    const key = `${action}:${identifier}`;
    const now = Date.now();

    const entry = inMemoryStore.get(key);

    // If no entry or window expired, create new window
    if (!entry || entry.resetAt < now) {
        inMemoryStore.set(key, {
            count: 1,
            resetAt: now + config.windowMs,
        });

        return {
            success: true,
            limit: config.limit,
            remaining: config.limit - 1,
            reset: now + config.windowMs,
        };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.limit) {
        return {
            success: false,
            limit: config.limit,
            remaining: 0,
            reset: entry.resetAt,
        };
    }

    return {
        success: true,
        limit: config.limit,
        remaining: config.limit - entry.count,
        reset: entry.resetAt,
    };
}

/**
 * Check Rate Limit for a specific identifier (User ID or IP)
 * Uses Redis when available, falls back to in-memory store
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string,
    action: string
) {
    // Fallback to in-memory rate limiting when Redis unavailable
    if (!limiter) {
        console.warn(`[RateLimit] Using in-memory fallback for ${action} (${identifier})`);
        return checkInMemoryRateLimit(identifier, action);
    }

    const config = RATE_LIMITS[action as keyof typeof RATE_LIMITS] || RATE_LIMITS.DEFAULT;

    try {
        // Create specific limiter for this action's config
        const actionLimiter = new Ratelimit({
            redis: limiter.redis, // Reuse connection
            limiter: Ratelimit.slidingWindow(config.limit, config.window as any),
            prefix: `@upstash/ratelimit:${action}`,
        });

        return await actionLimiter.limit(identifier);
    } catch (error) {
        // If Redis fails during runtime, fall back to in-memory
        console.error(`[RateLimit] Redis error, falling back to in-memory: ${error}`);
        return checkInMemoryRateLimit(identifier, action);
    }
}
