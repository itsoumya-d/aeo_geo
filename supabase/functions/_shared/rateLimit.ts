import { Redis } from "https://esm.sh/@upstash/redis@1.25.1";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@0.4.4";

// Define Rate Limit Configurations
export const RATE_LIMITS = {
    ANALYZE: { limit: 5, window: "60 s" },
    REWRITE: { limit: 10, window: "60 s" },
    DISCOVER: { limit: 10, window: "60 s" },
    CHECK_VISIBILITY: { limit: 5, window: "60 s" },
    SANDBOX_COMPARE: { limit: 5, window: "60 s" },
    DEFAULT: { limit: 20, window: "60 s" },
};

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
 * Check Rate Limit for a specific identifier (User ID or IP)
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string,
    action: string
) {
    if (!limiter) return { success: true, limit: 0, remaining: 0, reset: 0 };

    const config = RATE_LIMITS[action as keyof typeof RATE_LIMITS] || RATE_LIMITS.DEFAULT;

    // Create specific limiter for this action's config
    // Note: In a real app with diverse limits, you might instantiate different Ratelimit instances
    // or use a dynamic limiter if supported. For simplicity with @upstash/ratelimit, 
    // we often reuse the redis connection but might need different algorithms.
    // 
    // Optimization: We can create a new Ratelimit instance reusing the redis client for specific config.
    const actionLimiter = new Ratelimit({
        redis: limiter.redis, // Reuse connection
        limiter: Ratelimit.slidingWindow(config.limit, config.window as any),
        prefix: `@upstash/ratelimit:${action}`,
    });

    return await actionLimiter.limit(identifier);
}
