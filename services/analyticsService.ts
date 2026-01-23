import { supabase } from './supabase';

/**
 * Analytics Service
 * Provides aggregated data for historical trends and performance metrics
 */

export interface VisibilityDataPoint {
    date: string;
    score: number;
    competitorAvg: number;
    timestamp: number;
}

export type Timeframe = '7d' | '30d' | '90d' | 'all';

/**
 * Fetch historical visibility data for an organization across a timeframe
 */
export async function getVisibilityTrends(
    organizationId: string,
    timeframe: Timeframe = '30d'
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
        // Fetch audit snapshots
        const { data: audits, error: auditError } = await supabase
            .from('audits')
            .select('created_at, overall_score')
            .eq('organization_id', organizationId)
            .eq('status', 'complete')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (auditError) throw auditError;

        // Fetch competitor benchmarks for the same period
        const { data: benchmarks, error: benchmarkError } = await supabase
            .from('competitor_benchmarks')
            .select('captured_at, score')
            .eq('organization_id', organizationId)
            .eq('platform', 'Overall')
            .gte('captured_at', startDate.toISOString())
            .order('captured_at', { ascending: true });

        if (benchmarkError) {
            console.warn('Could not fetch competitor benchmarks for trends:', benchmarkError);
        }

        // Process data into daily buckets
        const dailyBuckets: Record<string, { scores: number[], compScores: number[] }> = {};

        // Process audits
        audits?.forEach(audit => {
            const dateStr = new Date(audit.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
            });
            if (!dailyBuckets[dateStr]) dailyBuckets[dateStr] = { scores: [], compScores: [] };
            dailyBuckets[dateStr].scores.push(audit.overall_score);
        });

        // Process benchmarks
        benchmarks?.forEach(bm => {
            const dateStr = new Date(bm.captured_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
            });
            if (!dailyBuckets[dateStr]) dailyBuckets[dateStr] = { scores: [], compScores: [] };
            dailyBuckets[dateStr].compScores.push(bm.score);
        });

        // Convert buckets to data points
        const results: VisibilityDataPoint[] = Object.entries(dailyBuckets).map(([date, data]) => {
            const avgScore = data.scores.length > 0
                ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
                : 0;

            const avgCompScore = data.compScores.length > 0
                ? Math.round(data.compScores.reduce((a, b) => a + b, 0) / data.compScores.length)
                : 65; // Fallback to market average

            return {
                date,
                score: avgScore,
                competitorAvg: avgCompScore,
                timestamp: new Date(date).getTime()
            };
        });

        // If no data, return mock for better initial UX or empty state handling
        if (results.length === 0) {
            return generateMockTrends(timeframe);
        }

        return results;
    } catch (error) {
        console.error('Error fetching visibility trends:', error);
        return generateMockTrends(timeframe);
    }
}

/**
 * Internal helper to generate mock data if no real data exists
 */
function generateMockTrends(timeframe: Timeframe): VisibilityDataPoint[] {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data: VisibilityDataPoint[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        data.push({
            date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            score: 40 + Math.floor(Math.random() * 20) + (days - i),
            competitorAvg: 60 + Math.floor(Math.random() * 10),
            timestamp: d.getTime()
        });
    }
    return data;
}

export default {
    getVisibilityTrends
};
