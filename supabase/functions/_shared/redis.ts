import { Redis } from "https://esm.sh/@upstash/redis@1.25.1";

/**
 * Initialize Redis Client using Environment Variables
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */
export const redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL") || "",
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN") || "",
});

/**
 * Cache TTL Configuration
 */
export const CACHE_TTL = {
    DISCOVERY: 60 * 60 * 24, // 24 Hours
    ANALYSIS: 60 * 60 * 4,   // 4 Hours (High Volatility)
    REWRITE: 60 * 60 * 24 * 7, // 7 Days (Stable)
};

/**
 * Helper to wrap expensive async functions with Redis caching (Cache-Aside)
 */
export async function withCache<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
): Promise<T> {
    if (!redis.url || !redis.token) {
        // Fallback if Redis is not configured
        return await fetchFn();
    }

    try {
        const cached = await redis.get<T>(key);
        if (cached) {
            console.log(`[Cache Hit] ${key}`);
            return cached;
        }
    } catch (err) {
        console.warn(`[Cache Read Error] ${key}:`, err);
    }

    console.log(`[Cache Miss] ${key}`);
    const data = await fetchFn();

    try {
        if (data) {
            await redis.set(key, data, { ex: ttlSeconds });
        }
    } catch (err) {
        console.warn(`[Cache Write Error] ${key}:`, err);
    }

    return data;
}
