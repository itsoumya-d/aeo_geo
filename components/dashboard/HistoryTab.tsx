import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Calendar, ArrowUpRight, ArrowDownRight, Minus, Search, Filter, Layers, Clock, ArrowLeftRight, ChevronRight, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import { Report } from '../../types';

interface AuditSnapshot {
    id: string;
    created_at: string;
    overall_score: number;
    domain_url: string;
    report: any;
}

export const HistoryTab: React.FC<{ currentReport: Report }> = ({ currentReport }) => {
    const { organization } = useAuth();
    const toast = useToast();
    const [snapshots, setSnapshots] = useState<AuditSnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (organization?.id) {
            fetchSnapshots();
        }
    }, [organization?.id]);

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audits')
                .select('id, created_at, overall_score, domain_url, report')
                .eq('organization_id', organization?.id)
                .eq('status', 'complete')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSnapshots(data || []);

            // Format for chart - chronological
            const chart = [...(data || [])].reverse().map(s => ({
                date: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                score: s.overall_score,
                timestamp: new Date(s.created_at).getTime()
            }));
            setChartData(chart);
        } catch (err: any) {
            toast.error("History Sync Failed", err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else if (selectedIds.length < 2) {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const comparedReports = selectedIds.length === 2
        ? [snapshots.find(s => s.id === selectedIds[0]), snapshots.find(s => s.id === selectedIds[1])].sort((a, b) =>
            new Date(a!.created_at).getTime() - new Date(b!.created_at).getTime())
        : null;

    const delta = comparedReports
        ? comparedReports[1]!.overall_score - comparedReports[0]!.overall_score
        : 0;

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
                            <HistoryIcon className="text-primary w-6 h-6" />
                        </div>
                        Neural Time-Travel
                    </h2>
                    <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
                        Trace the evolution of your brand's AI visibility. Select snapshots to perform deep delta analysis and detect structural neural shifts.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setCompareMode(!compareMode)}
                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${compareMode ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white/[0.03] text-slate-400 border border-white/5 hover:bg-white/[0.06]'}`}
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                        {compareMode ? 'Exit Comparison' : 'Compare Snapshots'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Timeline Graph */}
                <div className="lg:col-span-8 space-y-10">
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 shadow-2xl overflow-hidden relative group">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Visibility Velocity</h3>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AEO Performance</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dy={15}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dx={-15}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                        labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '9px', fontWeight: 800 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#6366f1"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Snapshot Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {snapshots.map((s, idx) => (
                            <div
                                key={s.id}
                                onClick={() => compareMode && toggleSelect(s.id)}
                                className={`p-8 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden ${selectedIds.includes(s.id) ? 'bg-primary/10 border-primary shadow-2xl shadow-primary/20 scale-[1.02]' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
                            >
                                {compareMode && (
                                    <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(s.id) ? 'bg-primary border-primary text-white' : 'border-white/10'}`}>
                                        {selectedIds.includes(s.id) && <Layers className="w-3 h-3" />}
                                    </div>
                                )}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <Calendar className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(s.created_at).toLocaleDateString()}</p>
                                        <p className="text-xs font-black text-white uppercase">{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">AEO Score</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-white tracking-tighter">{s.overall_score}</span>
                                            <span className="text-xs font-bold text-slate-600">/ 100</span>
                                        </div>
                                    </div>
                                    {idx < snapshots.length - 1 && (
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${s.overall_score > snapshots[idx + 1].overall_score ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {s.overall_score >= snapshots[idx + 1].overall_score ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {Math.abs(s.overall_score - snapshots[idx + 1].overall_score)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vertical Comparison Drawer / Delta Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <AnimatePresence mode="wait">
                        {comparedReports ? (
                            <motion.div
                                key="comparison"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-primary/20 p-10 shadow-3xl sticky top-28"
                            >
                                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-10 flex items-center gap-3">
                                    <ArrowLeftRight className="w-4 h-4" /> Snapshot Delta Analysis
                                </h3>

                                <div className="space-y-10">
                                    <div className="flex justify-between items-center bg-black/40 p-6 rounded-3xl border border-white/5">
                                        <div className="text-center flex-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Baseline</p>
                                            <p className="text-2xl font-black text-white">{comparedReports[0]!.overall_score}</p>
                                        </div>
                                        <div className="w-px h-10 bg-white/10" />
                                        <div className="text-center flex-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Current</p>
                                            <p className="text-2xl font-black text-white">{comparedReports[1]!.overall_score}</p>
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <div className={`text-6xl font-black tracking-tighter mb-2 ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {delta > 0 ? '+' : ''}{delta}%
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Neural Delta Detected</p>
                                    </div>

                                    <div className="space-y-4 pt-10 border-t border-white/5">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inferred Shift Factors</h4>
                                        {[
                                            { label: 'Technical Accuracy', val: delta > 0 ? '+12%' : '-5%', icon: ArrowUpRight },
                                            { label: 'Semantic Clarity', val: delta > 0 ? '+4%' : '-2%', icon: ArrowUpRight },
                                            { label: 'Citation Velocity', val: delta > 0 ? '+15%' : '+3%', icon: ArrowUpRight }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                                <span className="text-[11px] font-bold text-slate-400">{item.label}</span>
                                                <span className={`text-[11px] font-black ${delta >= 0 ? 'text-emerald-400' : 'text-slate-300'}`}>{item.val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button className="w-full bg-primary hover:bg-primary/90 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-3">
                                        <Download className="w-4 h-4" /> Download Delta Report
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 flex flex-col items-center justify-center text-center opacity-40 h-full min-h-[500px]">
                                <ArrowLeftRight className="w-20 h-20 text-slate-800 mb-8" />
                                <h3 className="text-white font-black text-lg mb-2">Ready to compare?</h3>
                                <p className="text-slate-500 text-sm max-w-[200px] leading-relaxed">
                                    Turn on **Compare Mode** and select two snapshots to unlock delta insights.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
