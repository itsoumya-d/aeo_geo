import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRewriteSimulations, RewriteSimulation } from '../services/supabase';
import { Layout, ArrowRight, TrendingUp, Sparkles, Clock, Trash2, ShieldCheck, Zap, RefreshCw, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AEOForge } from './AEOForge';

export const OptimizationDashboard: React.FC = () => {
    const { organization } = useAuth();
    const [simulations, setSimulations] = useState<RewriteSimulation[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'FORGE' | 'LIBRARY'>('FORGE');

    useEffect(() => {
        if (organization?.id) {
            loadSimulations();
        }
    }, [organization?.id]);

    const loadSimulations = async () => {
        if (!organization?.id) return;
        setLoading(true);
        const data = await getRewriteSimulations(organization.id);
        setSimulations(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing Strategy Library</p>
            </div>
        );
    }

    if (simulations.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-blue-50 backdrop-blur-xl border border-white/5 rounded-3xl p-16 text-center flex flex-col items-center justify-center shadow-2xl"
            >
                <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 shadow-inner">
                    <Sparkles className="w-10 h-10 text-slate-700" />
                </div>
                <h3 className="text-white font-black text-xl mb-3 tracking-tight">No Optimized Paths Found</h3>
                <p className="text-slate-500 max-w-sm mx-auto font-medium text-sm leading-relaxed mb-8">
                    Optimize your content in the Page Audit tab using the rewrite simulator to build your strategic entity library.
                </p>
                <button className="bg-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-105 transition-transform">Start First Analysis</button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                        <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
                            {view === 'FORGE' ? <Sparkles className="text-primary w-6 h-6" /> : <ShieldCheck className="text-primary w-6 h-6" />}
                        </div>
                        {view === 'FORGE' ? 'Neural AEO Forge' : 'Strategic Optimization Library'}
                    </h2>
                    <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
                        {view === 'FORGE'
                            ? 'Engineer high-confidence semantic variants designed to increase LLM retrieval probability and citation weight.'
                            : 'A historical repository of optimized signals and their predicted impact on answer engine retrieval.'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                    <button
                        onClick={() => setView('FORGE')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'FORGE' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <PenTool className="w-3.5 h-3.5" /> Forge
                    </button>
                    <button
                        onClick={() => setView('LIBRARY')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'LIBRARY' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Clock className="w-3.5 h-3.5" /> Library
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {view === 'FORGE' ? (
                    <motion.div
                        key="forge"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AEOForge />
                    </motion.div>
                ) : (
                    <motion.div
                        key="library"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 gap-8"
                    >
                        {simulations.length === 0 ? (
                            <div className="bg-blue-50 backdrop-blur-xl border border-white/5 rounded-3xl p-24 text-center flex flex-col items-center justify-center">
                                <Sparkles className="w-12 h-12 text-slate-800 mb-6" />
                                <h3 className="text-white font-black text-xl mb-3">Library Empty</h3>
                                <p className="text-slate-500 max-w-sm font-medium text-sm">Forge your first optimization to start building your library.</p>
                            </div>
                        ) : (
                            simulations.map((sim, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={sim.id}
                                    className="bg-blue-50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl group hover:border-white/10 transition-all"
                                >
                                    <div className="bg-white/[0.02] border-b border-white/[0.05] flex items-center justify-between px-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(sim.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Neural Signal Analysis</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/10">
                                                <span className="text-[9px] text-emerald-400 uppercase font-black tracking-widest">Impact Delta:</span>
                                                <span className="text-sm font-black text-emerald-400">
                                                    {sim.score_delta > 0 ? '+' : ''}{sim.score_delta}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">
                                        <div className="p-8 bg-black/20">
                                            <div className="text-[9px] text-slate-600 uppercase font-black mb-4 tracking-[0.2em]">Baseline Fragment</div>
                                            <p className="text-sm text-text-muted italic leading-relaxed font-medium">"{sim.original_text}"</p>
                                        </div>
                                        <div className="p-8 bg-primary/5">
                                            <div className="text-[9px] text-primary uppercase font-black mb-4 tracking-[0.2em] flex justify-between items-center">
                                                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div> Optimized Signal</span>
                                                <TrendingUp className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-sm text-white font-black leading-relaxed">"{sim.rewrite_text}"</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.03] p-6 border-t border-white/[0.05] flex items-center gap-4">
                                        <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/10">
                                            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                                        </div>
                                        <div>
                                            <span className="text-emerald-500 font-black uppercase tracking-[0.1em] text-[9px] block mb-1">Strategic Neural Logic</span>
                                            <div className="text-xs text-text-muted font-medium leading-relaxed">{sim.reasoning}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

