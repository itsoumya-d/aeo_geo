import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Report, AIPlatform } from '../../types';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';
import { Target, Users, TrendingUp, AlertCircle, ShieldCheck, Sparkles, Plus, X, Trash2, Loader2, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getCompetitors, addCompetitor, removeCompetitor, getCompetitorBenchmarks, CompetitorSummary } from '../../services/competitorService';
import { useToast } from '../Toast';
import { BenchmarkTabSkeleton } from './TabSkeletons';

interface BenchmarkTabProps {
    report: Report;
}

export const BenchmarkTab: React.FC<BenchmarkTabProps> = ({ report }) => {
    const toast = useToast();
    const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(['You', 'Market Average']);
    const [competitors, setCompetitors] = useState<CompetitorSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadCompetitors();
    }, []);

    const loadCompetitors = async () => {
        setLoading(true);
        try {
            const data = await getCompetitorBenchmarks();
            setCompetitors(data);
        } catch (err) {
            console.error('Failed to load competitors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCompetitor = async () => {
        if (!newDomain.trim()) return;
        setIsAdding(true);
        try {
            const result = await addCompetitor(newDomain, newName || undefined);
            if (result) {
                toast.success('Competitor Added', `${newDomain} is now being tracked.`);
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

    const handleRemoveCompetitor = async (id: string, domain: string) => {
        const success = await removeCompetitor(id);
        if (success) {
            toast.success('Removed', `${domain} is no longer being tracked.`);
            loadCompetitors();
        }
    };

    // Build radar data from report and competitors
    const radarData = [
        { subject: 'Technical Depth', You: report.overallScore, 'Market Average': 75, ...Object.fromEntries(competitors.map(c => [c.name || c.domain, c.latestScore || 50])) },
        { subject: 'Brand Trust', You: 85, 'Market Average': 70, ...Object.fromEntries(competitors.map(c => [c.name || c.domain, Math.round((c.latestScore || 50) * 0.9)])) },
        { subject: 'Citation Share', You: 60, 'Market Average': 80, ...Object.fromEntries(competitors.map(c => [c.name || c.domain, Math.round((c.latestScore || 50) * 0.7)])) },
        { subject: 'Neural Clarity', You: 70, 'Market Average': 65, ...Object.fromEntries(competitors.map(c => [c.name || c.domain, Math.round((c.latestScore || 50) * 0.85)])) },
        { subject: 'E-A-T Score', You: report.brandConsistnecyScore, 'Market Average': 60, ...Object.fromEntries(competitors.map(c => [c.name || c.domain, Math.round((c.latestScore || 50) * 0.95)])) },
    ];

    const radarColors: Record<string, string> = {
        'You': '#6366f1',
        'Market Average': '#94a3b8',
        ...Object.fromEntries(competitors.map((c, i) => [c.name || c.domain, ['#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'][i % 5]]))
    };

    const allCompetitorNames = ['You', 'Market Average', ...competitors.map(c => c.name || c.domain)];

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
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                        <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
                            <Users className="text-primary w-6 h-6" />
                        </div>
                        Market Intelligence
                    </h2>
                    <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
                        Benchmark your AI visibility against top competitors. Identify topic gaps and share-of-voice shifts across major neural engines.
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

            {/* Tracked Competitors Quick View */}
            {competitors.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {competitors.map((comp) => (
                        <div key={comp.domain} className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 group hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: radarColors[comp.name || comp.domain] }} />
                                    <span className="text-sm font-bold text-white truncate max-w-[120px]">{comp.name || comp.domain}</span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-black ${comp.scoreChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {comp.scoreChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {Math.abs(comp.scoreChange)}%
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-3xl font-black text-white">{comp.latestScore}</span>
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
                {/* Radar Comparison */}
                <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 sm:p-10 shadow-2xl">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" /> Multi-Dimensional Gap Analysis
                    </h3>
                    <div className="flex flex-wrap gap-3 mb-10">
                        {allCompetitorNames.map(name => (
                            <button
                                key={name}
                                onClick={() => {
                                    if (selectedCompetitors.includes(name)) {
                                        setSelectedCompetitors(selectedCompetitors.filter(n => n !== name));
                                    } else {
                                        setSelectedCompetitors([...selectedCompetitors, name]);
                                    }
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCompetitors.includes(name) ? 'bg-white/5 border-white/20 text-white' : 'border-transparent text-slate-600 hover:text-slate-400'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: radarColors[name] || '#64748b' }} />
                                    {name}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                {selectedCompetitors.map((name) => (
                                    <Radar
                                        key={name}
                                        name={name}
                                        dataKey={name}
                                        stroke={radarColors[name] || '#64748b'}
                                        fill={radarColors[name] || '#64748b'}
                                        fillOpacity={name === 'You' ? 0.3 : 0.05}
                                        strokeWidth={name === 'You' ? 3 : 1.5}
                                    />
                                ))}
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        borderRadius: '24px',
                                        padding: '16px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                    }}
                                    itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Score Cards */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-3xl">
                        <TrendingUp className="text-emerald-400 w-8 h-8 mb-4" />
                        <h4 className="text-white font-bold text-xl mb-2">Competitive Edge</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            You currently outperform the market in <span className="text-emerald-400 font-bold">Brand Consistency</span> by 15%. This increases your citation probability in complex long-form AI queries.
                        </p>
                    </div>

                    <div className="bg-rose-500/5 border border-rose-500/10 p-8 rounded-3xl">
                        <AlertCircle className="text-rose-400 w-8 h-8 mb-4" />
                        <h4 className="text-white font-bold text-xl mb-2">Critical Gap</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            <span className="text-rose-400 font-bold">Citation Depth</span> is 20% lower than top competitors. They are effectively owning high-intent queries related to your core features.
                        </p>
                    </div>

                    {competitors.length === 0 && (
                        <div className="bg-primary/5 border border-primary/10 p-8 rounded-3xl text-center">
                            <Users className="text-primary w-8 h-8 mb-4 mx-auto" />
                            <h4 className="text-white font-bold text-xl mb-2">No Competitors Tracked</h4>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                Add your first competitor to start benchmarking AI visibility.
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold"
                            >
                                Add Competitor
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Competitor SOV Table */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 sm:p-10 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400" /> Share of Voice Breakdown
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4">Entity</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-center">AEO Score</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-center">Change</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-center">Last Updated</th>
                                <th className="pb-6 text-[10px] uppercase font-black text-slate-500 tracking-widest px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            <tr className="group">
                                <td className="py-6 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span className="text-sm font-bold text-white uppercase tracking-tight">Your Brand</span>
                                    </div>
                                </td>
                                <td className="py-6 px-4 text-center font-black text-white">{report.overallScore}</td>
                                <td className="py-6 px-4 text-center text-emerald-400 font-bold text-xs">+12% ↑</td>
                                <td className="py-6 px-4 text-center text-slate-500 text-xs">Now</td>
                                <td className="py-6 px-4 text-right">-</td>
                            </tr>
                            {competitors.map((comp) => (
                                <tr key={comp.domain} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: radarColors[comp.name || comp.domain] }} />
                                            <span className="text-sm font-bold text-slate-400">{comp.name || comp.domain}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center font-bold text-slate-300">{comp.latestScore}</td>
                                    <td className={`py-6 px-4 text-center font-bold text-xs ${comp.scoreChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {comp.scoreChange >= 0 ? '+' : ''}{comp.scoreChange}% {comp.scoreChange >= 0 ? '↑' : '↓'}
                                    </td>
                                    <td className="py-6 px-4 text-center text-slate-500 text-xs">
                                        {new Date(comp.lastUpdated).toLocaleDateString()}
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <button
                                            onClick={() => handleRemoveCompetitor(comp.domain, comp.domain)}
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
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">Track New Competitor</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Domain *</label>
                                    <input
                                        type="text"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        placeholder="competitor.com"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary outline-none"
                                    />
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
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 px-6 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddCompetitor}
                                    disabled={!newDomain.trim() || isAdding}
                                    className="flex-1 py-3 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Add Competitor
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
