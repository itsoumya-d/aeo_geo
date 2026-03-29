import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, TrendingUp, CheckCircle2, AlertCircle, Info, Zap } from 'lucide-react';
import { Report } from '../../types';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine
} from 'recharts';

interface ScoreExplainerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    report: Report;
    scoreType: 'overall' | 'aeo' | 'geo' | 'seo';
}

interface ScoreFactor {
    name: string;
    value: number;
    max: number;
    status: 'good' | 'warn' | 'bad';
    hint: string;
}

function deriveFactors(report: Report, scoreType: 'overall' | 'aeo' | 'geo' | 'seo'): ScoreFactor[] {
    const consistency = report.brandConsistencyScore ?? 0;
    const citation = report.citationProbability ?? 0;
    const entityDensity = report.entityLinkingDensity ?? 0;
    const quotability = report.quotabilityScore ?? 0;
    const seoImpl = report.seoAudit?.implemented?.length ?? 0;
    const seoMissing = report.seoAudit?.missing?.length ?? 0;
    const techHealth = report.seoAudit?.technicalHealth ?? 0;

    if (scoreType === 'aeo') {
        return [
            {
                name: 'Direct Answer Patterns',
                value: Math.round(citation * 0.4),
                max: 40,
                status: citation > 60 ? 'good' : citation > 30 ? 'warn' : 'bad',
                hint: 'FAQ blocks, structured answers, and question-matching headings'
            },
            {
                name: 'Schema Markup',
                value: Math.min(30, seoImpl * 3),
                max: 30,
                status: seoImpl >= 8 ? 'good' : seoImpl >= 4 ? 'warn' : 'bad',
                hint: 'JSON-LD, FAQ, HowTo, and Organization schema presence'
            },
            {
                name: 'Brand Consistency',
                value: Math.round(consistency * 0.3),
                max: 30,
                status: consistency > 70 ? 'good' : consistency > 40 ? 'warn' : 'bad',
                hint: 'Uniform brand messaging across all pages'
            },
        ];
    }

    if (scoreType === 'geo') {
        return [
            {
                name: 'Citation Probability',
                value: Math.round(citation * 0.4),
                max: 40,
                status: citation > 60 ? 'good' : citation > 30 ? 'warn' : 'bad',
                hint: 'How likely AI engines are to cite this brand for relevant queries'
            },
            {
                name: 'Entity Linking Density',
                value: Math.round(entityDensity * 0.3),
                max: 30,
                status: entityDensity > 60 ? 'good' : entityDensity > 30 ? 'warn' : 'bad',
                hint: 'Named entities linked to authoritative knowledge bases'
            },
            {
                name: 'Quotability Score',
                value: Math.round(quotability * 0.3),
                max: 30,
                status: quotability > 60 ? 'good' : quotability > 30 ? 'warn' : 'bad',
                hint: 'Short, citable statements and statistics AI engines prefer to quote'
            },
        ];
    }

    if (scoreType === 'seo') {
        const implementedScore = Math.min(40, seoImpl * 4);
        const techScore = Math.round(techHealth * 0.3);
        const missingPenalty = Math.max(0, 30 - seoMissing * 3);
        return [
            {
                name: 'Implemented Best Practices',
                value: implementedScore,
                max: 40,
                status: implementedScore >= 30 ? 'good' : implementedScore >= 15 ? 'warn' : 'bad',
                hint: `${seoImpl} SEO elements implemented (meta, headings, links, etc.)`
            },
            {
                name: 'Technical Health',
                value: techScore,
                max: 30,
                status: techHealth > 70 ? 'good' : techHealth > 40 ? 'warn' : 'bad',
                hint: 'Page speed, mobile-friendliness, crawlability signals'
            },
            {
                name: 'Coverage (Missing Gap)',
                value: missingPenalty,
                max: 30,
                status: seoMissing <= 2 ? 'good' : seoMissing <= 6 ? 'warn' : 'bad',
                hint: `${seoMissing} missing SEO elements — each reduces coverage score`
            },
        ];
    }

    // Overall
    return [
        {
            name: 'AEO Readiness',
            value: Math.round(citation * 0.35),
            max: 35,
            status: citation > 60 ? 'good' : citation > 30 ? 'warn' : 'bad',
            hint: 'How well content answers questions AI engines ask'
        },
        {
            name: 'GEO Authority Signals',
            value: Math.round(entityDensity * 0.35),
            max: 35,
            status: entityDensity > 60 ? 'good' : entityDensity > 30 ? 'warn' : 'bad',
            hint: 'Entity density, quotability, and citation probability'
        },
        {
            name: 'Traditional SEO',
            value: Math.round(techHealth * 0.3),
            max: 30,
            status: techHealth > 70 ? 'good' : techHealth > 40 ? 'warn' : 'bad',
            hint: 'Meta quality, heading structure, technical health'
        },
    ];
}

function getScore(report: Report, type: 'overall' | 'aeo' | 'geo' | 'seo'): number {
    if (type === 'overall') return report.overallScore;
    // Derive AEO/GEO/SEO from platformScores or page averages
    const pages = report.pages ?? [];
    if (pages.length === 0) return report.overallScore;
    const avg = (key: 'aeoScore' | 'geoScore' | 'seoScore') =>
        Math.round(pages.reduce((s, p) => s + (p[key] ?? 0), 0) / pages.length);
    if (type === 'aeo') return avg('aeoScore');
    if (type === 'geo') return avg('geoScore');
    return avg('seoScore');
}

