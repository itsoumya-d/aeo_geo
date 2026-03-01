import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Audit } from '../services/supabase';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';
import {
    History, TrendingUp, TrendingDown, Minus, Calendar, ExternalLink,
    Loader2, ChevronRight, RefreshCw, Filter, ArrowUpRight, Search, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { safeHostname } from '../utils/validation';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import { HistorySkeleton } from './ui/Skeleton';

interface AuditWithDetails extends Audit {
    domain_name?: string;
}

interface TrendData {
    date: string;
    score: number;
}

const ScoreIndicator: React.FC<{ score: number; previousScore?: number }> = ({ score, previousScore }) => {
    const getScoreColor = (s: number) => {
        if (s >= 70) return 'text-emerald-400';
        if (s >= 50) return 'text-amber-400';
        return 'text-rose-400';
    };

    const diff = previousScore !== undefined ? score - previousScore : 0;
    const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
    const trendColor = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-500';

    return (
        <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
            {previousScore !== undefined && diff !== 0 && (
                <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
                    <TrendIcon className="w-3 h-3" />
                    {Math.abs(diff)}
                </span>
            )}
        </div>
    );
};

export const AuditHistory: React.FC = () => {
    const { organization, currentWorkspace } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const [audits, setAudits] = useState<AuditWithDetails[]>([]);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDomain, setSelectedDomain] = useState<string>('all');
    const [domains, setDomains] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

    useEffect(() => {
        if (organization?.id) {
            loadAudits();
        }
    }, [organization?.id, currentWorkspace?.id]);

    const loadAudits = async () => {
        if (!organization?.id) return;
        setLoading(true);

        try {
            let query = supabase
                .from('audits')
                .select('*')
                .eq('organization_id', organization.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (currentWorkspace?.id) {
                query = query.eq('workspace_id', currentWorkspace.id);
            }

            const { data, error } = await query;

            if (error) throw error;

            const auditsData = (data || []) as AuditWithDetails[];
            setAudits(auditsData);

            // Extract unique domains
            const uniqueDomains = [...new Set(auditsData.map(a => safeHostname(a.domain_url)).filter(Boolean))];
            setDomains(uniqueDomains);

            // Build trend data (last 10 audits in chronological order)
            const completedAudits = auditsData
                .filter(a => a.status === 'complete' && a.overall_score !== null)
                .slice(0, 10)
                .reverse();

            const trends = completedAudits.map(a => ({
                date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: a.overall_score || 0
            }));
            setTrendData(trends);

        } catch (error: any) {
            console.error('Failed to load audits:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredAudits = useMemo(() => {
        const now = Date.now();
        const rangeCutoff: Record<string, number> = {
            '7d': now - 7 * 24 * 60 * 60 * 1000,
            '30d': now - 30 * 24 * 60 * 60 * 1000,
            '90d': now - 90 * 24 * 60 * 60 * 1000,
            'all': 0,
        };
        const cutoff = rangeCutoff[dateRange] ?? 0;

        return audits.filter(a => {
            const hostname = safeHostname(a.domain_url) || a.domain_url;
            const matchesDomain = selectedDomain === 'all' || hostname === selectedDomain;
            const matchesSearch = searchQuery === '' || hostname.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = dateRange === 'all' || new Date(a.created_at).getTime() >= cutoff;
            return matchesDomain && matchesSearch && matchesDate;
        });
    }, [audits, selectedDomain, searchQuery, dateRange]);

    const getStatusBadge = (status: string) => {
        const styles = {
            complete: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            failed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    if (loading) {
        return <HistorySkeleton />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-3 rounded-xl">
                        <History className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Audit History</h3>
                        <p className="text-sm text-slate-400">{audits.length} total audits</p>
                    </div>
                </div>
                <button
                    onClick={loadAudits}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Score Trend Chart */}
            {trendData.length > 1 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Score Trend (Last 10 Audits)
                    </h4>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    width={30}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#scoreGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Filters */}
            {audits.length > 0 && (
                <div className="space-y-3">
                    {/* Date Range Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        {([
                            { value: '7d', label: '7 Days' },
                            { value: '30d', label: '30 Days' },
                            { value: '90d', label: '90 Days' },
                            { value: 'all', label: 'All Time' },
                        ] as const).map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setDateRange(value)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    dateRange === value
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Search + Domain Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by domain..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-600"
                            />
                        </div>
                        {domains.length > 1 && (
                            <div className="flex items-center gap-3">
                                <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <select
                                    value={selectedDomain}
                                    onChange={(e) => setSelectedDomain(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="all">All Domains ({audits.length})</option>
                                    {domains.map(domain => (
                                        <option key={domain} value={domain}>
                                            {domain} ({audits.filter(a => safeHostname(a.domain_url) === domain).length})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Audits List */}
            {filteredAudits.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    {audits.length === 0 ? (
                        <>
                            <h4 className="font-semibold text-white mb-2 text-lg">No Audits Yet</h4>
                            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                                Run your first AI visibility audit to discover how AI search engines see your brand.
                            </p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                            >
                                <Zap className="w-4 h-4" /> Start Your First Audit
                            </button>
                        </>
                    ) : (
                        <>
                            <h4 className="font-medium text-white mb-2">No Matches</h4>
                            <p className="text-sm text-slate-400">Try a different search term or domain filter.</p>
                            <button onClick={() => { setSearchQuery(''); setSelectedDomain('all'); setDateRange('all'); }} className="mt-3 text-xs text-primary hover:text-white transition-colors">
                                Clear filters
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAudits.map((audit, index) => {
                        const previousAudit = filteredAudits[index + 1];
                        const hostname = safeHostname(audit.domain_url) || audit.domain_url;
                        const externalUrl = audit.domain_url.startsWith('http')
                            ? audit.domain_url
                            : audit.domain_url.includes('.')
                                ? `https://${audit.domain_url}`
                                : null;
                        return (
                            <div
                                key={audit.id}
                                onClick={() => audit.status === 'complete' && navigate(`/results/${audit.id}`)}
                                className={`bg-slate-900/50 border border-slate-800 rounded-xl p-4 transition-colors group ${audit.status === 'complete' ? 'hover:border-primary/40 cursor-pointer' : 'hover:border-slate-700'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <ScoreIndicator
                                            score={audit.overall_score || 0}
                                            previousScore={previousAudit?.overall_score ?? undefined}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                                                    {hostname}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(audit.status)}`}>
                                                    {audit.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(audit.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                {externalUrl && (
                                                    <a
                                                        href={externalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 hover:text-primary transition-colors"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View Site
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/results/${audit.id}`)}
                                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-primary text-sm font-medium transition-opacity"
                                    >
                                        View Report
                                        <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
