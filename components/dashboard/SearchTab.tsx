import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Report } from '../../types';
import { SearchVisibility } from '../SearchVisibility';
import { KeywordRanking, getKeywordRankings } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
    AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, Minus, Globe, MousePointerClick,
    Eye, BarChart3, Loader2, AlertTriangle, Link2
} from 'lucide-react';

interface SearchTabProps {
    report: Report;
}

interface GSCMetric {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

export const SearchTab: React.FC<SearchTabProps> = ({ report }) => {
    const { organization } = useAuth();
    const [rankings, setRankings] = useState<KeywordRanking[]>([]);
    const [gscMetrics, setGscMetrics] = useState<GSCMetric[]>([]);
    const [gscConnected, setGscConnected] = useState(false);
    const [loadingGsc, setLoadingGsc] = useState(true);

    useEffect(() => {
        if (report.id) {
            getKeywordRankings(report.id).then(setRankings);
        }
        if (organization?.id) {
            loadGscData();
        } else {
            setLoadingGsc(false);
        }
    }, [report.id, organization?.id]);

    const loadGscData = async () => {
        if (!organization?.id) { setLoadingGsc(false); return; }
        setLoadingGsc(true);

        const { data: auth } = await supabase
            .from('gsc_auth')
            .select('id')
            .eq('organization_id', organization.id)
            .maybeSingle();

        setGscConnected(!!auth);

        if (auth) {
            const { data } = await supabase
                .from('gsc_metrics')
                .select('date, clicks, impressions, ctr, position')
                .eq('organization_id', organization.id)
                .order('date', { ascending: true })
                .limit(30);

            if (data && data.length > 0) {
                setGscMetrics(data);
            }
        }
        setLoadingGsc(false);
    };

    // Aggregate keyword rankings by platform for trend chart
    const platformTrendData = useMemo(() => {
        if (rankings.length === 0) return [];

        const byDate: Record<string, Record<string, number[]>> = {};
        for (const r of rankings) {
            const date = r.created_at.slice(0, 10);
            if (!byDate[date]) byDate[date] = {};
            const platform = r.platform;
            if (!byDate[date][platform]) byDate[date][platform] = [];
            if (r.rank !== null) byDate[date][platform].push(r.rank);
        }

        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, platforms]) => {
                const entry: Record<string, string | number> = {
                    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                };
                for (const [platform, ranks] of Object.entries(platforms)) {
                    entry[platform] = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
                }
                return entry;
            });
    }, [rankings]);

    const rankedPlatforms = useMemo(() => {
        const set = new Set(rankings.map(r => r.platform));
        return Array.from(set);
    }, [rankings]);

    const platformColors: Record<string, string> = {
        ChatGPT: '#10a37f',
        Gemini: '#4f46e5',
        Claude: '#d97757',
        Perplexity: '#3b82f6',
        'Google AI Overviews': '#ea4335',
        'Microsoft Copilot': '#00a4ef',
        'Meta AI': '#0866ff',
        Grok: '#1d9bf0',
    };

    const gscSummary = useMemo(() => {
        if (gscMetrics.length === 0) return null;
        const totalClicks = gscMetrics.reduce((s, m) => s + m.clicks, 0);
        const totalImpressions = gscMetrics.reduce((s, m) => s + m.impressions, 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const avgPosition = gscMetrics.reduce((s, m) => s + m.position, 0) / gscMetrics.length;

        const recent = gscMetrics.slice(-7);
        const previous = gscMetrics.slice(-14, -7);
        const recentClicks = recent.reduce((s, m) => s + m.clicks, 0);
        const prevClicks = previous.length > 0 ? previous.reduce((s, m) => s + m.clicks, 0) : recentClicks;
        const clicksTrend = prevClicks > 0 ? ((recentClicks - prevClicks) / prevClicks) * 100 : 0;

        return { totalClicks, totalImpressions, avgCtr, avgPosition, clicksTrend };
    }, [gscMetrics]);

    const TrendIcon = ({ value }: { value: number }) => {
        if (value > 2) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
        if (value < -2) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
        return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-10"
        >
            {/* GSC Metrics Panel */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
                <div className="px-6 sm:px-8 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Globe className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Google Search Console</h3>
                            <p className="text-[10px] text-slate-500">Traditional search performance (last 30 days)</p>
                        </div>
                    </div>
                    {gscConnected && (
                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                        </span>
                    )}
                </div>

                {loadingGsc ? (
                    <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading GSC data...</span>
                    </div>
                ) : !gscConnected ? (
                    <div className="p-8 text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500/50 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 mb-1">Google Search Console not connected</p>
                        <p className="text-xs text-slate-600">Connect GSC in Settings &rarr; Integrations to see organic search data alongside AI visibility.</p>
                    </div>
                ) : gscMetrics.length === 0 ? (
                    <div className="p-8 text-center">
                        <Link2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No GSC data available yet</p>
                        <p className="text-xs text-slate-600">Sync will populate data within 24 hours.</p>
                    </div>
                ) : (
                    <div className="p-6 sm:p-8">
                        {gscSummary && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MousePointerClick className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clicks</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-white">{gscSummary.totalClicks.toLocaleString()}</span>
                                        <div className="flex items-center gap-1 mb-1">
                                            <TrendIcon value={gscSummary.clicksTrend} />
                                            <span className={`text-[10px] font-bold ${gscSummary.clicksTrend > 0 ? 'text-emerald-400' : gscSummary.clicksTrend < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                {gscSummary.clicksTrend > 0 ? '+' : ''}{gscSummary.clicksTrend.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Impressions</span>
                                    </div>
                                    <span className="text-2xl font-black text-white">{gscSummary.totalImpressions.toLocaleString()}</span>
                                </div>
                                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg CTR</span>
                                    </div>
                                    <span className="text-2xl font-black text-white">{gscSummary.avgCtr.toFixed(1)}%</span>
                                </div>
                                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Position</span>
                                    </div>
                                    <span className="text-2xl font-black text-white">{gscSummary.avgPosition.toFixed(1)}</span>
                                </div>
                            </div>
                        )}

                        {/* GSC Trend Chart */}
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={gscMetrics.map(m => ({
                                    ...m,
                                    date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                }))}>
                                    <defs>
                                        <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#3b82f6" fill="url(#clicksGrad)" strokeWidth={2} name="Clicks" />
                                    <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="#8b5cf6" fill="url(#impressionsGrad)" strokeWidth={2} name="Impressions" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Keyword Ranking Trends (AI Platforms) */}
            {platformTrendData.length > 1 && (
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
                    <div className="px-6 sm:px-8 py-5 border-b border-white/5 flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">AI Platform Ranking Trends</h3>
                            <p className="text-[10px] text-slate-500">Average ranking position by platform over time</p>
                        </div>
                    </div>
                    <div className="p-6 sm:p-8">
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={platformTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} reversed domain={[1, 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                    {rankedPlatforms.map(platform => (
                                        <Line
                                            key={platform}
                                            type="monotone"
                                            dataKey={platform}
                                            stroke={platformColors[platform] || '#64748b'}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            name={platform}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Existing Search Visibility Component */}
            <SearchVisibility report={report} auditId={report.id} />
        </motion.div>
    );
};
