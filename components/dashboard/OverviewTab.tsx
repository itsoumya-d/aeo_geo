import React from 'react';
import { motion } from 'framer-motion';
import { Report } from '../../types';
import { TabType } from './DashboardTypes';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import { AlertTriangle, CheckCircle, TrendingUp, Cpu, Target, Layers } from 'lucide-react';
import { VisibilityTrendChart } from '../VisibilityTrendChart';

interface OverviewTabProps {
    report: Report;
    setActiveTab: (tab: TabType) => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ report, setActiveTab }) => {
    const scoreData = report.platformScores.map(ps => ({
        name: ps.platform,
        score: ps.score,
        fill: ps.score > 70 ? '#10b981' : ps.score > 50 ? '#fbbf24' : '#f43f5e'
    }));

    const overallData = [{
        name: 'Score',
        value: report.overallScore,
        fill: report.overallScore > 75 ? '#10b981' : '#6366f1'
    }];

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-10"
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Score Card */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-4 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/20 transition-colors shadow-2xl"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" /> Overall Visibility
                    </h3>
                    <div className="w-48 h-48 sm:w-64 sm:h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart innerRadius="85%" outerRadius="110%" barSize={12} data={overallData} startAngle={225} endAngle={-45}>
                                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                <RadialBar background={{ fill: 'rgba(255,255,255,0.03)' }} dataKey="value" cornerRadius={30} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl sm:text-7xl font-black text-white tracking-tighter">{report.overallScore}</span>
                            <span className="text-slate-500 text-[10px] sm:text-xs font-medium uppercase tracking-widest mt-1">Index Score</span>
                        </div>
                    </div>
                    {/* Subtle micro-stats */}
                    <div className="mt-8 grid grid-cols-2 gap-8 w-full border-t border-white/5 pt-8">
                        <div className="text-center">
                            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Consistency</div>
                            <div className="text-white font-bold">{report.brandConsistnecyScore}%</div>
                        </div>
                        <div className="text-center">
                            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Impact Potential</div>
                            <div className="text-primary font-bold">High</div>
                        </div>
                    </div>
                </motion.div>

                {/* Platform Breakdown */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-8 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 sm:p-10 shadow-2xl overflow-hidden relative"
                >
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-purple-400" /> Model Performance
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Optimal</div>
                            <div className="flex items-center gap-1.5 ml-3"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Neutral</div>
                            <div className="flex items-center gap-1.5 ml-3"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Poor</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                        <div className="h-60 sm:h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreData} layout="vertical" margin={{ left: -20, right: 20 }}>
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={110}
                                        tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            backdropFilter: 'blur(12px)',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                                            color: '#fff'
                                        }}
                                    />
                                    <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={28}>
                                        {scoreData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4 overflow-y-auto max-h-72 pr-4 custom-scrollbar text-left">
                            {report.platformScores.map((ps, i) => (
                                <motion.div
                                    key={ps.platform}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    className="bg-white/[0.02] hover:bg-white/[0.04] p-5 rounded-2xl border border-white/[0.05] transition-all group"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-white text-sm group-hover:text-primary transition-colors">{ps.platform}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${ps.score}%` }}></div>
                                            </div>
                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${ps.score > 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{ps.score}%</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{ps.reasoning}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Trend Chart */}
            <motion.div variants={itemVariants} className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-10 shadow-2xl">
                <div className="flex items-center gap-2 mb-8">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Visibility Trends</h3>
                </div>
                <VisibilityTrendChart />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Topical Authority */}
                <motion.div
                    variants={itemVariants}
                    className="bg-slate-900/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/5 p-6 sm:p-10 text-left shadow-2xl"
                >
                    <div className="flex items-center gap-2 mb-8">
                        <Layers className="w-4 h-4 text-blue-400" />
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Topical Dominance</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {report.topicalDominance?.map((topic, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                className="bg-white/[0.03] border border-white/[0.08] text-slate-300 px-5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 hover:bg-white/[0.06] transition-colors"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div> {topic}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Consistency Analysis */}
                <motion.div
                    variants={itemVariants}
                    className="bg-slate-900/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/5 p-6 sm:p-10 text-left shadow-2xl"
                >
                    <div className="flex items-center gap-2 mb-8">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Consistency Insights</h3>
                    </div>
                    <p className="text-slate-400 text-sm leading-loose">
                        {report.consistencyAnalysis || "Analysis of cross-platform brand representation and message alignment."}
                    </p>
                </motion.div>
            </div>

            {/* Actions */}
            <motion.div variants={itemVariants} className="text-left">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" /> Critical Optimization Actions
                    </h3>
                    <button
                        onClick={() => setActiveTab('pages')}
                        className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        VIEW ALL RECOMMENDATIONS →
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {report.pages.flatMap(p => p.recommendations).filter(r => r.impact === 'HIGH').slice(0, 6).map((rec, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -5 }}
                            className="bg-slate-900/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/5 hover:border-primary/20 transition-all shadow-xl group cursor-pointer"
                            onClick={() => setActiveTab('pages')}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2 text-rose-400/80">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                    <span className="font-bold text-[10px] uppercase tracking-widest">Priority</span>
                                </div>
                                <span className="text-[10px] text-slate-500 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/5 max-w-[140px] truncate font-bold">
                                    {rec.location}
                                </span>
                            </div>
                            <h4 className="text-white font-bold text-base mb-3 group-hover:text-primary transition-colors leading-tight">{rec.issue}</h4>
                            <p className="text-slate-500 text-xs mb-6 line-clamp-3 leading-relaxed font-medium">{rec.instruction}</p>
                            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Impact: <span className="text-rose-400">High</span></span>
                                <span className="text-[10px] font-bold text-primary group-hover:translate-x-1 transition-transform">FIX NOW →</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};
