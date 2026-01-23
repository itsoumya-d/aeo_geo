import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Audit } from '../services/supabase';
import { useToast } from './Toast';
import {
    History, TrendingUp, TrendingDown, Minus, Calendar, ExternalLink,
    Loader2, ChevronRight, RefreshCw, Filter, ArrowUpRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

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

interface AuditHistoryProps {
    onSelectAudit?: (audit: AuditWithDetails) => void;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({ onSelectAudit }) => {
    const { organization } = useAuth();
    const toast = useToast();

    const [audits, setAudits] = useState<AuditWithDetails[]>([]);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDomain, setSelectedDomain] = useState<string>('all');
    const [domains, setDomains] = useState<string[]>([]);

    useEffect(() => {
        if (organization?.id) {
            loadAudits();
        }
    }, [organization?.id]);

    const loadAudits = async () => {
        if (!organization?.id) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('audits')
                .select('*')
                .eq('organization_id', organization.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const auditsData = (data || []) as AuditWithDetails[];
            setAudits(auditsData);

            // Extract unique domains
            const uniqueDomains = [...new Set(auditsData.map(a =>
                new URL(a.domain_url).hostname
            ))];
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
            console.error('Failed to load audits:', error);
            toast.error('Failed to load history', error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredAudits = selectedDomain === 'all'
        ? audits
        : audits.filter(a => new URL(a.domain_url).hostname === selectedDomain);

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
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
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

            {/* Domain Filter */}
            {domains.length > 1 && (
                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="all">All Domains ({audits.length})</option>
                        {domains.map(domain => (
                            <option key={domain} value={domain}>
                                {domain} ({audits.filter(a => new URL(a.domain_url).hostname === domain).length})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Audits List */}
            {filteredAudits.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                    <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h4 className="font-medium text-white mb-2">No Audits Yet</h4>
                    <p className="text-sm text-slate-400">
                        Run your first AI visibility audit to see it here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAudits.map((audit, index) => {
                        const previousAudit = filteredAudits[index + 1];
                        return (
                            <div
                                key={audit.id}
                                className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <ScoreIndicator
                                            score={audit.overall_score || 0}
                                            previousScore={previousAudit?.overall_score ?? undefined}
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-white">
                                                    {new URL(audit.domain_url).hostname}
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
                                                <a
                                                    href={audit.domain_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    View Site
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onSelectAudit?.(audit)}
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
