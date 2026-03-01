import React from 'react';
import { Report } from '../../types';
import { VectorMap } from '../VectorMap';
import { ShieldCheck, Info, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConsistencyTabProps {
    report: Report;
}

export const ConsistencyTab: React.FC<ConsistencyTabProps> = ({ report }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8">
                    <VectorMap data={report.vectorMap || []} />
                </div>

                <div className="lg:col-span-4 flex flex-col gap-8">
                    {/* Alignment Score Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-10 text-center flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group h-full"
                    >
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                            <ShieldCheck className="w-10 h-10 text-primary" />
                        </div>

                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 opacity-60">Neural Alignment Score</h2>

                        <div className="relative mb-6">
                            <div className="text-7xl font-black text-white tracking-tighter">
                                {report.brandConsistencyScore}
                            </div>
                            <span className="absolute -top-1 -right-6 text-slate-500 text-xl font-bold opacity-30">/100</span>
                        </div>

                        <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.05] w-full">
                            <p className="text-slate-400 text-sm italic font-medium leading-relaxed line-clamp-4">
                                "{report.consistencyAnalysis}"
                            </p>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 w-full flex items-center justify-between">
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${report.brandConsistencyScore >= 80 ? 'text-emerald-400' : report.brandConsistencyScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {report.brandConsistencyScore >= 80 ? 'Optimized High' : report.brandConsistencyScore >= 60 ? 'Moderate' : 'Needs Attention'}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-white/10"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Score</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">{report.brandConsistencyScore}/100</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Insight Card */}
                    <div className="bg-primary/10 backdrop-blur-xl rounded-3xl border border-primary/20 p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Info className="w-5 h-5 text-primary" />
                            <h4 className="text-xs font-black text-white uppercase tracking-widest">AIE Insights</h4>
                        </div>
                        <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6">
                            Semantic consistency across your domain is currently high, reducing brand voice drift across AI assistants.
                        </p>
                        <button className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors group">
                            Full Analysis <ArrowUpRight className="w-3 h-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
