import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Target, Copy, Check, ChevronDown, Filter, CheckCircle2, EyeOff } from 'lucide-react';
import { Report, Recommendation } from '../../types';

interface RecommendationWithPage extends Recommendation {
    pageUrl: string;
}

type TagType = 'QUICK_WIN' | 'HIGH_IMPACT' | 'STRATEGIC' | 'NORMAL';
type FilterMode = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

function getTag(r: Recommendation): TagType {
    if (r.impact === 'HIGH' && r.effort === 'LOW') return 'QUICK_WIN';
    if (r.impact === 'HIGH') return 'HIGH_IMPACT';
    if (r.effort === 'LOW') return 'STRATEGIC';
    return 'NORMAL';
}

function impactScore(r: Recommendation): number {
    const impactVal = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const effortVal = { LOW: 3, MEDIUM: 2, HIGH: 1 }; // lower effort = better rank
    return impactVal[r.impact] * 10 + effortVal[r.effort];
}

const TAG_CONFIG: Record<TagType, { label: string; className: string; icon: React.ReactNode }> = {
    QUICK_WIN: {
        label: 'Quick Win',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <Zap className="w-3 h-3" />,
    },
    HIGH_IMPACT: {
        label: 'High Impact',
        className: 'bg-red-50 text-red-700 border-red-200',
        icon: <TrendingUp className="w-3 h-3" />,
    },
    STRATEGIC: {
        label: 'Strategic',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: <Target className="w-3 h-3" />,
    },
    NORMAL: {
        label: 'Normal',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: null,
    },
};

const EFFORT_LABEL = { HIGH: 'High effort', MEDIUM: 'Medium effort', LOW: 'Low effort' };
const IMPACT_LABEL = { HIGH: 'High impact', MEDIUM: 'Medium impact', LOW: 'Low impact' };

function CopySnippet({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
        >
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
    );
}

