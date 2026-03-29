import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import {
    Search, TrendingUp, TrendingDown, Minus, Filter,
    AlertCircle, CheckCircle2, RefreshCw, Zap, Plus, Globe, X, Trophy
} from 'lucide-react';
import { motion } from 'framer-motion';

interface RankingData {
    id: string;
    keyword: string;
    platform: string;
    rank: number;
    citation_found: boolean;
    sentiment_score: number;
    created_at: string;
    domain?: string; // null = own brand, string = competitor
}

interface CompetitorTracking {
    id: string;
    domain: string;
    added_at: string;
}

const PLATFORMS = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];
const PLATFORM_COLORS: Record<string, string> = {
    'ChatGPT': '#10a37f',
    'Gemini': '#4285f4',
    'Claude': '#d97706',
    'Perplexity': '#06b6d4',
};

function CitationBadge({ found }: { found: boolean }) {
    return found ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Cited
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <X className="w-3 h-3" /> Not cited
        </span>
    );
}

function DeltaBadge({ delta }: { delta: number | null }) {
    if (delta === null || delta === 0) return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    return delta > 0 ? (
        <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />+{delta}
        </span>
    ) : (
        <span className="flex items-center gap-0.5 text-xs text-red-500 font-bold">
            <TrendingDown className="w-3.5 h-3.5" />{delta}
        </span>
    );
}