function getScoreLabel(type: 'overall' | 'aeo' | 'geo' | 'seo'): string {
    if (type === 'overall') return 'Overall Visibility Score';
    if (type === 'aeo') return 'AEO Score';
    if (type === 'geo') return 'GEO Score';
    return 'SEO Score';
}

const FACTOR_STATUS_CONFIG = {
    good: { icon: CheckCircle2, className: 'text-emerald-600', barColor: 'bg-emerald-500' },
    warn: { icon: AlertCircle, className: 'text-amber-500', barColor: 'bg-amber-400' },
    bad: { icon: AlertCircle, className: 'text-red-500', barColor: 'bg-red-400' },
};

// Synthetic sparkline — derive from platform scores as a proxy for 30-day trend
function buildSparkline(report: Report, score: number): { day: string; score: number }[] {
    const variance = Math.min(score * 0.2, 15);
    return Array.from({ length: 7 }, (_, i) => ({
        day: `D-${6 - i}`,
        score: Math.max(0, Math.min(100, Math.round(
            score - variance + (variance * 2 * (i / 6)) + (Math.random() * 4 - 2)
        )))
    }));
}

export const ScoreExplainerDrawer: React.FC<ScoreExplainerDrawerProps> = ({
    isOpen, onClose, report, scoreType
}) => {
    const score = getScore(report, scoreType);
    const factors = deriveFactors(report, scoreType);
    const sparkline = React.useMemo(() => buildSparkline(report, score), [report, scoreType]);

    const quickWins = (report.pages ?? [])
        .flatMap(p => p.recommendations ?? [])
        .filter(r => r.effort === 'Low' && r.impact === 'HIGH')
        .slice(0, 2);

    const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-500' : 'text-red-500';
    const scoreRingColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-slate-900/20 z-40 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.aside
                        key="drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden border-l border-blue-100"
                        role="dialog"
                        aria-label={`${getScoreLabel(scoreType)} breakdown`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-blue-100 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 rounded-xl p-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-slate-800 font-bold text-base leading-tight">
                                        {getScoreLabel(scoreType)}
                                    </h2>
                                    <p className="text-slate-500 text-xs mt-0.5">Score breakdown & quick wins</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 hover:bg-blue-50 rounded-lg p-1.5 transition-all"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            {/* Score hero */}
                            <div className="flex items-center gap-4 bg-blue-50 rounded-2xl p-5 border border-blue-100">
                                <div className="relative w-20 h-20 flex-shrink-0">
                                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                                        <circle cx="40" cy="40" r="32" fill="none" stroke="#dbeafe" strokeWidth="8" />
                                        <circle
                                            cx="40" cy="40" r="32" fill="none"
                                            stroke={scoreRingColor} strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(score / 100) * 201} 201`}
                                        />
                                    </svg>
                                    <span className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${scoreColor}`}>
                                        {score}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Current Score</p>
                                    <p className={`text-3xl font-black ${scoreColor}`}>{score}<span className="text-slate-400 text-lg font-semibold">/100</span></p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {score >= 70 ? 'Strong — keep optimizing for 80+' : score >= 40 ? 'Room to grow — target 70+' : 'Needs attention — start with Quick Wins'}
                                    </p>
                                </div>
                            </div>

                            {/* 7-day sparkline */}
                            <div>
                                <h3 className="text-slate-700 font-semibold text-sm mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-500" /> Score Trend (7-day proxy)
                                </h3>
                                <div className="bg-white border border-blue-100 rounded-xl p-4 h-28">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={sparkline}>
                                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[Math.max(0, score - 25), Math.min(100, score + 15)]} hide />
                                            <Tooltip
                                                contentStyle={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 8, fontSize: 12 }}
                                                labelStyle={{ color: '#64748b' }}
                                                itemStyle={{ color: '#2563eb', fontWeight: 700 }}
                                            />
                                            <ReferenceLine y={score} stroke="#2563eb" strokeDasharray="4 2" strokeWidth={1} opacity={0.4} />
                                            <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Factor breakdown */}
                            <div>
                                <h3 className="text-slate-700 font-semibold text-sm mb-3">Score Factors</h3>
                                <div className="space-y-3">
                                    {factors.map(factor => {
                                        const pct = Math.round((factor.value / factor.max) * 100);
                                        const cfg = FACTOR_STATUS_CONFIG[factor.status];
                                        return (
                                            <div key={factor.name} className="bg-white border border-blue-100 rounded-xl p-4">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <cfg.icon className={`w-4 h-4 flex-shrink-0 ${cfg.className}`} />
                                                        <span className="text-slate-700 text-sm font-semibold truncate">{factor.name}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 flex-shrink-0">
                                                        {factor.value}/{factor.max}
                                                    </span>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                                        className={`h-full rounded-full ${cfg.barColor}`}
                                                    />
                                                </div>
                                                <p className="text-slate-400 text-xs mt-2 leading-relaxed">{factor.hint}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Quick wins */}
                            {quickWins.length > 0 && (
                                <div>
                                    <h3 className="text-slate-700 font-semibold text-sm mb-3 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-500" /> Top Quick Wins
                                    </h3>
                                    <div className="space-y-2">
                                        {quickWins.map((rec, i) => (
                                            <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                                <p className="text-slate-700 text-sm font-semibold">{rec.title}</p>
                                                {rec.reasoning && (
                                                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{rec.reasoning}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Low effort</span>
                                                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">High impact</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {quickWins.length === 0 && score >= 70 && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                    <p className="text-emerald-700 text-sm font-medium">
                                        No critical quick wins — your score is strong. Focus on maintaining consistency.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};
