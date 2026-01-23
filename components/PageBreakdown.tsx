import React, { useState } from 'react';
import { PageAnalysis, Recommendation } from '../types';
import { ChevronDown, RefreshCw, Layout, FileCode, Search, Code, Check, Zap, Target, ArrowRight } from 'lucide-react';
import { simulateRewriteAnalysis } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { saveRewriteSimulation } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface PageBreakdownProps {
    page: PageAnalysis;
}

export const PageBreakdown: React.FC<PageBreakdownProps> = ({ page }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300 shadow-2xl group"
        >
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 sm:p-8 cursor-pointer hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
                <div className="flex items-center gap-4 sm:gap-8">
                    <div className="relative flex-shrink-0">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-inner ${page.quoteLikelihood > 60 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'}`}>
                            {page.quoteLikelihood}%
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-slate-900 rounded-full border border-white/10 flex items-center justify-center">
                            <Target className={`w-2.5 h-2.5 sm:w-3 h-3 ${page.quoteLikelihood > 60 ? 'text-emerald-400' : 'text-rose-400'}`} />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-1 sm:mb-2">
                            <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-primary transition-colors tracking-tight truncate">{page.title}</h3>
                            <span className="w-fit text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.05] text-slate-400 px-2 py-0.5 rounded-full border border-white/[0.05]">{page.pageType}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium font-mono truncate max-w-[200px] sm:max-w-md bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.03]">{page.url}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-10">
                    <div className="hidden sm:block text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 opacity-60">AI Semantic Signal</div>
                        <div className="text-xs font-bold text-slate-300 max-w-[150px] truncate">{page.aiUnderstanding}</div>
                    </div>
                    <div className="text-left sm:text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 opacity-60">Action Items</div>
                        <div className="text-xs font-black text-white flex sm:justify-end gap-1.5 items-center">
                            <span className="bg-primary/20 text-primary w-5 h-5 rounded-md flex items-center justify-center text-[10px]">{page.recommendations.length}</span>
                            <span className="text-slate-400 uppercase tracking-tighter sm:inline hidden">Detected</span>
                        </div>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/5 ml-auto sm:ml-0"
                    >
                        <ChevronDown className="text-slate-500 w-3 h-3 sm:w-4 sm:h-4" />
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="border-t border-white/[0.05] bg-white/[0.01]"
                    >
                        {/* AI Perception Analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.05]">
                            <div className="bg-slate-900/60 p-10">
                                <div className="flex items-center gap-3 mb-6 text-primary">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Search className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Semantic Recognition</h4>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                                    {page.aiUnderstanding}
                                </p>
                            </div>
                            <div className="bg-slate-900/60 p-10">
                                <div className="flex items-center gap-3 mb-6 text-amber-400">
                                    <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Retrieval Gap Analysis</h4>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                                    {page.aiMissed}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 sm:p-10">
                            <div className="flex items-center justify-between mb-6 sm:mb-10">
                                <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                    <Layout className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                                    Optimization Blueprint
                                </h4>
                                <div className="h-px flex-1 mx-4 sm:mx-8 bg-white/[0.05]"></div>
                            </div>
                            <div className="space-y-6 sm:space-y-8">
                                {page.recommendations.map(rec => (
                                    <RecommendationCard key={rec.id} rec={rec} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const RecommendationCard: React.FC<{ rec: Recommendation }> = ({ rec }) => {
    const [simulating, setSimulating] = useState(false);
    const [draft, setDraft] = useState(rec.suggested || rec.snippet || "");
    const [result, setResult] = useState<{ scoreDelta: number, reasoning: string, vectorShift?: number } | null>(null);
    const [copiedSchema, setCopiedSchema] = useState(false);
    const { organization } = useAuth();

    const runSimulation = async () => {
        setSimulating(true);
        const res = await simulateRewriteAnalysis(rec.snippet || "", draft, rec.issue);
        setResult(res);

        if (organization?.id && res) {
            await saveRewriteSimulation({
                organization_id: organization.id,
                audit_page_id: null,
                original_text: rec.snippet || "",
                rewrite_text: draft,
                score_delta: res.scoreDelta,
                vector_shift: res.vectorShift || 0,
                reasoning: res.reasoning
            });
        }

        setSimulating(false);
    };

    const copySchema = () => {
        if (rec.generatedSchema) {
            navigator.clipboard.writeText(rec.generatedSchema);
            setCopiedSchema(true);
            setTimeout(() => setCopiedSchema(false), 2000);
        }
    };

    return (
        <motion.div
            whileHover={{ x: 5 }}
            className="bg-white/[0.02] border border-white/[0.05] rounded-2xl sm:rounded-3xl p-4 sm:p-8 hover:bg-white/[0.03] hover:border-white/10 transition-all group"
        >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 mb-10">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <span className={`px-3 sm:px-4 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${rec.impact === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {rec.impact} Impact
                        </span>
                        <span className={`px-3 sm:px-4 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-white/[0.05] text-slate-400 border border-white/[0.05]`}>
                            {rec.effort} Effort
                        </span>
                        <div className="h-3 sm:h-4 w-px bg-white/10 hidden sm:block"></div>
                        <span className="text-[9px] sm:text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest truncate max-w-[120px]">
                            {rec.location}
                        </span>
                    </div>
                    <h5 className="font-black text-white text-lg sm:text-xl mb-3 sm:mb-4 tracking-tight group-hover:text-primary transition-colors leading-tight">{rec.issue}</h5>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium mb-6 sm:mb-8">{rec.instruction}</p>

                    {/* Schema Generator UI */}
                    {rec.generatedSchema && (
                        <div className="mt-8 bg-black/40 rounded-2xl border border-white/5 overflow-hidden shadow-Inner">
                            <div className="flex items-center justify-between px-6 py-4 bg-white/[0.03] border-b border-white/5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                    <Code className="w-4 h-4 text-primary" /> Vectorized Metadata (JSON-LD)
                                </span>
                                <button
                                    onClick={copySchema}
                                    className="text-[10px] font-black text-primary hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"
                                >
                                    {copiedSchema ? <><Check className="w-3 h-3" /> Ready</> : <><RefreshCw className="w-3 h-3" /> Copy Schema</>}
                                </button>
                            </div>
                            <pre className="p-6 text-xs font-mono text-emerald-400/90 overflow-x-auto whitespace-pre-wrap leading-relaxed custom-scrollbar">
                                {rec.generatedSchema}
                            </pre>
                        </div>
                    )}
                </div>
            </div>

            {/* Before/After Simulation Engine */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Current State */}
                <div className="bg-black/40 p-8 rounded-2xl border border-white/5 relative">
                    <div className="text-[10px] text-slate-600 mb-6 font-black uppercase tracking-widest flex justify-between items-center">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500/40"></div> Baseline Content</span>
                        <span className="text-rose-500/60">Fragmented Signal</span>
                    </div>
                    <div className="text-sm font-medium text-slate-400 italic bg-white/[0.02] p-4 rounded-xl border-l-2 border-rose-500/40 mb-6 leading-relaxed">
                        "{rec.snippet}"
                    </div>
                    <div className="text-xs text-slate-500 font-medium leading-loose bg-white/[0.01] p-5 rounded-xl border border-white/5">
                        <span className="text-primary font-black uppercase tracking-widest text-[10px] block mb-2">Neural Analysis</span> {rec.aiReasoning}
                    </div>
                </div>

                {/* Simulation Editor */}
                <div className="bg-gradient-to-br from-primary/5 to-transparent p-px rounded-2xl shadow-2xl">
                    <div className="bg-slate-900/80 backdrop-blur-3xl p-8 rounded-[15px] relative group-focus-within:bg-slate-900 transition-colors h-full">
                        <div className="text-[10px] text-primary mb-6 font-black uppercase tracking-widest flex justify-between items-center">
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div> Neural Optimization Draft</span>
                            <span className="text-primary/60 flex items-center gap-2">
                                <RefreshCw className={`w-3 h-3 ${simulating ? 'animate-spin' : ''}`} /> Engine Sync
                            </span>
                        </div>
                        <textarea
                            className="w-full bg-transparent text-white text-sm font-medium outline-none resize-none border-l-2 border-primary/40 pl-4 py-1 focus:border-primary transition-colors placeholder:text-slate-700 min-h-[120px] leading-relaxed"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Synthesizing optimized signal..."
                        />

                        <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={runSimulation}
                                disabled={simulating}
                                className="text-[10px] bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {simulating ? 'Analyzing Latent Space...' : 'Simulate Gravity'}
                            </motion.button>

                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-6"
                                >
                                    <div className="flex flex-col items-end">
                                        <span className={`text-lg font-black tracking-tighter ${result.scoreDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {result.scoreDelta > 0 ? '+' : ''}{result.scoreDelta}%
                                        </span>
                                        <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Visibility Δ</span>
                                    </div>
                                    <div className="w-px h-8 bg-white/10"></div>
                                    {result.vectorShift !== undefined && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-black tracking-tighter text-blue-400">
                                                {result.vectorShift.toFixed(3)}
                                            </span>
                                            <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Shift</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {result && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-6 text-[11px] text-emerald-400/80 font-bold bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 leading-relaxed"
                            >
                                <span className="text-emerald-500 uppercase tracking-widest text-[9px] block mb-1">Impact Analysis</span> {result.reasoning}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}