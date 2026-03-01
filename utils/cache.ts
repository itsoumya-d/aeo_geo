/**
 * Lightweight in-memory cache with stale-while-revalidate semantics.
 *
 * - Deduplicates concurrent calls for the same key (request coalescing)
 * - Serves stale data instantly while a background refresh runs
 * - Automatically evicts expired entries to prevent memory leaks
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    /** A revalidation promise in-flight, if any */
    revalidating?: Promise<T>;
}

interface CacheOptions {
    /** How long (ms) data is considered fresh. Default: 30 seconds */
    ttl?: number;
    /** How long (ms) stale data can be served while revalidating. Default: 5 minutes */
    staleWhileRevalidate?: number;
}

const DEFAULT_TTL = 30_000;           // 30 s
const DEFAULT_SWR = 5 * 60_000;       // 5 min

class RequestCache {
    private store = new Map<string, CacheEntry<unknown>>();
    /** In-flight promises for deduplication */
    private inflight = new Map<string, Promise<unknown>>();

    /**
     * Fetch `key` using `fetcher`.
     *
     * Behavior:
     * - If fresh data exists  → return immediately
     * - If stale data exists  → return immediately, trigger background refresh
     * - If no data or expired → await the fetcher (deduplicating concurrent calls)
     */
    async get<T>(
        key: string,
        fetcher: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        const ttl = options.ttl ?? DEFAULT_TTL;
        const swr = options.staleWhileRevalidate ?? DEFAULT_SWR;
        const now = Date.now();
        const entry = this.store.get(key) as CacheEntry<T> | undefined;

        if (entry) {
            const age = now - entry.timestamp;

            // Still fresh — return immediately
            if (age < ttl) {
                return entry.data;
            }

            // Stale but within SWR window — serve stale, revalidate in background
            if (age < ttl + swr) {
                if (!entry.revalidating) {
                    const revalidationPromise = this.fetchAndStore(key, fetcher);
                    (this.store.get(key) as CacheEntry<T>).revalidating = revalidationPromise;
                    // Don't await — let it run in the background
                    revalidationPromise.catch(() => {/* silently ignore bg refresh errors */});
                }
                return entry.data;
            }
        }

        // No usable data — must fetch (deduplicate concurrent requests)
        return this.fetchAndStore(key, fetcher);
    }

    private async fetchAndStore<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        // If there's already an in-flight request for this key, share it
        const existing = this.inflight.get(key) as Promise<T> | undefined;
        if (existing) return existing;

        const promise = fetcher().then((data) => {
            this.store.set(key, { data, timestamp: Date.now() });
            this.inflight.delete(key);
            return data;
        }).catch((err) => {
            this.inflight.delete(key);
            throw err;
        });

        this.inflight.set(key, promise);
        return promise;
    }

    /** Immediately invalidate a cached entry (forces next call to refetch) */
    invalidate(key: string): void {
        this.store.delete(key);
    }

    /** Invalidate all entries whose keys start with `prefix` */
    invalidatePrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    /** Remove all entries older than `maxAge` ms. Call periodically to limit memory. */
    evictExpired(maxAge = DEFAULT_TTL + DEFAULT_SWR): void {
        const cutoff = Date.now() - maxAge;
        for (const [key, entry] of this.store.entries()) {
            if (entry.timestamp < cutoff) this.store.delete(key);
        }
    }

    /** Clear all cached data */
    clear(): void {
        this.store.clear();
        this.inflight.clear();
    }

    get size(): number {
        return this.store.size;
    }
}

/** Singleton cache shared across the application */
export const apiCache = new RequestCache();

// Periodically evict expired entries (every 2 minutes) when in browser context
if (typeof window !== 'undefined') {
    setInterval(() => apiCache.evictExpired(), 2 * 60_000);
}
