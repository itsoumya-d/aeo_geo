import React, { useState, useMemo } from 'react';
import { Report, PageAnalysis } from '../../types';
import { PageBreakdown } from '../PageBreakdown';
import { motion } from 'framer-motion';
import { FileText, Search, SortAsc, AlertTriangle, TrendingDown, Clock, RefreshCw } from 'lucide-react';

interface PagesTabProps {
    report: Report;
    onForceRefresh?: () => void;
}

type SortKey = 'default' | 'aeo_asc' | 'geo_asc' | 'seo_asc';

function scoreColor(score: number | undefined): string {
    if (score === undefined) return 'bg-slate-100 text-slate-500 border-slate-200';
    if (score < 40) return 'bg-red-50 text-red-600 border-red-200';
    if (score < 70) return 'bg-amber-50 text-amber-600 border-amber-200';
    return 'bg-green-50 text-green-600 border-green-200';
}

function ScoreChip({ label, score }: { label: string; score: number | undefined }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${scoreColor(score)}`}>
            {label} {score !== undefined ? score : '–'}
        </span>
    );
}

function sortPages(pages: PageAnalysis[], key: SortKey): PageAnalysis[] {
    if (key === 'aeo_asc') return [...pages].sort((a, b) => (a.aeoScore ?? 100) - (b.aeoScore ?? 100));
    if (key === 'geo_asc') return [...pages].sort((a, b) => (a.geoScore ?? 100) - (b.geoScore ?? 100));
    if (key === 'seo_asc') return [...pages].sort((a, b) => (a.seoScore ?? 100) - (b.seoScore ?? 100));
    return pages;
}

function formatCacheAge(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return 'less than an hour ago';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''} ago`;
}

export const PagesTab: React.FC<PagesTabProps> = ({ report, onForceRefresh }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('default');
    const [showOffMessageOnly, setShowOffMessageOnly] = useState(false);

    const filteredPages = useMemo(() => {
        let pages = report.pages.filter(page => {
            const matchesSearch = searchQuery === '' ||
                page.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                page.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesOffMessage = !showOffMessageOnly || page.offMessage;
            return matchesSearch && matchesOffMessage;
        });
        return sortPages(pages, sortKey);
    }, [report.pages, searchQuery, sortKey, showOffMessageOnly]);

    const offMessageCount = report.pages.filter(p => p.offMessage).length;
    const lowAeoCount = report.pages.filter(p => (p.aeoScore ?? 100) < 40).length;

    const SORT_OPTIONS: { label: string; value: SortKey }[] = [
        { label: 'Default', value: 'default' },
        { label: 'Lowest AEO', value: 'aeo_asc' },
        { label: 'Lowest GEO', value: 'geo_asc' },
        { label: 'Lowest SEO', value: 'seo_asc' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 text-left"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-blue-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <FileText className="text-blue-600 w-5 h-5" />
                        </div>
                        Page-by-Page Analysis
                        <span className="text-slate-400 text-base font-semibold ml-1">({report.pages.length})</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm max-w-xl">
                        AEO, GEO, and SEO scores for each crawled page. Fix the lowest-scoring pages first.
                    </p>
                </div>

                {/* Summary badges */}
                <div className="flex items-center gap-3 flex-wrap">
                    {lowAeoCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-bold text-red-600">{lowAeoCount} low AEO</span>
                        </div>
                    )}
                    {offMessageCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-bold text-amber-600">{offMessageCount} off-message</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Cached result banner */}
            {report._fromCache && report._cachedAt && (
                <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-blue-700">
                            <span className="font-semibold">Cached result</span> — page content unchanged,
                            last analyzed <span className="font-medium">{formatCacheAge(report._cachedAt)}</span>
                        </span>
                    </div>
                    {onForceRefresh && (
                        <button
                            onClick={onForceRefresh}
                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1.5 bg-white transition-all flex-shrink-0"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Force re-analyze
                        </button>
                    )}
                </div>
            )}

            {/* Filters + Sort row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search pages..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-blue-100 text-slate-700 text-sm rounded-xl pl-9 pr-4 py-2 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <SortAsc className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setSortKey(opt.value)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                sortKey === opt.value
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-blue-100 hover:border-blue-300'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}

                    {offMessageCount > 0 && (
                        <button
                            onClick={() => setShowOffMessageOnly(!showOffMessageOnly)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                showOffMessageOnly
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white text-slate-600 border-blue-100 hover:border-amber-300'
                            }`}
                        >
                            Off-Message Only
                        </button>
                    )}
                </div>
            </div>

            {/* Page list */}
            <div className="space-y-3">
                {filteredPages.length === 0 ? (
                    <div className="text-center py-16 bg-blue-50 rounded-2xl border border-blue-100">
                        <Search className="w-10 h-10 text-blue-300 mx-auto mb-3" />
                        {report.pages.length === 0 ? (
                            <>
                                <h3 className="text-base font-semibold text-slate-700 mb-1">No Pages Analyzed Yet</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto">Run an audit to see page-level AEO, GEO, and SEO scores.</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-base font-semibold text-slate-700 mb-1">No Matches</h3>
                                <button onClick={() => { setSearchQuery(''); setSortKey('default'); setShowOffMessageOnly(false); }} className="mt-3 text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium">
                                    Clear filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    filteredPages.map((page, idx) => (
                        <motion.div
                            key={page.url}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                        >
                            <PageBreakdown page={page} auditId={report.id} />
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
};
