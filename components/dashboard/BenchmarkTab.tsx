import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Report, AIPlatform } from '../../types';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { Users, Plus, X, Trash2, Loader2, RefreshCw, BarChart3, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { addCompetitor, removeCompetitor, getCompetitorBenchmarks, CompetitorSummary } from '../../services/competitorService';
import { useToast } from '../Toast';
import { useAuth } from '../../contexts/AuthContext';
import { BenchmarkTabSkeleton } from './TabSkeletons';
import { safeHostname } from '../../utils/validation';

interface BenchmarkTabProps {
    report: Report;
}

export const BenchmarkTab: React.FC<BenchmarkTabProps> = ({ report }) => {
    const toast = useToast();
    const { currentWorkspace } = useAuth();
    const [competitors, setCompetitors] = useState<CompetitorSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [bulkDomains, setBulkDomains] = useState('');
    const [duplicateError, setDuplicateError] = useState('');
    type Metric = 'Overall' | AIPlatform;
    const metricOptions: Metric[] = ['Overall', AIPlatform.CHATGPT, AIPlatform.GEMINI, AIPlatform.CLAUDE, AIPlatform.PERPLEXITY];
    const [metric, setMetric] = useState<Metric>('Overall');

    useEffect(() => {
        loadCompetitors();
    }, [currentWorkspace?.id]);

    const loadCompetitors = async () => {
        setLoading(true);
        try {
            const data = await getCompetitorBenchmarks(currentWorkspace?.id);
            setCompetitors(data);
        } catch (err) {
            console.error('Failed to load competitors:', err);
        } finally {
            setLoading(false);
        }
    };

    const cleanDomainStr = (raw: string) =>
        raw.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0].toLowerCase().trim();

    const handleAddCompetitor = async () => {
        if (!newDomain.trim()) return;
        setDuplicateError('');

        const clean = cleanDomainStr(newDomain);

        // Client-side duplicate check before hitting the API
        const isDuplicate = competitors.some(c => cleanDomainStr(c.domain) === clean);
        if (isDuplicate) {
            setDuplicateError(`${clean} is already being tracked.`);
            return;
        }

        setIsAdding(true);
        try {
            const result = await addCompetitor(newDomain, newName || undefined, currentWorkspace?.id);
            if (result) {
                toast.success('Competitor Added', `${clean} is now being tracked.`);
                setShowAddModal(false);
                setNewDomain('');
                setNewName('');
                loadCompetitors();
            } else {
                toast.error('Failed', 'Could not add competitor. Please try again.');
            }
        } catch (err) {
            toast.error('Error', 'Something went wrong.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleBulkImport = async () => {
        const lines = bulkDomains
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length === 0) return;

        setIsAdding(true);
        let added = 0;
        let skipped = 0;

        for (const line of lines) {
            const clean = cleanDomainStr(line);
            const isDuplicate = competitors.some(c => cleanDomainStr(c.domain) === clean);
            if (isDuplicate) { skipped++; continue; }

            const result = await addCompetitor(clean, undefined, currentWorkspace?.id);
            if (result) added++;
            else skipped++;
        }

        setIsAdding(false);
        setBulkDomains('');
        setShowAddModal(false);
        loadCompetitors();
        toast.success(
            'Bulk import complete',
            `${added} competitor${added !== 1 ? 's' : ''} added${skipped > 0 ? `, ${skipped} skipped (already tracked)` : ''}.`
        );
    };

    const handleRemoveCompetitor = async (id: string, domain: string) => {
        const success = await removeCompetitor(id);
        if (success) {
            toast.success('Removed', `${domain} is no longer being tracked.`);
            loadCompetitors();
        }
    };

    const palette = ['#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];
    const colorByDomain = useMemo(() => {
        const map: Record<string, string> = {};
        competitors.forEach((c, i) => {
            map[c.domain] = palette[i % palette.length];
        });
        return map;
    }, [competitors]);

    const getYourScore = (m: Metric): number | null => {
        if (m === 'Overall') return report.overallScore ?? null;
        const match = report.platformScores?.find((ps) => ps.platform === m);
        return typeof match?.score === 'number' ? match.score : null;
    };

    const getCompetitorScore = (comp: CompetitorSummary, m: Metric): number | null => {
        if (m === 'Overall') return typeof comp.latestScore === 'number' ? comp.latestScore : null;
        const match = comp.platformScores?.find((ps) => ps.platform === m);
        return typeof match?.score === 'number' ? match.score : null;
    };

    const yourScore = useMemo(() => getYourScore(metric), [metric, report]);
    const peerAverage = useMemo(() => {
        const scores = competitors.map((c) => getCompetitorScore(c, metric)).filter((s): s is number => typeof s === 'number');
        if (scores.length === 0) return null;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }, [competitors, metric]);

    const comparisonData = useMemo(() => {
        const rows: Array<{ name: string; score: number; color: string }> = [];

        if (typeof yourScore === 'number') {
            rows.push({ name: 'You', score: yourScore, color: '#6366f1' });
        }

        if (typeof peerAverage === 'number') {
            rows.push({ name: 'Peers avg', score: peerAverage, color: '#94a3b8' });
        }

        for (const comp of competitors) {
            const score = getCompetitorScore(comp, metric);
            if (typeof score !== 'number') continue;
            rows.push({
                name: comp.name || safeHostname(comp.domain),
                score,
                color: colorByDomain[comp.domain] || '#64748b',
            });
        }

        return rows;
    }, [colorByDomain, competitors, metric, peerAverage, yourScore]);

    const missingCompetitorScores = useMemo(() => {
        return competitors.filter((c) => getCompetitorScore(c, metric) === null).length;
    }, [competitors, metric]);

    if (loading) {
        return <BenchmarkTabSkeleton />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 text-left"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
                            <Users className="text-primary w-6 h-6" />
                        </div>
                        Market Intelligence
                    </h2>
                    <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
                        Benchmark your AI visibility against competitors and track how scores shift across platforms over time.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" />
                        Track Competitor
                    </button>
                    <button
                        onClick={loadCompetitors}
                        className="px-6 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border border-white/5"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Competitive Position Summary */}
            {competitors.length > 0 && typeof yourScore === 'number' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                        const allScores = [yourScore, ...competitors.map(c => c.latestScore).filter((s): s is number => typeof s === 'number')];
                        allScores.sort((a, b) => b - a);
                        const rank = allScores.indexOf(yourScore) + 1;
                        const wins = competitors.filter(c => (c.latestScore ?? 0) < yourScore).length;
                        const losses = competitors.filter(c => (c.latestScore ?? 0) > yourScore).length;
                        return (
                            <>
                                <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-6 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-2">Your Rank</p>
                                    <p className="text-4xl font-black text-primary">#{rank}</p>
                                    <p className="text-xs text-slate-500 mt-1">of {allScores.length}</p>
                                </div>
                                <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-6 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 mb-2">Outperforming</p>
                                    <p className="text-4xl font-black text-emerald-400">{wins}</p>
                                    <p className="text-xs text-slate-500 mt-1">competitors</p>
                                </div>
                                <div className="bg-rose-500/10 rounded-2xl border border-rose-500/20 p-6 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400/70 mb-2">Behind</p>
                                    <p className="text-4xl font-black text-rose-400">{losses}</p>
                                    <p className="text-xs text-slate-500 mt-1">competitors</p>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Tracked Competitors Quick View */}
            {competitors.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {competitors.map((comp) => (
                        <div key={comp.domain} className="bg-white backdrop-blur-xl rounded-2xl border border-slate-200 p-6 group hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorByDomain[comp.domain] || '#64748b' }} />
                                    <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{comp.name || comp.domain}</span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-black ${comp.scoreChange > 0 ? 'text-emerald-400' : comp.scoreChange < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                    {comp.scoreChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : comp.scoreChange < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                    {comp.scoreChange > 0 ? '+' : ''}{comp.scoreChange} pts
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-3xl font-black text-slate-900">{comp.latestScore}</span>
                                    <span className="text-slate-500 text-sm ml-1">/100</span>
                                </div>
                                <span className="text-[9px] text-slate-600 font-medium">
                                    {new Date(comp.lastUpdated).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 bg-white backdrop-blur-xl rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xl">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" /> Score comparison
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-8">
                        {metricOptions.map((m) => (
                            <button
                                key={m}
                                onClick={() => setMetric(m)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${metric === m ? 'bg-slate-900 text-white border-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                            >
                                {m === 'Overall' ? 'Overall' : m}
                            </button>
                        ))}
                    </div>

                    {comparisonData.length > 0 ? (
                        <>
                            <div className="h-[240px] sm:h-[320px] lg:h-[380px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={comparisonData}
                                        layout="vertical"
                                        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                                    >
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={120}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 14)}…` : String(v))}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                borderColor: '#e2e8f0',
                                                borderRadius: '16px',
                                                padding: '12px 14px',
                                                border: '1px solid #e2e8f0',
                                            }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}
                                        />
                                        <Bar dataKey="score" radius={[10, 10, 10, 10]}>
                                            {comparisonData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {metric !== 'Overall' && missingCompetitorScores > 0 ? (
                                <p className="mt-6 text-xs text-slate-500 leading-relaxed">
                                    {missingCompetitorScores} competitor{missingCompetitorScores === 1 ? '' : 's'} don’t have a recent {metric} benchmark yet.
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <div className="py-16 text-center text-slate-500">
                            No benchmarks available for this metric yet.
                        </div>
                    )}
                </div>

                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white backdrop-blur-xl rounded-3xl border border-slate-200 p-8 shadow-xl">
                        <h4 className="text-slate-900 font-bold text-lg">How benchmarking works</h4>
                        <p className="text-slate-500 text-sm leading-relaxed mt-3">
                            We compare your latest audit scores against the most recent benchmarks stored for your tracked competitors.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-5 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Add competitor
                            </button>
                            <button
                                onClick={loadCompetitors}
                                className="px-5 py-3 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-white/5"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {competitors.length === 0 ? (
                    <div className="bg-primary/5 border border-primary/10 p-8 rounded-3xl text-center">
                        <Users className="text-primary w-8 h-8 mb-4 mx-auto" />
                        <h4 className="text-slate-900 font-bold text-xl mb-2">No competitors tracked</h4>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                Add a competitor domain to begin benchmarking.
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold"
                            >
                                Track competitor
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Competitor Benchmarks Table */}
            <div className="bg-white backdrop-blur-xl rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400" /> Competitive benchmarks
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4">Entity</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-center">Visibility score</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-center">Change (pts)</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-center">Last Updated</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            <tr className="group">
                                <td className="py-6 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">Your Brand</span>
                                    </div>
                                </td>
                                <td className="py-6 px-4 text-center font-black text-slate-900">{report.overallScore}</td>
                                <td className="py-6 px-4 text-center text-slate-500 font-bold text-xs">—</td>
                                <td className="py-6 px-4 text-center text-slate-500 text-xs">This audit</td>
                                <td className="py-6 px-4 text-right">-</td>
                            </tr>
                            {competitors.map((comp) => (
                                <tr key={comp.domain} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorByDomain[comp.domain] || '#64748b' }} />
                                            <span className="text-sm font-bold text-slate-400 truncate max-w-[240px]">{comp.name || comp.domain}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center font-bold text-slate-300">{comp.latestScore}</td>
                                    <td className={`py-6 px-4 text-center font-bold text-xs ${comp.scoreChange > 0 ? 'text-emerald-400' : comp.scoreChange < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                        {comp.scoreChange > 0 ? '+' : ''}{comp.scoreChange}
                                    </td>
                                    <td className="py-6 px-4 text-center text-slate-500 text-xs">
                                        {new Date(comp.lastUpdated).toLocaleDateString()}
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <button
                                            onClick={() => handleRemoveCompetitor(comp.id, comp.domain)}
                                            className="p-2 text-slate-600 hover:text-rose-400 transition-colors"
                                            title="Remove competitor"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Competitor Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-xl font-bold text-white">Track Competitors</h3>
                                <button onClick={() => { setShowAddModal(false); setDuplicateError(''); }} aria-label="Close" className="p-2 text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Mode tabs */}
                            <div className="flex gap-1 bg-black/30 p-1 rounded-xl mb-5">
                                {(['single', 'bulk'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => { setAddMode(mode); setDuplicateError(''); }}
                                        className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors capitalize ${addMode === mode ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {mode === 'single' ? 'Single Domain' : 'Bulk Import'}
                                    </button>
                                ))}
                            </div>

                            {addMode === 'single' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Domain *</label>
                                        <input
                                            type="text"
                                            value={newDomain}
                                            onChange={(e) => { setNewDomain(e.target.value); setDuplicateError(''); }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
                                            placeholder="competitor.com"
                                            className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary outline-none transition-colors ${duplicateError ? 'border-rose-500/50' : 'border-white/10'}`}
                                        />
                                        {duplicateError && (
                                            <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> {duplicateError}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Display Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Competitor Inc."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                        <button onClick={() => { setShowAddModal(false); setDuplicateError(''); }} className="flex-1 py-3 px-6 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-sm transition-all">Cancel</button>
                                        <button
                                            onClick={handleAddCompetitor}
                                            disabled={!newDomain.trim() || isAdding}
                                            className="flex-1 py-3 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Add Competitor
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Domains (one per line)</label>
                                        <textarea
                                            value={bulkDomains}
                                            onChange={(e) => setBulkDomains(e.target.value)}
                                            placeholder={"competitor1.com\ncompetitor2.com\ncompetitor3.com"}
                                            rows={6}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary outline-none font-mono text-sm resize-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">{bulkDomains.split('\n').filter(l => l.trim()).length} domains</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 px-6 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-sm transition-all">Cancel</button>
                                        <button
                                            onClick={handleBulkImport}
                                            disabled={!bulkDomains.trim() || isAdding}
                                            className="flex-1 py-3 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Import All
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