export const SentinelDashboard: React.FC = () => {
    const { organization } = useAuth();
    const [rankings, setRankings] = useState<RankingData[]>([]);
    const [competitors, setCompetitors] = useState<CompetitorTracking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKeyword, setSelectedKeyword] = useState<string>('all');
    const [uniqueKeywords, setUniqueKeywords] = useState<string[]>([]);
    const [showAddCompetitor, setShowAddCompetitor] = useState(false);
    const [newCompetitorDomain, setNewCompetitorDomain] = useState('');
    const [addingCompetitor, setAddingCompetitor] = useState(false);

    useEffect(() => {
        if (organization?.id) {
            fetchAll();
        }
    }, [organization?.id]);

    const fetchAll = async () => {
        setLoading(true);
        await Promise.all([fetchRankings(), fetchCompetitors()]);
        setLoading(false);
    };

    const fetchRankings = async () => {
        try {
            const { data, error } = await supabase
                .from('keyword_rankings')
                .select('*')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                setRankings(data);
                const keys = Array.from(new Set(data.map((d: RankingData) => d.keyword)));
                setUniqueKeywords(keys);
                if (keys.length > 0 && (selectedKeyword === 'all' || !keys.includes(selectedKeyword))) {
                    setSelectedKeyword(keys[0]);
                }
            }
        } catch (err) {
            console.error('Sentinel fetch error:', err);
        }
    };

    const fetchCompetitors = async () => {
        if (!organization?.id) return;
        try {
            const { data } = await supabase
                .from('competitor_tracking')
                .select('*')
                .eq('organization_id', organization.id)
                .order('added_at', { ascending: false });
            setCompetitors(data || []);
        } catch {
            // Table may not exist yet
        }
    };

    const handleAddCompetitor = async () => {
        if (!newCompetitorDomain.trim() || !organization?.id) return;
        setAddingCompetitor(true);
        try {
            let domain = newCompetitorDomain.trim();
            if (!domain.startsWith('http')) domain = `https://${domain}`;
            const hostname = new URL(domain).hostname;

            const { error } = await supabase
                .from('competitor_tracking')
                .insert({ organization_id: organization.id, domain: hostname, added_at: new Date().toISOString() });

            if (!error) {
                setNewCompetitorDomain('');
                setShowAddCompetitor(false);
                fetchCompetitors();
            }
        } catch {
            // URL parse error
        } finally {
            setAddingCompetitor(false);
        }
    };

    const handleRemoveCompetitor = async (id: string) => {
        await supabase.from('competitor_tracking').delete().eq('id', id);
        fetchCompetitors();
    };

    // Build chart data
    const processChartData = () => {
        const filtered = selectedKeyword === 'all'
            ? rankings.filter(r => !r.domain) // own brand only for 'all'
            : rankings.filter(r => r.keyword === selectedKeyword && !r.domain);

        const grouped = filtered.reduce((acc, curr) => {
            const dateKey = curr.created_at.slice(0, 10);
            const label = new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!acc[dateKey]) acc[dateKey] = { date: label, _k: dateKey };
            acc[dateKey][curr.platform] = curr.rank;
            return acc;
        }, {} as Record<string, any>);

        return Object.values(grouped).sort((a: any, b: any) => String(a._k).localeCompare(String(b._k)));
    };

    const chartData = processChartData();

    // Build competitor citation comparison
    const buildCompetitorComparison = () => {
        const keyword = selectedKeyword === 'all' ? uniqueKeywords[0] : selectedKeyword;
        if (!keyword) return [];

        return PLATFORMS.map(platform => {
            const ownRows = rankings
                .filter(r => r.keyword === keyword && r.platform === platform && !r.domain)
                .sort((a, b) => b.created_at.localeCompare(a.created_at));
            const own = ownRows[0];

            const competitorData = competitors.map(comp => {
                const compRows = rankings
                    .filter(r => r.keyword === keyword && r.platform === platform && r.domain === comp.domain)
                    .sort((a, b) => b.created_at.localeCompare(a.created_at));
                const latest = compRows[0];
                return { domain: comp.domain, rank: latest?.rank ?? null, cited: latest?.citation_found ?? false };
            });

            return {
                platform,
                own: { rank: own?.rank ?? null, cited: own?.citation_found ?? false },
                competitors: competitorData,
            };
        });
    };

    const comparisonData = buildCompetitorComparison();

    // Build insight
    const insight = React.useMemo(() => {
        const keyword = selectedKeyword === 'all' ? uniqueKeywords[0] : selectedKeyword;
        if (!keyword) return null;

        const snapshots = PLATFORMS.map(platform => {
            const byPlatform = rankings
                .filter(r => r.keyword === keyword && r.platform === platform && !r.domain)
                .sort((a, b) => a.created_at.localeCompare(b.created_at));

            const latest = byPlatform[byPlatform.length - 1];
            const prev = byPlatform[byPlatform.length - 2];
            const delta = latest?.rank != null && prev?.rank != null ? prev.rank - latest.rank : null;
            return { platform, latestRank: latest?.rank ?? null, prevRank: prev?.rank ?? null, delta, cited: Boolean(latest?.citation_found) };
        });

        const citedCount = snapshots.filter(s => s.cited).length;
        const best = snapshots
            .filter(s => s.delta !== null && s.latestRank !== null && s.delta !== 0)
            .sort((a, b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0))[0];

        const parts: string[] = [];
        if (best?.delta) {
            parts.push(`${best.platform} ${best.delta > 0 ? 'improved' : 'dropped'} from #${best.prevRank} to #${best.latestRank}.`);
        }
        if (citedCount > 0) {
            parts.push(`${citedCount}/${PLATFORMS.length} platforms cited your brand.`);
        } else {
            parts.push('No citations in the latest check. Try improving on-page clarity.');
        }

        return { keyword, text: parts.join(' ') };
    }, [rankings, selectedKeyword, uniqueKeywords]);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 bg-blue-100 rounded-lg" />
                <div className="h-64 w-full bg-blue-50 rounded-2xl" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-blue-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <Search className="text-blue-600 w-5 h-5" />
                        </div>
                        Sentinel Tracking
                    </h2>
                    <p className="text-slate-500 mt-1 text-sm">Track citation and ranking signals vs competitors across AI platforms.</p>
                </div>
                <button
                    onClick={fetchAll}
                    aria-label="Refresh tracking data"
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Keyword filter */}
            {uniqueKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {uniqueKeywords.map(k => (
                        <button
                            key={k}
                            onClick={() => setSelectedKeyword(k)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${selectedKeyword === k
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                            }`}
                        >
                            {k}
                        </button>
                    ))}
                </div>
            )}

            {uniqueKeywords.length > 0 ? (
                <>
                    {/* Chart + Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white border border-blue-100 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                Rank Velocity: <span className="text-blue-600 ml-1">{selectedKeyword}</span>
                            </h3>
                            <div className="h-[220px] sm:h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} reversed domain={[1, 20]} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#fff', borderColor: '#dbeafe', borderRadius: '12px', boxShadow: '0 4px 20px rgba(37,99,235,0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                                        {PLATFORMS.map(p => (
                                            <Line
                                                key={p}
                                                type="monotone"
                                                dataKey={p}
                                                stroke={PLATFORM_COLORS[p] || '#3b82f6'}
                                                strokeWidth={2.5}
                                                dot={{ r: 4, strokeWidth: 0, fill: PLATFORM_COLORS[p] }}
                                                activeDot={{ r: 6 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            <div className="bg-white border border-blue-100 rounded-2xl p-5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Latest Citations</h4>
                                <div className="space-y-3">
                                    {rankings
                                        .filter(r => r.keyword === selectedKeyword && !r.domain)
                                        .slice(-4)
                                        .reverse()
                                        .map((r, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[10px] text-blue-600">
                                                        {r.platform[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700">{r.platform}</p>
                                                        <p className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-bold ${r.rank <= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    #{r.rank}
                                                </span>
                                            </div>
                                        ))}
                                    {rankings.filter(r => r.keyword === selectedKeyword && !r.domain).length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-4">No data yet for this keyword.</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-sm font-bold text-blue-900">Sentinel Insight</h4>
                                </div>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    {insight ? (
                                        <>For <strong>"{insight.keyword}"</strong>: {insight.text}</>
                                    ) : (
                                        <>Run visibility checks to generate insights for your tracked keywords.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Competitor Citation Comparison */}
                    <div className="bg-white border border-blue-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    Competitor Citation Comparison
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Compare citation status across platforms for "{selectedKeyword}"</p>
                            </div>
                            <button
                                onClick={() => setShowAddCompetitor(!showAddCompetitor)}
                                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Competitor
                            </button>
                        </div>

                        {/* Add competitor form */}
                        {showAddCompetitor && (
                            <div className="mb-5 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={newCompetitorDomain}
                                    onChange={e => setNewCompetitorDomain(e.target.value)}
                                    placeholder="competitor.com"
                                    className="flex-1 bg-white border border-blue-200 text-slate-800 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-slate-400"
                                    onKeyDown={e => e.key === 'Enter' && handleAddCompetitor()}
                                />
                                <button
                                    onClick={handleAddCompetitor}
                                    disabled={addingCompetitor || !newCompetitorDomain.trim()}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                >
                                    {addingCompetitor ? 'Adding...' : 'Add'}
                                </button>
                                <button onClick={() => setShowAddCompetitor(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Competitor tags */}
                        {competitors.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {competitors.map(c => (
                                    <div key={c.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                        <Globe className="w-3 h-3" />
                                        {c.domain}
                                        <button onClick={() => handleRemoveCompetitor(c.id)} className="text-blue-400 hover:text-red-500 ml-0.5">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Comparison table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-blue-100">
                                        <th className="text-left p-3 text-slate-400 font-semibold text-xs">Platform</th>
                                        <th className="p-3 text-center text-slate-500 font-semibold text-xs">Your Brand</th>
                                        {competitors.map(c => (
                                            <th key={c.id} className="p-3 text-center text-slate-400 font-semibold text-xs">{c.domain}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonData.map((row, i) => (
                                        <tr key={row.platform} className={`border-b border-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}`}>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[row.platform] }} />
                                                    <span className="font-semibold text-slate-700 text-xs">{row.platform}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {row.own.rank !== null ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`text-sm font-bold ${row.own.rank <= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>#{row.own.rank}</span>
                                                        <CitationBadge found={row.own.cited} />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>
                                            {row.competitors.map((comp, ci) => (
                                                <td key={ci} className="p-3 text-center">
                                                    {comp.rank !== null ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className={`text-sm font-bold ${comp.rank <= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>#{comp.rank}</span>
                                                            <CitationBadge found={comp.cited} />
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {competitors.length === 0 && (
                                <p className="text-center text-xs text-slate-400 py-4">Add competitors above to compare citation rates side-by-side.</p>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 bg-white border border-blue-100 rounded-2xl">
                    <div className="bg-blue-50 p-4 rounded-2xl inline-flex mb-4">
                        <Search className="w-10 h-10 text-blue-300" />
                    </div>
                    <h3 className="text-slate-700 font-bold text-lg mb-2">No Tracking Data Yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto text-sm">
                        Run a visibility check for at least one keyword to populate this dashboard.
                    </p>
                </div>
            )}
        </motion.div>
    );
};