function RecommendationCard({ rec, onStatusChange }: { rec: RecommendationWithPage; onStatusChange: (id: string, status: 'DONE' | 'IGNORED' | 'OPEN') => void }) {
    const [expanded, setExpanded] = useState(false);
    const tag = getTag(rec);
    const tagConfig = TAG_CONFIG[tag];
    const isDone = rec.status === 'DONE';
    const isIgnored = rec.status === 'IGNORED';

    return (
        <div className={`bg-white border rounded-xl overflow-hidden transition-opacity ${isDone ? 'opacity-60' : isIgnored ? 'opacity-40' : ''} ${tag === 'QUICK_WIN' ? 'border-emerald-200' : tag === 'HIGH_IMPACT' ? 'border-red-200' : 'border-blue-100'}`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-start justify-between p-4 text-left hover:bg-slate-50 transition-colors gap-3"
            >
                <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                        {isDone
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <div className={`w-2 h-2 rounded-full mt-1.5 ${tag === 'QUICK_WIN' ? 'bg-emerald-400' : tag === 'HIGH_IMPACT' ? 'bg-red-400' : 'bg-blue-400'}`} />
                        }
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            {tag !== 'NORMAL' && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagConfig.className}`}>
                                    {tagConfig.icon}
                                    {tagConfig.label}
                                </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">{rec.location}</span>
                        </div>
                        <p className={`text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>{rec.issue}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{rec.pageUrl}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${rec.impact === 'HIGH' ? 'bg-red-50 text-red-600' : rec.impact === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                            {IMPACT_LABEL[rec.impact]}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-medium ${rec.effort === 'LOW' ? 'bg-emerald-50 text-emerald-600' : rec.effort === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                            {EFFORT_LABEL[rec.effort]}
                        </span>
                    </div>
                    <span className={`text-slate-400 transition-transform text-xs ${expanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
            </button>

            {expanded && (
                <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">What to do</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{rec.instruction}</p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Why it matters for AI</p>
                        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3 leading-relaxed">{rec.aiReasoning}</p>
                    </div>

                    {rec.snippet && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current snippet</p>
                                <CopySnippet text={rec.snippet} />
                            </div>
                            <pre className="bg-slate-900 text-slate-300 text-[11px] p-3 rounded-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{rec.snippet}</pre>
                        </div>
                    )}

                    {rec.suggested && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">AI-suggested rewrite</p>
                                <CopySnippet text={rec.suggested} />
                            </div>
                            <pre className="bg-emerald-900/10 border border-emerald-200 text-emerald-800 text-[11px] p-3 rounded-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{rec.suggested}</pre>
                        </div>
                    )}

                    {rec.generatedSchema && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Generated JSON-LD</p>
                                <CopySnippet text={rec.generatedSchema} />
                            </div>
                            <pre className="bg-slate-900 text-green-400 text-[11px] p-3 rounded-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">{rec.generatedSchema}</pre>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                        {!isDone && (
                            <button
                                onClick={() => onStatusChange(rec.id, 'DONE')}
                                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                            </button>
                        )}
                        {isDone && (
                            <button
                                onClick={() => onStatusChange(rec.id, 'OPEN')}
                                className="flex items-center gap-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                            >
                                Reopen
                            </button>
                        )}
                        {!isIgnored && !isDone && (
                            <button
                                onClick={() => onStatusChange(rec.id, 'IGNORED')}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 transition-colors font-medium"
                            >
                                <EyeOff className="w-3.5 h-3.5" /> Ignore
                            </button>
                        )}
                        {isIgnored && (
                            <button
                                onClick={() => onStatusChange(rec.id, 'OPEN')}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 transition-colors font-medium"
                            >
                                Unignore
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface RecommendationsTabProps {
    report: Report;
}

export const RecommendationsTab: React.FC<RecommendationsTabProps> = ({ report }) => {
    const [filter, setFilter] = useState<FilterMode>('ALL');
    const [showDone, setShowDone] = useState(false);
    const [statuses, setStatuses] = useState<Record<string, 'OPEN' | 'DONE' | 'IGNORED'>>({});

    // Flatten all recommendations across pages
    const allRecs: RecommendationWithPage[] = report.pages.flatMap(page =>
        (page.recommendations || []).map(r => ({ ...r, pageUrl: page.url }))
    );

    const handleStatusChange = (id: string, status: 'DONE' | 'IGNORED' | 'OPEN') => {
        setStatuses(prev => ({ ...prev, [id]: status }));
    };

    const getStatus = (rec: RecommendationWithPage) =>
        statuses[rec.id] ?? rec.status ?? 'OPEN';

    // Apply filters
    const filtered = allRecs
        .filter(r => {
            const status = getStatus(r);
            if (!showDone && (status === 'DONE' || status === 'IGNORED')) return false;
            if (filter !== 'ALL' && r.impact !== filter) return false;
            return true;
        })
        .sort((a, b) => impactScore(b) - impactScore(a));

    const quickWins = allRecs.filter(r => getTag(r) === 'QUICK_WIN' && getStatus(r) === 'OPEN').length;
    const highImpact = allRecs.filter(r => r.impact === 'HIGH' && getStatus(r) === 'OPEN').length;
    const doneCount = allRecs.filter(r => getStatus(r) === 'DONE').length;

    if (allRecs.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
            >
                <div className="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100">
                    <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">No recommendations yet</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                    Run your first audit to generate AI-powered improvement recommendations.
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-blue-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <Target className="text-blue-600 w-5 h-5" />
                        </div>
                        Improvement Recommendations
                    </h2>
                    <p className="text-slate-500 mt-1 text-sm">Sorted by impact × effort. Quick Wins first.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-semibold">{quickWins} quick wins</span>
                    <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg text-xs font-semibold">{highImpact} high impact</span>
                    {doneCount > 0 && <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-semibold">{doneCount} done</span>}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Filter className="w-3.5 h-3.5" />
                    <span className="font-medium">Impact:</span>
                </div>
                {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as FilterMode[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
                    >
                        {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                ))}
                <button
                    onClick={() => setShowDone(!showDone)}
                    className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${showDone
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {showDone ? 'Hide completed' : 'Show completed'}
                </button>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="bg-white border border-blue-100 rounded-xl p-10 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">All recommendations addressed!</p>
                    <p className="text-sm text-slate-400 mt-1">No open items match the current filter.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(rec => (
                        <RecommendationCard
                            key={`${rec.pageUrl}-${rec.id}`}
                            rec={{ ...rec, status: getStatus(rec) }}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};
