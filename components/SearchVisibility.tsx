import React, { useState } from 'react';
import { Report, AIPlatform } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { CheckCircle, XCircle, Search, Copy, Terminal, Activity, Hash, Zap, RefreshCw, ExternalLink, Info, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function SentimentBadge({ score }: { score: number | null | undefined }) {
    if (score === null || score === undefined) return null;
    if (score > 0.3) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold text-green-700 bg-green-50 border-green-200">
            <TrendingUp className="w-3 h-3" /> Positive
        </span>
    );
    if (score < -0.3) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold text-rose-700 bg-rose-50 border-rose-200">
            <TrendingDown className="w-3 h-3" /> Negative
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold text-slate-600 bg-slate-50 border-slate-200">
            <Minus className="w-3 h-3" /> Neutral
        </span>
    );
}
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
            case AIPlatform.CHATGPT: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
            case AIPlatform.GEMINI: return 'text-blue-700 bg-blue-50 border-blue-200';
            case AIPlatform.CLAUDE: return 'text-amber-700 bg-amber-50 border-amber-200';
            case AIPlatform.PERPLEXITY: return 'text-purple-700 bg-purple-50 border-purple-200';
            case AIPlatform.DEEPSEEK: return 'text-sky-700 bg-sky-50 border-sky-200';
            default: return 'text-text-muted bg-background border-border';
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Top Section: SEO Health & Keywords */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SEO Health Score */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-blue-50 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-border shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <Activity className="w-32 h-32 text-primary" />
                    </div>
                    <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-6">AI Visibility Score</h3>
                    <div className="flex items-end gap-3 mb-6">
                        <span className="text-7xl font-black text-text-primary tracking-tighter">
                            {report.seoAudit?.technicalHealth || 0}
                        </span>
                        <span className="text-xl text-text-secondary mb-2 font-black opacity-50">/100</span>
                    </div>
                    <div className="w-full bg-background h-2.5 rounded-full overflow-hidden border border-border">
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
                    className="lg:col-span-2 bg-blue-50 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-border shadow-2xl relative overflow-hidden flex flex-col"
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
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d6e4f0', borderRadius: '12px' }}
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
                <div className="bg-blue-50 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-border shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-emerald-500/10 p-2.5 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-text-primary font-black text-lg tracking-tight">Active Optimizations</h3>
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
                                    <span className="text-sm text-text-secondary font-medium leading-relaxed">{item}</span>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-text-muted font-bold text-xs uppercase tracking-widest py-8 text-center italic border-2 border-dashed border-border rounded-2xl">No active optimizations found</div>
                        )}
                    </div>
                </div>

                {/* Missing */}
                <div className="bg-blue-50 backdrop-blur-xl rounded-3xl p-8 border border-border shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-rose-500/10 p-2.5 rounded-xl">
                            <XCircle className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h3 className="text-text-primary font-black text-lg tracking-tight">Missing Optimizations</h3>
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
                                    <span className="text-sm text-text-secondary font-medium leading-relaxed">{item}</span>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-text-muted font-bold text-xs uppercase tracking-widest py-8 text-center italic border-2 border-dashed border-border rounded-2xl">All critical paths optimized</div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Search Queries Simulation */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-4">
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
                            className="bg-blue-50 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 hover:border-primary/20 transition-all group shadow-2xl"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPlatformColor(sq.platform)}`}>
                                        {sq.platform}
                                    </span>
                                    <span className="text-[10px] text-text-muted font-black uppercase tracking-widest bg-background px-3 py-1.5 rounded-lg border border-border shadow-inner">
                                        {sq.intent} Intent
                                    </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border">
                                    <Target className="w-3.5 h-3.5 text-text-muted" />
                                </div>
                            </div>
                            <div className="bg-background p-6 rounded-2xl font-mono text-xs text-text-secondary mb-8 border border-border group-hover:border-primary/30 transition-colors leading-relaxed break-words overflow-hidden">
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
                                    className="w-12 h-12 bg-background hover:bg-slate-50 text-text-muted hover:text-text-primary rounded-xl transition-all flex items-center justify-center border border-border"
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
                                        className="mt-6 p-5 rounded-2xl bg-background border border-border text-[11px] text-text-secondary overflow-hidden"
                                    >
                                        <div className="font-black text-text-muted mb-3 flex justify-between items-center text-[9px] uppercase tracking-widest">
                                            <span>Response Verified</span>
                                            <div className="flex items-center gap-2">
                                                <SentimentBadge score={visibilityResults[idx].sentiment} />
                                                {visibilityResults[idx].citationFound && <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">POSITIVE MATCH</span>}
                                            </div>
                                        </div>
                                        <div className="line-clamp-4 italic font-medium text-text-secondary bg-surface p-3 rounded-xl border-l-2 border-primary/30 leading-relaxed mb-4">
                                            "{visibilityResults[idx].answer}"
                                        </div>
                                        {visibilityResults[idx].rank && (
                                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tighter pt-3 border-t border-border">
                                                <span className="flex items-center gap-2">Confidence <span className="text-text-primary">High</span></span>
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
