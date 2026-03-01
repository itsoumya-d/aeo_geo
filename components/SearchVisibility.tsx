import React, { useState } from 'react';
import { Report, AIPlatform } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { CheckCircle, XCircle, Search, Copy, Terminal, Activity, Hash, Zap, RefreshCw, ExternalLink, Info, Target } from 'lucide-react';
import { checkVisibility, checkVisibilityBatch } from '../services/geminiService';
import { useToast } from './Toast';
import { saveKeywordRanking, getKeywordRankings } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchVisibilityProps {
    report: Report;
    auditId?: string;
}

export const SearchVisibility: React.FC<SearchVisibilityProps> = ({ report, auditId }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [checkingIndex, setCheckingIndex] = useState<number | null>(null);
    const [batchChecking, setBatchChecking] = useState(false);
    const [visibilityResults, setVisibilityResults] = useState<Record<number, any>>({});
    const [loadingInitial, setLoadingInitial] = useState(false);
    const toast = useToast();

    // Load existing rankings if auditId is present
    React.useEffect(() => {
        if (auditId) {
            loadExistingRankings();
        }
    }, [auditId]);

    const loadExistingRankings = async () => {
        if (!auditId) return;
        setLoadingInitial(true);
        const rankings = await getKeywordRankings(auditId);

        const resultsMap: Record<number, any> = {};
        report.searchQueries?.forEach((sq, idx) => {
            const match = rankings.find(r => r.keyword === sq.query && r.platform === sq.platform);
            if (match) {
                resultsMap[idx] = {
                    platform: match.platform,
                    rank: match.rank,
                    citationFound: match.citation_found,
                    sentiment: match.sentiment_score,
                    answer: "Historical data point synchronized."
                };
            }
        });
        setVisibilityResults(resultsMap);
        setLoadingInitial(false);
    };

    const handleCheckVisibility = async (query: string, platform: AIPlatform, index: number) => {
        // All platforms now supported via server-side routing

        setCheckingIndex(index);
        const domain = report.pages[0]?.url ? new URL(report.pages[0].url).hostname : "cognition.ai";

        const result = await checkVisibility(query, domain, platform);

        if (result) {
            setVisibilityResults(prev => ({ ...prev, [index]: result }));

            if (auditId) {
                await saveKeywordRanking({
                    audit_id: auditId,
                    keyword: query,
                    platform: platform,
                    rank: result.rank,
                    citation_found: result.citationFound,
                    sentiment_score: result.sentiment
                });
            }

            if (result.citationFound) {
                toast.success("Visibility Confirmed!", `Your brand was cited in ${platform}'s answer.`);
            } else {
                toast.warning("Not Visible", `Your brand was NOT found in the top answer.`);
            }
        } else {
            toast.error("Check Failed", "Could not verify visibility at this time.");
        }
        setCheckingIndex(null);
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleCheckAllVisibility = async () => {
        if (!report.searchQueries?.length || batchChecking) return;

        setBatchChecking(true);
        const fallbackDomain = report.pages[0]?.url ? new URL(report.pages[0].url).hostname : "cognition.ai";

        const checks = report.searchQueries.map((sq) => ({
            query: sq.query,
            domain: fallbackDomain,
            platform: sq.platform,
        }));

        const results = await checkVisibilityBatch(checks);
        if (!results) {
            toast.error("Batch Check Failed", "Could not verify visibility right now.");
            setBatchChecking(false);
            return;
        }

        const mapped: Record<number, any> = {};
        await Promise.all(results.map(async (result, index) => {
            mapped[index] = result;
            if (auditId && result) {
                await saveKeywordRanking({
                    audit_id: auditId,
                    keyword: report.searchQueries[index].query,
                    platform: report.searchQueries[index].platform,
                    rank: result.rank,
                    citation_found: result.citationFound,
                    sentiment_score: result.sentiment
                });
            }
        }));

        setVisibilityResults(prev => ({ ...prev, ...mapped }));
        const citedCount = results.filter(r => r?.citationFound).length;
        toast.success("Batch Check Complete", `${citedCount}/${results.length} queries cited your brand.`);
        setBatchChecking(false);
    };

    const getPlatformColor = (platform: AIPlatform) => {
        switch (platform) {
            case AIPlatform.CHATGPT: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]';
            case AIPlatform.GEMINI: return 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_10px_rgba(96,165,250,0.1)]';
            case AIPlatform.CLAUDE: return 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]';
            case AIPlatform.PERPLEXITY: return 'text-purple-400 bg-purple-400/10 border-purple-400/20 shadow-[0_0_10px_rgba(192,132,252,0.1)]';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Top Section: SEO Health & Keywords */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SEO Health Score */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/5 shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <Activity className="w-32 h-32 text-primary" />
                    </div>
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6">AI Visibility Score</h3>
                    <div className="flex items-end gap-3 mb-6">
                        <span className="text-7xl font-black text-white tracking-tighter">
                            {report.seoAudit?.technicalHealth || 0}
                        </span>
                        <span className="text-xl text-slate-600 mb-2 font-black opacity-30">/100</span>
                    </div>
                    <div className="w-full bg-white/[0.03] h-2.5 rounded-full overflow-hidden border border-white/[0.05]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${report.seoAudit?.technicalHealth || 0}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] ${report.seoAudit?.technicalHealth > 70 ? 'bg-emerald-500' : report.seoAudit?.technicalHealth > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-6 font-black uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" />
                        Search Engine & AI Readiness
                    </p>
                </motion.div>

                {/* Platform Comparison Chart */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Platform Dominance</h3>
                    </div>

                    <div className="flex-1 w-full min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={report.platformScores || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="platform"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                    itemStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar
                                    dataKey="score"
                                    radius={[8, 8, 0, 0]}
                                    barSize={40}
                                >
                                    {
                                        (report.platformScores || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.platform === 'ChatGPT' ? '#10a37f' :
                                                    entry.platform === 'Claude' ? '#d97757' :
                                                        entry.platform === 'Perplexity' ? '#3b82f6' :
                                                            entry.platform === 'Gemini' ? '#4f46e5' : '#64748b'
                                            } />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Technical Audit Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Implemented */}
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/5 shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-emerald-500/10 p-2.5 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg tracking-tight">Active Optimizations</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Passed Verification</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {report.seoAudit?.implemented?.length > 0 ? (
                            report.seoAudit.implemented.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group hover:border-emerald-500/30 transition-all"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-sm text-slate-300 font-medium leading-relaxed">{item}</span>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-slate-600 font-bold text-xs uppercase tracking-widest py-8 text-center italic border-2 border-dashed border-white/5 rounded-2xl">No active optimizations found</div>
                        )}
                    </div>
                </div>

                {/* Missing */}
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-rose-500/10 p-2.5 rounded-xl">
                            <XCircle className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg tracking-tight">Missing Optimizations</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Action Required</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {report.seoAudit?.missing?.length > 0 ? (
                            report.seoAudit.missing.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-start gap-4 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 group hover:border-rose-500/30 transition-all"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                    <span className="text-sm text-slate-300 font-medium leading-relaxed">{item}</span>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-slate-600 font-bold text-xs uppercase tracking-widest py-8 text-center italic border-2 border-dashed border-white/5 rounded-2xl">All critical paths optimized</div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Search Queries Simulation */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-4">
                            <div className="bg-primary/20 p-2 rounded-xl">
                                <Terminal className="w-5 h-5 text-primary" />
                            </div>
                            AI Platform Visibility Checks
                        </h2>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Verify how AI platforms cite your brand in their responses.</p>
                    </div>
                    <button
                        onClick={handleCheckAllVisibility}
                        disabled={batchChecking || checkingIndex !== null || !report.searchQueries?.length}
                        className="px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/30 transition-colors disabled:opacity-50"
                    >
                        {batchChecking ? 'Running all checks…' : 'Run all checks'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {report.searchQueries?.map((sq, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ scale: 1.01 }}
                            className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 hover:border-white/10 transition-all group shadow-2xl"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPlatformColor(sq.platform)}`}>
                                        {sq.platform}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">
                                        {sq.intent} Intent
                                    </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5">
                                    <Target className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                            </div>
                            <div className="bg-black/40 p-6 rounded-2xl font-mono text-xs text-slate-400 mb-8 border border-white/5 group-hover:border-primary/30 transition-colors leading-relaxed break-words overflow-hidden">
                                <span className="text-primary mr-3 opacity-50">$ cognition test --q</span>
                                "{sq.query}"
                            </div>
                            <div className="flex gap-3">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleCheckVisibility(sq.query, sq.platform, idx)}
                                    disabled={checkingIndex === idx || batchChecking}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl ${visibilityResults[idx]?.citationFound ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10' : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20 disabled:bg-primary/50'}`}
                                >
                                    {checkingIndex === idx ? (
                                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking visibility...</>
                                    ) : visibilityResults[idx] ? (
                                        visibilityResults[idx].citationFound ?
                                            <><CheckCircle className="w-3.5 h-3.5" /> Cited in Top-1 Response</> :
                                            <><XCircle className="w-3.5 h-3.5 text-rose-400" /> Citation Not Found</>
                                    ) : (
                                        <><Zap className="w-3.5 h-3.5" /> Run Verification</>
                                    )}
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => copyToClipboard(sq.query, idx)}
                                    className="w-12 h-12 bg-white/[0.03] hover:bg-white/[0.05] text-slate-500 hover:text-white rounded-xl transition-all flex items-center justify-center border border-white/5"
                                    title="Copy Query"
                                >
                                    {copiedIndex === idx ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </motion.button>
                            </div>

                            {/* Live Result Preview */}
                            <AnimatePresence>
                                {visibilityResults[idx] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="mt-6 p-5 rounded-2xl bg-black/60 border border-white/5 text-[11px] text-slate-500 overflow-hidden"
                                    >
                                        <div className="font-black text-slate-400 mb-3 flex justify-between items-center text-[9px] uppercase tracking-widest">
                                            <span>Response Verified</span>
                                            {visibilityResults[idx].citationFound && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/10">POSITIVE MATCH</span>}
                                        </div>
                                        <div className="line-clamp-4 italic font-medium text-slate-300 bg-white/[0.02] p-3 rounded-xl border-l-2 border-primary/30 leading-relaxed mb-4">
                                            "{visibilityResults[idx].answer}"
                                        </div>
                                        {visibilityResults[idx].rank && (
                                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tighter pt-3 border-t border-white/5">
                                                <span className="flex items-center gap-2">Confidence <span className="text-white">High</span></span>
                                                <span className="flex items-center gap-2">Platform Rank <span className="text-primary">#1</span></span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>

        </div>
    );
};
