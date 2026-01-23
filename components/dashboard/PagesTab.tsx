import React from 'react';
import { Report } from '../../types';
import { PageBreakdown } from '../PageBreakdown';
import { motion } from 'framer-motion';
import { FileText, Info } from 'lucide-react';

interface PagesTabProps {
    report: Report;
}

export const PagesTab: React.FC<PagesTabProps> = ({ report }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 text-left"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
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
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                    <Info className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Real-Time Sync Active</span>
                </div>
            </div>

            <div className="space-y-8">
                {report.pages.map((page, idx) => (
                    <PageBreakdown key={idx} page={page} />
                ))}
            </div>
        </motion.div>
    );
};
