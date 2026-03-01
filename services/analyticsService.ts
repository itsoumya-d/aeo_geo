import { supabase } from './supabase';
import { apiCache } from '../utils/cache';

/**
 * Analytics Service
 * Provides aggregated data for historical trends and performance metrics
 */

export interface VisibilityDataPoint {
    date: string;
    score: number;
    competitorAvg: number | null;
    timestamp: number;
}

export type Timeframe = '7d' | '30d' | '90d' | 'all';

/**
 * Fetch historical visibility data for an organization across a timeframe
 */
export async function getVisibilityTrends(
    organizationId: string,
    timeframe: Timeframe = '30d',
    workspaceId?: string | null
): Promise<VisibilityDataPoint[]> {
    const cacheKey = `visibility:${organizationId}:${workspaceId ?? 'all'}:${timeframe}`;
    return apiCache.get(cacheKey, () => _fetchVisibilityTrends(organizationId, timeframe, workspaceId), { ttl: 60_000 });
}

async function _fetchVisibilityTrends(
    organizationId: string,
    timeframe: Timeframe,
    workspaceId?: string | null
): Promise<VisibilityDataPoint[]> {
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
        case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        case 'all':
            startDate = new Date(0); // Epoch
            break;
    }

    try {
        // Build base queries with optional workspace filter
        const auditBase = supabase
            .from('audits')
            .select('created_at, overall_score')
            .eq('organization_id', organizationId)
            .eq('status', 'complete')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        const benchmarkBase = supabase
            .from('competitor_benchmarks')
            .select('captured_at, score')
            .eq('organization_id', organizationId)
            .eq('platform', 'Overall')
            .gte('captured_at', startDate.toISOString())
            .order('captured_at', { ascending: true });

        // Fetch audit snapshots and competitor benchmarks in parallel
        const [auditResult, benchmarkResult] = await Promise.all([
            workspaceId ? auditBase.eq('workspace_id', workspaceId) : auditBase,
            workspaceId ? benchmarkBase.eq('workspace_id', workspaceId) : benchmarkBase,
        ]);

        const { data: audits, error: auditError } = auditResult;
        const { data: benchmarks, error: benchmarkError } = benchmarkResult;

        if (auditError) throw auditError;

        if (benchmarkError) {
            console.warn('Could not fetch competitor benchmarks for trends:', benchmarkError);
        }

        const dailyBuckets: Record<string, { scores: number[]; compScores: number[] }> = {};

        const dateKey = (iso: string) => {
            try {
                return new Date(iso).toISOString().slice(0, 10);
            } catch {
                return iso.slice(0, 10);
            }
        };

        const labelForKey = (key: string) => {
            const d = new Date(`${key}T00:00:00Z`);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        };

        // Process audits
        audits?.forEach(audit => {
            const dateStr = dateKey(audit.created_at);
            if (!dailyBuckets[dateStr]) dailyBuckets[dateStr] = { scores: [], compScores: [] };
            dailyBuckets[dateStr].scores.push(audit.overall_score);
        });

        // Process benchmarks
        benchmarks?.forEach(bm => {
            const dateStr = dateKey(bm.captured_at);
            if (!dailyBuckets[dateStr]) dailyBuckets[dateStr] = { scores: [], compScores: [] };
            dailyBuckets[dateStr].compScores.push(bm.score);
        });

        // Convert buckets to data points
        const results: VisibilityDataPoint[] = Object.entries(dailyBuckets)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, data]) => {
            const avgScore = data.scores.length > 0
                ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
                : 0;

            const avgCompScore = data.compScores.length > 0
                ? Math.round(data.compScores.reduce((a, b) => a + b, 0) / data.compScores.length)
                : null;

            return {
                date: labelForKey(key),
                score: avgScore,
                competitorAvg: avgCompScore,
                timestamp: new Date(`${key}T00:00:00Z`).getTime()
            };
        });

        return results;
    } catch (error) {
        console.error('Error fetching visibility trends:', error);
        return [];
    }
}

export default {
    getVisibilityTrends
};
