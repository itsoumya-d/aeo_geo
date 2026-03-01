import { supabase } from './supabase';
import { auditLog, getCurrentActor } from './auditService';
import { sendSlackNotification } from './slackService';
import { apiCache } from '../utils/cache';

/**
 * Competitor Tracking Service
 * Manages competitor domains and their AI visibility benchmarks
 */

export interface CompetitorDomain {
    id: string;
    organization_id: string;
    domain: string;
    name: string | null;
    is_active: boolean;
    last_audited_at: string | null;
    created_at: string;
}

export interface CompetitorBenchmark {
    id: string;
    organization_id: string;
    competitor_domain: string;
    platform: 'ChatGPT' | 'Gemini' | 'Claude' | 'Perplexity' | 'Overall';
    score: number;
    keywords_tracked: number;
    citations_found: number;
    metadata: Record<string, unknown>;
    captured_at: string;
}

export interface CompetitorSummary {
    id: string;
    domain: string;
    name?: string;
    latestScore: number;
    scoreChange: number;
    lastUpdated: string;
    platformScores: {
        platform: string;
        score: number;
    }[];
}

/**
 * Get all tracked competitors for the current organization, optionally filtered by workspace
 */
export async function getCompetitors(workspaceId?: string | null): Promise<CompetitorDomain[]> {
    const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

    if (!orgData?.organization_id) return [];

    let query = supabase
        .from('competitor_domains')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching competitors:', error);
        return [];
    }

    return data || [];
}

/**
 * Add a new competitor to track, optionally scoped to a workspace
 */
export async function addCompetitor(domain: string, name?: string, workspaceId?: string | null): Promise<CompetitorDomain | null> {
    // Clean domain
    const cleanDomain = domain
        .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
        .split('/')[0]
        .toLowerCase();

    const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

    if (!orgData?.organization_id) return null;

    const { data, error } = await supabase
        .from('competitor_domains')
        .upsert({
            organization_id: orgData.organization_id,
            ...(workspaceId ? { workspace_id: workspaceId } : {}),
            domain: cleanDomain,
            name: name || cleanDomain,
            is_active: true
        }, { onConflict: 'organization_id,domain' })
        .select()
        .single();

    if (error) {
        console.error('Error adding competitor:', error);
        return null;
    }

    // Invalidate cached benchmarks so next fetch reflects the new competitor
    apiCache.invalidatePrefix('competitor:benchmarks:');

    // Log the event
    const actor = await getCurrentActor();
    if (actor) {
        await auditLog({
            actor,
            action: 'competitor.tracked',
            target: { id: data.id, type: 'competitor', display_name: cleanDomain },
            metadata: { domain: cleanDomain, name }
        });
    }

    // Dispatch Slack Notification
    if (orgData?.organization_id) {
        await sendSlackNotification(orgData.organization_id, {
            title: '🎯 New Competitor Tracked',
            message: `*${name || cleanDomain}* has been added to the visibility benchmark pool.`,
            level: 'info',
            cta_url: `${window.location.origin}/dashboard?tab=benchmark`,
            cta_text: 'View Benchmarks'
        });
    }

    return data;
}

/**
 * Remove a competitor from tracking
 */
export async function removeCompetitor(competitorId: string): Promise<boolean> {
    const { error } = await supabase
        .from('competitor_domains')
        .update({ is_active: false })
        .eq('id', competitorId);

    if (error) {
        console.error('Error removing competitor:', error);
        return false;
    }

    // Invalidate cached benchmarks so next fetch reflects the change
    apiCache.invalidatePrefix('competitor:benchmarks:');

    // Log the event
    const actor = await getCurrentActor();
    if (actor) {
        await auditLog({
            actor,
            action: 'competitor.untracked',
            target: { id: competitorId, type: 'competitor' }
        });
    }

    return true;
}

/**
 * Get latest benchmarks for all competitors
 * Uses batched queries instead of N+1 sequential queries per competitor.
 * Results are cached for 60 s with stale-while-revalidate for up to 5 min.
 */
export async function getCompetitorBenchmarks(workspaceId?: string | null): Promise<CompetitorSummary[]> {
    const cacheKey = `competitor:benchmarks:${workspaceId ?? 'all'}`;
    return apiCache.get(cacheKey, () => _fetchCompetitorBenchmarks(workspaceId), { ttl: 60_000 });
}

