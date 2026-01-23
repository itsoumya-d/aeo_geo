/**
 * Cache service for storing and retrieving audit results
 * Uses localStorage with TTL-based expiration
 */

import { Report } from '../types';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // time to live in milliseconds
}

const CACHE_PREFIX = 'cognition_cache_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cache key from URL
 */
function getCacheKey(url: string): string {
    // Normalize URL for consistent caching
    const normalized = url.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
    return `${CACHE_PREFIX}${normalized}`;
}

/**
 * Store data in cache with TTL
 */
export function setCache<T>(url: string, data: T, ttl: number = DEFAULT_TTL): void {
    const key = getCacheKey(url);
    const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
    };

    try {
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
        console.warn('Cache storage failed:', error);
        // If storage is full, clear old entries
        clearExpiredCache();
        try {
            localStorage.setItem(key, JSON.stringify(entry));
        } catch {
            console.error('Cache storage failed after cleanup');
        }
    }
}

/**
 * Get data from cache if not expired
 */
export function getCache<T>(url: string): { data: T; age: number } | null {
    const key = getCacheKey(url);

    try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const entry: CacheEntry<T> = JSON.parse(stored);
        const age = Date.now() - entry.timestamp;

        // Check if expired
        if (age > entry.ttl) {
            localStorage.removeItem(key);
            return null;
        }

        return { data: entry.data, age };
    } catch (error) {
        console.warn('Cache retrieval failed:', error);
        return null;
    }
}

/**
 * Remove a specific cache entry
 */
export function removeCache(url: string): void {
    const key = getCacheKey(url);
    localStorage.removeItem(key);
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache(): void {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const entry: CacheEntry<unknown> = JSON.parse(stored);
                    if (now - entry.timestamp > entry.ttl) {
                        localStorage.removeItem(key);
                    }
                }
            } catch {
                // Remove corrupted entries
                localStorage.removeItem(key);
            }
        }
    });
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
        }
    });
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; totalSize: number } {
    const keys = Object.keys(localStorage);
    let entries = 0;
    let totalSize = 0;

    keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            entries++;
            const stored = localStorage.getItem(key);
            if (stored) {
                totalSize += stored.length * 2; // UTF-16 = 2 bytes per char
            }
        }
    });

    return { entries, totalSize };
}

/**
 * Format cache age for display
 */
export function formatCacheAge(ageMs: number): string {
    const minutes = Math.floor(ageMs / (1000 * 60));
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Convenience functions for Report caching
export const cacheReport = (url: string, report: Report) => setCache<Report>(url, report);
export const getCachedReport = (url: string) => getCache<Report>(url);
export const removeCachedReport = (url: string) => removeCache(url);
