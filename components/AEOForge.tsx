import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, RefreshCw, Check, Copy, AlertCircle, Quote, TrendingUp, ChevronDown } from 'lucide-react';
import { simulateRewriteAnalysis } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { saveRewriteSimulation } from '../services/supabase';
import { useToast } from './Toast';

type Goal = 'SNIPPET' | 'AUTHORITY' | 'CLARITY' | 'CONVERSION';
type Tone = 'PROFESSIONAL' | 'AUTHORITATIVE' | 'CONVERSATIONAL' | 'TECHNICAL';

export const AEOForge: React.FC = () => {
    const [original, setOriginal] = useState("");
    const [optimized, setOptimized] = useState("");
    const [goal, setGoal] = useState<Goal>('AUTHORITY');
    const [tone, setTone] = useState<Tone>('PROFESSIONAL');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ scoreDelta: number, reasoning: string, vectorShift: number } | null>(null);
    const { organization } = useAuth();
    const toast = useToast();

    const forgeOptimization = async () => {
        if (!original.trim()) {
            toast.error("Input Required", "Please enter some content to optimize.");
            return;
        }

        setLoading(true);
        try {
            const res = await simulateRewriteAnalysis(original, "", "General Optimization", goal, tone);
            setOptimized(res.rewrite || "");
            setResult(res);

            if (organization?.id) {
                await saveRewriteSimulation({
                    organization_id: organization.id,
                    audit_page_id: null,
                    original_text: original,
                    rewrite_text: res.rewrite || "",
                    score_delta: res.scoreDelta,
                    vector_shift: res.vectorShift || 0,
                    reasoning: res.reasoning
                });
            }
            toast.success("Optimization Forged", "New semantic variant generated successfully.");
        } catch (error) {
            toast.error("Forge Failed", "The neural engine encountered an error.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(optimized);
        toast.info("Copied", "Optimized content copied to clipboard.");
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Control Bar */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-center gap-6 shadow-2xl">
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Optimization Goal</label>
                        <div className="relative group">
                            <select
                                value={goal}
                                onChange={(e) => setGoal(e.target.value as Goal)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="AUTHORITY">Maximize Authority</option>
                                <option value="SNIPPET">Featured Snippet Hook</option>
                                <option value="CLARITY">Neural Simplicity</option>
                                <option value="CONVERSION">Visibility-to-Click</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tone of Voice</label>
                        <div className="relative group">
                            <select
                                value={tone}
                                onChange={(e) => setTone(e.target.value as Tone)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="PROFESSIONAL">Professional</option>
                                <option value="AUTHORITATIVE">Authoritative</option>
                                <option value="CONVERSATIONAL">Conversational</option>
                                <option value="TECHNICAL">Technical Deep-Dive</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                </div>
                <button
                    onClick={forgeOptimization}
                    disabled={loading}
                    className="w-full lg:w-auto bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 shrink-0"
                >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Forging...' : 'Forge Optimization'}
                </button>
            </div>

            {/* Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Input Panel */}
                <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-white/[0.02] border-b border-white/[0.05] px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Quote className="w-4 h-4 text-slate-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Input</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{original.length} Characters</span>
                    </div>
                    <textarea
                        value={original}
                        onChange={(e) => setOriginal(e.target.value)}
                        placeholder="Paste your baseline content here (e.g., pricing description, hero section, or key value props)..."
                        className="flex-1 min-h-[400px] w-full bg-transparent p-8 text-slate-300 text-sm font-medium leading-relaxed outline-none resize-none placeholder:text-slate-700 placeholder:italic"
                    />
                </div>

                {/* Output Panel */}
                <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative group">
                    <div className="bg-primary/5 border-b border-white/[0.05] px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="w-4 h-4 text-primary fill-primary/20" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Neural Optimized Core</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {optimized && (
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
                                    title="Copy to Clipboard"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative flex flex-col">
                        <textarea
                            value={optimized}
                            readOnly
                            placeholder="Optimization variant will appear here..."
                            className="flex-1 min-h-[400px] w-full bg-transparent p-8 text-white text-sm font-bold leading-relaxed outline-none resize-none placeholder:text-slate-800"
                        />

                        {!optimized && !loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                                <Sparkles className="w-12 h-12 text-slate-800 mb-4" />
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Awaiting Simulation</p>
                            </div>
                        )}

                        {loading && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center space-y-6">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-black uppercase tracking-[0.2em] text-xs">Simulating Gravity</p>
                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">Analyzing latent vector shifts...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Impact Widget */}
                    <AnimatePresence>
                        {result && !loading && (
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute bottom-6 left-6 right-6 p-6 bg-slate-900/90 backdrop-blur-2xl border border-primary/20 rounded-2xl shadow-[0_10px_30px_rgba(99,102,241,0.2)]"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Visibility Index Δ</span>
                                            <span className={`text-2xl font-black ${result.scoreDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {result.scoreDelta > 0 ? '+' : ''}{result.scoreDelta}%
                                            </span>
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Semantic Shift</span>
                                            <span className="text-2xl font-black text-blue-400">
                                                {result.vectorShift.toFixed(3)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/10 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Enhanced Citation</span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium leading-relaxed border-t border-white/5 pt-4 flex gap-3">
                                    <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-slate-200">Neural Logic:</strong> {result.reasoning}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
