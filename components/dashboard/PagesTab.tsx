import React, { useState, useMemo } from 'react';
import { Report } from '../../types';
import { PageBreakdown } from '../PageBreakdown';
import { motion } from 'framer-motion';
import { FileText, Info, Search, Filter } from 'lucide-react';

interface PagesTabProps {
    report: Report;
}

type ImpactFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const PagesTab: React.FC<PagesTabProps> = ({ report }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [impactFilter, setImpactFilter] = useState<ImpactFilter>('ALL');

    const filteredPages = useMemo(() => {
        return report.pages.filter(page => {
            const matchesSearch = searchQuery === '' ||
                page.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                page.title.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesImpact = impactFilter === 'ALL' ||
                page.recommendations.some(r => r.impact === impactFilter);

            return matchesSearch && matchesImpact;
        });
    }, [report.pages, searchQuery, impactFilter]);

    const highCount = report.pages.reduce((acc, p) => acc + p.recommendations.filter(r => r.impact === 'HIGH').length, 0);
    const medCount = report.pages.reduce((acc, p) => acc + p.recommendations.filter(r => r.impact === 'MEDIUM').length, 0);
    const lowCount = report.pages.reduce((acc, p) => acc + p.recommendations.filter(r => r.impact === 'LOW').length, 0);

    const FILTERS: { label: string; value: ImpactFilter; count: number; color: string }[] = [
        { label: 'All', value: 'ALL', count: report.pages.length, color: 'text-text-primary border-border hover:border-primary/40' },
        { label: 'High Impact', value: 'HIGH', count: highCount, color: 'text-rose-600 border-rose-300 hover:border-rose-400' },
        { label: 'Medium', value: 'MEDIUM', count: medCount, color: 'text-amber-600 border-amber-300 hover:border-amber-400' },
        { label: 'Low', value: 'LOW', count: lowCount, color: 'text-blue-600 border-blue-300 hover:border-blue-400' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 text-left"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-10">
                <div>
                    <h2 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-4">
                        <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
                            <FileText className="text-primary w-6 h-6" />
                        </div>
                        Neural Page Audit
                        <span className="text-slate-500 text-lg font-bold ml-2">({report.pages.length})</span>
                    </h2>
                    <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
                        In-depth analysis of how LLM search engines perceive each page in your domain. We assess citation likelihood, semantic clarity, and retrieval fragments.
                    </p>
                </div>
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-background border border-border">
                    <Info className="w-4 h-4 text-text-muted" />
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">{report.pages.length} Pages Analyzed</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search pages..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-background border border-border text-text-primary text-sm rounded-xl pl-9 pr-4 py-2.5 placeholder:text-text-secondary focus:outline-none focus:border-primary/50 transition-all"
                    />
                </div>

                {/* Impact filter pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setImpactFilter(f.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all ${f.color} ${impactFilter === f.value ? 'bg-primary/10' : 'bg-transparent'}`}
                        >
                            {f.label}
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{f.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-8">
                {filteredPages.length === 0 ? (
                    <div className="text-center py-20 bg-blue-50 rounded-3xl border border-border">
                        <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        {report.pages.length === 0 ? (
                            <>
                                <h3 className="text-lg font-bold text-text-primary mb-2">No Pages Analyzed Yet</h3>
                                <p className="text-sm text-text-secondary max-w-md mx-auto">Run an audit to see a page-level breakdown of how AI search engines perceive each page on your site.</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-text-primary mb-2">No Matches</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto">Try adjusting your search or filter criteria.</p>
                                <button onClick={() => { setSearchQuery(''); setImpactFilter('ALL'); }} className="mt-4 text-xs text-primary hover:text-white transition-colors">
                                    Clear filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    filteredPages.map((page, idx) => (
                        <PageBreakdown key={idx} page={page} auditId={report.id} />
                    ))
                )}
            </div>
        </motion.div>
    );
};
