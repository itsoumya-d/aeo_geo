import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import {
    Search, TrendingUp, TrendingDown, Minus, Filter,
    AlertCircle, CheckCircle2, RefreshCw, Zap
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'framer-motion';
import { SentinelSkeleton } from './ui/Skeleton';

interface RankingData {
    id: string;
    keyword: string;
    platform: string;
    rank: number;
    citation_found: boolean;
    sentiment_score: number;
    created_at: string;
}

export const SentinelDashboard: React.FC = () => {
    const { organization } = useAuth();
    const [rankings, setRankings] = useState<RankingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKeyword, setSelectedKeyword] = useState<string | 'all'>('all');
    const [uniqueKeywords, setUniqueKeywords] = useState<string[]>([]);

    useEffect(() => {
        if (organization?.id) {
            fetchRankings();
        }
    }, [organization?.id]);

    const fetchRankings = async () => {
        setLoading(true);
        try {
            // Join with audits to filter by org_id? No, relies on RLS policy "Users can read own keyword rankings"
            // But we need to ensure the query is efficient.
            // Since RLS is dependent on subquery, we might just query normally.

            // To make it easy, we'll fetch last 30 days of rankings
            const { data, error } = await supabase
                .from('keyword_rankings')
                .select('*')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                setRankings(data);
                const keys = Array.from(new Set(data.map(d => d.keyword)));
                setUniqueKeywords(keys);
                if (keys.length > 0 && selectedKeyword === 'all') {
                    setSelectedKeyword(keys[0]); // Default to first keyword
                }
            }
        } catch (err) {
            console.error("Sentinel Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Process Data for Chart
    const processChartData = () => {
        if (!rankings.length) return [];

        // Filter by keyword
        const filtered = selectedKeyword === 'all'
            ? rankings
            : rankings.filter(r => r.keyword === selectedKeyword);

        // Group by Date and Platform
        const grouped = filtered.reduce((acc, curr) => {
            const dateKey = curr.created_at.slice(0, 10);
            const label = new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!acc[dateKey]) acc[dateKey] = { date: label, _k: dateKey };

            // If multiple entries for same platform on same day, ensure we take specific one or avg? 
            // For now assume one audit per day.
            acc[dateKey][curr.platform] = curr.rank;
            return acc;
        }, {} as Record<string, any>);

        return Object.values(grouped).sort((a, b) => String(a._k).localeCompare(String(b._k)));
    };

    const chartData = processChartData();
    const platforms = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];
    const colors = {
        'ChatGPT': '#10a37f',
        'Gemini': '#4285f4',
        'Claude': '#d97706',
        'Perplexity': '#06b6d4'
    };

    const insight = React.useMemo(() => {
        const keyword = selectedKeyword === 'all' ? uniqueKeywords[0] : selectedKeyword;
        if (!keyword) return null;

        const rows = rankings.filter((r) => r.keyword === keyword);
        if (rows.length === 0) return null;

        const snapshots = platforms.map((platform) => {
            const byPlatform = rows
                .filter((r) => r.platform === platform)
                .sort((a, b) => a.created_at.localeCompare(b.created_at));

            const latest = byPlatform[byPlatform.length - 1];
            const prev = byPlatform[byPlatform.length - 2];

            const latestRank = latest?.rank ?? null;
            const prevRank = prev?.rank ?? null;
            const delta = latestRank !== null && prevRank !== null ? prevRank - latestRank : null;

            return {
                platform,
                latestRank,
                prevRank,
                delta,
                cited: Boolean(latest?.citation_found),
            };
        });

        const citedCount = snapshots.filter((s) => s.cited).length;
        const best = snapshots
            .filter((s) => s.delta !== null && s.latestRank !== null && s.prevRank !== null)
            .sort((a, b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0))[0];

        const parts: string[] = [];
        if (best && best.delta !== null && best.latestRank !== null && best.prevRank !== null && best.delta !== 0) {
            const direction = best.delta > 0 ? 'improved' : 'dropped';
            parts.push(`${best.platform} ${direction} from #${best.prevRank} to #${best.latestRank}.`);
        } else {
            const latestWithRank = snapshots.find((s) => s.latestRank !== null);
            if (latestWithRank && latestWithRank.latestRank !== null) {
                parts.push(`Latest ranks are updating. ${latestWithRank.platform} is currently at #${latestWithRank.latestRank}.`);
            }
        }

        if (citedCount > 0) {
            parts.push(`${citedCount}/${platforms.length} platforms cited your brand in the latest check.`);
        } else {
            parts.push('No citations detected in the latest check. Try refining the query or improving on-page clarity.');
        }

        return { keyword, text: parts.join(' ') };
    }, [platforms, rankings, selectedKeyword, uniqueKeywords]);

    if (loading) return <SentinelSkeleton />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-8">
                <div>
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <Search className="w-5 h-5 text-primary" />
                        </div>
                        Sentinel Tracking
                    </h2>
                    <p className="text-text-secondary mt-2 max-w-2xl text-sm">
                        Track citation and ranking signals across major AI platforms.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchRankings}
                        aria-label="Refresh tracking data"
                        className="p-2 text-text-muted hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
                {uniqueKeywords.map(k => (
                    <button
                        key={k}
                        onClick={() => setSelectedKeyword(k)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${selectedKeyword === k
                                ? 'bg-primary text-white border-primary'
                                : 'bg-surface hover:bg-surfaceHighlight text-text-secondary border-border'
                            }`}
                    >
                        {k}
                    </button>
                ))}
            </div>

            {/* Chart Area */}
            {uniqueKeywords.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 p-6 min-h-[400px]">
                        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            Rank Velocity: <span className="text-primary">{selectedKeyword}</span>
                        </h3>
                        <div className="h-[220px] sm:h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        reversed // Rank 1 is top
                                        domain={[1, 20]}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    {platforms.map(p => (
                                        <Line
                                            key={p}
                                            type="monotone"
                                            dataKey={p}
                                            stroke={colors[p as keyof typeof colors] || '#fff'}
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 0, fill: colors[p as keyof typeof colors] }}
                                            activeDot={{ r: 6 }}
                                            connectNulls
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Stats Card */}
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-4">Latest Citations</h4>
                            <div className="space-y-4">
                                {rankings
                                    .filter(r => r.keyword === selectedKeyword)
                                    .slice(-4) // Last 4 entries
                                    .reverse()
                                    .map((r, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-surfaceHighlight flex items-center justify-center font-bold text-[10px] text-white">
                                                    {r.platform[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">{r.platform}</p>
                                                    <p className="text-[10px] text-text-muted">{new Date(r.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs font-bold ${r.rank <= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    #{r.rank}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </Card>

                        <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 text-primary" />
                                <h4 className="text-sm font-bold text-white">Sentinel Insight</h4>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {insight ? (
                                    <>For <strong>"{insight.keyword}"</strong>: {insight.text}</>
                                ) : (
                                    <>Run visibility checks to generate insights for your tracked keywords.</>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                    <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">No Tracking Data Yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto text-sm">
                        Run a visibility check for at least one keyword to populate this dashboard.
                    </p>
                </div>
            )}
        </div>
    );
};