async function _fetchCompetitorBenchmarks(workspaceId?: string | null): Promise<CompetitorSummary[]> {
    const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

    if (!orgData?.organization_id) return [];

    // Build workspace-scoped queries
    const competitorQuery = supabase
        .from('competitor_domains')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .eq('is_active', true);

    const benchmarkQuery = supabase
        .from('competitor_benchmarks')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .order('captured_at', { ascending: false });

    // Get competitors with their latest benchmarks in parallel
    const [competitorsResult, benchmarksResult] = await Promise.all([
        workspaceId ? competitorQuery.eq('workspace_id', workspaceId) : competitorQuery,
        workspaceId ? benchmarkQuery.eq('workspace_id', workspaceId) : benchmarkQuery,
    ]);

    const competitors = competitorsResult.data;
    const allBenchmarks = benchmarksResult.data;

    if (!competitors || competitors.length === 0) return [];
    if (!allBenchmarks) return competitors.map(c => ({
        id: c.id, domain: c.domain, name: c.name,
        latestScore: 0, scoreChange: 0, lastUpdated: c.created_at, platformScores: []
    }));

    // Group benchmarks by competitor domain
    const benchmarksByDomain = new Map<string, typeof allBenchmarks>();
    for (const b of allBenchmarks) {
        const key = b.competitor_domain;
        if (!benchmarksByDomain.has(key)) benchmarksByDomain.set(key, []);
        benchmarksByDomain.get(key)!.push(b);
    }

    return competitors.map(competitor => {
        const domainBenchmarks = benchmarksByDomain.get(competitor.domain) || [];

        // Get latest overall score (already sorted by captured_at desc)
        const overallScores = domainBenchmarks.filter(b => b.platform === 'Overall');
        const latestOverall = overallScores[0];
        const previousOverall = overallScores[1];

        // Get latest platform-specific scores (deduplicated by platform)
        const seenPlatforms = new Set<string>();
        const platformScores = domainBenchmarks
            .filter(b => {
                if (b.platform === 'Overall' || seenPlatforms.has(b.platform)) return false;
                seenPlatforms.add(b.platform);
                return true;
            })
            .slice(0, 4)
            .map(p => ({ platform: p.platform, score: p.score }));

        return {
            id: competitor.id,
            domain: competitor.domain,
            name: competitor.name,
            latestScore: latestOverall?.score || 0,
            scoreChange: latestOverall?.score && previousOverall?.score
                ? latestOverall.score - previousOverall.score
                : 0,
            lastUpdated: latestOverall?.captured_at || competitor.created_at,
            platformScores
        };
    });
}

/**
 * Save a competitor benchmark result
 */
export async function saveCompetitorBenchmark(
    competitorDomain: string,
    platform: CompetitorBenchmark['platform'],
    score: number,
    metadata?: Record<string, unknown>,
    workspaceId?: string | null
): Promise<boolean> {
    const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

    if (!orgData?.organization_id) return false;

    const { error } = await supabase
        .from('competitor_benchmarks')
        .insert({
            organization_id: orgData.organization_id,
            ...(workspaceId ? { workspace_id: workspaceId } : {}),
            competitor_domain: competitorDomain,
            platform,
            score,
            metadata: metadata || {}
        });

    if (error) {
        console.error('Error saving benchmark:', error);
        return false;
    }

    // Update last_audited_at on competitor domain
    await supabase
        .from('competitor_domains')
        .update({ last_audited_at: new Date().toISOString() })
        .eq('organization_id', orgData.organization_id)
        .eq('domain', competitorDomain);

    return true;
}

/**
 * Get historical benchmarks for a specific competitor
 */
export async function getCompetitorHistory(
    competitorDomain: string,
    days: number = 30
): Promise<CompetitorBenchmark[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

    if (!orgData?.organization_id) return [];

    const { data, error } = await supabase
        .from('competitor_benchmarks')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .eq('competitor_domain', competitorDomain)
        .gte('captured_at', startDate.toISOString())
        .order('captured_at', { ascending: true });

    if (error) {
        console.error('Error fetching competitor history:', error);
        return [];
    }

    return data || [];
}

/**
 * Track a usage analytics event
 */
export async function trackUsageEvent(
    eventType: string,
    category: string = 'general',
    metadata?: Record<string, unknown>
): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userData.user?.id)
        .single();

    if (!orgData?.organization_id) return;

    await supabase
        .from('usage_analytics')
        .insert({
            organization_id: orgData.organization_id,
            user_id: userData.user?.id,
            event_type: eventType,
            event_category: category,
            metadata: metadata || {}
        });
}

export default {
    getCompetitors,
    addCompetitor,
    removeCompetitor,
    getCompetitorBenchmarks,
    saveCompetitorBenchmark,
    getCompetitorHistory,
    trackUsageEvent
};
