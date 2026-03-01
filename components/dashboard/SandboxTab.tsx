import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Trash2, Zap, Target, Brain, Info, Trophy, ChevronRight } from 'lucide-react';
import { simulateSandboxCompare } from '../../services/geminiService';
import { SandboxCompareResult, SandboxCandidateResult } from '../../supabase/functions/_shared/types';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../../utils/errors';

export const SandboxTab: React.FC = () => {
    const toast = useToast();
    const [goal, setGoal] = useState("");
    const [variantA, setVariantA] = useState("");
    const [variantB, setVariantB] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SandboxCompareResult | null>(null);

    const handleSimulation = async () => {
        if (!goal || !variantA || !variantB) {
            toast.error("Incomplete Data", "Please provide a goal and both variants to begin simulation.");
            return;
        }

        setLoading(true);
        try {
            const data = await simulateSandboxCompare(goal, variantA, variantB);

            if (!data) throw new Error("Comparison unavailable");

            setResults(data);
            toast.success("Simulation complete", "Your variants have been compared successfully.");
        } catch (err: any) {
            console.error('Sandbox simulation failed:', getTechnicalErrorMessage(err));
            const user = toUserMessage(err);
            toast.error(user.title, user.message);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => {
        setGoal("");
        setVariantA("");
        setVariantB("");
        setResults(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-12 text-left"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                        <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
                            <Sparkles className="text-primary w-6 h-6" />
                        </div>
                        A/B Sandbox
                    </h2>
                    <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
                        Compare two versions of your copy against a clear goal and see which one is more likely to perform better across AI platforms.
                    </p>
                </div>
                {results && (
                    <button onClick={clear} className="text-slate-500 hover:text-rose-500 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 border border-white/5 rounded-xl">
                        <Trash2 className="w-4 h-4" /> Reset
                    </button>
                )}
            </div>

            {/* Config & Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-12">
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 shadow-2xl space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-primary" />
                                <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Optimization goal</label>
                            </div>
                            <input
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                placeholder="e.g., Establish 'Cognition' as the world's most secure AEO tool for agencies."
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-primary/50 transition-all placeholder:text-slate-700 shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                {/* Variant A */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="flex items-center justify-between px-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Variant A: Candidate</h3>
                        {results && results.a.score > results.b.score && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5"><Trophy className="w-3 h-3" /> Winner</span>}
                    </div>
                    <div className={`group transition-all duration-500 ${results && results.a.score > results.b.score ? 'ring-2 ring-emerald-500/50' : ''}`}>
                        <textarea
                            value={variantA}
                            onChange={(e) => setVariantA(e.target.value)}
                            readOnly={!!results}
                            placeholder="Paste variant A here..."
                            className="w-full h-80 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 text-sm text-slate-300 font-medium outline-none focus:border-white/20 transition-all shadow-2xl resize-none leading-relaxed"
                        />
                    </div>
                    {results && <MetricCard result={results.a} />}
                </div>

                {/* Variant B */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="flex items-center justify-between px-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Variant B: Challenger</h3>
                        {results && results.b.score > results.a.score && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5"><Trophy className="w-3 h-3" /> Winner</span>}
                    </div>
                    <div className={`group transition-all duration-500 ${results && results.b.score > results.a.score ? 'ring-2 ring-emerald-500/50' : ''}`}>
                        <textarea
                            value={variantB}
                            onChange={(e) => setVariantB(e.target.value)}
                            readOnly={!!results}
                            placeholder="Paste variant B here..."
                            className="w-full h-80 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 text-sm text-slate-300 font-medium outline-none focus:border-white/20 transition-all shadow-2xl resize-none leading-relaxed"
                        />
                    </div>
                    {results && <MetricCard result={results.b} />}
                </div>
            </div>

            {/* Simulation Trigger */}
            {!results && (
                <div className="flex justify-center pt-10">
                    <button
                        onClick={handleSimulation}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 text-white px-20 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-3xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 group"
                    >
                        {loading ? <Zap className="w-5 h-5 animate-pulse" /> : <Brain className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                        {loading ? 'Running simulation…' : 'Run simulation'}
                    </button>
                </div>
            )}
        </motion.div>
    );
};

const MetricCard = ({ result }: { result: SandboxCandidateResult }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 space-y-8"
    >
        <div className="flex items-end justify-between">
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Visibility confidence</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white tracking-tighter">{result.score}%</span>
                    <span className="text-xs font-bold text-slate-600">/ 100</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`w-1.5 h-6 rounded-full ${i <= Math.round(result.score / 20) ? 'bg-primary' : 'bg-white/5'}`} />
                    ))}
                </div>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Signal strength</span>
            </div>
        </div>

        <div className="pt-6 border-t border-white/5 grid grid-cols-3 gap-4">
            {result.platformScores.map((ps, i) => (
                <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-600 uppercase mb-1">{ps.platform}</p>
                    <p className="text-sm font-black text-white">{ps.score}</p>
                </div>
            ))}
        </div>

        <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Why this scores</span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{result.reasoning}</p>
        </div>
    </motion.div>
);
